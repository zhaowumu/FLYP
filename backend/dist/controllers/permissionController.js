"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionController = void 0;
const database_1 = require("../config/database");
const SystemConfig_1 = require("../entities/SystemConfig");
const permissions_1 = require("../config/permissions");
const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
exports.permissionController = {
    async getPermissions(_req, res) {
        try {
            const config = await configRepository.findOne({ where: { key: "role_permissions" } });
            if (config) {
                res.json(JSON.parse(config.value));
            }
            else {
                res.json(permissions_1.DEFAULT_ROLE_PERMISSIONS);
            }
        }
        catch (error) {
            console.error("Error getting permissions:", error);
            res.status(500).json({ error: "Failed to get permissions" });
        }
    },
    async updatePermissions(req, res) {
        try {
            const permissions = req.body;
            const config = await configRepository.findOne({ where: { key: "role_permissions" } });
            if (config) {
                config.value = JSON.stringify(permissions);
                await configRepository.save(config);
            }
            else {
                const newConfig = configRepository.create({
                    key: "role_permissions",
                    value: JSON.stringify(permissions),
                    description: "角色权限配置",
                });
                await configRepository.save(newConfig);
            }
            res.json({ message: "Permissions updated successfully" });
        }
        catch (error) {
            console.error("Error updating permissions:", error);
            res.status(500).json({ error: "Failed to update permissions" });
        }
    },
};
//# sourceMappingURL=permissionController.js.map