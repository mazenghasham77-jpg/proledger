import { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function simpleRateLimit(maxRequests = 100, windowMs = 60_000) {
  return function (req: Request, res: Response, next: NextFunction) {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || current.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      return res.status(429).json({ message: "Too many requests" });
    }

    current.count += 1;
    return next();
  };
}
