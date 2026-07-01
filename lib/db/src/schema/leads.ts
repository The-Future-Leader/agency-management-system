import { pgTable, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("LEAD"),
  companyName: text("company_name"),
  contactName: text("contact_name"),
  email: text("email"),
  value: real("value"),
  probability: integer("probability").default(0),
  expectedCloseDate: text("expected_close_date"),
  source: text("source"),
  notes: text("notes"),
  stageChangedAt: timestamp("stage_changed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, stageChangedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
