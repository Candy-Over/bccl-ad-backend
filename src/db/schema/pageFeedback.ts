import { mysqlTable, int, timestamp, uniqueIndex } from "drizzle-orm/mysql-core";
import { pageDiffSummary } from "./pageDiffSummary.js";
import { masterFeedback } from "./masterFeedback.js";

export const pageFeedback = mysqlTable(
  "page_feedback",
  {
    id: int("id").autoincrement().primaryKey(),

    summaryId: int("summary_id")
      .notNull()
      .references(() => pageDiffSummary.id, { onDelete: "cascade" }),

    masterFeedbackId: int("master_feedback_id")
      .notNull()
      .references(() => masterFeedback.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    summaryUnique: uniqueIndex("page_feedback_summary_unique").on(table.summaryId),
  }),
);
