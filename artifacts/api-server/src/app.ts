import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import publicRouter from "./routes/publicCalendar";
import { errorHandler, createError } from "./middleware/errorHandler";
import { db } from "@workspace/db";
import { proposalsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", express.static(uploadsDir));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/public", publicRouter);
app.use("/api/auth", authLimiter);
app.use("/api", router);

app.get("/sign/:token", async (req, res) => {
  const token = req.params.token;
  const [proposal] = await db.select().from(proposalsTable).where(eq(proposalsTable.signToken, token));
  if (!proposal) {
    res.status(404).send("Proposal not found");
    return;
  }
  res.type("html").send(`<!doctype html><html><body><h1>Proposal signing</h1><p>Proposal: ${proposal.title ?? proposal.id}</p><p>Status: ${proposal.status ?? "DRAFT"}</p><form method="post" action="/api/proposals/${proposal.id}/sign"><button type="submit">Sign proposal</button></form></body></html>`);
});

if (process.env.SERVE_STATIC === "true") {
  const publicDir = path.resolve(__dirname, "../../agency-os/dist/public");
  app.use(express.static(publicDir));
  app.get("*all", (req, res) => {
    res.sendFile(path.resolve(publicDir, "index.html"));
  });
}

app.use(errorHandler);

export default app;
