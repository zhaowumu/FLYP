import { Request, Response } from "express";
import * as XLSX from "xlsx";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { User } from "../entities/User";
import { Project } from "../entities/Project";
import { OperationLog } from "../entities/OperationLog";
import { SystemConfig } from "../entities/SystemConfig";

export const excelController = {
  async exportAll(req: Request, res: Response) {
    try {
      const { format } = req.query;
      const useRawFormat = format === "raw";

      const userRepository = AppDataSource.getRepository(User);
      const projectRepository = AppDataSource.getRepository(Project);
      const taskRepository = AppDataSource.getRepository(Task);
      const bugRepository = AppDataSource.getRepository(Bug);
      const operationLogRepository = AppDataSource.getRepository(OperationLog);
      const systemConfigRepository = AppDataSource.getRepository(SystemConfig);

      const users = await userRepository.find();
      const projects = await projectRepository.find({ relations: ["manager"] });
      const tasks = await taskRepository.find({ relations: ["project", "assignees", "creator", "parentTask"] });
      const bugs = await bugRepository.find({ relations: ["project", "assignee", "reporter"] });
      const logs = await operationLogRepository.find({ relations: ["user"], order: { createdAt: "DESC" } });
      const configs = await systemConfigRepository.find();

      const workbook = XLSX.utils.book_new();

      if (useRawFormat) {
        const usersData = users.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          realName: u.realName,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(usersData), "User");

        const projectsData = projects.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(projectsData), "Project");

        const tasksData = tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          projectId: t.project?.id,
          assigneeIds: t.assignees?.map((a: any) => a.id).join(',') || '',
          creatorId: t.creator?.id,
          parentTaskId: t.parentTask?.id,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tasksData), "Task");

        const bugsData = bugs.map(b => ({
          id: b.id,
          title: b.title,
          description: b.description,
          severity: b.severity,
          status: b.status,
          reproduceSteps: b.reproduceSteps,
          projectId: b.project?.id,
          assigneeId: b.assignee?.id,
          reporterId: b.reporter?.id,
          dueDate: b.dueDate,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(bugsData), "Bug");

        const logsData = logs.map(l => ({
          id: l.id,
          targetType: l.targetType,
          targetId: l.targetId,
          userId: l.user?.id,
          action: l.action,
          oldStatus: l.oldStatus,
          newStatus: l.newStatus,
          oldAssignee: l.oldAssignee,
          newAssignee: l.newAssignee,
          oldPriority: l.oldPriority,
          newPriority: l.newPriority,
          oldSeverity: l.oldSeverity,
          newSeverity: l.newSeverity,
          oldDueDate: l.oldDueDate,
          newDueDate: l.newDueDate,
          remark: l.remark,
          createdAt: l.createdAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logsData), "OperationLog");

        const configsData = configs.map(c => ({
          id: c.id,
          key: c.key,
          value: c.value,
          description: c.description,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(configsData), "SystemConfig");
      } else {
        const usersData = users.map(u => ({
          id: u.id,
          username: u.username,
          password: u.password,
          realName: u.realName,
          phone: u.phone,
          role: u.role,
          isActive: u.isActive ? "启用" : "禁用",
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(usersData), "User");

        const projectsData = projects.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          createdBy: p.manager?.realName || "未知",
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(projectsData), "Project");

        const tasksData = tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          project: t.project?.name || "无",
          assignee: t.assignees?.map((a: any) => a.realName).join('、') || "未分配",
          creator: t.creator?.realName || "未知",
          parentTask: t.parentTask?.title || "无",
          dueDate: t.dueDate,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tasksData), "Task");

        const bugsData = bugs.map(b => ({
          id: b.id,
          title: b.title,
          description: b.description,
          severity: b.severity,
          status: b.status,
          reproduceSteps: b.reproduceSteps,
          project: b.project?.name || "无",
          assignee: b.assignee?.realName || "未分配",
          reporter: b.reporter?.realName || "未知",
          dueDate: b.dueDate,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(bugsData), "Bug");

        const logsData = logs.map(l => ({
          id: l.id,
          targetType: l.targetType === "task" ? "任务" : "缺陷",
          targetId: l.targetId,
          user: l.user?.realName || "未知",
          action: l.action,
          oldStatus: l.oldStatus,
          newStatus: l.newStatus,
          oldAssignee: l.oldAssignee,
          newAssignee: l.newAssignee,
          oldPriority: l.oldPriority,
          newPriority: l.newPriority,
          oldSeverity: l.oldSeverity,
          newSeverity: l.newSeverity,
          oldDueDate: l.oldDueDate,
          newDueDate: l.newDueDate,
          remark: l.remark,
          createdAt: l.createdAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logsData), "OperationLog");

        const configsData = configs.map(c => ({
          id: c.id,
          key: c.key,
          value: c.value,
          description: c.description,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(configsData), "SystemConfig");
      }

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const filename = useRawFormat ? `newbee_export_raw_${Date.now()}.xlsx` : `newbee_export_${Date.now()}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "导出失败" });
    }
  },
};
