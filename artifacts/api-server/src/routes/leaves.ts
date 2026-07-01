import { Router } from "express";
import { db } from "@workspace/db";
import { leaveRequests, users } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/leaves", requireAuth, asyncHandler(async (req, res) => {
  const { userId, status } = req.query as Record<string, string>;
  const conditions = [];
  if (userId) conditions.push(eq(leaveRequests.userId, userId));
  if (status) conditions.push(eq(leaveRequests.status, status as any));

  const [allLeaves, allUsers] = await Promise.all([
    db.select().from(leaveRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`created_at desc`),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);

  const userMap: Record<string, string> = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

  return res.json(allLeaves.map((l) => ({
    ...l,
    userName: userMap[l.userId] ?? null,
    createdAt: l.createdAt?.toISOString() ?? null,
  })));
}));

router.post("/leaves", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const { type, startDate, endDate, reason } = req.body;
  if (!type || !startDate || !endDate) throw createError("type, startDate, and endDate are required", 400);

  const [leave] = await db.insert(leaveRequests).values({
    id: crypto.randomUUID(),
    userId,
    type,
    startDate,
    endDate,
    reason: reason ?? null,
    status: "PENDING",
  }).returning();

  return res.status(201).json({ ...leave, userName: user.name, createdAt: leave.createdAt?.toISOString() ?? null });
}));

router.post("/leaves/:id/approve", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [updated] = await db.update(leaveRequests)
    .set({ status: "APPROVED", reviewedBy: userId })
    .where(eq(leaveRequests.id, (req.params.id as string)))
    .returning();
  if (!updated) throw createError("Not found", 404);
  return res.json({ ...updated, createdAt: updated.createdAt?.toISOString() ?? null });
}));

router.post("/leaves/:id/reject", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [updated] = await db.update(leaveRequests)
    .set({ status: "REJECTED", reviewedBy: userId })
    .where(eq(leaveRequests.id, (req.params.id as string)))
    .returning();
  if (!updated) throw createError("Not found", 404);
  return res.json({ ...updated, createdAt: updated.createdAt?.toISOString() ?? null });
}));

// GET /api/leaves/balance?userId=&year=
router.get("/leaves/balance", requireAuth, asyncHandler(async (req, res) => {
  const { userId, year } = req.query as Record<string, string>;
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
  const targetUserId = userId || (req as any).userId;
  if (!targetUserId) throw createError("userId is required", 400);

  const result = await db.execute(
    `SELECT * FROM leave_balances WHERE user_id = $1 AND year = $2`,
    [targetUserId, targetYear]
  );
  const rows = result.rows ?? result;
  if (rows.length === 0) {
    // Return default balance if no row exists yet
    return res.json({
      userId: targetUserId, year: targetYear,
      casualTotal: 12, casualUsed: 0,
      sickTotal: 6, sickUsed: 0,
      earnedTotal: 15, earnedUsed: 0,
    });
  }
  return res.json(rows[0]);
}));

export default router;
