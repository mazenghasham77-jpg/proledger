import { Prisma } from "@prisma/client";

export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  companyId: string,
  documentKey: string
) {
  const sequence = await tx.numberSequence.findUnique({
    where: { companyId_documentKey: { companyId, documentKey } },
  });

  if (!sequence) {
    throw new Error(`Missing number sequence for ${documentKey}`);
  }

  const number = `${sequence.prefix}${String(sequence.nextNumber).padStart(sequence.padding, "0")}`;

  await tx.numberSequence.update({
    where: { id: sequence.id },
    data: { nextNumber: sequence.nextNumber + 1 },
  });

  return number;
}
