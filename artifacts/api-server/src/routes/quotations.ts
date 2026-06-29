import { Router } from "express";
import { db } from "@workspace/db";
import { quotationsTable, invoicesTable, clientsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

async function generateQuotationNumber(): Promise<string> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(quotationsTable);
  const n = (Number(count) + 1).toString().padStart(5, "0");
  return `QT-${n}`;
}

router.get("/", asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      id: quotationsTable.id,
      number: quotationsTable.number,
      clientId: quotationsTable.clientId,
      joinedClientName: clientsTable.companyName,
      status: quotationsTable.status,
      quotationDate: quotationsTable.quotationDate,
      validUntil: quotationsTable.validUntil,
      dueDate: quotationsTable.dueDate,
      currency: quotationsTable.currency,
      companyName: quotationsTable.companyName,
      companyPhone: quotationsTable.companyPhone,
      companyGstin: quotationsTable.companyGstin,
      companyAddress: quotationsTable.companyAddress,
      companyCity: quotationsTable.companyCity,
      companyPostal: quotationsTable.companyPostal,
      companyState: quotationsTable.companyState,
      companyEmail: quotationsTable.companyEmail,
      companyPan: quotationsTable.companyPan,
      logoUrl: quotationsTable.logoUrl,
      clientName: quotationsTable.clientName,
      clientPhone: quotationsTable.clientPhone,
      clientGstin: quotationsTable.clientGstin,
      clientAddress: quotationsTable.clientAddress,
      clientCity: quotationsTable.clientCity,
      clientPostal: quotationsTable.clientPostal,
      clientState: quotationsTable.clientState,
      clientEmail: quotationsTable.clientEmail,
      clientPan: quotationsTable.clientPan,
      billingAddress: quotationsTable.billingAddress,
      shippingAddress: quotationsTable.shippingAddress,
      lineItems: quotationsTable.lineItems,
      subtotal: quotationsTable.subtotal,
      taxAmount: quotationsTable.taxAmount,
      discount: quotationsTable.discount,
      discountType: quotationsTable.discountType,
      total: quotationsTable.total,
      notes: quotationsTable.notes,
      termsAndConditions: quotationsTable.termsAndConditions,
      signatureText: quotationsTable.signatureText,
      bankDetails: quotationsTable.bankDetails,
      createdAt: quotationsTable.createdAt,
    })
    .from(quotationsTable)
    .leftJoin(clientsTable, eq(quotationsTable.clientId, clientsTable.id));

  return res.json(rows.map((r) => ({ ...r, clientName: r.clientName || r.joinedClientName || null })));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const [row] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.clientId) body.clientId = null;
  if (!body.number) body.number = await generateQuotationNumber();
  const [row] = await db.insert(quotationsTable).values(body).returning();
  return res.status(201).json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (body.clientId === "") body.clientId = null;
  const [row] = await db
    .update(quotationsTable)
    .set(body)
    .where(eq(quotationsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(quotationsTable).where(eq(quotationsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

router.post("/:id/convert-to-invoice", asyncHandler(async (req, res) => {
  const [quot] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, (req.params.id as string)));
  if (!quot) throw createError("Quotation not found", 404);

  const existing = await db.select({ number: invoicesTable.number }).from(invoicesTable);
  const nums = existing
    .map((r) => r.number)
    .filter((n): n is string => !!n && n.startsWith("INV-"))
    .map((n) => parseInt(n.replace("INV-", ""), 10))
    .filter((n) => !isNaN(n));
  const nextNum = `INV-${nums.length > 0 ? Math.max(...nums) + 1 : 1001}`;

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      number: nextNum,
      clientId: quot.clientId,
      status: "DRAFT",
      subtotal: quot.subtotal,
      taxAmount: quot.taxAmount,
      total: quot.total,
      notes: quot.notes,
      companyGstin: quot.companyGstin,
      clientGstin: quot.clientGstin,
      billingAddress: quot.billingAddress,
      shippingAddress: quot.shippingAddress,
      termsAndConditions: quot.termsAndConditions,
      bankDetails: quot.bankDetails as unknown as typeof invoicesTable.$inferInsert["bankDetails"],
      lineItems: quot.lineItems as unknown as typeof invoicesTable.$inferInsert["lineItems"],
    })
    .returning();

  await db.update(quotationsTable).set({ status: "APPROVED" }).where(eq(quotationsTable.id, (req.params.id as string)));

  return res.status(201).json(invoice);
}));

export default router;
