import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { createJournalEntry } from "../services/accounting.service";

const createSchema = z.object({
  paymentDate: z.string(),
  amount: z.number().positive(),
  bankAccountCode: z.string().default("1010"),
  invoiceId: z.string().optional(),
  billId: z.string().optional(),
});

export async function createPayment(req: AuthRequest, res: Response) {
  try {
    const body = createSchema.parse(req.body);
    if (!body.invoiceId && !body.billId) {
      return res.status(400).json({ message: "invoiceId or billId is required" });
    }
    if (body.invoiceId && body.billId) {
      return res.status(400).json({ message: "Only one of invoiceId or billId may be supplied" });
    }

    const companyId = req.user!.companyId;
    const payment = await prisma.$transaction(async (tx) => {
      const paymentCount = await tx.payment.count({ where: { companyId } });
      const paymentNo = `PAY-${String(paymentCount + 1).padStart(5, "0")}`;

      let direction: "INCOMING" | "OUTGOING";
      let lines;

      if (body.invoiceId) {
        const invoice = await tx.invoice.findFirst({ where: { id: body.invoiceId, companyId } });
        if (!invoice) throw new Error("Invoice not found");
        const updatedPaid = Number(invoice.amountPaid) + body.amount;
        const updatedStatus = updatedPaid >= Number(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID";

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { amountPaid: new Decimal(updatedPaid), status: updatedStatus },
        });

        direction = "INCOMING";
        lines = [{
          debitAccountCode: body.bankAccountCode,
          creditAccountCode: "1100",
          amount: body.amount,
          description: `Invoice payment ${paymentNo}`,
        }];
      } else {
        const bill = await tx.bill.findFirst({ where: { id: body.billId, companyId } });
        if (!bill) throw new Error("Bill not found");
        const updatedPaid = Number(bill.amountPaid) + body.amount;
        const updatedStatus = updatedPaid >= Number(bill.totalAmount) ? "PAID" : "PARTIALLY_PAID";

        await tx.bill.update({
          where: { id: bill.id },
          data: { amountPaid: new Decimal(updatedPaid), status: updatedStatus },
        });

        direction = "OUTGOING";
        lines = [{
          debitAccountCode: "2000",
          creditAccountCode: body.bankAccountCode,
          amount: body.amount,
          description: `Bill payment ${paymentNo}`,
        }];
      }

      const created = await tx.payment.create({
        data: {
          companyId,
          paymentNo,
          paymentDate: new Date(body.paymentDate),
          amount: new Decimal(body.amount),
          bankAccountCode: body.bankAccountCode,
          direction,
          invoiceId: body.invoiceId,
          billId: body.billId,
        },
      });

      const je = await createJournalEntry({
        tx,
        companyId,
        createdById: req.user!.id,
        entryDate: new Date(body.paymentDate),
        memo: `Payment ${paymentNo}`,
        sourceType: "PAYMENT",
        sourceId: created.id,
        lines,
      });

      return tx.payment.update({ where: { id: created.id }, data: { postedJournalEntryId: je.id } });
    });

    return res.status(201).json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create payment";
    return res.status(400).json({ message });
  }
}

export async function listPayments(req: AuthRequest, res: Response) {
  const payments = await prisma.payment.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: { createdAt: "desc" },
  });
  return res.json(payments);
}
