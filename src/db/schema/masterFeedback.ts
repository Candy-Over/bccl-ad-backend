import { int, mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core";

export const masterFeedback = mysqlTable("master_feedback", {
    id: int("id").autoincrement().primaryKey(),
    feedbackText: varchar("feedback_text", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
