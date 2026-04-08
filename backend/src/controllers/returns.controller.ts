import { Decimal } from "@prisma/client/runtime/library";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { createJournalEntry } from "../services/accounting.service";
import { issueInventory, receiveInventory } from "../services/inventory-valuation.service";

const salesReturnSchema = z.object({
  customerId: z.string(),
  returnDate: z.string(),
  warehouseCode: z.string().default("MAIN"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().optional(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative().optional(),
  })).min(1),
});

const supplierReturnSchema = z.object({
  supplierId: z.string(),
  returnDate: z.string(),
  warehouseCode: z.string().default("MAIN"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().optional(),
    description: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative().optional(),
  })).min(1),
});

const creditNoteSchema = z.object({
  customerId: z.string().optional(),
  creditNoteDate: z.string(),
  notes: z.string().optional(),
  taxPercent: z.number().min(0).max(100).default(0),
  lines: z.array(z.object({
    productId: z.string().optional(),
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
  })).min(1),
});

export async function createSalesReturn(req: AuthRequest, res: Response) {
  try {
    const body = salesReturnSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.salesReturn.count({ where: { companyId } });
      const returnNo = `SR-${String(count + 1).padStart(5, "0")}`;
      const warehouse = await tx.warehouse.findUniqueOrThrow({ where: { companyId_code: { companyId, code: body.warehouseCode } } });

      const created = await tx.salesReturn.create({
        data: {
          companyId,
          customerId: body.customerId,
          returnNo,
          returnDate: new Date(body.returnDate),
          warehouseId: warehouse.id,
          status: "POSTED",
          notes: body.notes,
          lines: {
            create: body.lines.map((line) => ({
              productId: line.productId,
              description: line.description,
              quantity: new Decimal(line.quantity),
              unitPrice: line.unitPrice != null ? new Decimal(line.unitPrice) : undefined,
            })),
          },
        },
        include: { lines: true, customer: true },
      });

      for (const line of body.lines) {
        if (!line.productId) continue;
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product?.isTrackedInventory || !product.sku) continue;

        const inventoryItem = await tx.inventoryItem.findFirstOrThrow({ where: { companyId, sku: product.sku } });
        await receiveInventory({
          tx,
          inventoryItemId: inventoryItem.id,
          warehouseId: warehouse.id,
          quantity: line.quantity,
          unitCost: Number(product.unitCost ?? 0),
        });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            movementType: "IN",
            referenceNo: returnNo,
            notes: `Sales return ${returnNo}`,
            createdById: req.user!.id,
            lines: {
              create: [{
                inventoryItemId: inventoryItem.id,
                warehouseId: warehouse.id,
                quantity: new Decimal(line.quantity),
                unitCost: new Decimal(product.unitCost ?? 0),
              }],
            },
          },
        });
      }

      return created;
    });

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create sales return";
    return res.status(400).json({ message });
  }
}

export async function listSalesReturns(req: AuthRequest, res: Response) {
  const rows = await prisma.salesReturn.findMany({
    where: { companyId: req.user!.companyId },
    include: { customer: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}

export async function createSupplierReturn(req: AuthRequest, res: Response) {
  try {
    const body = supplierReturnSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.supplierReturn.count({ where: { companyId } });
      const returnNo = `VR-${String(count + 1).padStart(5, "0")}`;
      const warehouse = await tx.warehouse.findUniqueOrThrow({ where: { companyId_code: { companyId, code: body.warehouseCode } } });

      const created = await tx.supplierReturn.create({
        data: {
          companyId,
          supplierId: body.supplierId,
          returnNo,
          returnDate: new Date(body.returnDate),
          warehouseId: warehouse.id,
          status: "POSTED",
          notes: body.notes,
          lines: {
            create: body.lines.map((line) => ({
              productId: line.productId,
              description: line.description,
              quantity: new Decimal(line.quantity),
              unitCost: line.unitCost != null ? new Decimal(line.unitCost) : undefined,
            })),
          },
        },
        include: { lines: true, supplier: true },
      });

      for (const line of body.lines) {
        if (!line.productId) continue;
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product?.isTrackedInventory || !product.sku) continue;

        const inventoryItem = await tx.inventoryItem.findFirstOrThrow({ where: { companyId, sku: product.sku } });
        const issued = await issueInventory({
          tx,
          inventoryItemId: inventoryItem.id,
          warehouseId: warehouse.id,
          quantity: line.quantity,
        });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            movementType: "OUT",
            referenceNo: returnNo,
            notes: `Supplier return ${returnNo}`,
            createdById: req.user!.id,
            lines: {
              create: [{
                inventoryItemId: inventoryItem.id,
                warehouseId: warehouse.id,
                quantity: new Decimal(line.quantity),
                unitCost: new Decimal(issued.unitCost),
              }],
            },
          },
        });
      }

      return created;
    });

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create supplier return";
    return res.status(400).json({ message });
  }
}

export async function listSupplierReturns(req: AuthRequest, res: Response) {
  const rows = await prisma.supplierReturn.findMany({
    where: { companyId: req.user!.companyId },
    include: { supplier: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}

export async function createCreditNote(req: AuthRequest, res: Response) {
  try {
    const body = creditNoteSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.creditNote.count({ where: { companyId } });
      const creditNoteNo = `CN-${String(count + 1).padStart(5, "0")}`;
      const subtotal = body.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
      const taxAmount = +(subtotal * (body.taxPercent / 100)).toFixed(2);
      const totalAmount = +(subtotal + taxAmount).toFixed(2);

      const created = await tx.creditNote.create({
        data: {
          companyId,
          customerId: body.customerId,
          creditNoteNo,
          creditNoteDate: new Date(body.creditNoteDate),
          status: "POSTED",
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(taxAmount),
          totalAmount: new Decimal(totalAmount),
          notes: body.notes,
          lines: {
            create: body.lines.map((line) => ({
              productId: line.productId,
              description: line.description,
              quantity: new Decimal(line.quantity),
              unitPrice: new Decimal(line.unitPrice),
              lineAmount: new Decimal(line.quantity * line.unitPrice),
            })),
          },
        },
        include: { lines: true, customer: true },
      });

      const je = await createJournalEntry({
        tx,
        companyId,
        createdById: req.user!.id,
        entryDate: new Date(body.creditNoteDate),
        memo: `Credit note ${creditNoteNo}`,
        sourceType: "CREDIT_NOTE",
        sourceId: created.id,
        lines: [
          {
            debitAccountCode: "4000",
            creditAccountCode: "1100",
            amount: subtotal,
            description: `Credit note ${creditNoteNo} revenue reversal`,
          },
          ...(taxAmount > 0 ? [{
            debitAccountCode: "2100",
            creditAccountCode: "1100",
            amount: taxAmount,
            description: `Credit note ${creditNoteNo} tax reversal`,
          }] : []),
        ],
      });

      return tx.creditNote.update({
        where: { id: created.id },
        data: { postedJournalEntryId: je.id },
        include: { lines: true, customer: true },
      });
    });

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create credit note";
    return res.status(400).json({ message });
  }
}

export async function listCreditNotes(req: AuthRequest, res: Response) {
  const rows = await prisma.creditNote.findMany({
    where: { companyId: req.user!.companyId },
    include: { customer: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}
