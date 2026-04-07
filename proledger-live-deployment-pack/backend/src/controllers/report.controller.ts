import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { getAccountBalances } from "../services/accounting.service";
import { inventoryValuationReport } from "../services/inventory-valuation.service";

export async function profitLossReport(req: AuthRequest, res: Response) {
  const balances = await getAccountBalances(req.user!.companyId);
  const income = balances.filter((b) => b.type === "INCOME").reduce((sum, b) => sum + -b.balance, 0);
  const cogs = balances.filter((b) => b.type === "COST_OF_SALES").reduce((sum, b) => sum + b.balance, 0);
  const expenses = balances.filter((b) => b.type === "EXPENSE").reduce((sum, b) => sum + b.balance, 0);
  return res.json({ revenue: income, costOfSales: cogs, grossProfit: income - cogs, expenses, netProfit: income - cogs - expenses });
}

export async function balanceSheetReport(req: AuthRequest, res: Response) {
  const balances = await getAccountBalances(req.user!.companyId);
  const assets = balances.filter((b) => b.type === "ASSET").reduce((sum, b) => sum + b.balance, 0);
  const liabilities = balances.filter((b) => b.type === "LIABILITY").reduce((sum, b) => sum + -b.balance, 0);
  const equity = balances.filter((b) => b.type === "EQUITY").reduce((sum, b) => sum + -b.balance, 0);
  return res.json({ assets, liabilities, equity, balances });
}

export async function cashFlowReport(req: AuthRequest, res: Response) {
  const balances = await getAccountBalances(req.user!.companyId);
  const cashAccounts = balances.filter((b) => ["1000", "1010"].includes(b.code));
  const closingCash = cashAccounts.reduce((sum, b) => sum + b.balance, 0);
  return res.json({ closingCash, accounts: cashAccounts });
}

export async function agedReceivablesReport(req: AuthRequest, res: Response) {
  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { companyId: req.user!.companyId, status: { in: ["SENT", "PARTIALLY_PAID"] } },
    include: { customer: true },
  });
  const rows = invoices.map((invoice) => {
    const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    const daysPastDue = Math.max(0, Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000));
    return { invoiceNo: invoice.invoiceNo, customer: invoice.customer.name, dueDate: invoice.dueDate, outstanding, daysPastDue };
  });
  return res.json(rows);
}

export async function agedPayablesReport(req: AuthRequest, res: Response) {
  const now = new Date();
  const bills = await prisma.bill.findMany({
    where: { companyId: req.user!.companyId, status: { in: ["APPROVED", "PARTIALLY_PAID"] } },
    include: { supplier: true },
  });
  const rows = bills.map((bill) => {
    const outstanding = Number(bill.totalAmount) - Number(bill.amountPaid);
    const daysPastDue = Math.max(0, Math.floor((now.getTime() - bill.dueDate.getTime()) / 86400000));
    return { billNo: bill.billNo, supplier: bill.supplier.name, dueDate: bill.dueDate, outstanding, daysPastDue };
  });
  return res.json(rows);
}

export async function taxSummaryReport(req: AuthRequest, res: Response) {
  const balances = await getAccountBalances(req.user!.companyId);
  const vatPayable = balances.find((b) => b.code === "2100")?.balance ?? 0;
  const vatRecoverable = balances.find((b) => b.code === "2200")?.balance ?? 0;
  return res.json({ outputTax: -vatPayable, inputTax: vatRecoverable, netTaxDue: (-vatPayable) - vatRecoverable });
}

export async function inventoryValuationSummary(req: AuthRequest, res: Response) {
  const rows = await inventoryValuationReport(prisma, req.user!.companyId);
  const totalValue = rows.reduce((sum, row) => sum + row.inventoryValue, 0);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantityOnHand, 0);
  return res.json({ totalValue, totalQuantity, rows });
}
