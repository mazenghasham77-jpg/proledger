import { Prisma } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { issueInventory, receiveInventory } from "../services/inventory-valuation.service";

const deliverySchema = z.object({
  customerId: z.string(),
  salesOrderId: z.string().optional(),
  deliveryDate: z.string(),
  warehouseCode: z.string().default("MAIN"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().optional(),
    description: z.string(),
    quantity: z.number().positive(),
  })).min(1),
});

const receiptSchema = z.object({
  supplierId: z.string(),
  purchaseOrderId: z.string().optional(),
  receiptDate: z.string(),
  warehouseCode: z.string().default("MAIN"),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().optional(),
    description: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative(),
  })).min(1),
});

export async function createDeliveryNote(req: AuthRequest, res: Response) {
  try {
    const body = deliverySchema.parse(req.body);
    const companyId = req.user!.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.deliveryNote.count({ where: { companyId } });
      const deliveryNo = `DN-${String(count + 1).padStart(5, "0")}`;
      const warehouse = await tx.warehouse.findUniqueOrThrow({ where: { companyId_code: { companyId, code: body.warehouseCode } } });

      const created = await tx.deliveryNote.create({
        data: {
          companyId,
          customerId: body.customerId,
          salesOrderId: body.salesOrderId,
          deliveryNo,
          deliveryDate: new Date(body.deliveryDate),
          warehouseId: warehouse.id,
          status: "POSTED",
          notes: body.notes,
          lines: {
            create: body.lines.map((line) => ({
              productId: line.productId,
              description: line.description,
              quantity: new Prisma.Decimal(line.quantity),
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
            referenceNo: deliveryNo,
            notes: `Shipment ${deliveryNo}`,
            createdById: req.user!.id,
            lines: {
              create: [{
                inventoryItemId: inventoryItem.id,
                warehouseId: warehouse.id,
                quantity: new Prisma.Decimal(line.quantity),
                unitCost: new Prisma.Decimal(issued.unitCost),
              }],
            },
          },
        });
      }

      return created;
    });

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create delivery note";
    return res.status(400).json({ message });
  }
}

export async function listDeliveryNotes(req: AuthRequest, res: Response) {
  const rows = await prisma.deliveryNote.findMany({
    where: { companyId: req.user!.companyId },
    include: { customer: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}

export async function createGoodsReceipt(req: AuthRequest, res: Response) {
  try {
    const body = receiptSchema.parse(req.body);
    const companyId = req.user!.companyId;

    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.goodsReceipt.count({ where: { companyId } });
      const receiptNo = `GRN-${String(count + 1).padStart(5, "0")}`;
      const warehouse = await tx.warehouse.findUniqueOrThrow({ where: { companyId_code: { companyId, code: body.warehouseCode } } });

      const created = await tx.goodsReceipt.create({
        data: {
          companyId,
          supplierId: body.supplierId,
          purchaseOrderId: body.purchaseOrderId,
          receiptNo,
          receiptDate: new Date(body.receiptDate),
          warehouseId: warehouse.id,
          status: "POSTED",
          notes: body.notes,
          lines: {
            create: body.lines.map((line) => ({
              productId: line.productId,
              description: line.description,
              quantity: new Prisma.Decimal(line.quantity),
              unitCost: new Prisma.Decimal(line.unitCost),
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

        await receiveInventory({
          tx,
          inventoryItemId: inventoryItem.id,
          warehouseId: warehouse.id,
          quantity: line.quantity,
          unitCost: line.unitCost,
        });

        await tx.inventoryMovement.create({
          data: {
            companyId,
            movementType: "IN",
            referenceNo: receiptNo,
            notes: `Receipt ${receiptNo}`,
            createdById: req.user!.id,
            lines: {
              create: [{
                inventoryItemId: inventoryItem.id,
                warehouseId: warehouse.id,
                quantity: new Prisma.Decimal(line.quantity),
                unitCost: new Prisma.Decimal(line.unitCost),
              }],
            },
          },
        });
      }

      return created;
    });

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create goods receipt";
    return res.status(400).json({ message });
  }
}

export async function listGoodsReceipts(req: AuthRequest, res: Response) {
  const rows = await prisma.goodsReceipt.findMany({
    where: { companyId: req.user!.companyId },
    include: { supplier: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}
