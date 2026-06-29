import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

const STAGES = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

router.get("/", asyncHandler(async (req, res) => {
  const rows = await db.select().from(leadsTable);
  const now = Date.now();
  const result = rows.map((lead) => ({
    ...lead,
    daysInStage: lead.stageChangedAt
      ? Math.floor((now - new Date(lead.stageChangedAt).getTime()) / 86400000)
      : 0,
  }));
  return res.json(result);
}));

router.get("/pipeline-summary", asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      stage: leadsTable.stage,
      count: sql<number>`count(*)::int`,
      totalValue: sql<number>`coalesce(sum(${leadsTable.value}), 0)::float`,
    })
    .from(leadsTable)
    .groupBy(leadsTable.stage);

  const map = Object.fromEntries(rows.map((r) => [r.stage, r]));
  const summary = STAGES.map((stage) => ({
    stage,
    count: map[stage]?.count ?? 0,
    totalValue: map[stage]?.totalValue ?? 0,
  }));
  return res.json(summary);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const [row] = await db
    .insert(leadsTable)
    .values({ ...body, stageChangedAt: new Date() })
    .returning();
  return res.status(201).json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const updates: Record<string, unknown> = { ...body };
  if (body.stage) updates.stageChangedAt = new Date();
  const [row] = await db
    .update(leadsTable)
    .set(updates)
    .where(eq(leadsTable.id, req.params.id))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(leadsTable).where(eq(leadsTable.id, req.params.id));
  return res.status(204).send();
}));

export default router;
