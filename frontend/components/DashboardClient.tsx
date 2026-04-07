"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type Company = {
  name: string;
  legalName?: string | null;
  baseCurrency: string;
  fiscalYearStart: string;
  taxNumber?: string | null;
};

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type Balance = {
  id: string;
  quantityOnHand: string;
  inventoryItem: { name: string; sku: string };
  warehouse: { name: string; code: string };
};

type Invoice = {
  id: string;
  invoiceNo: string;
  status: string;
  totalAmount: string;
  amountPaid: string;
  customer: { name: string };
};

type Bill = {
  id: string;
  billNo: string;
  status: string;
  totalAmount: string;
  amountPaid: string;
  supplier: { name: string };
};

type ProfitLoss = {
  revenue: number;
  costOfSales: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

export default function DashboardClient() {
  const [company, setCompany] = useState<Company | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("proledger_access_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      apiFetch<Company>("/company/me", { headers }),
      apiFetch<Account[]>("/accounts", { headers }),
      apiFetch<Balance[]>("/inventory/balances", { headers }),
      apiFetch<Invoice[]>("/invoices", { headers }),
      apiFetch<Bill[]>("/bills", { headers }),
      apiFetch<ProfitLoss>("/reports/profit-loss", { headers }),
    ])
      .then(([companyRes, accountsRes, balancesRes, invoicesRes, billsRes, plRes]) => {
        setCompany(companyRes);
        setAccounts(accountsRes);
        setBalances(balancesRes);
        setInvoices(invoicesRes);
        setBills(billsRes);
        setProfitLoss(plRes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load dashboard"));
  }, []);

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "grid", gap: 20 }}>
        <section style={cardStyle}>
          <h1 style={{ margin: 0, fontSize: 30, color: "#0f172a" }}>ProLedger Step 2 Dashboard</h1>
          <p style={{ color: "#64748b" }}>Now connected to invoices, bills, payments, journal posting foundation, inventory balances, and reporting endpoints.</p>
          {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}
          {company ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <Info label="Company" value={company.name} />
              <Info label="Currency" value={company.baseCurrency} />
              <Info label="Fiscal Year Start" value={company.fiscalYearStart} />
              <Info label="Tax Number" value={company.taxNumber || "-"} />
            </div>
          ) : <div>Loading company...</div>}
        </section>

        {profitLoss ? (
          <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Info label="Revenue" value={money(profitLoss.revenue)} />
            <Info label="Cost of Sales" value={money(profitLoss.costOfSales)} />
            <Info label="Gross Profit" value={money(profitLoss.grossProfit)} />
            <Info label="Expenses" value={money(profitLoss.expenses)} />
            <Info label="Net Profit" value={money(profitLoss.netProfit)} />
          </section>
        ) : null}

        <section style={cardStyle}>
          <h2>Chart of Accounts</h2>
          <table style={tableStyle}>
            <thead><tr><th style={thTd}>Code</th><th style={thTd}>Name</th><th style={thTd}>Type</th></tr></thead>
            <tbody>
              {accounts.map((a) => <tr key={a.id}><td style={thTd}>{a.code}</td><td style={thTd}>{a.name}</td><td style={thTd}>{a.type}</td></tr>)}
            </tbody>
          </table>
        </section>

        <section style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr 1fr" }}>
          <div style={cardStyle}>
            <h2>Invoices</h2>
            <table style={tableStyle}>
              <thead><tr><th style={thTd}>No</th><th style={thTd}>Customer</th><th style={thTd}>Status</th><th style={thTd}>Total</th><th style={thTd}>Paid</th></tr></thead>
              <tbody>
                {invoices.map((row) => <tr key={row.id}><td style={thTd}>{row.invoiceNo}</td><td style={thTd}>{row.customer.name}</td><td style={thTd}>{row.status}</td><td style={thTd}>{row.totalAmount}</td><td style={thTd}>{row.amountPaid}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div style={cardStyle}>
            <h2>Bills</h2>
            <table style={tableStyle}>
              <thead><tr><th style={thTd}>No</th><th style={thTd}>Supplier</th><th style={thTd}>Status</th><th style={thTd}>Total</th><th style={thTd}>Paid</th></tr></thead>
              <tbody>
                {bills.map((row) => <tr key={row.id}><td style={thTd}>{row.billNo}</td><td style={thTd}>{row.supplier.name}</td><td style={thTd}>{row.status}</td><td style={thTd}>{row.totalAmount}</td><td style={thTd}>{row.amountPaid}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section style={cardStyle}>
          <h2>Inventory Balances</h2>
          <table style={tableStyle}>
            <thead><tr><th style={thTd}>SKU</th><th style={thTd}>Item</th><th style={thTd}>Warehouse</th><th style={thTd}>On Hand</th></tr></thead>
            <tbody>
              {balances.map((b) => <tr key={b.id}><td style={thTd}>{b.inventoryItem.sku}</td><td style={thTd}>{b.inventoryItem.name}</td><td style={thTd}>{b.warehouse.name}</td><td style={thTd}>{b.quantityOnHand}</td></tr>)}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "white" }}>
      <div style={{ color: "#64748b", fontSize: 13 }}>{label}</div>
      <div style={{ color: "#0f172a", fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
};

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" };
const thTd: React.CSSProperties = { borderBottom: "1px solid #e5e7eb", padding: 10, textAlign: "left" };
