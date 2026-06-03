"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, logAudit } from "@/lib/access";
import { proposalSchema, type ActionResult } from "@/lib/validations";

export async function createProposal(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "create");
    const parsed = proposalSchema.safeParse({
      clientId: formData.get("clientId"),
      title: formData.get("title"),
      templateKey: formData.get("templateKey") || undefined,
      status: formData.get("status"),
      subtotal: formData.get("subtotal"),
      discount: formData.get("discount") || 0,
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const discount = parsed.data.discount ?? 0;
    const total = parsed.data.subtotal - discount;

    const proposal = await prisma.proposal.create({
      data: {
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        templateKey: parsed.data.templateKey,
        status: parsed.data.status,
        subtotal: parsed.data.subtotal,
        discount,
        total: Math.max(0, total),
      },
    });

    if (parsed.data.status === "APPROVED") {
      await prisma.agreement.create({
        data: {
          clientId: parsed.data.clientId,
          proposalId: proposal.id,
          title: `${parsed.data.title} — Agreement`,
          content: `Agreement generated from proposal "${parsed.data.title}". Total: ₹${total}`,
          status: "DRAFT",
        },
      });
    }

    await logAudit(user.id, "CREATE", "Proposal", proposal.id);
    revalidatePath("/finance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create proposal" };
  }
}

export async function updateProposalStatus(
  id: string,
  status: string
): Promise<ActionResult> {
  try {
    const user = await requirePermission("finance", "edit");
    const proposal = await prisma.proposal.update({
      where: { id },
      data: { status: status as "DRAFT" },
    });

    if (status === "APPROVED") {
      const existing = await prisma.agreement.findFirst({
        where: { proposalId: id },
      });
      if (!existing) {
        await prisma.agreement.create({
          data: {
            clientId: proposal.clientId,
            proposalId: id,
            title: `${proposal.title} — Agreement`,
            content: `Agreement for ${proposal.title}. Amount: ₹${proposal.total}`,
            status: "DRAFT",
          },
        });
      }
    }

    await logAudit(user.id, "UPDATE_STATUS", "Proposal", id, { status });
    revalidatePath("/finance");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update proposal" };
  }
}
