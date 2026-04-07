import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

export async function listAccounts(req: AuthRequest, res: Response) {
  const accounts = await prisma.account.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: [{ code: "asc" }],
  });
  return res.json(accounts);
}
