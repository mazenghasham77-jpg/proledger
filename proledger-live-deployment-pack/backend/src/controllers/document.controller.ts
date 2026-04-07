import { Response } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth";
import { buildInvoicePdfHtml } from "../services/pdf.service";
import { sendMail } from "../services/email.service";

export async function generateInvoicePdf(req: AuthRequest, res: Response) {
  const invoiceId = req.params.invoiceId;

  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id: invoiceId, companyId: req.user!.companyId },
    include: { customer: true, lines: true, company: true },
  });

  const html = buildInvoicePdfHtml({
    invoiceNo: invoice.invoiceNo,
    companyName: invoice.company.name,
    customerName: invoice.customer.name,
    invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    totalAmount: String(invoice.totalAmount),
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      lineAmount: String(l.lineAmount),
    })),
  });

  return res.json({
    invoiceId: invoice.id,
    invoiceNo: invoice.invoiceNo,
    html,
    note: "HTML-to-PDF foundation generated. Connect Playwright or Puppeteer for binary PDF rendering.",
  });
}

export async function emailInvoice(req: AuthRequest, res: Response) {
  const invoiceId = req.params.invoiceId;

  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id: invoiceId, companyId: req.user!.companyId },
    include: { customer: true, lines: true, company: true },
  });

  if (!invoice.customer.email) {
    return res.status(400).json({ message: "Customer email is missing" });
  }

  const html = buildInvoicePdfHtml({
    invoiceNo: invoice.invoiceNo,
    companyName: invoice.company.name,
    customerName: invoice.customer.name,
    invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate.toISOString().slice(0, 10),
    totalAmount: String(invoice.totalAmount),
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      lineAmount: String(l.lineAmount),
    })),
  });

  const result = await sendMail({
    to: invoice.customer.email,
    subject: `Invoice ${invoice.invoiceNo}`,
    html,
  });

  return res.json(result);
}
