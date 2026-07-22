import { Request, Response } from "express";
import { logger } from "../services/logger";
import { AppDataSource } from "../config/database";
import { OperationLog } from "../entities/OperationLog";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";

const operationLogRepository = AppDataSource.getRepository(OperationLog);
const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);

/**
 * GET /api/operation-logs?page=1&pageSize=20&userId=1&action=comment&targetType=task&keyword=xxx
 * 获取操作日志，支持后端分页和筛选
 */
export const getOperationLogs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const { userId, action, targetType } = req.query;

    const where: any = {};
    if (userId) where.user = { id: parseInt(userId as string) };
    if (action) where.action = action as string;
    if (targetType) where.targetType = targetType as string;

    const whereClause = Object.keys(where).length ? where : undefined;

    const [logs, total] = await operationLogRepository.findAndCount({
      relations: ['user'],
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      ...(whereClause ? { where: whereClause } : {}),
    });

    // 批量查任务/缺陷标题，避免 N+1
    const taskIds = [...new Set(logs.filter(l => l.targetType === "task").map(l => l.targetId))];
    const bugIds = [...new Set(logs.filter(l => l.targetType === "bug").map(l => l.targetId))];
    const taskMap: Record<number, string> = {};
    const bugMap: Record<number, string> = {};
    if (taskIds.length) {
      const tasks = await taskRepository.findByIds(taskIds);
      tasks.forEach(t => { taskMap[t.id] = t.title; });
    }
    if (bugIds.length) {
      const bugs = await bugRepository.findByIds(bugIds);
      bugs.forEach(b => { bugMap[b.id] = b.title; });
    }

    const data = logs.map(log => {
      const title = log.targetType === "task" ? taskMap[log.targetId] : bugMap[log.targetId];
      const user = log.user ? {
        id: log.user.id,
        username: log.user.username,
        realName: log.user.realName,
        avatar: log.user.avatar || undefined,
        role: log.user.role || ''
      } : { id: 0, username: '', realName: '已删除人员', avatar: undefined, role: '' };
      return {
        id: log.id,
        targetType: log.targetType,
        targetId: log.targetId,
        action: log.action,
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        oldAssignee: log.oldAssignee,
        newAssignee: log.newAssignee,
        oldPriority: log.oldPriority,
        newPriority: log.newPriority,
        oldSeverity: log.oldSeverity,
        newSeverity: log.newSeverity,
        oldDueDate: log.oldDueDate,
        newDueDate: log.newDueDate,
        remark: (log as any).remark || null,
        createdAt: log.createdAt,
        user,
        title,
      };
    });

    res.json({ data, total });
  } catch (error) {
    logger.error("Failed to fetch operation logs:", error);
    res.status(500).json({ error: "Failed to fetch operation logs" });
  }
};
