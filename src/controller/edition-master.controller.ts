import type { Request, Response } from "express";
import { and, count, eq, asc, like, or } from "drizzle-orm";
import { db } from "../db/db.js";
import { editionMaster } from "../db/schema/index.js";

const editionMasterList = async (req: Request, res: Response): Promise<any> => {
  try {
    const { search } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ error: "Page and limit parameters must be positive integers" });
    }

    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(editionMaster.edition, `%${search}%`),
          like(editionMaster.editionLongName, `%${search}%`),
          like(editionMaster.city, `%${search}%`),
          like(editionMaster.publication, `%${search}%`),
        ),
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select()
      .from(editionMaster)
      .where(whereClause)
      .orderBy(asc(editionMaster.city), asc(editionMaster.edition))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ value: count() })
      .from(editionMaster)
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
    console.error("Error in editionMasterList:", err);
    return res.status(500).json({
      error: "An error occurred while fetching the edition master list",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

const cityList = async (req: Request, res: Response): Promise<any> => {
  try {
    // Get paginated summary rows
    const data = await db
      .selectDistinct({city: editionMaster.city})
      .from(editionMaster)
      .orderBy(asc(editionMaster.city));

    return res.status(200).json({
      msg: "List of cities",
      data: {
        data,
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

const editionForCity = async (req: Request, res: Response): Promise<any> => {
  try {
    const { city } = req.params;
    if(!city){
      return res.status(400).json({
        msg: "No city is provided"
      })
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;

    if (page < 1 || limit < 1) {
      return res
        .status(400)
        .json({ error: "Page and limit parameters must be positive integers" });
    }

    const offset = (page - 1) * limit;

    const data = await db
      .select({
        edition: editionMaster.edition,
        longName: editionMaster.editionLongName,
        publication: editionMaster.publication,
        status: editionMaster.status
      })
      .from(editionMaster)
      .where(eq(editionMaster.city, city as string))
      .orderBy(asc(editionMaster.edition))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ value: count() })
      .from(editionMaster)
      .where(eq(editionMaster.city, city as string));
    const total = countResult?.value || 0;

    return res.status(200).json({
      msg: "List",
      data: {
        total,
        data,
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

export { editionMasterList, cityList, editionForCity };
