import { Router } from "express";
import { db } from "@workspace/db";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

// GET /api/attachments?entityType=task&entityId=xxx
router.get("/", asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query as Record<string, string>;
  if (!entityType || !entityId) throw createError("entityType and entityId are required", 400);

  const result = await db.execute(
    `SELECT * FROM file_attachments WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return res.json(result.rows ?? result);
}));

// POST /api/attachments
router.post("/", asyncHandler(async (req, res) => {
  const { entityType, entityId, filename, url } = req.body as {
    entityType: string;
    entityId: string;
    filename: string;
    url: string;
  };
  if (!entityType || !entityId || !filename || !url) {
    throw createError("entityType, entityId, filename, and url are required", 400);
  }

  const uploadedBy = (req as any).user?.id ?? null;

  const result = await db.execute(
    `INSERT INTO file_attachments (id, entity_type, entity_id, filename, url, uploaded_by)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)
     RETURNING *`,
    [entityType, entityId, filename, url, uploadedBy]
  );
  const row = (result.rows ?? result)[0];
  return res.status(201).json(row);
}));

// DELETE /api/attachments/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  await db.execute(
    `DELETE FROM file_attachments WHERE id = $1`,
    [req.params.id]
  );
  return res.status(204).send();
}));

export default router;
