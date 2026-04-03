import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";
import { DEFAULT_ROLE_PERMISSIONS } from "../config/permissions";

const configRepository = AppDataSource.getRepository(SystemConfig);

export const permissionController = {
  async getPermissions(_req: Request, res: Response) {
    try {
      const config = await configRepository.findOne({ where: { key: "role_permissions" } });
      if (config) {
        res.json(JSON.parse(config.value));
      } else {
        res.json(DEFAULT_ROLE_PERMISSIONS);
      }
    } catch (error) {
      console.error("Error getting permissions:", error);
      res.status(500).json({ error: "Failed to get permissions" });
    }
  },

  async updatePermissions(req: Request, res: Response) {
    try {
      const permissions = req.body;
      const config = await configRepository.findOne({ where: { key: "role_permissions" } });

      if (config) {
        config.value = JSON.stringify(permissions);
        await configRepository.save(config);
      } else {
        const newConfig = configRepository.create({
          key: "role_permissions",
          value: JSON.stringify(permissions),
          description: "角色权限配置",
        });
        await configRepository.save(newConfig);
      }

      res.json({ message: "Permissions updated successfully" });
    } catch (error) {
      console.error("Error updating permissions:", error);
      res.status(500).json({ error: "Failed to update permissions" });
    }
  },
};
