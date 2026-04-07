import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";

export type PostingLine = {
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  description?: string;
};

async function getAccountIdByCode(tx: Prisma.TransactionClient | PrismaClient, companyId: string, code: string) {
  const account = await tx.account.findUnique({ where: { companyId_code: { companyId, code } } });
  if (!account) throw new Error(`Account ${code} not found`);
  return account.id;
}

export async function createJournalEntry(params: {
  companyId: string;
  createdById?: string;
  entryDate?: Date;
  memo?: string;
  sourceType?: string;
  sourceId?: string;
  lines: PostingLine[];
  tx?: Prisma.TransactionClient;
}) {
  const db = params.tx ?? prisma;
  const totalDebit = params.lines.reduce((sum, line) => sum + line.amount, 0);
  const totalCredit = params.lines.reduce((sum, line) => sum + line.amount, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new Error("Journal entry is not balanced");
  }

  const count = await db.journalEntry.count({ where: { companyId: params.companyId } });
  const entryNo = `JE-${String(count + 1).padStart(5, "0")}`;

  const linesData = [] as Array<{
    debitAccountId: string;
    creditAccountId: string;
    amount: Prisma.Decimal;
    description?: string;
  }>;

  for (const line of params.lines) {
    if (line.amount <= 0) throw new Error("Journal line amount must be greater than zero");
    linesData.push({
      debitAccountId: await getAccountIdByCode(db, params.companyId, line.debitAccountCode),
      creditAccountId: await getAccountIdByCode(db, params.companyId, line.creditAccountCode),
      amount: new Prisma.Decimal(line.amount),
      description: line.description,
    });
  }

  return db.journalEntry.create({
    data: {
      companyId: params.companyId,
      createdById: params.createdById,
      entryNo,
      entryDate: params.entryDate ?? new Date(),
      memo: params.memo,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      status: "POSTED",
      lines: { create: linesData },
    },
    include: {
      lines: {
        include: {
          debitAccount: true,
          creditAccount: true,
        },
      },
    },
  });
}

export async function getAccountBalances(companyId: string) {
  const entries = await prisma.journalEntry.findMany({
    where: { companyId, status: "POSTED" },
    include: {
      lines: {
        include: {
          debitAccount: true,
          creditAccount: true,
        },
      },
    },
    orderBy: { entryDate: "asc" },
  });

  const balances = new Map<string, { code: string; name: string; type: string; balance: number }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const debit = line.debitAccount;
      const credit = line.creditAccount;
      const amount = Number(line.amount);

      if (debit) {
        const key = debit.id;
        const current = balances.get(key) ?? { code: debit.code, name: debit.name, type: debit.type, balance: 0 };
        current.balance += amount;
        balances.set(key, current);
      }

      if (credit) {
        const key = credit.id;
        const current = balances.get(key) ?? { code: credit.code, name: credit.name, type: credit.type, balance: 0 };
        current.balance -= amount;
        balances.set(key, current);
      }
    }
  }

  return Array.from(balances.values()).sort((a, b) => a.code.localeCompare(b.code));
}
