import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { OperationLog } from "../entities/OperationLog";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";

const operationLogRepository = AppDataSource.getRepository(OperationLog);
const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);

/**
 * GET /api/operation-logs?limit=20
 * 获取近期操作日志（用于 Dashboard 面板展示，不含 remark）
 * 额外拼接 taskTitle / bugTitle 方便前端展示
 */
export const getOperationLogs = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const logs = await operationLogRepository.find({
      relations: ['user'],
      order: { createdAt: "DESC" },
      take: limit,
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
      const { remark, ...rest } = log as any;
      const title = log.targetType === "task" ? taskMap[log.targetId] : bugMap[log.targetId];
      // user 为 null 时（用户已删除）显示"已删除人员"
      const user = log.user ? {
        id: log.user.id,
        username: log.user.username,
        realName: log.user.realName,
        avatar: log.user.avatar || undefined,
        role: log.user.role || ''
      } : { id: 0, username: '', realName: '已删除人员', avatar: undefined, role: '' };
      return { ...rest, user, title };
    });

    res.json({ data });
  } catch (error) {
    console.error("Failed to fetch operation logs:", error);
    res.status(500).json({ error: "Failed to fetch operation logs" });
  }
};
