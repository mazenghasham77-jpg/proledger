import express from "express";

const app = express();

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SERVER STARTED ON PORT ${PORT}`);
});
