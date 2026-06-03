"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { invoiceSchema, type ActionResult } from "@/lib/validations";

export async function createInvoice(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "create");
    const parsed = invoiceSchema.safeParse({
      clientId: formData.get("clientId"),
      projectId: formData.get("projectId") || undefined,
      status: formData.get("status"),
      currency: formData.get("currency"),
      subtotal: formData.get("subtotal"),
      gstRate: formData.get("gstRate"),
      dueDate: formData.get("dueDate") || undefined,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const gstAmount = (parsed.data.subtotal * parsed.data.gstRate) / 100;
    const total = parsed.data.subtotal + gstAmount;
    const number = `BB-INV-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

    await prisma.invoice.create({
      data: {
        number,
        clientId: parsed.data.clientId,
        projectId: parsed.data.projectId || null,
        status: parsed.data.status,
        currency: parsed.data.currency,
        subtotal: parsed.data.subtotal,
        gstRate: parsed.data.gstRate,
        gstAmount,
        total,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        lineItems: {
          create: {
            description: formData.get("lineDescription")?.toString() || "Services",
            quantity: 1,
            rate: parsed.data.subtotal,
            gstRate: parsed.data.gstRate,
            amount: parsed.data.subtotal,
          },
        },
      },
    });

    await logAudit(user.id, "CREATE", "Invoice", number);
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create invoice" };
  }
}

export async function markInvoicePaid(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "edit");
    await prisma.invoice.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() },
    });
    await logAudit(user.id, "PAID", "Invoice", id);
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update invoice" };
  }
}
