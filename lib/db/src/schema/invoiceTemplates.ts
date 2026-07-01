import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const invoiceTemplatesTable = pgTable("invoice_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  description: text("description"),
  amount: real("amount").default(0),
  currency: text("currency").default("INR"),
  frequency: text("frequency").default("MONTHLY"),
  nextRunAt: timestamp("next_run_at").defaultNow(),
  lastRunAt: timestamp("last_run_at"),
  status: text("status").default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceTemplateSchema = createInsertSchema(invoiceTemplatesTable).omit({ id: true, createdAt: true });
export type InsertInvoiceTemplate = z.infer<typeof insertInvoiceTemplateSchema>;
export type InvoiceTemplate = typeof invoiceTemplatesTable.$inferSelect;
