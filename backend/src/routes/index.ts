import { Router } from "express";
import { loginHandler } from "../controllers/auth.controller";
import { getMyCompany } from "../controllers/company.controller";
import { listAccounts } from "../controllers/account.controller";
import { requireAuth } from "../middleware/auth";
import { createJournalEntryHandler } from "../controllers/journal.controller";
import { createInvoice, listInvoices } from "../controllers/invoice.controller";
import { createBill, listBills } from "../controllers/bill.controller";
import { createPayment, listPayments } from "../controllers/payment.controller";
import { createInventoryMovement, getInventoryValuation, listInventoryBalances, listInventoryMovements } from "../controllers/inventory.controller";
import { agedPayablesReport, agedReceivablesReport, balanceSheetReport, cashFlowReport, inventoryValuationSummary, profitLossReport, taxSummaryReport } from "../controllers/report.controller";
import { createPurchaseOrder, createSalesOrder, listPurchaseOrders, listSalesOrders } from "../controllers/order.controller";
import { createDeliveryNote, createGoodsReceipt, listDeliveryNotes, listGoodsReceipts } from "../controllers/fulfillment.controller";
import { createCreditNote, createSalesReturn, createSupplierReturn, listCreditNotes, listSalesReturns, listSupplierReturns } from "../controllers/returns.controller";
import { approveEntity, closePeriod, createPeriod, listApprovals, listAuditLogs, listPeriods, rejectEntity, reopenPeriod, requestApproval } from "../controllers/control.controller";
import { clearBankTransaction, importBankTransactions, listBankAccounts, listBankTransactions, matchBankTransaction } from "../controllers/reconciliation.controller";
import { createAttachment, listAttachments } from "../controllers/attachment.controller";
import { emailInvoice, generateInvoicePdf } from "../controllers/document.controller";

const router = Router();

router.post("/auth/login", loginHandler);
router.use(requireAuth);

router.get("/company/me", getMyCompany);
router.get("/accounts", listAccounts);

router.get("/journal-entries", listJournalEntries);
router.post("/journal-entries", createJournalEntryHandler);

router.get("/invoices", listInvoices);
router.post("/invoices", createInvoice);
router.get("/invoices/:invoiceId/pdf", generateInvoicePdf);
router.post("/invoices/:invoiceId/email", emailInvoice);

router.get("/bills", listBills);
router.post("/bills", createBill);

router.get("/payments", listPayments);
router.post("/payments", createPayment);

router.get("/sales-orders", listSalesOrders);
router.post("/sales-orders", createSalesOrder);

router.get("/purchase-orders", listPurchaseOrders);
router.post("/purchase-orders", createPurchaseOrder);

router.get("/delivery-notes", listDeliveryNotes);
router.post("/delivery-notes", createDeliveryNote);

router.get("/goods-receipts", listGoodsReceipts);
router.post("/goods-receipts", createGoodsReceipt);

router.get("/sales-returns", listSalesReturns);
router.post("/sales-returns", createSalesReturn);

router.get("/supplier-returns", listSupplierReturns);
router.post("/supplier-returns", createSupplierReturn);

router.get("/credit-notes", listCreditNotes);
router.post("/credit-notes", createCreditNote);

router.get("/inventory/balances", listInventoryBalances);
router.get("/inventory/movements", listInventoryMovements);
router.get("/inventory/valuation", getInventoryValuation);
router.post("/inventory/movements", createInventoryMovement);

router.get("/reports/profit-loss", profitLossReport);
router.get("/reports/balance-sheet", balanceSheetReport);
router.get("/reports/cash-flow", cashFlowReport);
router.get("/reports/aged-receivables", agedReceivablesReport);
router.get("/reports/aged-payables", agedPayablesReport);
router.get("/reports/tax-summary", taxSummaryReport);
router.get("/reports/inventory-valuation", inventoryValuationSummary);

router.get("/controls/approvals", listApprovals);
router.post("/controls/approvals/request", requestApproval);
router.post("/controls/approvals/approve", approveEntity);
router.post("/controls/approvals/reject", rejectEntity);

router.get("/controls/periods", listPeriods);
router.post("/controls/periods", createPeriod);
router.post("/controls/periods/:periodId/close", closePeriod);
router.post("/controls/periods/:periodId/reopen", reopenPeriod);
router.get("/controls/audit-logs", listAuditLogs);

router.get("/bank/accounts", listBankAccounts);
router.get("/bank/transactions", listBankTransactions);
router.post("/bank/transactions/import", importBankTransactions);
router.post("/bank/transactions/match", matchBankTransaction);
router.post("/bank/transactions/:bankTransactionId/clear", clearBankTransaction);

router.get("/attachments", listAttachments);
router.post("/attachments", createAttachment);

export default router;
