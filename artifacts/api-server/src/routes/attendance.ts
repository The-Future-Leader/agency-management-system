import { Router } from "express";
import { db } from "@workspace/db";
import { attendance, users } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/attendance", requireAuth, asyncHandler(async (req, res) => {
  const { userId, month } = req.query as Record<string, string>;
  const conditions = [];
  if (userId) conditions.push(eq(attendance.userId, userId));
  if (month) {
    const [year, mo] = month.split("-").map(Number);
    const start = new Date(year, mo - 1, 1).toISOString().slice(0, 10);
    const end = new Date(year, mo, 0).toISOString().slice(0, 10);
    conditions.push(sql`date >= ${start} AND date <= ${end}`);
  }

  const [records, allUsers] = await Promise.all([
    db.select().from(attendance)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`check_in_at desc`),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);

  const userMap: Record<string, string> = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));

  return res.json(records.map((r) => ({
    ...r,
    userName: userMap[r.userId] ?? null,
    checkInAt: r.checkInAt.toISOString(),
    checkOutAt: r.checkOutAt?.toISOString() ?? null,
  })));
}));

router.post("/attendance/check-in", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });
  if (existing) throw createError("Already checked in today", 400);

  const now = new Date();
  const workStart = new Date();
  workStart.setHours(9, 0, 0, 0);

  const [record] = await db.insert(attendance).values({
    id: crypto.randomUUID(),
    userId,
    checkInAt: now,
    isLate: now > workStart,
    date: today,
  }).returning();

  return res.json({
    ...record,
    userName: user.name,
    checkInAt: record.checkInAt.toISOString(),
    checkOutAt: null,
  });
}));

router.post("/attendance/check-out", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId));
  if (!user) throw createError("Unauthorized", 401);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });
  if (!existing) throw createError("No check-in found for today", 400);
  if (existing.checkOutAt) throw createError("Already checked out", 400);

  const now = new Date();
  const workEnd = new Date();
  workEnd.setHours(18, 0, 0, 0);
  const overtimeMin = Math.max(0, Math.floor((now.getTime() - workEnd.getTime()) / 60000));

  const [updated] = await db.update(attendance)
    .set({ checkOutAt: now, overtimeMin })
    .where(eq(attendance.id, existing.id))
    .returning();

  return res.json({
    ...updated,
    userName: user.name,
    checkInAt: updated.checkInAt.toISOString(),
    checkOutAt: updated.checkOutAt?.toISOString() ?? null,
  });
}));

router.get("/attendance/today", requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  const today = new Date().toISOString().slice(0, 10);
  const record = await db.query.attendance.findFirst({
    where: and(eq(attendance.userId, userId), eq(attendance.date, today)),
  });
  return res.json({
    checkedIn: !!record,
    checkInAt: record?.checkInAt?.toISOString() ?? null,
    checkOutAt: record?.checkOutAt?.toISOString() ?? null,
    attendanceId: record?.id ?? null,
  });
}));

export default router;
