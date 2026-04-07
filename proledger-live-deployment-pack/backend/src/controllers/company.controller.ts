import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

export async function getMyCompany(req: AuthRequest, res: Response) {
  const company = await prisma.company.findUnique({ where: { id: req.user!.companyId } });
  return res.json(company);
}
