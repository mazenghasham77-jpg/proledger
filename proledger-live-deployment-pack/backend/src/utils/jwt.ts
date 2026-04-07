import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  sub: string;
  companyId: string;
  role: string;
  email: string;
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}
