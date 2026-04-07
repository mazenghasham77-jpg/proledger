import LoginForm from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 24, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>ProLedger</div>
          <div style={{ color: "#64748b", marginTop: 8 }}>Step 1 foundation login</div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
