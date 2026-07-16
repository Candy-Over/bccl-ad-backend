import type { Request, Response } from "express";
import { Readable } from "stream";
import csv from "csv-parser";
import { count } from "drizzle-orm";
import { db } from "../db/db.js";
import { csvData } from "../db/schema/index.js";
// import { csvData } from "../db/schema.js";

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

    const results: any[] = [];
    let isFirstRow = true;

    const separator = detectSeparator(req.file.buffer);
    const stream = Readable.from(req.file.buffer);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv({ headers: false, separator }))
        .on("data", (row) => {
          const values = Object.values(row) as string[];

          if (isFirstRow) {
            isFirstRow = false;
            // Detect header: check if any cell matches common header identifiers
            const isHeader = values.some(
              (val) =>
                val &&
                (val.toLowerCase() === "id" ||
                  val.toLowerCase().startsWith("column") ||
                  val.toLowerCase().includes("header") ||
                  val.toLowerCase().includes("name") ||
                  val.toLowerCase().match(/^c\d+$/))
            );
            if (isHeader) {
              return; // Skip the header row
            }
          }

          results.push({
            c1: values[0] || null,
            c2: values[1] || null,
            c3: values[2] || null,
            c4: values[3] || null,
            c5: values[4] || null,
            c6: values[5] || null,
            c7: values[6] || null,
            c8: values[7] || null,
            c9: values[8] || null,
            c10: values[9] || null,
          });
        })
        .on("end", () => {
          resolve();
        })
        .on("error", (error) => {
          reject(error);
        });
    });

    if (results.length === 0) {
      return res.status(400).json({ error: "CSV file is empty or contains no valid rows" });
    }

    // Batch insert into MySQL
    const BATCH_SIZE = 1000;
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);
      await db.insert(csvData).values(batch);
    }

    return res.status(200).json({
      message: "CSV parsed and data saved to database successfully",
      rowsUploaded: results.length,
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

    // Get paginated rows
    const data = await db
      .select()
      .from(csvData)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db.select({ value: count() }).from(csvData);
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

export { uploadCsv, getCsvData };