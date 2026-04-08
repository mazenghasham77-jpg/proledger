import { Prisma } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { createJournalEntry } from "../services/accounting.service";
import { issueInventory } from "../services/inventory-valuation.service";

const lineSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  productId: z.string().optional(),
});

const createSchema = z.object({
  customerId: z.string(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional(),
  taxPercent: z.number().min(0).max(100).default(0),
  warehouseCode: z.string().default("MAIN"),
  lines: z.array(lineSchema).min(1),
});

export async function createInvoice(req: AuthRequest, res: Response) {
  try {
    const body = createSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceCount = await tx.invoice.count({ where: { companyId } });
      const invoiceNo = `INV-${String(invoiceCount + 1).padStart(5, "0")}`;
      const subtotal = body.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      const taxAmount = +(subtotal * (body.taxPercent / 100)).toFixed(2);
      const totalAmount = +(subtotal + taxAmount).toFixed(2);

      const warehouse = await tx.warehouse.findUniqueOrThrow({
        where: { companyId_code: { companyId, code: body.warehouseCode } },
      });

      const created = await tx.invoice.create({
        data: {
          companyId,
          customerId: body.customerId,
          invoiceNo,
          invoiceDate: new Date(body.invoiceDate),
          dueDate: new Date(body.dueDate),
          status: "SENT",
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(taxAmount),
          totalAmount: new Decimal(totalAmount),
          notes: body.notes,
          lines: {
            create: body.lines.map((line) => ({
              description: line.description,
              quantity: new Decimal(line.quantity),
              unitPrice: new Decimal(line.unitPrice),
              lineAmount: new Decimal(line.quantity * line.unitPrice),
              productId: line.productId,
            })),
          },
        },
        include: { lines: true },
      });

      const revenuePostingLines = [{
        debitAccountCode: "1100",
        creditAccountCode: "4000",
        amount: subtotal,
        description: `Invoice ${invoiceNo} revenue`,
      }];
      if (taxAmount > 0) {
        revenuePostingLines.push({
          debitAccountCode: "1100",
          creditAccountCode: "2100",
          amount: taxAmount,
          description: `Invoice ${invoiceNo} tax`,
        });
      }

      const revenueJe = await createJournalEntry({
        tx,
        companyId,
        createdById: req.user!.id,
        entryDate: new Date(body.invoiceDate),
        memo: `Auto-posted invoice ${invoiceNo}`,
        sourceType: "INVOICE",
        sourceId: created.id,
        lines: revenuePostingLines,
      });

      let totalCogs = 0;

      for (const line of body.lines) {
        if (!line.productId) continue;
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product?.isTrackedInventory) continue;

        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { companyId, sku: product.sku ?? undefined },
        });
        if (!inventoryItem) {
          throw new Error(`No inventory item linked to product ${product.name}`);
        }

        const issue = await issueInventory({
          tx,
          inventoryItemId: inventoryItem.id,
          warehouseId: warehouse.id,
          quantity: line.quantity,
        });

        totalCogs += issue.issuedValue;

        await tx.inventoryMovement.create({
          data: {
            companyId,
            movementType: "OUT",
            referenceNo: invoiceNo,
            notes: `Auto issue from invoice ${invoiceNo}`,
            createdById: req.user!.id,
            lines: {
              create: [{
                inventoryItemId: inventoryItem.id,
                warehouseId: warehouse.id,
                quantity: new Decimal(line.quantity),
                unitCost: new Decimal(issue.unitCost),
              }],
            },
          },
        });
      }

      if (totalCogs > 0) {
        await createJournalEntry({
          tx,
          companyId,
          createdById: req.user!.id,
          entryDate: new Date(body.invoiceDate),
          memo: `COGS for invoice ${invoiceNo}`,
          sourceType: "INVOICE_COGS",
          sourceId: created.id,
          lines: [{
            debitAccountCode: "5100",
            creditAccountCode: "1200",
            amount: +totalCogs.toFixed(2),
            description: `COGS for invoice ${invoiceNo}`,
          }],
        });
      }

      return tx.invoice.update({
        where: { id: created.id },
        data: { postedJournalEntryId: revenueJe.id },
        include: { lines: true, customer: true },
      });
    });

    return res.status(201).json(invoice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invoice";
    return res.status(400).json({ message });
  }
}

export async function listInvoices(req: AuthRequest, res: Response) {
  const invoices = await prisma.invoice.findMany({
    where: { companyId: req.user!.companyId },
    include: { customer: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(invoices);
}
