import {
    mysqlTable,
    int,
    varchar,
    date,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/mysql-core";

export const pageDiffSummary = mysqlTable(
    "page_diff_summary",
    {
        id: int("id").autoincrement().primaryKey(),

        prProdId: int("prprod_id").notNull(),
        prProdName: varchar("prprod_name", { length: 50 }).notNull(), // CAP/MP
        prProdDump: int("prprod_dump").notNull(),

        dumpDate: date("dump_date").notNull(),
        // dumpTime: time("dump_time").notNull(),

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
            // table.dumpTime,
            table.prProdName,
            table.pageId
        ),

        // uniqueDump: uniqueIndex("page_diff_summary_unique").on(
        //     table.prProdId,
        //     table.dumpDate,
        //     table.dumpTime,
        //     table.pageId
        // ),
        uniqueDump: uniqueIndex("page_diff_summary_unique").on(
            table.prProdId,
            table.dumpDate,
            table.pageId
        ),
    })
);