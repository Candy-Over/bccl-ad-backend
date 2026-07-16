import {
  mysqlTable,
  int,
  varchar,
  boolean,
  timestamp,
  index,
  time,
} from "drizzle-orm/mysql-core";

import { pageDiffSummary } from "./pageDiffSummary.js";

export const pageDiffDetail = mysqlTable(
  "page_diff_detail",
  {
    id: int("id").autoincrement().primaryKey(),

    summaryId: int("summary_id")
      .notNull()
      .references(() => pageDiffSummary.id, {
        onDelete: "cascade",
      }),

    dumpTime: time("dump_time").notNull(),

    elementCode: varchar("element_code", { length: 50 }).notNull(),
    elementName: varchar("element_name", { length: 255 }).notNull(),

    newPlace: boolean("new_place").default(false).notNull(),
    deleteDisplace: boolean("delete_displace").default(false).notNull(),
    changePosition: boolean("change_position").default(false).notNull(),
    changeGeometry: boolean("change_geometry").default(false).notNull(),
    changeNameMaterial: boolean("change_name_material")
      .default(false)
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // summaryIdx: index("page_diff_detail_summary_idx").on(table.summaryId),
    summaryIdx: index("page_diff_detail_summary_idx").on(
      table.summaryId,
      table.dumpTime,
      table.elementCode,
    ),
  }),
);
