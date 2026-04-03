import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { Project } from "../entities/Project";
import { User } from "../entities/User";

export const backupController = {
  // 备份所有数据
  async backup(req: Request, res: Response) {
    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const bugRepository = AppDataSource.getRepository(Bug);
      const projectRepository = AppDataSource.getRepository(Project);
      const userRepository = AppDataSource.getRepository(User);

      // 获取所有数据
      const tasks = await taskRepository.find({
        relations: ["project", "assignee", "creator", "parentTask"],
      });

      const bugs = await bugRepository.find({
        relations: ["project", "assignee", "reporter"],
      });

      const projects = await projectRepository.find({
        relations: ["members"],
      });

      const users = await userRepository.find();

      // 构建备份数据
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          users,
          projects,
          tasks,
          bugs,
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

  // 恢复数据
  async restore(req: Request, res: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const backupData = req.body;

      if (!backupData || !backupData.data) {
        return res.status(400).json({ error: "无效的备份文件" });
      }

      const { users, projects, tasks, bugs } = backupData.data;

      // 清空现有数据（按依赖顺序）
      await queryRunner.manager.delete(Bug, {});
      await queryRunner.manager.delete(Task, {});
      await queryRunner.manager.delete(Project, {});
      // 不删除用户，只更新或插入

      // 恢复用户
      if (users && users.length > 0) {
        for (const user of users) {
          const existingUser = await queryRunner.manager.findOne(User, { where: { username: user.username } });
          if (!existingUser) {
            const newUser = queryRunner.manager.create(User, {
              username: user.username,
              realName: user.realName,
              email: user.email,
              phone: user.phone,
              role: user.role,
              password: "123456", // 默认密码
            });
            await queryRunner.manager.save(newUser);
          }
        }
      }

      // 恢复项目
      if (projects && projects.length > 0) {
        for (const project of projects) {
          const newProject = queryRunner.manager.create(Project, {
            name: project.name,
            description: project.description,
            status: project.status,
          });
          await queryRunner.manager.save(newProject);
        }
      }

      // 恢复任务
      if (tasks && tasks.length > 0) {
        // 先恢复没有父任务的任务
        const rootTasks = tasks.filter((t: any) => !t.parentTask);
        const subtasks = tasks.filter((t: any) => t.parentTask);

        for (const task of rootTasks) {
          const project = await queryRunner.manager.findOne(Project, { where: { name: task.project?.name } });
          const assignee = task.assignee ? await queryRunner.manager.findOne(User, { where: { username: task.assignee.username } }) : null;
          const creator = task.creator ? await queryRunner.manager.findOne(User, { where: { username: task.creator.username } }) : null;

          const newTask = queryRunner.manager.create(Task, {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
            project: project ? { id: project.id } as any : null,
            assignee: assignee ? { id: assignee.id } as any : null,
            creator: creator ? { id: creator.id } as any : null,
          });
          await queryRunner.manager.save(newTask);
        }

        // 恢复子任务
        for (const task of subtasks) {
          const project = await queryRunner.manager.findOne(Project, { where: { name: task.project?.name } });
          const assignee = task.assignee ? await queryRunner.manager.findOne(User, { where: { username: task.assignee.username } }) : null;
          const creator = task.creator ? await queryRunner.manager.findOne(User, { where: { username: task.creator.username } }) : null;
          const parentTask = task.parentTask ? await queryRunner.manager.findOne(Task, { where: { title: task.parentTask.title } }) : null;

          const newTask = queryRunner.manager.create(Task, {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
            project: project ? { id: project.id } as any : null,
            assignee: assignee ? { id: assignee.id } as any : null,
            creator: creator ? { id: creator.id } as any : null,
            parentTask: parentTask ? { id: parentTask.id } as any : null,
          });
          await queryRunner.manager.save(newTask);
        }
      }

      // 恢复缺陷
      if (bugs && bugs.length > 0) {
        for (const bug of bugs) {
          const project = await queryRunner.manager.findOne(Project, { where: { name: bug.project?.name } });
          const assignee = bug.assignee ? await queryRunner.manager.findOne(User, { where: { username: bug.assignee.username } }) : null;
          const reporter = bug.reporter ? await queryRunner.manager.findOne(User, { where: { username: bug.reporter.username } }) : null;

          const newBug = queryRunner.manager.create(Bug, {
            title: bug.title,
            description: bug.description,
            severity: bug.severity,
            status: bug.status,
            reproduceSteps: bug.reproduceSteps,
            project: project ? { id: project.id } as any : null,
            assignee: assignee ? { id: assignee.id } as any : null,
            reporter: reporter ? { id: reporter.id } as any : null,
          });
          await queryRunner.manager.save(newBug);
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

  // 清空数据库（删除所有数据但保留用户）
  async clearDatabase(req: Request, res: Response) {
    try {
      // 先删除外键关联的子任务
      await AppDataSource.query(`UPDATE task SET "parentTaskId" = NULL`);
      
      // 删除ManyToMany关联表
      await AppDataSource.query(`DELETE FROM task_dependencies`);
      
      // 删除实体数据
      await AppDataSource.query(`DELETE FROM bug`);
      await AppDataSource.query(`DELETE FROM task`);
      await AppDataSource.query(`DELETE FROM project`);

      res.json({ success: true, message: "数据库已清空（用户数据保留）" });
    } catch (error) {
      console.error("Error clearing database:", error);
      res.status(500).json({ error: "清空失败: " + (error as Error).message });
    }
  },
};
