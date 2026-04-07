import bcrypt from "bcryptjs";
import { PrismaClient, AccountType, RoleName, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureSequence(companyId: string, documentKey: string, prefix: string) {
  await prisma.numberSequence.upsert({
    where: { companyId_documentKey: { companyId, documentKey } },
    update: {},
    create: { companyId, documentKey, prefix, nextNumber: 1, padding: 5 },
  });
}

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "seed-company" },
    update: {},
    create: {
      id: "seed-company",
      name: "ProLedger Demo Company",
      legalName: "ProLedger Demo Company LLC",
      baseCurrency: "USD",
      fiscalYearStart: "01-01",
      taxNumber: "TAX-123456",
    },
  });

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  await prisma.user.upsert({
    where: { email: "admin@proledger.local" },
    update: {},
    create: {
      email: "admin@proledger.local",
      passwordHash,
      fullName: "System Administrator",
      role: RoleName.ADMIN,
      companyId: company.id,
    },
  });

  const accounts = [
    ["1000", "Cash on Hand", AccountType.ASSET],
    ["1010", "Bank Accounts", AccountType.ASSET],
    ["1100", "Accounts Receivable", AccountType.ASSET],
    ["1200", "Inventory Asset", AccountType.ASSET],
    ["2000", "Accounts Payable", AccountType.LIABILITY],
    ["2100", "VAT Payable", AccountType.LIABILITY],
    ["2200", "VAT Recoverable", AccountType.ASSET],
    ["3000", "Owner Equity", AccountType.EQUITY],
    ["4000", "Sales Revenue", AccountType.INCOME],
    ["5000", "Operating Expenses", AccountType.EXPENSE],
    ["5100", "Cost of Goods Sold", AccountType.COST_OF_SALES],
  ] as const;

  for (const [code, name, type] of accounts) {
    await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      update: {},
      create: { companyId: company.id, code, name, type, isSystem: true },
    });
  }

  const seqs = [
    ["invoice", "INV-"], ["bill", "BILL-"], ["journal", "JE-"], ["sales_order", "SO-"],
    ["purchase_order", "PO-"], ["delivery_note", "DN-"], ["goods_receipt", "GRN-"],
    ["sales_return", "SR-"], ["supplier_return", "VR-"], ["credit_note", "CN-"], ["payment", "PAY-"]
  ];
  for (const [key, prefix] of seqs) {
    await ensureSequence(company.id, key, prefix);
  }

  await prisma.accountingPeriod.upsert({
    where: { companyId_periodLabel: { companyId: company.id, periodLabel: "2026-04" } },
    update: {},
    create: {
      companyId: company.id,
      periodLabel: "2026-04",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-30T23:59:59.999Z"),
      isClosed: false,
    },
  });

  const bank = await prisma.bankAccount.upsert({
    where: { id: "seed-bank-main" },
    update: {},
    create: {
      id: "seed-bank-main",
      companyId: company.id,
      name: "Main Bank Account",
      bankName: "Demo Bank",
      accountNumber: "1234567890",
      iban: "AE0000000000001234567890",
      currency: "USD",
      glAccountCode: "1010",
    },
  });

  await prisma.bankTransaction.createMany({
    data: [
      {
        companyId: company.id,
        bankAccountId: bank.id,
        transactionDate: new Date("2026-04-03"),
        description: "Customer transfer Al Noor Trading",
        referenceNo: "BTX-001",
        amount: new Prisma.Decimal(5000),
        status: "IMPORTED",
      },
      {
        companyId: company.id,
        bankAccountId: bank.id,
        transactionDate: new Date("2026-04-04"),
        description: "Supplier payment Emirates Supplies",
        referenceNo: "BTX-002",
        amount: new Prisma.Decimal(-1800),
        status: "IMPORTED",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded Step 6 demo data.");
}

main().finally(async () => {
  await prisma.$disconnect();
});
