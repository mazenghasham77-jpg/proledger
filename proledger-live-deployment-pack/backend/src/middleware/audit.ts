import { Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { AuthRequest } from "./auth";

export function auditAction(action: string, entityType: string, entityIdResolver?: (req: AuthRequest, resBody: any) => string | undefined) {
  return async function (req: AuthRequest, res: Response, next: NextFunction) {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      setImmediate(async () => {
        try {
          if (req.user?.id) {
            const entityId = entityIdResolver ? entityIdResolver(req, body) : body?.id;
            if (entityId) {
              await prisma.auditLog.create({
                data: {
                  userId: req.user.id,
                  action,
                  entityType,
                  entityId,
                  metaJson: {
                    method: req.method,
                    path: req.originalUrl,
                  },
                },
              });
            }
          }
        } catch (_) {}
      });

      return originalJson(body);
    } as any;

    next();
  };
}
