import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, invoicesTable } from "@workspace/db/schema";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { validateBody } from "../lib/validation";
import { insertClientSchema } from "@workspace/db/schema";

function calcHealthScore(invoices: { status: string | null; dueDate: string | null }[]): string {
  const now = new Date();
  const overdueInvs = invoices.filter(inv => inv.status === "OVERDUE");
  const sentWithPastDue = invoices.filter(inv => {
    if (inv.status !== "SENT" || !inv.dueDate) return false;
    return new Date(inv.dueDate) < now;
  });
  const allProblematic = [...overdueInvs, ...sentWithPastDue];

  if (allProblematic.length === 0) return "GREEN";

  const maxDaysOverdue = Math.max(
    ...allProblematic.map(inv => {
      if (!inv.dueDate) return 0;
      return Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24));
    }),
  );

  const overdueRatio = allProblematic.length / Math.max(invoices.length, 1);

  if (maxDaysOverdue > 60 || overdueRatio > 0.5) return "RED";
  if (maxDaysOverdue > 15 || overdueRatio > 0.2) return "YELLOW";
  return "GREEN";
}

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const { search, category, page = "1", limit = "50" } = req.query as Record<string, string>;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(clientsTable.companyName, `%${search}%`),
        ilike(clientsTable.contactPerson, `%${search}%`),
      ),
    );
  }
  if (category) conditions.push(eq(clientsTable.category, category));

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(clientsTable).where(conditions.length ? and(...conditions) : undefined).limit(limitNum).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(clientsTable).where(conditions.length ? and(...conditions) : undefined),
  ]);

  return res.json({ items: rows, page: pageNum, limit: limitNum, total });
}));

router.post("/", asyncHandler(async (req, res) => {
  const body = validateBody(insertClientSchema, req.body);
  const [row] = await db.insert(clientsTable).values(body).returning();
  return res.status(201).json(row);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const body = validateBody(insertClientSchema.partial(), req.body);
  const [row] = await db
    .update(clientsTable)
    .set(body)
    .where(eq(clientsTable.id, (req.params.id as string)))
    .returning();
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  await db.delete(clientsTable).where(eq(clientsTable.id, (req.params.id as string)));
  return res.status(204).send();
}));

router.post("/:id/recalculate-health", asyncHandler(async (req, res) => {
  const clientId = req.params.id as string;
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) throw createError("Not found", 404);

  const invoices = await db
    .select({ status: invoicesTable.status, dueDate: invoicesTable.dueDate })
    .from(invoicesTable)
    .where(eq(invoicesTable.clientId, clientId));

  const health = calcHealthScore(invoices);
  const [updated] = await db
    .update(clientsTable)
    .set({ health })
    .where(eq(clientsTable.id, clientId))
    .returning();

  return res.json({ health, client: updated });
}));

router.get("/:id/contracts", asyncHandler(async (req, res) => {
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.clientId, (req.params.id as string)));
  const contracts = invoices.map((inv) => ({
    id: inv.id,
    title: `Invoice ${inv.number ?? inv.id.slice(0, 6)}`,
    status: inv.status,
    value: inv.total,
    startDate: inv.invoiceDate,
    endDate: inv.dueDate,
  }));
  return res.json(contracts);
}));

export default router;
