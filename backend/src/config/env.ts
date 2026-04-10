import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is missing"),
  PORT: z.string().default("4000"),
  JWT_SECRET: z.string().min(10, "JWT_SECRET must be at least 10 characters"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  FRONTEND_URL: z.string().optional(),
  NODE_ENV: z.string().default("production"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("ENV VALIDATION ERROR:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
