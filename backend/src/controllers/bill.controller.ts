import { Decimal } from "@prisma/client/runtime/library";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { createJournalEntry } from "../services/accounting.service";
import { receiveInventory } from "../services/inventory-valuation.service";

const lineSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  productId: z.string().optional(),
});

const createSchema = z.object({
  supplierId: z.string(),
  billDate: z.string(),
  dueDate: z.string(),
  notes: z.string().optional(),
  taxPercent: z.number().min(0).max(100).default(0),
  expenseAccountCode: z.string().default("5000"),
  warehouseCode: z.string().default("MAIN"),
  lines: z.array(lineSchema).min(1),
});

export async function createBill(req: AuthRequest, res: Response) {
  try {
    const body = createSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const bill = await prisma.$transaction(async (tx) => {
      const billCount = await tx.bill.count({ where: { companyId } });
      const billNo = `BILL-${String(billCount + 1).padStart(5, "0")}`;
      const subtotal = body.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      const taxAmount = +(subtotal * (body.taxPercent / 100)).toFixed(2);
      const totalAmount = +(subtotal + taxAmount).toFixed(2);
      const warehouse = await tx.warehouse.findUniqueOrThrow({
        where: { companyId_code: { companyId, code: body.warehouseCode } },
      });

      const created = await tx.bill.create({
        data: {
          companyId,
          supplierId: body.supplierId,
          billNo,
          billDate: new Date(body.billDate),
          dueDate: new Date(body.dueDate),
          status: "APPROVED",
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

      const postingLines = [];
      for (const line of body.lines) {
        if (!line.productId) {
          postingLines.push({
            debitAccountCode: body.expenseAccountCode,
            creditAccountCode: "2000",
            amount: +(line.quantity * line.unitPrice).toFixed(2),
            description: `Bill ${billNo} expense`,
          });
          continue;
        }

        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product?.isTrackedInventory) {
          postingLines.push({
            debitAccountCode: body.expenseAccountCode,
            creditAccountCode: "2000",
            amount: +(line.quantity * line.unitPrice).toFixed(2),
            description: `Bill ${billNo} expense`,
          });
          continue;
        }

        const inventoryItem = await tx.inventoryItem.findFirst({
          where: { companyId, sku: product.sku ?? undefined },
        });
        if (!inventoryItem) throw new Error(`No inventory item linked to product ${product.name}`);

        await receiveInventory({
          tx,
          inventoryItemId: inventoryItem.id,
          warehouseId: warehouse.id,
          quantity: line.quantity,
          unitCost: line.unitPrice,
        });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            movementType: "IN",
            referenceNo: billNo,
            notes: `Auto receipt from bill ${billNo}`,
            createdById: req.user!.id,
            lines: {
              create: [{
                inventoryItemId: inventoryItem.id,
                warehouseId: warehouse.id,
                quantity: new Decimal(line.quantity),
                unitCost: new Decimal(line.unitPrice),
              }],
            },
          },
        });

        postingLines.push({
          debitAccountCode: "1200",
          creditAccountCode: "2000",
          amount: +(line.quantity * line.unitPrice).toFixed(2),
          description: `Bill ${billNo} inventory receipt`,
        });
      }

      if (taxAmount > 0) {
        postingLines.push({
          debitAccountCode: "2200",
          creditAccountCode: "2000",
          amount: taxAmount,
          description: `Bill ${billNo} tax`,
        });
      }

      const je = await createJournalEntry({
        tx,
        companyId,
        createdById: req.user!.id,
        entryDate: new Date(body.billDate),
        memo: `Auto-posted bill ${billNo}`,
        sourceType: "BILL",
        sourceId: created.id,
        lines: postingLines,
      });

      return tx.bill.update({
        where: { id: created.id },
        data: { postedJournalEntryId: je.id },
        include: { lines: true, supplier: true },
      });
    });

    return res.status(201).json(bill);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create bill";
    return res.status(400).json({ message });
  }
}

export async function listBills(req: AuthRequest, res: Response) {
  const bills = await prisma.bill.findMany({
    where: { companyId: req.user!.companyId },
    include: { supplier: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(bills);
}
