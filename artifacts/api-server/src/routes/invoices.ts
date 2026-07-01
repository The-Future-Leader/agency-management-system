import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, clientsTable, invoiceTemplatesTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/financial-summary", asyncHandler(async (req, res) => {
  const [
    [{ totalRevenue, paidCount }],
    [{ outstanding }],
    [{ overdue }],
    [{ invoiceCount }],
  ] = await Promise.all([
    db.select({ totalRevenue: sql<number>`coalesce(sum(total),0)::float`, paidCount: sql<number>`count(*)::int` }).from(invoicesTable).where(eq(invoicesTable.status, "PAID")),
    db.select({ outstanding: sql<number>`coalesce(sum(total),0)::float` }).from(invoicesTable).where(sql`status in ('SENT','VIEWED')`),
    db.select({ overdue: sql<number>`coalesce(sum(total),0)::float` }).from(invoicesTable).where(eq(invoicesTable.status, "OVERDUE")),
    db.select({ invoiceCount: sql<number>`count(*)::int` }).from(invoicesTable),
  ]);
  return res.json({ totalRevenue, outstanding, overdue, paidCount, invoiceCount });
}));

router.get("/", asyncHandler(async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;
  const [rows, [{ total }]] = await Promise.all([
    db
    .select({
      id: invoicesTable.id,
      number: invoicesTable.number,
      clientId: invoicesTable.clientId,
      clientName: clientsTable.companyName,
      status: invoicesTable.status,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
      currency: invoicesTable.currency,
      subtotal: invoicesTable.subtotal,
      taxAmount: invoicesTable.taxAmount,
      discount: invoicesTable.discount,
      total: invoicesTable.total,
      lineItems: invoicesTable.lineItems,
      notes: invoicesTable.notes,
      termsAndConditions: invoicesTable.termsAndConditions,
      companyGstin: invoicesTable.companyGstin,
      clientGstin: invoicesTable.clientGstin,
      billingAddress: invoicesTable.billingAddress,
      shippingAddress: invoicesTable.shippingAddress,
      bankDetails: invoicesTable.bankDetails,
      logoUrl: invoicesTable.logoUrl,
      businessName: invoicesTable.businessName,
      businessPhone: invoicesTable.businessPhone,
      businessEmail: invoicesTable.businessEmail,
      businessPan: invoicesTable.businessPan,
      businessAddress: invoicesTable.businessAddress,
      businessCity: invoicesTable.businessCity,
      businessPostalCode: invoicesTable.businessPostalCode,
      businessState: invoicesTable.businessState,
      clientPhone: invoicesTable.clientPhone,
      clientEmail: invoicesTable.clientEmail,
      clientPan: invoicesTable.clientPan,
      clientCity: invoicesTable.clientCity,
      clientPostalCode: invoicesTable.clientPostalCode,
      clientState: invoicesTable.clientState,
      gstType: invoicesTable.gstType,
      signatureUrl: invoicesTable.signatureUrl,
      discountType: invoicesTable.discountType,
    })
    .from(invoicesTable)
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .orderBy(desc(invoicesTable.createdAt))
    .limit(limitNum)
    .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(invoicesTable),
  ]);
  return res.json({ items: rows, page: pageNum, limit: limitNum, total });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.clientId) body.clientId = null;
  if (typeof body.total !== "undefined" && typeof body.total !== "number") throw createError("total must be a number", 400);
  if (!body.clientId) body.clientId = null;
  if (!body.number) {
    const existing = await db.select({ number: invoicesTable.number }).from(invoicesTable);
    const nums = existing
      .map((r) => r.number)
      .filter((n): n is string => !!n && n.startsWith("INV-"))
      .map((n) => parseInt(n.replace("INV-", ""), 10))
      .filter((n) => !isNaN(n));
    body.number = `INV-${nums.length > 0 ? Math.max(...nums) + 1 : 1001}`;
  }
  const [row] = await db.insert(invoicesTable).values(body).returning();
  return res.status(201).json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (body.clientId === "") body.clientId = null;
  if (body.total && typeof body.total !== "number") throw createError("total must be a number", 400);
  if (body.clientId === "") body.clientId = null;
  const [row] = await db
    .update(invoicesTable)
    .set(body)
    .where(eq(invoicesTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.post("/:id/send-email", asyncHandler(async (req, res) => {
  const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  const sentAt = new Date();
  const [updated] = await db.update(invoicesTable).set({ status: "SENT", sentAt }).where(eq(invoicesTable.id, row.id)).returning();
  return res.json({ ...updated, sentAt: sentAt.toISOString() });
}));

router.post("/recurring/run", asyncHandler(async (_req, res) => {
  const templates = await db.select().from(invoiceTemplatesTable).where(eq(invoiceTemplatesTable.status, "ACTIVE"));
  for (const template of templates) {
    const next = template.nextRunAt ? new Date(template.nextRunAt) : new Date();
    if (next > new Date()) continue;
    const [row] = await db.insert(invoicesTable).values({
      id: crypto.randomUUID(),
      clientId: template.clientId,
      number: `INV-${Date.now()}`,
      status: "DRAFT",
      total: template.amount ?? 0,
      currency: template.currency ?? "INR",
      notes: template.description ?? null,
    }).returning();
    await db.update(invoiceTemplatesTable).set({ lastRunAt: new Date(), nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }).where(eq(invoiceTemplatesTable.id, template.id));
    if (row) { }
  }
  return res.json({ created: templates.length });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(invoicesTable).where(eq(invoicesTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

export default router;
