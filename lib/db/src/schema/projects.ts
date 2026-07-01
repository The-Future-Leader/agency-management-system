import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  status: text("status").default("NOT_STARTED"),
  priority: text("priority").default("MEDIUM"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  description: text("description"),
  budget: real("budget"),
  currency: text("currency").default("INR"),
  budgetSpent: real("budget_spent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
