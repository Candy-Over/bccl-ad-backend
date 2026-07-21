import {
  mysqlTable,
  int,
  varchar,
  date,
  timestamp,
  index,
  uniqueIndex,
  time,
} from "drizzle-orm/mysql-core";

export const pageDiffSummary = mysqlTable(
  "page_diff_summary",
  {
    id: int("id").autoincrement().primaryKey(),

    prProdId: int("prprod_id").notNull(),
    // prProdName was "CAP/MP" (e.g. "TOIM/MP") — split into its two parts.
    cap: varchar("cap", { length: 50 }).notNull(),
    mp: varchar("mp", { length: 50 }).notNull(),
    prProdDump: int("prprod_dump").notNull(),

    // Parsed from the upload's file name (e.g. "TOIM-20260716" -> "2026-07-16"),
    // not the CSV's own Dump Date column — the file can be dumped on a different
    // calendar day than the edition it's produced for. Nullable because rows
    // uploaded before this column existed have no file name on record to derive it from.
    editionDate: date("edition_date", { mode: "string" }),

    dumpDate: date("dump_date", { mode: "string" }).notNull(),
    dumpTime: time("dump_time").notNull(),

    pageId: int("page_id").notNull(),
    pageName: varchar("page_name", { length: 100 }).notNull(),
    pageNo: int("page_no").notNull(),

    ppId: int("pp_id").notNull(),
    ppName: varchar("pp_name", { length: 100 }).notNull(),

    diffFreeArea: int("diff_free_area").default(0),
    diffElements: int("diff_elements").default(0),
    makeUpFlag: int("makeup_flag").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    searchIdx: index("page_diff_summary_search_idx").on(
      table.dumpDate,
      table.dumpTime,
      table.cap,
      table.pageId,
    ),

    uniqueDump: uniqueIndex("page_diff_summary_unique").on(
      table.prProdId,
      table.dumpDate,
      table.dumpTime,
      table.pageId,
    ),
  }),
);
