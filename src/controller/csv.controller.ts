import type { Request, Response } from "express";
import { Readable } from "stream";
import csv from "csv-parser";
import { and, count, eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { editionMaster, pageDiffDetail, pageDiffSummary } from "../db/schema/index.js";

// Maps a normalized CSV header to the pageDiffSummary field it fills.
// "PrProd Name" (e.g. "TOIM/MP") is handled separately below since it's split into cap + mp.
const SUMMARY_FIELDS: Record<string, string> = {
  prprodid: "prProdId",
  prproddump: "prProdDump",
  dumpdate: "dumpDate",
  pageid: "pageId",
  pagename: "pageName",
  pageno: "pageNo",
  ppid: "ppId",
  ppname: "ppName",
  difffreearea: "diffFreeArea",
  diffelements: "diffElements",
  makeupflag: "makeUpFlag",
};

// Maps a normalized CSV header to the pageDiffDetail field it fills.
// "Dump Time" is handled separately below since it's stored on both the summary and the detail.
const DETAIL_FIELDS: Record<string, string> = {
  newplace: "newPlace",
  deletedisplace: "deleteDisplace",
  changeposition: "changePosition",
  changegeometry: "changeGeometry",
  changenamematerial: "changeNameMaterial",
};

// Maps a normalized CSV header to the editionMaster field it fills.
const EDITION_MASTER_FIELDS: Record<string, string> = {
  object: "object",
  edition: "edition",
  editionlongname: "editionLongName",
  city: "city",
  status: "status",
  publication: "publication",
};

const NUMERIC_SUMMARY_FIELDS = new Set([
  "prProdId",
  "prProdDump",
  "pageId",
  "pageNo",
  "ppId",
  "diffFreeArea",
  "diffElements",
  "makeUpFlag",
]);

const BOOLEAN_DETAIL_FIELDS = new Set([
  "newPlace",
  "deleteDisplace",
  "changePosition",
  "changeGeometry",
  "changeNameMaterial",
]);

const normalizeKey = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, "");

// "20260715" -> "2026-07-15"
const toIsoDate = (raw: string): string =>
  /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;

// "231445" -> "23:14:45"
const toHmsTime = (raw: string): string =>
  /^\d{6}$/.test(raw) ? `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)}` : raw;

type MappedRow = {
  summary: Record<string, any>;
  detail: Record<string, any>;
  hasElement: boolean;
};

// The CSV's "Element" column packs a code and a name together, e.g.
// "27107797_1 INSTITUTE FOR DESIGN OF ELECTR" -> code "27107797_1", name "INSTITUTE FOR DESIGN OF ELECTR".
const splitElement = (raw: string): { elementCode: string; elementName: string } => {
  const spaceIdx = raw.indexOf(" ");
  return spaceIdx === -1
    ? { elementCode: raw, elementName: "" }
    : { elementCode: raw.slice(0, spaceIdx), elementName: raw.slice(spaceIdx + 1).trim() };
};

// The CSV's "PrProd Name" column packs cap and mp together, e.g. "TOIM/MP" -> cap "TOIM", mp "MP".
const splitCapMp = (raw: string): { cap: string; mp: string } => {
  const slashIdx = raw.indexOf("/");
  return slashIdx === -1
    ? { cap: raw, mp: "" }
    : { cap: raw.slice(0, slashIdx), mp: raw.slice(slashIdx + 1).trim() };
};

const mapRow = (row: Record<string, string>): MappedRow => {
  const summary: Record<string, any> = {};
  const detail: Record<string, any> = {};
  let elementRaw = "";
  let dumpTimeRaw = "";
  let prProdNameRaw = "";

  for (const [header, rawValue] of Object.entries(row)) {
    const key = normalizeKey(header);
    const value = (rawValue ?? "").trim();

    if (key === "element") {
      elementRaw = value;
      continue;
    }

    if (key === "dumptime") {
      dumpTimeRaw = value;
      continue;
    }

    if (key === "prprodname") {
      prProdNameRaw = value;
      continue;
    }

    const summaryField = SUMMARY_FIELDS[key];
    if (summaryField) {
      summary[summaryField] = NUMERIC_SUMMARY_FIELDS.has(summaryField)
        ? parseInt(value, 10) || 0
        : value;
      continue;
    }

    const detailField = DETAIL_FIELDS[key];
    if (detailField) {
      detail[detailField] = BOOLEAN_DETAIL_FIELDS.has(detailField) ? value === "1" : value;
    }
  }

  if (typeof summary.dumpDate === "string") {
    summary.dumpDate = toIsoDate(summary.dumpDate);
  }

  if (prProdNameRaw) {
    Object.assign(summary, splitCapMp(prProdNameRaw));
  }

  // A page/dump can be uploaded multiple times a day at different dump times, each producing
  // its own summary row — so dumpTime is part of both the summary and its detail rows.
  if (dumpTimeRaw) {
    const dumpTime = toHmsTime(dumpTimeRaw);
    summary.dumpTime = dumpTime;
    detail.dumpTime = dumpTime;
  }

  const hasElement = elementRaw.length > 0;
  if (hasElement) {
    Object.assign(detail, splitElement(elementRaw));
  }

  return { summary, detail, hasElement };
};

const mapEditionMasterRow = (row: Record<string, string>): Record<string, any> => {
  const edition: Record<string, any> = {};

  for (const [header, rawValue] of Object.entries(row)) {
    const key = normalizeKey(header);
    const value = (rawValue ?? "").trim();

    const field = EDITION_MASTER_FIELDS[key];
    if (field) {
      edition[field] = value || null;
    }
  }

  return edition;
};

