import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";
import { DEFAULT_ROLE_PERMISSIONS } from "../config/permissions";

interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Invalid token." });
  }
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Insufficient permissions." });
    }

    next();
  };
};

async function getPermissions() {
  try {
    const configRepo = await AppDataSource.getRepository(SystemConfig).findOne({
      where: { key: "role_permissions" },
    });
    if (configRepo?.value) {
      return JSON.parse(configRepo.value);
    }
  } catch {
    // ignore
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

export const projectPermissionMiddleware = (action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const permissions = await getPermissions();
      const rolePerms = permissions[user.role];
      const hasPermission = rolePerms?.project?.[action] ?? false;

      if (!hasPermission) {
        return res.status(403).json({ error: "没有权限执行此操作" });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "权限检查失败" });
    }
  };
};

export const taskPermissionMiddleware = (action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const permissions = await getPermissions();
      const rolePerms = permissions[user.role];
      const hasPermission = rolePerms?.task?.[action] ?? false;

      if (!hasPermission) {
        return res.status(403).json({ error: "没有权限执行此操作" });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "权限检查失败" });
    }
  };
};

export const bugPermissionMiddleware = (action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const permissions = await getPermissions();
      const rolePerms = permissions[user.role];
      const hasPermission = rolePerms?.bug?.[action] ?? false;

      if (!hasPermission) {
        return res.status(403).json({ error: "没有权限执行此操作" });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "权限检查失败" });
    }
  };
};
