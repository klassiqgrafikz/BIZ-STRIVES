import prisma from "@/lib/db/prisma";

export type NotifyParams = {
  businessId?: string | null;
  userId?: string | null;
  type: "MoneyReceived" | "InvoiceOverdue" | "SavingsDue" | "StatementGenerated" | "MonthlyReportReady" | "System";
  title: string;
  message: string;
  actionLink?: string | null;
};

export async function notify(params: NotifyParams) {
  try {
    await prisma.notification.create({
      data: {
        businessId: params.businessId ?? undefined,
        userId: params.userId ?? undefined,
        type: params.type as never,
        title: params.title,
        message: params.message,
        actionLink: params.actionLink ?? undefined,
      },
    });
  } catch (e) {
    console.error("[notify] failed", e);
  }
}
