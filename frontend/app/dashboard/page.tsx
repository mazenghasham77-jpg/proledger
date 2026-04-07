"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Company = { name: string; baseCurrency: string; fiscalYearStart: string; taxNumber?: string | null };
type InventoryValuation = { totalValue: number; totalQuantity: number };
type Approval = { id: string; entityType: string; entityId: string; status: string; requestedAt: string };
type Period = { id: string; periodLabel: string; isClosed: boolean; startDate: string; endDate: string };
type AuditLog = { id: string; action: string; entityType: string; entityId: string; createdAt: string };
type BankTransaction = { id: string; description: string; amount: string; status: string; transactionDate: string; referenceNo?: string | null };
type Attachment = { id: string; entityType: string; entityId: string; fileName: string; createdAt: string };

export default function DashboardPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [inventoryValuation, setInventoryValuation] = useState<InventoryValuation | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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
      apiFetch<InventoryValuation>("/reports/inventory-valuation", { headers }),
      apiFetch<Approval[]>("/controls/approvals", { headers }),
      apiFetch<Period[]>("/controls/periods", { headers }),
      apiFetch<AuditLog[]>("/controls/audit-logs", { headers }),
      apiFetch<BankTransaction[]>("/bank/transactions", { headers }),
      apiFetch<Attachment[]>("/attachments", { headers }),
    ])
      .then(([c, iv, ap, pe, au, bt, at]) => {
        setCompany(c);
        setInventoryValuation(iv);
        setApprovals(ap);
        setPeriods(pe);
        setAuditLogs(au);
        setBankTransactions(bt);
        setAttachments(at);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load dashboard"));
  }, []);

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "grid", gap: 20 }}>
        <section style={cardStyle}>
          <h1 style={{ margin: 0, fontSize: 30, color: "#0f172a" }}>ProLedger Step 6 Dashboard</h1>
          <p style={{ color: "#64748b" }}>Bank reconciliation, attachments, PDF, and email foundations are now added to the platform.</p>
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

        <section style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <Info label="Inventory Value" value={money(inventoryValuation?.totalValue || 0)} />
          <Info label="Inventory Quantity" value={String(inventoryValuation?.totalQuantity || 0)} />
          <Info label="Open Approvals" value={String(approvals.filter(a => a.status === "PENDING").length)} />
          <Info label="Closed Periods" value={String(periods.filter(p => p.isClosed).length)} />
          <Info label="Imported Bank Txns" value={String(bankTransactions.filter(t => t.status === "IMPORTED").length)} />
          <Info label="Matched Bank Txns" value={String(bankTransactions.filter(t => t.status === "MATCHED" || t.status === "CLEARED").length)} />
          <Info label="Attachments" value={String(attachments.length)} />
          <Info label="Audit Records" value={String(auditLogs.length)} />
        </section>

        <SimpleTable
          title="Bank Transactions"
          headers={["Date", "Reference", "Description", "Amount", "Status"]}
          rows={bankTransactions.map(t => [
            new Date(t.transactionDate).toLocaleDateString(),
            t.referenceNo || "-",
            t.description,
            t.amount,
            t.status
          ])}
        />

        <SimpleTable
          title="Attachments"
          headers={["Entity Type", "Entity ID", "File Name", "Created"]}
          rows={attachments.map(a => [
            a.entityType,
            a.entityId,
            a.fileName,
            new Date(a.createdAt).toLocaleString()
          ])}
        />

        <SimpleTable
          title="Approvals"
          headers={["Entity Type", "Entity ID", "Status", "Requested At"]}
          rows={approvals.map(a => [a.entityType, a.entityId, a.status, new Date(a.requestedAt).toLocaleString()])}
        />

        <SimpleTable
          title="Accounting Periods"
          headers={["Label", "Start", "End", "Closed"]}
          rows={periods.map(p => [p.periodLabel, new Date(p.startDate).toLocaleDateString(), new Date(p.endDate).toLocaleDateString(), p.isClosed ? "Yes" : "No"])}
        />
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

function SimpleTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <section style={cardStyle}>
      <h2>{title}</h2>
      <table style={tableStyle}>
        <thead><tr>{headers.map((h) => <th key={h} style={thTd}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} style={thTd}>{v}</td>)}</tr>)}
        </tbody>
      </table>
    </section>
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
