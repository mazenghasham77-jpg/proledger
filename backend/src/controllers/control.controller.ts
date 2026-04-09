const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
const firstString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

const approvalSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
});

const rejectSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  rejectionNote: z.string().min(1),
});

const periodSchema = z.object({
  periodLabel: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export async function requestApproval(req: AuthRequest, res: Response) {
  const body = approvalSchema.parse(req.body);
  const row = await prisma.approval.upsert({
    where: {
      companyId_entityType_entityId: {
        companyId: req.user!.companyId,
        entityType: body.entityType,
        entityId: body.entityId,
      },
    },
    update: { status: "PENDING", requestedById: req.user!.id, requestedAt: new Date(), rejectionNote: null, approvedById: null, decidedAt: null },
    create: {
      companyId: req.user!.companyId,
      entityType: body.entityType,
      entityId: body.entityId,
      status: "PENDING",
      requestedById: req.user!.id,
    },
  });
  return res.json(row);
}

export async function approveEntity(req: AuthRequest, res: Response) {
  const body = approvalSchema.parse(req.body);
  const row = await prisma.approval.upsert({
    where: {
      companyId_entityType_entityId: {
        companyId: req.user!.companyId,
        entityType: body.entityType,
        entityId: body.entityId,
      },
    },
    update: { status: "APPROVED", approvedById: req.user!.id, decidedAt: new Date(), rejectionNote: null },
    create: {
      companyId: req.user!.companyId,
      entityType: body.entityType,
      entityId: body.entityId,
      status: "APPROVED",
      approvedById: req.user!.id,
      decidedAt: new Date(),
    },
  });
  return res.json(row);
}

export async function rejectEntity(req: AuthRequest, res: Response) {
  const body = rejectSchema.parse(req.body);
  const row = await prisma.approval.upsert({
    where: {
      companyId_entityType_entityId: {
        companyId: req.user!.companyId,
        entityType: body.entityType,
        entityId: body.entityId,
      },
    },
    update: { status: "REJECTED", approvedById: req.user!.id, decidedAt: new Date(), rejectionNote: body.rejectionNote },
    create: {
      companyId: req.user!.companyId,
      entityType: body.entityType,
      entityId: body.entityId,
      status: "REJECTED",
      approvedById: req.user!.id,
      decidedAt: new Date(),
      rejectionNote: body.rejectionNote,
    },
  });
  return res.json(row);
}

export async function listApprovals(req: AuthRequest, res: Response) {
  const rows = await prisma.approval.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: { requestedAt: "desc" },
  });
  return res.json(rows);
}

export async function createPeriod(req: AuthRequest, res: Response) {
  const body = periodSchema.parse(req.body);
  const row = await prisma.accountingPeriod.create({
    data: {
      companyId: req.user!.companyId,
      periodLabel: body.periodLabel,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
  });
  return res.status(201).json(row);
}

export async function listPeriods(req: AuthRequest, res: Response) {
  const rows = await prisma.accountingPeriod.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: { startDate: "desc" },
  });
  return res.json(rows);
}

export async function closePeriod(req: AuthRequest, res: Response) {
  const periodId = String(req.params.periodId || "");
  const row = await prisma.accountingPeriod.update({
    where: { id: periodId },
    data: { isClosed: true, closedAt: new Date(), closedById: req.user!.id },
  });
  return res.json(row);
}

export async function reopenPeriod(req: AuthRequest, res: Response) {
  const periodId = String(req.params.periodId || "");
  const row = await prisma.accountingPeriod.update({
    where: { id: periodId },
    data: { isClosed: false, closedAt: null, closedById: null },
  });
  return res.json(row);
}

export async function listAuditLogs(req: AuthRequest, res: Response) {
  const rows = await prisma.auditLog.findMany({
    where: { user: { companyId: req.user!.companyId } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json(rows);
}
