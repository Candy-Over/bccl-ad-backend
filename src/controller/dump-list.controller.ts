import type { Request, Response } from "express";
import { and, count, eq, asc, desc, like, inArray, gte, lte } from "drizzle-orm";
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

// Fetches detail rows for many summary ids in one round trip — a dump detail
// page renders one card per page, and fetching each card's details separately
// was firing one request per page instead of one for the whole dump.
const getDetailsBulk = async (req: Request, res: Response): Promise<any> => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => !Number.isNaN(id));

    if (ids.length === 0) {
      return res.status(400).json({
        msg: "ids is a required query parameter (comma-separated summary ids)",
      });
    }

    const rows = await db
      .select()
      .from(pageDiffDetail)
      .where(inArray(pageDiffDetail.summaryId, ids))
      .orderBy(asc(pageDiffDetail.summaryId), asc(pageDiffDetail.id));

    const data: Record<number, typeof rows> = {};
    for (const id of ids) data[id] = [];
    for (const row of rows) {
      data[row.summaryId]!.push(row);
    }

    return res.status(200).json({
      msg: "Detail lists fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching bulk detail list:", error);

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
          eq(pageDiffSummary.editionDate, date as string),
          eq(pageDiffSummary.cap, editionRow.edition),
        ),
      )
      .orderBy(asc(pageDiffSummary.dumpTime));

    // "Changed" is counted per dump event (distinct dumpTime), not per row —
    // a single dump can touch multiple pages, which would otherwise inflate
    // the count.
    const total = new Set(data.map((row) => row.dumpTime)).size;

    return res.status(200).json({
      msg: "List fetched",
      data: {
        cap: editionRow.edition,
        total,
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
    const { date, city, cap } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!date) {
      return res.status(400).json({
        msg: "date is a required query parameter",
      });
    }

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ error: "Page and limit parameters must be positive integers" });
    }

    const summaryRows = await db
      .select()
      .from(pageDiffSummary)
      .where(eq(pageDiffSummary.editionDate, date as string))
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
        dumpTimes: Set<string>;
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
          dumpTimes: new Set(),
          pages: [],
        });
      }

      const group = groups.get(cap)!;
      group.dumpTimes.add(row.dumpTime);
      group.pages.push(row);
    }

    // "Changed" is counted per dump event (distinct dumpTime), not per row —
    // a single dump can touch multiple pages, which would otherwise inflate
    // the count.
    let groupList = Array.from(groups.values()).map(
      ({ dumpTimes, ...group }) => ({
        ...group,
        total: dumpTimes.size,
      }),
    );

    // city/cap narrow which editions are in the list — applied before
    // pagination so a caller after one specific cap (e.g. the dump detail
    // page) always gets it regardless of what page it'd otherwise fall on.
    if (city) groupList = groupList.filter((group) => group.city === city);
    if (cap) groupList = groupList.filter((group) => group.cap === cap);

    const total = groupList.length;
    const offset = (page - 1) * limit;
    const pagedGroups = groupList.slice(offset, offset + limit);

    return res.status(200).json({
      msg: "Edition summary fetched",
      data: {
        date,
        total,
        groups: pagedGroups,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
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

// Report over a date range for a single edition — one entry per editionDate
// in range that has data, each carrying its own dump count and full row list
// so the client can render a per-date accordion identical to the single-date
// edition view, without a second request per date.
const getEditionReport = async (req: Request, res: Response): Promise<any> => {
  try {
    const { edition, dateFrom, dateTo } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!edition || !dateFrom || !dateTo) {
      return res.status(400).json({
        msg: "edition, dateFrom and dateTo are required query parameters",
      });
    }

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ error: "Page and limit parameters must be positive integers" });
    }

    // "edition" is a natural key on its own (see uploadEditionMaster) — no
    // city needed to resolve it.
    const [editionRow] = await db
      .select()
      .from(editionMaster)
      .where(eq(editionMaster.edition, edition as string));

    if (!editionRow) {
      return res.status(404).json({
        msg: "No matching edition found",
      });
    }

    // editionMaster.edition matches pageDiffSummary.cap.
    const rows = await db
      .select()
      .from(pageDiffSummary)
      .where(
        and(
          eq(pageDiffSummary.cap, editionRow.edition),
          gte(pageDiffSummary.editionDate, dateFrom as string),
          lte(pageDiffSummary.editionDate, dateTo as string),
        ),
      )
      .orderBy(asc(pageDiffSummary.editionDate), asc(pageDiffSummary.dumpTime));

    const dateGroups = new Map<
      string,
      { date: string; dumpTimes: Set<string>; pages: (typeof rows)[number][] }
    >();

    for (const row of rows) {
      // editionDate is nullable on older rows uploaded before it existed —
      // exclude them from a report keyed by editionDate rather than grouping
      // them under a misleading "Unknown" bucket.
      if (!row.editionDate) continue;

      let group = dateGroups.get(row.editionDate);
      if (!group) {
        group = { date: row.editionDate, dumpTimes: new Set(), pages: [] };
        dateGroups.set(row.editionDate, group);
      }

      group.dumpTimes.add(row.dumpTime);
      group.pages.push(row);
    }

    const dateList = Array.from(dateGroups.values())
      .map(({ dumpTimes, ...group }) => ({ ...group, total: dumpTimes.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // "Changed" is counted per dump event (distinct dumpTime) — summing each
    // date's own count keeps that consistent at the range level too.
    const overallTotal = dateList.reduce((sum, group) => sum + group.total, 0);

    const total = dateList.length;
    const offset = (page - 1) * limit;
    const pagedDates = dateList.slice(offset, offset + limit);

    return res.status(200).json({
      msg: "Edition report fetched",
      data: {
        cap: editionRow.edition,
        editionLongName: editionRow.editionLongName,
        city: editionRow.city,
        publication: editionRow.publication,
        status: editionRow.status,
        dateFrom,
        dateTo,
        overallTotal,
        dates: pagedDates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching edition report:", error);
    return res.status(500).json({
      msg: "Failed to fetch edition report",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export {
  getPageDiffSummery,
  getEditionDumTotal,
  getDetails,
  getDetailsBulk,
  getEditionSummaryByDate,
  getEditionReport,
};
