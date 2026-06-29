import { Router } from "express";
import { db } from "@workspace/db";
import { clientSocialAccountsTable, contentPostsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const { clientId } = req.query as { clientId?: string };
  const rows = clientId
    ? await db.select().from(clientSocialAccountsTable).where(eq(clientSocialAccountsTable.clientId, clientId))
    : await db.select().from(clientSocialAccountsTable);
  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { clientId, platform, handle, pageId, profileUrl, accessToken } = req.body;
  if (!clientId || !platform) throw createError("clientId and platform are required", 400);
  const [row] = await db
    .insert(clientSocialAccountsTable)
    .values({ clientId, platform, handle, pageId, profileUrl, accessToken })
    .returning();
  return res.status(201).json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { handle, pageId, profileUrl, accessToken, isActive } = req.body;
  const [row] = await db
    .update(clientSocialAccountsTable)
    .set({ handle, pageId, profileUrl, accessToken, isActive })
    .where(eq(clientSocialAccountsTable.id, req.params.id))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(clientSocialAccountsTable).where(eq(clientSocialAccountsTable.id, req.params.id));
  return res.status(204).send();
}));

router.post("/ignite", asyncHandler(async (req, res) => {
  const { clientId, caption, platforms, scheduledAt, title, assetsLink } = req.body as {
    clientId: string;
    caption: string;
    platforms: string[];
    scheduledAt?: string;
    title?: string;
    assetsLink?: string;
  };
  if (!clientId || !caption || !platforms?.length) {
    throw createError("clientId, caption and platforms required", 400);
  }
  const rows = await db
    .insert(contentPostsTable)
    .values(
      platforms.map((platform) => ({
        clientId,
        platform,
        caption,
        title: title || undefined,
        scheduledAt: scheduledAt || undefined,
        assetsLink: assetsLink || undefined,
        status: "SCHEDULED",
        contentType: "POST",
      })),
    )
    .returning();
  return res.status(201).json({ created: rows.length, posts: rows });
}));

export default router;
