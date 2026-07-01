import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

const STAGES = ["LEAD", "CONTACTED", "DEMO_GIVEN", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];

router.get("/", asyncHandler(async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(leadsTable).limit(limitNum).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(leadsTable),
  ]);
  const now = Date.now();
  const result = rows.map((lead) => ({
    ...lead,
    daysInStage: lead.stageChangedAt
      ? Math.floor((now - new Date(lead.stageChangedAt).getTime()) / 86400000)
      : 0,
  }));
  return res.json({ items: result, page: pageNum, limit: limitNum, total });
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

router.get("/forecast", asyncHandler(async (_req, res) => {
  const [stageRows, monthlyRows] = await Promise.all([
    db.execute(`
      SELECT
        stage,
        COUNT(*)::int AS count,
        COALESCE(SUM(CASE WHEN value IS NULL THEN 0 ELSE value * COALESCE(probability, 0) END), 0)::float AS weighted_value,
        COALESCE(SUM(CASE WHEN value IS NULL THEN 0 ELSE value END), 0)::float AS total_value
      FROM leads
      GROUP BY stage
    `),
    db.execute(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::int AS count,
        COALESCE(SUM(CASE WHEN value IS NULL THEN 0 ELSE value * COALESCE(probability, 0) END), 0)::float AS weighted_value
      FROM leads
      WHERE created_at IS NOT NULL
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `),
  ]);

  const byStage = STAGES.map((stage) => {
    const row = (stageRows.rows ?? stageRows).find((item: any) => item.stage === stage);
    return {
      stage,
      count: Number(row?.count ?? 0),
      weightedValue: Number(row?.weighted_value ?? 0),
      totalValue: Number(row?.total_value ?? 0),
    };
  });

  const monthly = (monthlyRows.rows ?? monthlyRows).map((row: any) => ({
    month: row.month,
    count: Number(row.count),
    weightedValue: Number(row.weighted_value),
  }));

  return res.json({ byStage, monthly });
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
    .where(eq(leadsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(leadsTable).where(eq(leadsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

export default router;
