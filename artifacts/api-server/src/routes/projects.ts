import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, clientsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      status: projectsTable.status,
      priority: projectsTable.priority,
      clientId: projectsTable.clientId,
      clientName: clientsTable.companyName,
      startDate: projectsTable.startDate,
      dueDate: projectsTable.dueDate,
      description: projectsTable.description,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id));
  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const [row] = await db.insert(projectsTable).values(body).returning();
  return res.status(201).json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const [row] = await db
    .update(projectsTable)
    .set(body)
    .where(eq(projectsTable.id, req.params.id))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(projectsTable).where(eq(projectsTable.id, req.params.id));
  return res.status(204).send();
}));

export default router;
