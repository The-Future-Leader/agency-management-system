import { Router } from "express";
import { db } from "@workspace/db";
import { proposalsTable, clientsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      id: proposalsTable.id,
      title: proposalsTable.title,
      clientId: proposalsTable.clientId,
      clientName: clientsTable.companyName,
      status: proposalsTable.status,
      template: proposalsTable.template,
      value: proposalsTable.value,
      validUntil: proposalsTable.validUntil,
      scope: proposalsTable.scope,
      deliverables: proposalsTable.deliverables,
      timeline: proposalsTable.timeline,
      notes: proposalsTable.notes,
      createdAt: proposalsTable.createdAt,
    })
    .from(proposalsTable)
    .leftJoin(clientsTable, eq(proposalsTable.clientId, clientsTable.id));
  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.clientId) body.clientId = null;
  const signTokenValue = body.signToken ?? crypto.randomUUID();
  const [row] = await db.insert(proposalsTable).values({ ...body, signToken: signTokenValue }).returning();
  return res.status(201).json({ ...row, signToken: signTokenValue });
}));

router.post("/:id/sign", asyncHandler(async (req, res) => {
  const [row] = await db.select().from(proposalsTable).where(eq(proposalsTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  const signedAt = new Date();
  const [updated] = await db.update(proposalsTable).set({ status: "SIGNED", signToken: null, signedAt }).where(eq(proposalsTable.id, row.id)).returning();
  return res.json(updated);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (body.clientId === "") body.clientId = null;
  const [row] = await db
    .update(proposalsTable)
    .set(body)
    .where(eq(proposalsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(proposalsTable).where(eq(proposalsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

export default router;
