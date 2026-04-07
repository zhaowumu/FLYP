"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bugPermissionMiddleware = exports.taskPermissionMiddleware = exports.projectPermissionMiddleware = exports.roleMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_1 = require("../config/database");
const SystemConfig_1 = require("../entities/SystemConfig");
const permissions_1 = require("../config/permissions");
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Access denied. No token provided." });
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({ error: "Invalid token." });
    }
};
exports.authMiddleware = authMiddleware;
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated." });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied. Insufficient permissions." });
        }
        next();
    };
};
exports.roleMiddleware = roleMiddleware;
async function getPermissions() {
    try {
        const configRepo = await database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig).findOne({
            where: { key: "role_permissions" },
        });
        if (configRepo?.value) {
            return JSON.parse(configRepo.value);
        }
    }
    catch {
        // ignore
    }
    return permissions_1.DEFAULT_ROLE_PERMISSIONS;
}
const projectPermissionMiddleware = (action) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            const permissions = await getPermissions();
            const rolePerms = permissions[user.role];
            const hasPermission = rolePerms?.project?.[action] ?? false;
            if (!hasPermission) {
                return res.status(403).json({ error: "没有权限执行此操作" });
            }
            next();
        }
        catch (error) {
            res.status(500).json({ error: "权限检查失败" });
        }
    };
};
exports.projectPermissionMiddleware = projectPermissionMiddleware;
const taskPermissionMiddleware = (action) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            const permissions = await getPermissions();
            const rolePerms = permissions[user.role];
            const hasPermission = rolePerms?.task?.[action] ?? false;
            if (!hasPermission) {
                return res.status(403).json({ error: "没有权限执行此操作" });
            }
            next();
        }
        catch (error) {
            res.status(500).json({ error: "权限检查失败" });
        }
    };
};
exports.taskPermissionMiddleware = taskPermissionMiddleware;
const bugPermissionMiddleware = (action) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            const permissions = await getPermissions();
            const rolePerms = permissions[user.role];
            const hasPermission = rolePerms?.bug?.[action] ?? false;
            if (!hasPermission) {
                return res.status(403).json({ error: "没有权限执行此操作" });
            }
            next();
        }
        catch (error) {
            res.status(500).json({ error: "权限检查失败" });
        }
    };
};
exports.bugPermissionMiddleware = bugPermissionMiddleware;
//# sourceMappingURL=authMiddleware.js.map