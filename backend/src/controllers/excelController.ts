import { Request, Response } from "express";
import { ExcelService } from "../services/excelService";

const excelService = new ExcelService();

export const excelController = {
  // 导出任务到Excel
  async exportTasks(req: Request, res: Response) {
    try {
      const { projectId } = req.query;
      const buffer = await excelService.exportTasksToExcel(projectId ? parseInt(projectId as string) : undefined);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=tasks_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting tasks:", error);
      res.status(500).json({ error: "Failed to export tasks" });
    }
  },

  // 导出BUG到Excel
  async exportBugs(req: Request, res: Response) {
    try {
      const { projectId } = req.query;
      const buffer = await excelService.exportBugsToExcel(projectId ? parseInt(projectId as string) : undefined);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=bugs_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting bugs:", error);
      res.status(500).json({ error: "Failed to export bugs" });
    }
  },

  // 导出全部数据到Excel（多Sheet）
  async exportAll(req: Request, res: Response) {
    try {
      const buffer = await excelService.exportAllToExcel();

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=full_export_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting all data:", error);
      res.status(500).json({ error: "Failed to export all data" });
    }
  },

  // 从Excel导入任务
  async importTasks(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const result = await excelService.importTasksFromExcel(req.file.buffer, parseInt(projectId));
      res.json(result);
    } catch (error) {
      console.error("Error importing tasks:", error);
      res.status(500).json({ error: "Failed to import tasks" });
    }
  },

  // 从Excel导入BUG
  async importBugs(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const result = await excelService.importBugsFromExcel(req.file.buffer, parseInt(projectId));
      res.json(result);
    } catch (error) {
      console.error("Error importing bugs:", error);
      res.status(500).json({ error: "Failed to import bugs" });
    }
  },

  // 下载任务导入模板
  async downloadTaskTemplate(req: Request, res: Response) {
    try {
      const buffer = excelService.generateTaskTemplate();

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=task_import_template.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading task template:", error);
      res.status(500).json({ error: "Failed to download task template" });
    }
  },

  // 下载BUG导入模板
  async downloadBugTemplate(req: Request, res: Response) {
    try {
      const buffer = excelService.generateBugTemplate();

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=bug_import_template.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading bug template:", error);
      res.status(500).json({ error: "Failed to download bug template" });
    }
  },
};