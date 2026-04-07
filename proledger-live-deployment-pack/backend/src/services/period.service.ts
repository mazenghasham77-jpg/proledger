import { Prisma } from "@prisma/client";

export async function assertPeriodOpen(
  tx: Prisma.TransactionClient | any,
  companyId: string,
  date: Date
) {
  const period = await tx.accountingPeriod.findFirst({
    where: {
      companyId,
      startDate: { lte: date },
      endDate: { gte: date },
    },
  });

  if (period?.isClosed) {
    throw new Error(`Accounting period ${period.periodLabel} is closed`);
  }

  return period;
}
