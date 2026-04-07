export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", padding: 24 }}>
      <div style={{ background: "white", borderRadius: 24, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.06)", maxWidth: 700 }}>
        <h1 style={{ marginTop: 0, color: "#0f172a" }}>ProLedger Production Launch Pack</h1>
        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          This build is prepared as a production-ready starter foundation for accounting, inventory, approvals,
          reconciliation, documents, and governance workflows.
        </p>
        <ul style={{ color: "#334155", lineHeight: 1.8 }}>
          <li>Backend healthcheck</li>
          <li>Dockerized backend and frontend</li>
          <li>Environment templates</li>
          <li>Deployment and security checklists</li>
          <li>Testing plan scaffolding</li>
        </ul>
        <p style={{ color: "#64748b" }}>Go to <strong>/login</strong> to access the app.</p>
      </div>
    </main>
  );
}
