import { Router } from "express";
import { db } from "@workspace/db";
import { proformaInvoicesTable, clientsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

const PINV_COLS = {
  id: proformaInvoicesTable.id,
  number: proformaInvoicesTable.number,
  clientId: proformaInvoicesTable.clientId,
  clientName: clientsTable.companyName,
  status: proformaInvoicesTable.status,
  invoiceDate: proformaInvoicesTable.invoiceDate,
  dueDate: proformaInvoicesTable.dueDate,
  companyGstin: proformaInvoicesTable.companyGstin,
  clientGstin: proformaInvoicesTable.clientGstin,
  billingAddress: proformaInvoicesTable.billingAddress,
  shippingAddress: proformaInvoicesTable.shippingAddress,
  subtotal: proformaInvoicesTable.subtotal,
  taxAmount: proformaInvoicesTable.taxAmount,
  total: proformaInvoicesTable.total,
  notes: proformaInvoicesTable.notes,
  termsAndConditions: proformaInvoicesTable.termsAndConditions,
  bankDetails: proformaInvoicesTable.bankDetails,
  lineItems: proformaInvoicesTable.lineItems,
  createdAt: proformaInvoicesTable.createdAt,
};

async function nextNumber() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(proformaInvoicesTable);
  return `PINV-${1001 + Number(count)}`;
}

router.get("/", asyncHandler(async (req, res) => {
  const rows = await db
    .select(PINV_COLS)
    .from(proformaInvoicesTable)
    .leftJoin(clientsTable, eq(proformaInvoicesTable.clientId, clientsTable.id));
  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.clientId) body.clientId = null;
  if (!body.number) body.number = await nextNumber();
  const [row] = await db.insert(proformaInvoicesTable).values(body).returning();
  return res.status(201).json(row);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const [row] = await db
    .select(PINV_COLS)
    .from(proformaInvoicesTable)
    .leftJoin(clientsTable, eq(proformaInvoicesTable.clientId, clientsTable.id))
    .where(eq(proformaInvoicesTable.id, req.params.id));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (body.clientId === "") body.clientId = null;
  const [row] = await db
    .update(proformaInvoicesTable)
    .set(body)
    .where(eq(proformaInvoicesTable.id, req.params.id))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(proformaInvoicesTable).where(eq(proformaInvoicesTable.id, req.params.id));
  return res.status(204).send();
}));

export default router;
