import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

const createSchema = z.object({
  entityType: z.enum(["INVOICE", "BILL", "PAYMENT", "CREDIT_NOTE", "SALES_ORDER", "PURCHASE_ORDER", "DELIVERY_NOTE", "GOODS_RECEIPT", "SALES_RETURN", "SUPPLIER_RETURN", "JOURNAL_ENTRY"]),
  entityId: z.string(),
  fileName: z.string(),
  mimeType: z.string().optional(),
  storageKey: z.string(),
  fileSize: z.number().int().positive().optional(),
});

export async function createAttachment(req: AuthRequest, res: Response) {
  try {
    const body = createSchema.parse(req.body);
    const row = await prisma.attachment.create({
      data: {
        companyId: req.user!.companyId,
        entityType: body.entityType,
        entityId: body.entityId,
        fileName: body.fileName,
        mimeType: body.mimeType,
        storageKey: body.storageKey,
        fileSize: body.fileSize,
        uploadedById: req.user!.id,
      },
    });
    return res.status(201).json(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create attachment";
    return res.status(400).json({ message });
  }
}

export async function listAttachments(req: AuthRequest, res: Response) {
  const entityType = req.query.entityType as string | undefined;
  const entityId = req.query.entityId as string | undefined;

  const rows = await prisma.attachment.findMany({
    where: {
      companyId: req.user!.companyId,
      ...(entityType ? { entityType: entityType as any } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(rows);
}
