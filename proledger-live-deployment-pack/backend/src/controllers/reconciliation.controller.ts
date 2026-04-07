import { Prisma } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

const importSchema = z.object({
  bankAccountId: z.string(),
  transactions: z.array(z.object({
    transactionDate: z.string(),
    valueDate: z.string().optional(),
    description: z.string(),
    referenceNo: z.string().optional(),
    amount: z.number(),
  })).min(1),
});

const matchSchema = z.object({
  bankTransactionId: z.string(),
  matchedEntityType: z.string(),
  matchedEntityId: z.string(),
});

export async function listBankAccounts(req: AuthRequest, res: Response) {
  const rows = await prisma.bankAccount.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}

export async function listBankTransactions(req: AuthRequest, res: Response) {
  const rows = await prisma.bankTransaction.findMany({
    where: { companyId: req.user!.companyId },
    include: { bankAccount: true },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
  return res.json(rows);
}

export async function importBankTransactions(req: AuthRequest, res: Response) {
  try {
    const body = importSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const t of body.transactions) {
        const row = await tx.bankTransaction.create({
          data: {
            companyId: req.user!.companyId,
            bankAccountId: body.bankAccountId,
            transactionDate: new Date(t.transactionDate),
            valueDate: t.valueDate ? new Date(t.valueDate) : undefined,
            description: t.description,
            referenceNo: t.referenceNo,
            amount: new Prisma.Decimal(t.amount),
            status: "IMPORTED",
          },
        });
        rows.push(row);
      }
      return rows;
    });
    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import bank transactions";
    return res.status(400).json({ message });
  }
}

export async function matchBankTransaction(req: AuthRequest, res: Response) {
  try {
    const body = matchSchema.parse(req.body);
    const row = await prisma.bankTransaction.update({
      where: { id: body.bankTransactionId },
      data: {
        status: "MATCHED",
        matchedEntityType: body.matchedEntityType,
        matchedEntityId: body.matchedEntityId,
        matchedAt: new Date(),
      },
    });
    return res.json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not match transaction";
    return res.status(400).json({ message });
  }
}

export async function clearBankTransaction(req: AuthRequest, res: Response) {
  const bankTransactionId = req.params.bankTransactionId;
  const row = await prisma.bankTransaction.update({
    where: { id: bankTransactionId },
    data: { status: "CLEARED" },
  });
  return res.json(row);
}
