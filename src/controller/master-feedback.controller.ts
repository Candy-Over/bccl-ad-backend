import type { Request, Response } from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { masterFeedback } from "../db/schema/index.js";

const listMasterFeedback = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await db
      .select()
      .from(masterFeedback)
      .orderBy(asc(masterFeedback.id));

    return res.status(200).json({
      msg: "Master feedback list",
      data,
    });
  } catch (err) {
    console.error("Error in listMasterFeedback:", err);
    return res.status(500).json({
      error: "An error occurred while fetching the master feedback list",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

const createMasterFeedback = async (req: Request, res: Response): Promise<any> => {
  try {
    const feedbackText = (req.body?.feedbackText ?? "").toString().trim();

    if (!feedbackText) {
      return res.status(400).json({ error: "feedbackText is required" });
    }

    const [result] = await db.insert(masterFeedback).values({ feedbackText });

    const [created] = await db
      .select()
      .from(masterFeedback)
      .where(eq(masterFeedback.id, result.insertId));

    return res.status(201).json({
      msg: "Master feedback created",
      data: created,
    });
  } catch (err) {
    console.error("Error in createMasterFeedback:", err);
    return res.status(500).json({
      error: "An error occurred while creating the master feedback",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export { listMasterFeedback, createMasterFeedback };
