import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { signAccessToken } from "../utils/jwt";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    companyId: user.companyId,
    role: user.role,
    email: user.email,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
    },
  };
}
