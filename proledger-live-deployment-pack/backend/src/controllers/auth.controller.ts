import { Request, Response } from "express";
import { z } from "zod";
import { login } from "../services/auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loginHandler(req: Request, res: Response) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body.email, body.password);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return res.status(400).json({ message });
  }
}
