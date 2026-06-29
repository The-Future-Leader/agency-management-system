import { Router } from "express";
import { db } from "@workspace/db";
import { purchaseOrdersTable, clientsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

const PO_COLS = {
  id: purchaseOrdersTable.id,
  number: purchaseOrdersTable.number,
  clientId: purchaseOrdersTable.clientId,
  clientName: clientsTable.companyName,
  status: purchaseOrdersTable.status,
  orderDate: purchaseOrdersTable.orderDate,
  deliveryDate: purchaseOrdersTable.deliveryDate,
  companyGstin: purchaseOrdersTable.companyGstin,
  vendorGstin: purchaseOrdersTable.vendorGstin,
  billingAddress: purchaseOrdersTable.billingAddress,
  shippingAddress: purchaseOrdersTable.shippingAddress,
  subtotal: purchaseOrdersTable.subtotal,
  taxAmount: purchaseOrdersTable.taxAmount,
  total: purchaseOrdersTable.total,
  notes: purchaseOrdersTable.notes,
  termsAndConditions: purchaseOrdersTable.termsAndConditions,
  lineItems: purchaseOrdersTable.lineItems,
  createdAt: purchaseOrdersTable.createdAt,
};

async function nextNumber() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrdersTable);
  return `PO-${1001 + Number(count)}`;
}

router.get("/", asyncHandler(async (req, res) => {
  const rows = await db
    .select(PO_COLS)
    .from(purchaseOrdersTable)
    .leftJoin(clientsTable, eq(purchaseOrdersTable.clientId, clientsTable.id));
  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.clientId) body.clientId = null;
  if (!body.number) body.number = await nextNumber();
  const [row] = await db.insert(purchaseOrdersTable).values(body).returning();
  return res.status(201).json(row);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const [row] = await db
    .select(PO_COLS)
    .from(purchaseOrdersTable)
    .leftJoin(clientsTable, eq(purchaseOrdersTable.clientId, clientsTable.id))
    .where(eq(purchaseOrdersTable.id, req.params.id));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (body.clientId === "") body.clientId = null;
  const [row] = await db
    .update(purchaseOrdersTable)
    .set(body)
    .where(eq(purchaseOrdersTable.id, req.params.id))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, req.params.id));
  return res.status(204).send();
}));

export default router;
