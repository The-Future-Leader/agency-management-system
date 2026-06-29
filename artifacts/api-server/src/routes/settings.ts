import { Router } from "express";
import { db } from "@workspace/db";
import { agencySettings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

const DEFAULT_SETTINGS = {
  id: "default",
  agencyName: "Blink Beyond",
  primaryColor: "#6366f1",
  currency: "INR",
  taxLabel: "GST",
  taxPercent: 18,
  workDayStart: "09:00",
  workDayEnd: "18:00",
};

async function ensureSettings() {
  let settings = await db.query.agencySettings.findFirst({ where: eq(agencySettings.id, "default") });
  if (!settings) {
    const [created] = await db.insert(agencySettings).values(DEFAULT_SETTINGS).returning();
    settings = created;
  }
  return settings;
}

router.get("/settings", requireAuth, asyncHandler(async (_req, res) => {
  const settings = await ensureSettings();
  return res.json({ ...settings, updatedAt: settings.updatedAt?.toISOString() ?? null });
}));

router.patch("/settings", requireAuth, asyncHandler(async (req, res) => {
  await ensureSettings();
  const { id: _id, ...body } = req.body;
  const [updated] = await db.update(agencySettings)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(agencySettings.id, "default"))
    .returning();
  return res.json({ ...updated, updatedAt: updated.updatedAt?.toISOString() ?? null });
}));

export default router;
