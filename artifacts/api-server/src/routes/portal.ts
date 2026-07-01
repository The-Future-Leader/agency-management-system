import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { asyncHandler } from "../lib/asyncHandler";
import { createError } from "../middleware/errorHandler";
import { signToken, verifyToken } from "../lib/jwt";

const router = Router();

router.use(async (req: any, res: any, next: any) => {
  if (req.path === "/login") return next();
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, clientId: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

export async function portalAuthMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization || "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, clientId: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) throw createError("Email and password are required", 400);

  const [row] = await db.execute(`SELECT * FROM client_users WHERE email = $1`, [email]);
  const user = (row?.rows?.[0] ?? row?.[0] ?? null) as any;
  if (!user) throw createError("Invalid credentials", 401);

  const valid = await compare(password, user.password_hash);
  if (!valid) throw createError("Invalid credentials", 401);

  const token = signToken(user.id);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, clientId: user.client_id } });
}));

router.get("/me", asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw createError("Unauthorized", 401);
  const payload = (req as any).user ?? null;
  if (!payload) throw createError("Unauthorized", 401);
  const [client] = await db.select({ id: clientsTable.id, companyName: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, (payload.clientId ?? payload.user?.clientId)));
  return res.json({ user: payload, client });
}));

export default router;
