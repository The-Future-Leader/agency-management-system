import { Router } from "express";
import { db } from "@workspace/db";
import { deliveryChallansTable, clientsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

const DC_COLS = {
  id: deliveryChallansTable.id,
  number: deliveryChallansTable.number,
  clientId: deliveryChallansTable.clientId,
  clientName: clientsTable.companyName,
  status: deliveryChallansTable.status,
  challanDate: deliveryChallansTable.challanDate,
  companyGstin: deliveryChallansTable.companyGstin,
  clientGstin: deliveryChallansTable.clientGstin,
  shippingAddress: deliveryChallansTable.shippingAddress,
  vehicleNumber: deliveryChallansTable.vehicleNumber,
  dispatchMode: deliveryChallansTable.dispatchMode,
  notes: deliveryChallansTable.notes,
  termsAndConditions: deliveryChallansTable.termsAndConditions,
  lineItems: deliveryChallansTable.lineItems,
  createdAt: deliveryChallansTable.createdAt,
};

async function nextNumber() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(deliveryChallansTable);
  return `DC-${1001 + Number(count)}`;
}

router.get("/", asyncHandler(async (req, res) => {
  const rows = await db
    .select(DC_COLS)
    .from(deliveryChallansTable)
    .leftJoin(clientsTable, eq(deliveryChallansTable.clientId, clientsTable.id));
  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.clientId) body.clientId = null;
  if (!body.number) body.number = await nextNumber();
  const [row] = await db.insert(deliveryChallansTable).values(body).returning();
  return res.status(201).json(row);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const [row] = await db
    .select(DC_COLS)
    .from(deliveryChallansTable)
    .leftJoin(clientsTable, eq(deliveryChallansTable.clientId, clientsTable.id))
    .where(eq(deliveryChallansTable.id, req.params.id));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (body.clientId === "") body.clientId = null;
  const [row] = await db
    .update(deliveryChallansTable)
    .set(body)
    .where(eq(deliveryChallansTable.id, req.params.id))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(deliveryChallansTable).where(eq(deliveryChallansTable.id, req.params.id));
  return res.status(204).send();
}));

export default router;
