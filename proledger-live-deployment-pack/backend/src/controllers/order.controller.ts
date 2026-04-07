import { Prisma } from "@prisma/client";
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

const salesOrderSchema = z.object({
  customerId: z.string(),
  orderDate: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    productId: z.string().optional(),
  })).min(1),
});

const purchaseOrderSchema = z.object({
  supplierId: z.string(),
  orderDate: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    productId: z.string().optional(),
  })).min(1),
});

export async function createSalesOrder(req: AuthRequest, res: Response) {
  try {
    const body = salesOrderSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const count = await prisma.salesOrder.count({ where: { companyId } });
    const orderNo = `SO-${String(count + 1).padStart(5, "0")}`;

    const order = await prisma.salesOrder.create({
      data: {
        companyId,
        customerId: body.customerId,
        orderNo,
        orderDate: new Date(body.orderDate),
        status: "CONFIRMED",
        notes: body.notes,
        lines: {
          create: body.lines.map((line) => ({
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            lineAmount: new Prisma.Decimal(line.quantity * line.unitPrice),
            productId: line.productId,
          })),
        },
      },
      include: { lines: true, customer: true },
    });

    return res.status(201).json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create sales order";
    return res.status(400).json({ message });
  }
}

export async function listSalesOrders(req: AuthRequest, res: Response) {
  const rows = await prisma.salesOrder.findMany({
    where: { companyId: req.user!.companyId },
    include: { customer: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}

export async function createPurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const body = purchaseOrderSchema.parse(req.body);
    const companyId = req.user!.companyId;
    const count = await prisma.purchaseOrder.count({ where: { companyId } });
    const orderNo = `PO-${String(count + 1).padStart(5, "0")}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        companyId,
        supplierId: body.supplierId,
        orderNo,
        orderDate: new Date(body.orderDate),
        status: "APPROVED",
        notes: body.notes,
        lines: {
          create: body.lines.map((line) => ({
            description: line.description,
            quantity: new Prisma.Decimal(line.quantity),
            unitPrice: new Prisma.Decimal(line.unitPrice),
            lineAmount: new Prisma.Decimal(line.quantity * line.unitPrice),
            productId: line.productId,
          })),
        },
      },
      include: { lines: true, supplier: true },
    });

    return res.status(201).json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create purchase order";
    return res.status(400).json({ message });
  }
}

export async function listPurchaseOrders(req: AuthRequest, res: Response) {
  const rows = await prisma.purchaseOrder.findMany({
    where: { companyId: req.user!.companyId },
    include: { supplier: true, lines: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}
