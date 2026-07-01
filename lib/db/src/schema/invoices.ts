import { pgTable, text, real, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const invoicesTable = pgTable("invoices", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  number: text("number"),
  clientId: text("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  status: text("status").default("DRAFT"),
  invoiceDate: text("invoice_date"),
  dueDate: text("due_date"),

  // Business (your) details
  logoUrl: text("logo_url"),
  businessName: text("business_name"),
  businessPhone: text("business_phone"),
  businessEmail: text("business_email"),
  businessPan: text("business_pan"),
  companyGstin: text("company_gstin"),
  businessAddress: text("business_address"),
  businessCity: text("business_city"),
  businessPostalCode: text("business_postal_code"),
  businessState: text("business_state"),

  // Client details
  clientGstin: text("client_gstin"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientPan: text("client_pan"),
  billingAddress: text("billing_address"),
  clientCity: text("client_city"),
  clientPostalCode: text("client_postal_code"),
  clientState: text("client_state"),
  shippingAddress: text("shipping_address"),

  // Tax & currency
  currency: text("currency").default("INR"),
  gstType: text("gst_type").default("CGST_SGST"),

  // Financials
  subtotal: real("subtotal").default(0),
  taxAmount: real("tax_amount").default(0),
  discount: real("discount").default(0),
  discountType: text("discount_type").default("FIXED"),
  total: real("total").default(0),
  sentAt: timestamp("sent_at"),

  // Footer
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  signatureUrl: text("signature_url"),
  bankDetails: json("bank_details").$type<{ accountNumber?: string; ifsc?: string; bankName?: string; accountName?: string }>(),

  // Line items: description, hsnSac, qty, unitPrice, taxPercent (gst%)
  lineItems: json("line_items").$type<Array<{
    description: string;
    hsnSac?: string;
    qty: number;
    unitPrice: number;
    taxPercent: number;
  }>>(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
