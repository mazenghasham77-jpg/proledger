import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import { createJournalEntry } from "../services/accounting.service";

const schema = z.object({
  entryDate: z.string().optional(),
  memo: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
  lines: z.array(z.object({
    debitAccountCode: z.string(),
    creditAccountCode: z.string(),
    amount: z.number().positive(),
    description: z.string().optional(),
  })).min(1),
});

export async function createJournalEntryHandler(req: AuthRequest, res: Response) {
  try {
    const body = schema.parse(req.body);
    const entry = await createJournalEntry({
      companyId: req.user!.companyId,
      createdById: req.user!.id,
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
      memo: body.memo,
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      lines: body.lines,
    });
    return res.status(201).json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create journal entry";
    return res.status(400).json({ message });
  }
}
