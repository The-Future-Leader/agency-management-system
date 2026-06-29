import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, invoicesTable } from "@workspace/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const { search, category } = req.query as Record<string, string>;

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

  const rows = await db
    .select()
    .from(clientsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  return res.json(rows);
}));

router.post("/", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
  const [row] = await db.insert(clientsTable).values(body).returning();
  return res.status(201).json(row);
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const [row] = await db.select().from(clientsTable).where(eq(clientsTable.id, (req.params.id as string)));
  if (!row) throw createError("Not found", 404);
  return res.json(row);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const { id: _id, createdAt: _ts, ...body } = req.body;
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
