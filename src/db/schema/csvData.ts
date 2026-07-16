import { mysqlTable, serial, varchar } from "drizzle-orm/mysql-core";

export const csvData = mysqlTable("csv_data", {
    id: serial("id").primaryKey(),
    c1: varchar("c1", { length: 255 }),
    c2: varchar("c2", { length: 255 }),
    c3: varchar("c3", { length: 255 }),
    c4: varchar("c4", { length: 255 }),
    c5: varchar("c5", { length: 255 }),
    c6: varchar("c6", { length: 255 }),
    c7: varchar("c7", { length: 255 }),
    c8: varchar("c8", { length: 255 }),
    c9: varchar("c9", { length: 255 }),
    c10: varchar("c10", { length: 255 }),
});
