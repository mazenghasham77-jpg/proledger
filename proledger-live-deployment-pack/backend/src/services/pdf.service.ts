export function buildInvoicePdfHtml(params: {
  invoiceNo: string;
  companyName: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: string;
  lines: Array<{ description: string; quantity: string; unitPrice: string; lineAmount: string }>;
}) {
  const rows = params.lines.map(
    (l) => `<tr><td>${l.description}</td><td>${l.quantity}</td><td>${l.unitPrice}</td><td>${l.lineAmount}</td></tr>`
  ).join("");

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 12px 0; }
          .meta { margin-bottom: 20px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          .total { margin-top: 20px; font-size: 20px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Invoice ${params.invoiceNo}</h1>
        <div class="meta">
          <div><strong>Company:</strong> ${params.companyName}</div>
          <div><strong>Customer:</strong> ${params.customerName}</div>
          <div><strong>Invoice Date:</strong> ${params.invoiceDate}</div>
          <div><strong>Due Date:</strong> ${params.dueDate}</div>
        </div>
        <table>
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total: ${params.totalAmount}</div>
      </body>
    </html>
  `;
}
