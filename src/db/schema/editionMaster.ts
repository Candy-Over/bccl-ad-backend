import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core";

export const editionMaster = mysqlTable("edition_master", {
    id: int("id").autoincrement().primaryKey(),
    object: varchar("object", { length: 50 }).notNull(),
    edition: varchar("edition", { length: 50 }).notNull(),
    editionLongName: varchar("edition_long_name", { length: 255 }),
    city: varchar("city", { length: 100 }),
    status: varchar("status", {length: 10}),
    publication: varchar("publication", { length: 50 }),
});
