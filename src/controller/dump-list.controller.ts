import type { Request, Response } from "express";
import { and, count, eq, asc, desc, like } from "drizzle-orm";
import { db } from "../db/db.js";
import { editionMaster, pageDiffDetail, pageDiffSummary } from "../db/schema/index.js";

const getPageDiffSummery = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { cap, date, time, pageName, pageId } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ error: "Page and limit parameters must be positive integers" });
    }

    const offset = (page - 1) * limit;

    // Only filter on whichever of these query params were actually given.
    const conditions = [];
    if (cap) conditions.push(like(pageDiffSummary.cap, `%${cap}%`));
    if (date) conditions.push(eq(pageDiffSummary.dumpDate, date as string));
    if (time) conditions.push(eq(pageDiffSummary.dumpTime, time as string));
    if (pageName)
      conditions.push(
        like(pageDiffSummary.pageName, `%${pageName}%` as string),
      );
    if (pageId && !Number.isNaN(parseInt(pageId as string, 10))) {
      conditions.push(
        eq(pageDiffSummary.pageId, parseInt(pageId as string, 10)),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get paginated summary rows
    const data = await db
      .select()
      .from(pageDiffSummary)
      .where(whereClause)
      .orderBy(desc(pageDiffSummary.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ value: count() })
      .from(pageDiffSummary)
      .where(whereClause);
    const total = countResult?.value || 0;

    return res.status(200).json({
      msg: "List",
      data: {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getCsvData:", err);
    return res.status(500).json({
      error: "An error occurred while fetching the CSV data",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

const getDetails = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        msg: "Invalid id",
      });
    }

    const data = await db
      .select()
      .from(pageDiffDetail)
      .where(eq(pageDiffDetail.summaryId, id))
      .orderBy(asc(pageDiffDetail.id));

    return res.status(200).json({
      msg: "Detail list fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching detail list:", error);

    return res.status(500).json({
      msg: "Failed to fetch detail list",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const getEditionDumTotal = async (req: Request, res: Response) => {
  try {
    const { date, city, edition } = req.query;

    if (!date || !city || !edition) {
      return res.status(400).json({
        msg: "date, city and edition are required query parameters",
      });
    }

    // Resolve the edition (city + edition) against editionMaster first.
    const [editionRow] = await db
      // .select({ edition: editionMaster.edition })
      .select()
      .from(editionMaster)
      .where(
        and(
          eq(editionMaster.city, city as string),
          eq(editionMaster.edition, edition as string),
        ),
      );

    if (!editionRow) {
      return res.status(404).json({
        msg: "No matching edition found for the given city and edition",
      });
    }

    // editionMaster.edition matches pageDiffSummary.cap.
    const data = await db
      .select()
      .from(pageDiffSummary)
      .where(
        and(
          eq(pageDiffSummary.dumpDate, date as string),
          eq(pageDiffSummary.cap, editionRow.edition),
        ),
      )
      .orderBy(asc(pageDiffSummary.dumpTime));

    return res.status(200).json({
      msg: "List fetched",
      data: {
        cap: editionRow.edition,
        total: data.length,
        data,
      },
    });
  } catch (error) {
    console.error("Error fetching detail list:", error);

    return res.status(500).json({
      msg: "Failed to fetch detail list",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// One group per cap/edition for the given date, each carrying its own total
// and full row list — replaces client-side grouping that previously fetched
// up to 500 raw rows and joined editionMaster in the browser.
const getEditionSummaryByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        msg: "date is a required query parameter",
      });
    }

    const summaryRows = await db
      .select()
      .from(pageDiffSummary)
      .where(eq(pageDiffSummary.dumpDate, date as string))
      .orderBy(asc(pageDiffSummary.cap), asc(pageDiffSummary.dumpTime));

    const editionRows = await db.select().from(editionMaster);
    const editionByCap = new Map(editionRows.map((row) => [row.edition, row]));

    const groups = new Map<
      string,
      {
        cap: string;
        editionLongName: string | null;
        city: string | null;
        status: string | null;
        publication: string | null;
        total: number;
        pages: (typeof summaryRows)[number][];
      }
    >();

    for (const row of summaryRows) {
      const cap = row.cap || "Unknown";

      if (!groups.has(cap)) {
        const info = editionByCap.get(cap);
        groups.set(cap, {
          cap,
          editionLongName: info?.editionLongName ?? null,
          city: info?.city ?? null,
          status: info?.status ?? null,
          publication: info?.publication ?? null,
          total: 0,
          pages: [],
        });
      }

      const group = groups.get(cap)!;
      group.total += 1;
      group.pages.push(row);
    }

    return res.status(200).json({
      msg: "Edition summary fetched",
      data: {
        date,
        total: summaryRows.length,
        groups: Array.from(groups.values()),
      },
    });
  } catch (error) {
    console.error("Error fetching edition summary:", error);
    return res.status(500).json({
      msg: "Failed to fetch edition summary",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export {
  getPageDiffSummery,
  getEditionDumTotal,
  getDetails,
  getEditionSummaryByDate,
};
