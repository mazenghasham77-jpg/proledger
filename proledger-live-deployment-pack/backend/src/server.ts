import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { router } from "./routes";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api", router);

app.listen(Number(env.PORT), () => {
  console.log(`ProLedger backend running on http://localhost:${env.PORT}`);
});
