import { redirect } from "next/navigation";
import { getCurrentUser, canPerform } from "@/lib/access";
import { prisma } from "@/lib/db";
import { FinanceManager } from "@/components/finance/finance-manager";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [proposals, invoices, agreements, clients] = await Promise.all([
    prisma.proposal.findMany({
      include: { client: { select: { companyName: true, email: true, billingAddress: true, gstin: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      include: { client: { select: { companyName: true, email: true, billingAddress: true, gstin: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agreement.findMany({
      include: { client: { select: { companyName: true, email: true, billingAddress: true, gstin: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({ select: { id: true, companyName: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance & Billing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create proposals and invoices — approving a proposal auto-generates an agreement draft
        </p>
      </div>
      <FinanceManager
        proposals={proposals}
        invoices={invoices}
        agreements={agreements}
        clients={clients}
        canManage={canPerform(user.systemRole, "finance", "create")}
      />
    </div>
  );
}
