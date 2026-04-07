"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelController = void 0;
const XLSX = __importStar(require("xlsx"));
const database_1 = require("../config/database");
const Task_1 = require("../entities/Task");
const Bug_1 = require("../entities/Bug");
const User_1 = require("../entities/User");
const Project_1 = require("../entities/Project");
const OperationLog_1 = require("../entities/OperationLog");
const SystemConfig_1 = require("../entities/SystemConfig");
exports.excelController = {
    async exportAll(req, res) {
        try {
            const { format } = req.query;
            const useRawFormat = format === "raw";
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const projectRepository = database_1.AppDataSource.getRepository(Project_1.Project);
            const taskRepository = database_1.AppDataSource.getRepository(Task_1.Task);
            const bugRepository = database_1.AppDataSource.getRepository(Bug_1.Bug);
            const operationLogRepository = database_1.AppDataSource.getRepository(OperationLog_1.OperationLog);
            const systemConfigRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
            const users = await userRepository.find();
            const projects = await projectRepository.find({ relations: ["manager"] });
            const tasks = await taskRepository.find({ relations: ["project", "assignee", "creator", "parentTask"] });
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
                    assigneeId: t.assignee?.id,
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
            }
            else {
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
                    assignee: t.assignee?.realName || "未分配",
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
            const filename = useRawFormat ? `flyp_export_raw_${Date.now()}.xlsx` : `flyp_export_${Date.now()}.xlsx`;
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
            res.send(buffer);
        }
        catch (error) {
            console.error("Error exporting data:", error);
            res.status(500).json({ error: "导出失败" });
        }
    },
};
//# sourceMappingURL=excelController.js.map