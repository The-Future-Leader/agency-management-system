import { z } from "zod/v4";
import { createError } from "../middleware/errorHandler";

export function validateBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    throw createError(`Validation failed: ${details}`, 400);
  }
  return result.data;
}
