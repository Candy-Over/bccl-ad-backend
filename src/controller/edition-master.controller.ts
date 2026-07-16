import type { Request, Response } from "express";
import { and, count, eq, asc, like } from "drizzle-orm";
import { db } from "../db/db.js";
import { editionMaster } from "../db/schema/index.js";

const editionMasterList = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { cap } = req.query;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const condition=[];
    if(cap) condition.push(like(editionMaster.edition, `%${cap}%`))
    const whereClause = condition.length>0?and(...condition):undefined

    // Get paginated summary rows
    const data = await db
      .select({cap: editionMaster.edition})
      .from(editionMaster).where(whereClause)

    return res.status(200).json({
      msg: "List",
      data: {
        data
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


export { editionMasterList };
