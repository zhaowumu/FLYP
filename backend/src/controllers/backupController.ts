import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { Project } from "../entities/Project";
import { User } from "../entities/User";
import { OperationLog } from "../entities/OperationLog";
import { SystemConfig } from "../entities/SystemConfig";

export const backupController = {
  async backup(req: Request, res: Response) {
    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const bugRepository = AppDataSource.getRepository(Bug);
      const projectRepository = AppDataSource.getRepository(Project);
      const userRepository = AppDataSource.getRepository(User);
      const logRepository = AppDataSource.getRepository(OperationLog);
      const configRepository = AppDataSource.getRepository(SystemConfig);

      const users = await userRepository.find();
      const projectsRaw = await projectRepository.find({ relations: ["manager"] });
      const tasksRaw = await taskRepository.find({
        relations: ["project", "assignee", "creator", "parentTask"],
      });
      const bugsRaw = await bugRepository.find({
        relations: ["project", "assignee", "reporter"],
      });
      const logsRaw = await logRepository.find({ relations: ["user"] });
      const configs = await configRepository.find();

      const projects = projectsRaw.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        createdBy: p.createdBy,
        managerId: p.manager?.id ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      const tasks = tasksRaw.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
        projectId: t.project?.id ?? null,
        assigneeId: t.assignee?.id ?? null,
        creatorId: t.creator?.id ?? null,
        parentTaskId: t.parentTask?.id ?? null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      const bugs = bugsRaw.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        severity: b.severity,
        status: b.status,
        reproduceSteps: b.reproduceSteps,
        dueDate: b.dueDate,
        projectId: b.project?.id ?? null,
        assigneeId: b.assignee?.id ?? null,
        reporterId: b.reporter?.id ?? null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }));

      const logs = logsRaw.map((l) => ({
        id: l.id,
        targetType: l.targetType,
        targetId: l.targetId,
        userId: l.user?.id ?? null,
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

      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          users,
          projects,
          tasks,
          bugs,
          logs,
          configs,
        },
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=backup_${Date.now()}.json`);
      res.json(backupData);
    } catch (error) {
      console.error("Error backing up data:", error);
      res.status(500).json({ error: "备份失败" });
    }
  },

  async restore(req: Request, res: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const backupData = req.body;

      if (!backupData || !backupData.data) {
        return res.status(400).json({ error: "无效的备份文件" });
      }

      const { users, projects, tasks, bugs, logs, configs } = backupData.data;

      await queryRunner.manager.delete(OperationLog, {});
      await queryRunner.manager.delete(Bug, {});
      await queryRunner.manager.delete(Task, {});
      await queryRunner.manager.delete(Project, {});
      await queryRunner.manager.delete(User, {});

      if (users && users.length > 0) {
        for (const u of users) {
          const newUser = queryRunner.manager.create(User, {
            username: u.username,
            password: u.password,
            realName: u.realName,
            phone: u.phone,
            role: u.role,
            isActive: u.isActive,
          });
          await queryRunner.manager.save(newUser);
        }
      }

      if (projects && projects.length > 0) {
        for (const p of projects) {
          const newProject = queryRunner.manager.create(Project, {
            name: p.name,
            description: p.description,
            status: p.status,
            createdBy: p.managerId || 1,
            manager: p.managerId ? { id: p.managerId } as any : null,
          });
          await queryRunner.manager.save(newProject);
        }
      }

      if (tasks && tasks.length > 0) {
        const rootTasks = tasks.filter((t: any) => !t.parentTaskId);
        const subtasks = tasks.filter((t: any) => t.parentTaskId);

        for (const t of rootTasks) {
          const newTask = queryRunner.manager.create(Task, {
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            project: t.projectId ? { id: t.projectId } as any : null,
            assignee: t.assigneeId ? { id: t.assigneeId } as any : null,
            creator: t.creatorId ? { id: t.creatorId } as any : null,
          });
          await queryRunner.manager.save(newTask);
        }

        for (const t of subtasks) {
          const newTask = queryRunner.manager.create(Task, {
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            project: t.projectId ? { id: t.projectId } as any : null,
            assignee: t.assigneeId ? { id: t.assigneeId } as any : null,
            creator: t.creatorId ? { id: t.creatorId } as any : null,
            parentTask: t.parentTaskId ? { id: t.parentTaskId } as any : null,
          });
          await queryRunner.manager.save(newTask);
        }
      }

      if (bugs && bugs.length > 0) {
        for (const b of bugs) {
          const newBug = queryRunner.manager.create(Bug, {
            title: b.title,
            description: b.description,
            severity: b.severity,
            status: b.status,
            reproduceSteps: b.reproduceSteps,
            dueDate: b.dueDate,
            project: b.projectId ? { id: b.projectId } as any : null,
            assignee: b.assigneeId ? { id: b.assigneeId } as any : null,
            reporter: b.reporterId ? { id: b.reporterId } as any : null,
          });
          await queryRunner.manager.save(newBug);
        }
      }

      if (configs && configs.length > 0) {
        for (const c of configs) {
          const newConfig = queryRunner.manager.create(SystemConfig, {
            key: c.key,
            value: c.value,
            description: c.description,
          });
          await queryRunner.manager.save(newConfig);
        }
      }

      if (logs && logs.length > 0) {
        for (const l of logs) {
          const newLog = queryRunner.manager.create(OperationLog, {
            targetType: l.targetType,
            targetId: l.targetId,
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
            user: l.userId ? { id: l.userId } as any : null,
          });
          await queryRunner.manager.save(newLog);
        }
      }

      await queryRunner.commitTransaction();
      res.json({ success: true, message: "数据恢复成功" });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error restoring data:", error);
      res.status(500).json({ error: "恢复失败" });
    } finally {
      await queryRunner.release();
    }
  },

  async clearDatabase(req: Request, res: Response) {
    try {
      await AppDataSource.query(`UPDATE task SET "parentTaskId" = NULL`);
      await AppDataSource.query(`DELETE FROM task_dependencies`);
      await AppDataSource.query(`DELETE FROM operation_log`);
      await AppDataSource.query(`DELETE FROM bug`);
      await AppDataSource.query(`DELETE FROM task`);
      await AppDataSource.query(`DELETE FROM project`);

      res.json({ success: true, message: "数据库已清空（用户数据保留）" });
    } catch (error) {
      console.error("Error clearing database:", error);
      res.status(500).json({ error: "清空失败: " + (error as Error).message });
    }
  },

  async clearAllDatabase(req: Request, res: Response) {
    try {
      await AppDataSource.query(`UPDATE task SET "parentTaskId" = NULL`);
      await AppDataSource.query(`DELETE FROM task_dependencies`);
      await AppDataSource.query(`DELETE FROM operation_log`);
      await AppDataSource.query(`DELETE FROM bug`);
      await AppDataSource.query(`DELETE FROM task`);
      await AppDataSource.query(`DELETE FROM project`);
      await AppDataSource.query(`DELETE FROM user`);
      await AppDataSource.query(`DELETE FROM system_config`);

      res.json({ success: true, message: "所有数据已清空（包含用户）" });
    } catch (error) {
      console.error("Error clearing all database:", error);
      res.status(500).json({ error: "清空失败: " + (error as Error).message });
    }
  },
};
