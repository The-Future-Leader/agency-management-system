import { Router } from "express";
import { db } from "@workspace/db";
import { contentPostsTable, clientsTable, clientCalendarSharesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

const CONTENT_COLUMNS = {
  id: contentPostsTable.id,
  platform: contentPostsTable.platform,
  contentType: contentPostsTable.contentType,
  status: contentPostsTable.status,
  caption: contentPostsTable.caption,
  description: contentPostsTable.description,
  referenceUrl: contentPostsTable.referenceUrl,
  assetsLink: contentPostsTable.assetsLink,
  scheduledAt: contentPostsTable.scheduledAt,
  shootDate: contentPostsTable.shootDate,
  clientId: contentPostsTable.clientId,
  clientName: clientsTable.companyName,
  title: contentPostsTable.title,
  script: contentPostsTable.script,
  ideation: contentPostsTable.ideation,
  format: contentPostsTable.format,
  needsRevision: contentPostsTable.needsRevision,
  referenceLinks: contentPostsTable.referenceLinks,
  customProperties: contentPostsTable.customProperties,
  comments: contentPostsTable.comments,
  createdAt: contentPostsTable.createdAt,
};

router.get("/", asyncHandler(async (req, res) => {
  const { clientId } = req.query as Record<string, string>;
  const rows = await db
    .select(CONTENT_COLUMNS)
    .from(contentPostsTable)
    .leftJoin(clientsTable, eq(contentPostsTable.clientId, clientsTable.id))
    .where(clientId ? eq(contentPostsTable.clientId, clientId) : undefined);
  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  if (!body.clientId) body.clientId = null;
  if (!body.referenceUrl) body.referenceUrl = null;
  if (!body.description) body.description = null;
  const [row] = await db.insert(contentPostsTable).values(body).returning();
  return res.status(201).json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const [row] = await db
    .update(contentPostsTable)
    .set(body)
    .where(eq(contentPostsTable.id, req.params.id))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(contentPostsTable).where(eq(contentPostsTable.id, req.params.id));
  return res.status(204).send();
}));

// ─── Share Calendar Routes ────────────────────────────────────

router.post("/shares", asyncHandler(async (req, res) => {
  const { clientId, label, expiresAt } = req.body;
  if (!clientId) throw createError("clientId is required", 400);
  const { randomUUID } = await import("crypto");
  const shareToken = randomUUID();

  const [share] = await db
    .insert(clientCalendarSharesTable)
    .values({
      clientId,
      shareToken,
      label: label ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  return res.status(201).json(share);
}));

router.get("/shares", asyncHandler(async (req, res) => {
  const { clientId } = req.query;
  const shares = await db
    .select()
    .from(clientCalendarSharesTable)
    .where(clientId ? eq(clientCalendarSharesTable.clientId, clientId as string) : undefined);
  return res.json(shares);
}));

export default router;
