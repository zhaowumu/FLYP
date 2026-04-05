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
      const projects = await projectRepository.find({ relations: ["manager"] });
      const tasks = await taskRepository.find({
        relations: ["project", "assignee", "creator", "parentTask"],
      });
      const bugs = await bugRepository.find({
        relations: ["project", "assignee", "reporter"],
      });
      const logs = await logRepository.find({ relations: ["user"] });
      const configs = await configRepository.find();

      const backupData = {
        version: "2.0",
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
          let managerId: number | null = null;
          if (p.manager) {
            const manager = await queryRunner.manager.findOne(User, { where: { username: p.manager.username } });
            if (manager) managerId = manager.id;
          }
          if (!managerId && p.createdBy) {
            managerId = p.createdBy;
          }
          const newProject = queryRunner.manager.create(Project, {
            name: p.name,
            description: p.description,
            status: p.status,
            createdBy: managerId || 1,
            manager: managerId ? { id: managerId } as any : null,
          });
          await queryRunner.manager.save(newProject);
        }
      }

      if (tasks && tasks.length > 0) {
        const rootTasks = tasks.filter((t: any) => !t.parentTask);
        const subtasks = tasks.filter((t: any) => t.parentTask);

        for (const t of rootTasks) {
          const project = t.project ? await queryRunner.manager.findOne(Project, { where: { name: t.project.name } }) : null;
          const assignee = t.assignee ? await queryRunner.manager.findOne(User, { where: { username: t.assignee.username } }) : null;
          const creator = t.creator ? await queryRunner.manager.findOne(User, { where: { username: t.creator.username } }) : null;

          const newTask = queryRunner.manager.create(Task, {
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            project: project ? { id: project.id } as any : null,
            assignee: assignee ? { id: assignee.id } as any : null,
            creator: creator ? { id: creator.id } as any : null,
          });
          await queryRunner.manager.save(newTask);
        }

        for (const t of subtasks) {
          const project = t.project ? await queryRunner.manager.findOne(Project, { where: { name: t.project.name } }) : null;
          const assignee = t.assignee ? await queryRunner.manager.findOne(User, { where: { username: t.assignee.username } }) : null;
          const creator = t.creator ? await queryRunner.manager.findOne(User, { where: { username: t.creator.username } }) : null;
          const parentTask = t.parentTask ? await queryRunner.manager.findOne(Task, { where: { title: t.parentTask.title } }) : null;

          const newTask = queryRunner.manager.create(Task, {
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            project: project ? { id: project.id } as any : null,
            assignee: assignee ? { id: assignee.id } as any : null,
            creator: creator ? { id: creator.id } as any : null,
            parentTask: parentTask ? { id: parentTask.id } as any : null,
          });
          await queryRunner.manager.save(newTask);
        }
      }

      if (bugs && bugs.length > 0) {
        for (const b of bugs) {
          const project = b.project ? await queryRunner.manager.findOne(Project, { where: { name: b.project.name } }) : null;
          const assignee = b.assignee ? await queryRunner.manager.findOne(User, { where: { username: b.assignee.username } }) : null;
          const reporter = b.reporter ? await queryRunner.manager.findOne(User, { where: { username: b.reporter.username } }) : null;

          const newBug = queryRunner.manager.create(Bug, {
            title: b.title,
            description: b.description,
            severity: b.severity,
            status: b.status,
            reproduceSteps: b.reproduceSteps,
            dueDate: b.dueDate,
            project: project ? { id: project.id } as any : null,
            assignee: assignee ? { id: assignee.id } as any : null,
            reporter: reporter ? { id: reporter.id } as any : null,
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
          const user = l.user ? await queryRunner.manager.findOne(User, { where: { username: l.user.username } }) : null;
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
            user: user ? { id: user.id } as any : null,
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
