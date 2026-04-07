import express from "express";
import cors from "cors";
import routes from "./routes";
import { simpleRateLimit } from "./middleware/rate-limit";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
}));

app.use(express.json({ limit: "5mb" }));
app.use(simpleRateLimit(300, 60_000));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "proledger-backend",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.use("/", routes);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
});

export default app;
