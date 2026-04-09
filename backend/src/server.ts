import express from "express";
import cors from "cors";
import { env } from "./config/env";
import router from "./routes";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});
app.use("/api", router);

const PORT = Number(process.env.PORT || env.PORT || 4000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ProLedger backend running on port ${PORT}`);
});