const detectSeparator = (buffer: Buffer): string => {
  let firstLine = "";
  for (let i = 0; i < buffer.length; i++) {
    const char = String.fromCharCode(buffer[i]!);
    if (char === "\n" || char === "\r") {
      break;
    }
    firstLine += char;
  }

  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) {
    return ";";
  }
  if (tabs > commas && tabs > semicolons) {
    return "\t";
  }
  return ",";
};

const uploadCsv = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded or invalid file type" });
    }

    const rows: Array<{ summary: Record<string, any>; detail: Record<string, any>; hasElement: boolean }> = [];

    const separator = detectSeparator(req.file.buffer);
    const stream = Readable.from(req.file.buffer);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv({ separator }))
        .on("data", (row) => {
          rows.push(mapRow(row as Record<string, string>));
        })
        .on("end", () => {
          resolve();
        })
        .on("error", (error) => {
          reject(error);
        });
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: "CSV file is empty or contains no valid rows" });
    }

    // Group rows into one pageDiffSummary parent per (prProdId, dumpDate, dumpTime, pageId) —
    // the same page can be dumped more than once a day, each dump time getting its own summary.
    const groups = new Map<string, { summary: Record<string, any>; details: Record<string, any>[] }>();
    for (const { summary, detail, hasElement } of rows) {
      const key = `${summary.prProdId}|${summary.dumpDate}|${summary.dumpTime}|${summary.pageId}`;
      const group = groups.get(key);

      if (!group) {
        groups.set(key, { summary, details: hasElement ? [detail] : [] });
      } else {
        if (!hasElement) {
          // The blank-Element row is the page-level summary line — it carries the real
          // diffFreeArea/diffElements/makeUpFlag totals, which every elemented row just
          // repeats as 0. Let it override whatever the group started with.
          Object.assign(group.summary, summary);
        }
        if (hasElement) {
          group.details.push(detail);
        }
      }
    }

    const BATCH_SIZE = 1000;
    let summariesProcessed = 0;
    let detailsInserted = 0;

    for (const { summary, details } of groups.values()) {
      const [existing] = await db
        .select({ id: pageDiffSummary.id })
        .from(pageDiffSummary)
        .where(
          and(
            eq(pageDiffSummary.prProdId, summary.prProdId),
            eq(pageDiffSummary.dumpDate, summary.dumpDate),
            eq(pageDiffSummary.dumpTime, summary.dumpTime),
            eq(pageDiffSummary.pageId, summary.pageId)
          )
        );

      let summaryId: number;
      if (existing) {
        summaryId = existing.id;
        // Re-uploading the same summary must refresh its mutable fields (e.g. diffFreeArea,
        // diffElements, makeUpFlag) — reusing the id alone left them stuck at their first value.
        await db
          .update(pageDiffSummary)
          .set(summary as any)
          .where(eq(pageDiffSummary.id, summaryId));
        // Re-uploading the same summary also replaces its details instead of duplicating them.
        await db.delete(pageDiffDetail).where(eq(pageDiffDetail.summaryId, summaryId));
      } else {
        const [insertResult] = await db.insert(pageDiffSummary).values(summary as any);
        summaryId = insertResult.insertId;
      }
      summariesProcessed++;

      const detailRows = details.map((detail) => ({ ...detail, summaryId }));
      for (let i = 0; i < detailRows.length; i += BATCH_SIZE) {
        const batch = detailRows.slice(i, i + BATCH_SIZE);
        await db.insert(pageDiffDetail).values(batch as any);
        detailsInserted += batch.length;
      }
    }

    return res.status(200).json({
      message: "CSV parsed and data saved to database successfully",
      summariesProcessed,
      detailsInserted,
    });
  } catch (err) {
    console.error("Error in uploadCsv:", err);
    return res.status(500).json({
      error: "An error occurred while uploading and parsing the CSV file",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

const getCsvData = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: "Page and limit parameters must be positive integers" });
    }

    const offset = (page - 1) * limit;

    // Get paginated summary rows
    const data = await db
      .select()
      .from(pageDiffSummary)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db.select({ value: count() }).from(pageDiffSummary);
    const total = countResult?.value || 0;

    return res.status(200).json({
      data,
      pagination: {
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

// Upload Edition master
const uploadEditionMaster = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded or invalid file type" });
    }

    const rows: Record<string, any>[] = [];
    const separator = detectSeparator(req.file.buffer);
    const stream = Readable.from(req.file.buffer);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv({ separator }))
        .on("data", (row) => {
          const edition = mapEditionMasterRow(row as Record<string, string>);
          if (!edition.object || !edition.edition) return; // required fields missing
          rows.push(edition);
        })
        .on("end", () => {
          resolve();
        })
        .on("error", (error) => {
          reject(error);
        });
    });

    if (rows.length === 0) {
      return res.status(400).json({ error: "CSV file is empty or contains no valid rows" });
    }

    const BATCH_SIZE = 1000;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db.insert(editionMaster).values(batch as any);
    }

    return res.status(200).json({
      message: "Edition master CSV parsed and data saved to database successfully",
      rowsUploaded: rows.length,
    });
  } catch (err) {
    console.error("Error in uploadEditionMaster:", err);
    return res.status(500).json({
      error: "An error occurred while uploading and parsing the edition master CSV file",
      details: err instanceof Error ? err.message : String(err),
    });
  }
};

export { uploadCsv, uploadEditionMaster, getCsvData };