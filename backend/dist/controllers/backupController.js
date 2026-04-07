"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupController = void 0;
const database_1 = require("../config/database");
const Task_1 = require("../entities/Task");
const Bug_1 = require("../entities/Bug");
const Project_1 = require("../entities/Project");
const User_1 = require("../entities/User");
const OperationLog_1 = require("../entities/OperationLog");
const SystemConfig_1 = require("../entities/SystemConfig");
exports.backupController = {
    async backup(req, res) {
        try {
            const taskRepository = database_1.AppDataSource.getRepository(Task_1.Task);
            const bugRepository = database_1.AppDataSource.getRepository(Bug_1.Bug);
            const projectRepository = database_1.AppDataSource.getRepository(Project_1.Project);
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const logRepository = database_1.AppDataSource.getRepository(OperationLog_1.OperationLog);
            const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
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
        }
        catch (error) {
            console.error("Error backing up data:", error);
            res.status(500).json({ error: "备份失败" });
        }
    },
    async restore(req, res) {
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        await queryRunner.startTransaction();
        try {
            const backupData = req.body;
            if (!backupData || !backupData.data) {
                return res.status(400).json({ error: "无效的备份文件" });
            }
            const { users, projects, tasks, bugs, logs, configs } = backupData.data;
            await queryRunner.manager.delete(OperationLog_1.OperationLog, {});
            await queryRunner.manager.delete(Bug_1.Bug, {});
            await queryRunner.manager.delete(Task_1.Task, {});
            await queryRunner.manager.delete(Project_1.Project, {});
            await queryRunner.manager.delete(User_1.User, {});
            if (users && users.length > 0) {
                for (const u of users) {
                    const newUser = queryRunner.manager.create(User_1.User, {
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
                    const newProject = queryRunner.manager.create(Project_1.Project, {
                        name: p.name,
                        description: p.description,
                        status: p.status,
                        createdBy: p.managerId || 1,
                        manager: p.managerId ? { id: p.managerId } : null,
                    });
                    await queryRunner.manager.save(newProject);
                }
            }
            if (tasks && tasks.length > 0) {
                const rootTasks = tasks.filter((t) => !t.parentTaskId);
                const subtasks = tasks.filter((t) => t.parentTaskId);
                for (const t of rootTasks) {
                    const newTask = queryRunner.manager.create(Task_1.Task, {
                        title: t.title,
                        description: t.description,
                        priority: t.priority,
                        status: t.status,
                        dueDate: t.dueDate,
                        project: t.projectId ? { id: t.projectId } : null,
                        assignee: t.assigneeId ? { id: t.assigneeId } : null,
                        creator: t.creatorId ? { id: t.creatorId } : null,
                    });
                    await queryRunner.manager.save(newTask);
                }
                for (const t of subtasks) {
                    const newTask = queryRunner.manager.create(Task_1.Task, {
                        title: t.title,
                        description: t.description,
                        priority: t.priority,
                        status: t.status,
                        dueDate: t.dueDate,
                        project: t.projectId ? { id: t.projectId } : null,
                        assignee: t.assigneeId ? { id: t.assigneeId } : null,
                        creator: t.creatorId ? { id: t.creatorId } : null,
                        parentTask: t.parentTaskId ? { id: t.parentTaskId } : null,
                    });
                    await queryRunner.manager.save(newTask);
                }
            }
            if (bugs && bugs.length > 0) {
                for (const b of bugs) {
                    const newBug = queryRunner.manager.create(Bug_1.Bug, {
                        title: b.title,
                        description: b.description,
                        severity: b.severity,
                        status: b.status,
                        reproduceSteps: b.reproduceSteps,
                        dueDate: b.dueDate,
                        project: b.projectId ? { id: b.projectId } : null,
                        assignee: b.assigneeId ? { id: b.assigneeId } : null,
                        reporter: b.reporterId ? { id: b.reporterId } : null,
                    });
                    await queryRunner.manager.save(newBug);
                }
            }
            if (configs && configs.length > 0) {
                for (const c of configs) {
                    const newConfig = queryRunner.manager.create(SystemConfig_1.SystemConfig, {
                        key: c.key,
                        value: c.value,
                        description: c.description,
                    });
                    await queryRunner.manager.save(newConfig);
                }
            }
            if (logs && logs.length > 0) {
                for (const l of logs) {
                    const newLog = queryRunner.manager.create(OperationLog_1.OperationLog, {
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
                        user: l.userId ? { id: l.userId } : null,
                    });
                    await queryRunner.manager.save(newLog);
                }
            }
            await queryRunner.commitTransaction();
            res.json({ success: true, message: "数据恢复成功" });
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Error restoring data:", error);
            res.status(500).json({ error: "恢复失败" });
        }
        finally {
            await queryRunner.release();
        }
    },
    async clearDatabase(req, res) {
        try {
            await database_1.AppDataSource.query(`UPDATE task SET "parentTaskId" = NULL`);
            await database_1.AppDataSource.query(`DELETE FROM task_dependencies`);
            await database_1.AppDataSource.query(`DELETE FROM operation_log`);
            await database_1.AppDataSource.query(`DELETE FROM bug`);
            await database_1.AppDataSource.query(`DELETE FROM task`);
            await database_1.AppDataSource.query(`DELETE FROM project`);
            res.json({ success: true, message: "数据库已清空（用户数据保留）" });
        }
        catch (error) {
            console.error("Error clearing database:", error);
            res.status(500).json({ error: "清空失败: " + error.message });
        }
    },
    async clearAllDatabase(req, res) {
        try {
            await database_1.AppDataSource.query(`UPDATE task SET "parentTaskId" = NULL`);
            await database_1.AppDataSource.query(`DELETE FROM task_dependencies`);
            await database_1.AppDataSource.query(`DELETE FROM operation_log`);
            await database_1.AppDataSource.query(`DELETE FROM bug`);
            await database_1.AppDataSource.query(`DELETE FROM task`);
            await database_1.AppDataSource.query(`DELETE FROM project`);
            await database_1.AppDataSource.query(`DELETE FROM user`);
            await database_1.AppDataSource.query(`DELETE FROM system_config`);
            res.json({ success: true, message: "所有数据已清空（包含用户）" });
        }
        catch (error) {
            console.error("Error clearing all database:", error);
            res.status(500).json({ error: "清空失败: " + error.message });
        }
    },
};
//# sourceMappingURL=backupController.js.map