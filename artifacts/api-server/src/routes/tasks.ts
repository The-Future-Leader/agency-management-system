import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, projectsTable, usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;
  const [rows, [{ total }]] = await Promise.all([
    db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
      projectName: projectsTable.name,
      assigneeId: tasksTable.assigneeId,
      assigneeName: usersTable.name,
      dueDate: tasksTable.dueDate,
      description: tasksTable.description,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .limit(limitNum)
    .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(tasksTable),
  ]);
  return res.json({ items: rows, page: pageNum, limit: limitNum, total });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.projectId) body.projectId = null;
  if (!body.assigneeId) body.assigneeId = null;
  const [row] = await db.insert(tasksTable).values(body).returning();
  return res.status(201).json(row);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const [row] = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      projectId: tasksTable.projectId,
      projectName: projectsTable.name,
      assigneeId: tasksTable.assigneeId,
      assigneeName: usersTable.name,
      dueDate: tasksTable.dueDate,
      description: tasksTable.description,
    })
    .from(tasksTable)
    .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(eq(tasksTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (body.projectId === "") body.projectId = null;
  if (body.assigneeId === "") body.assigneeId = null;
  const [row] = await db
    .update(tasksTable)
    .set(body)
    .where(eq(tasksTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(tasksTable).where(eq(tasksTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

// ─── Subtasks ─────────────────────────────────────────────────

router.get("/:id/subtasks", asyncHandler(async (req, res) => {
  const result = await db.execute(
    `SELECT t.*, u.name as assignee_name FROM tasks t
     LEFT JOIN users u ON t.assignee_id = u.id
     WHERE t.parent_id = $1 ORDER BY t.created_at ASC`,
    [req.params.id]
  );
  return res.json(result.rows ?? result);
}));

export default router;
