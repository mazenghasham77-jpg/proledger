import { Decimal } from "@prisma/client/runtime/library";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { getOrCreateBalance, inventoryValuationReport, issueInventory, receiveInventory } from "../services/inventory-valuation.service";

const movementSchema = z.object({
  movementType: z.enum(["IN", "OUT", "TRANSFER", "ADJUSTMENT"]),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  fromWarehouseId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  lines: z.array(z.object({
    inventoryItemId: z.string(),
    warehouseId: z.string().optional(),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative().optional(),
  })).min(1),
});

export async function createInventoryMovement(req: AuthRequest, res: Response) {
  try {
    const body = movementSchema.parse(req.body);

    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryMovement.create({
        data: {
          companyId: req.user!.companyId,
          movementType: body.movementType,
          referenceNo: body.referenceNo,
          notes: body.notes,
          createdById: req.user!.id,
          lines: {
            create: body.lines.map((line) => ({
              inventoryItemId: line.inventoryItemId,
              warehouseId: line.warehouseId ?? body.toWarehouseId ?? body.fromWarehouseId!,
              quantity: new Decimal(line.quantity),
              unitCost: line.unitCost != null ? new Decimal(line.unitCost) : undefined,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of body.lines) {
        if (body.movementType === "IN") {
          if (!line.warehouseId) throw new Error("warehouseId is required for IN");
          await receiveInventory({
            tx,
            inventoryItemId: line.inventoryItemId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
            unitCost: line.unitCost ?? 0,
          });
        } else if (body.movementType === "OUT") {
          if (!line.warehouseId) throw new Error("warehouseId is required for OUT");
          await issueInventory({
            tx,
            inventoryItemId: line.inventoryItemId,
            warehouseId: line.warehouseId,
            quantity: line.quantity,
          });
        } else if (body.movementType === "ADJUSTMENT") {
          if (!line.warehouseId) throw new Error("warehouseId is required for ADJUSTMENT");
          const balance = await getOrCreateBalance(tx, line.inventoryItemId, line.warehouseId);
          await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: { quantityOnHand: new Decimal(line.quantity) },
          });
        } else if (body.movementType === "TRANSFER") {
          if (!body.fromWarehouseId || !body.toWarehouseId) {
            throw new Error("fromWarehouseId and toWarehouseId are required for TRANSFER");
          }
          const issued = await issueInventory({
            tx,
            inventoryItemId: line.inventoryItemId,
            warehouseId: body.fromWarehouseId,
            quantity: line.quantity,
          });
          await receiveInventory({
            tx,
            inventoryItemId: line.inventoryItemId,
            warehouseId: body.toWarehouseId,
            quantity: line.quantity,
            unitCost: issued.unitCost,
          });
        }
      }

      return created;
    });

    return res.status(201).json(movement);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create movement";
    return res.status(400).json({ message });
  }
}

export async function listInventoryBalances(req: AuthRequest, res: Response) {
  const balances = await prisma.inventoryBalance.findMany({
    where: { inventoryItem: { companyId: req.user!.companyId } },
    include: { inventoryItem: true, warehouse: true },
  });
  return res.json(balances);
}

export async function listInventoryMovements(req: AuthRequest, res: Response) {
  const movements = await prisma.inventoryMovement.findMany({
    where: { companyId: req.user!.companyId },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(movements);
}

export async function getInventoryValuation(req: AuthRequest, res: Response) {
  const rows = await inventoryValuationReport(prisma, req.user!.companyId);
  const totalValue = rows.reduce((sum, row) => sum + row.inventoryValue, 0);
  return res.json({ totalValue, rows });
}
