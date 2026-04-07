"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customLinkController = void 0;
const database_1 = require("../config/database");
const SystemConfig_1 = require("../entities/SystemConfig");
const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
exports.customLinkController = {
    async getCustomLinks(_req, res) {
        try {
            const config = await configRepository.findOne({ where: { key: "custom_links" } });
            if (config) {
                res.json(JSON.parse(config.value));
            }
            else {
                res.json([]);
            }
        }
        catch (error) {
            console.error("Error getting custom links:", error);
            res.status(500).json({ error: "Failed to get custom links" });
        }
    },
    async updateCustomLinks(req, res) {
        try {
            const links = req.body;
            const config = await configRepository.findOne({ where: { key: "custom_links" } });
            if (config) {
                config.value = JSON.stringify(links);
                await configRepository.save(config);
            }
            else {
                const newConfig = configRepository.create({
                    key: "custom_links",
                    value: JSON.stringify(links),
                    description: "侧边栏自定义链接配置",
                });
                await configRepository.save(newConfig);
            }
            res.json({ message: "Custom links updated successfully" });
        }
        catch (error) {
            console.error("Error updating custom links:", error);
            res.status(500).json({ error: "Failed to update custom links" });
        }
    },
};
//# sourceMappingURL=customLinkController.js.map