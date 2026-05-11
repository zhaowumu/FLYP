import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { OperationLog } from "../entities/OperationLog";
import { User } from "../entities/User";
import { DingTalkService } from "../services/dingtalkService";

const dingTalkService = new DingTalkService();

const taskRepository = AppDataSource.getRepository(Task);
const userRepository = AppDataSource.getRepository(User);
const operationLogRepository = AppDataSource.getRepository(OperationLog);

async function createOperationLog(
  targetId: number,
  userId: number,
  userName: string,
  action: string,
  extraFields: Partial<OperationLog> = {}
): Promise<OperationLog> {
  const log = operationLogRepository.create({
    targetType: "task",
    targetId,
    user: { id: userId },
    action,
    ...extraFields,
  });
  return operationLogRepository.save(log);
}

async function getTaskLogs(taskId: number): Promise<OperationLog[]> {
  return operationLogRepository.find({
    where: { targetType: "task", targetId: taskId },
    relations: ["user"],
    order: { createdAt: "ASC" },
  });
}

/** 辅助：将 assigneeIds 数组转为 User 实体数组 */
async function resolveAssigneeIds(ids: number[] | undefined): Promise<User[]> {
  if (!ids || ids.length === 0) return [];
  const users = await userRepository.findByIds(ids);
  return users;
}

/** 辅助：获取 assignees 的显示名称列表 */
function getAssigneeNames(assignees: User[] | undefined): string {
  if (!assignees || assignees.length === 0) return "未分配";
  return assignees.map(u => u.realName).join("、");
}

export const taskController = {
  async createTask(req: Request, res: Response) {
    try {
      const { title, description, priority, dueDate, projectId, assigneeIds, parentTaskId, category } = req.body;
      const createdBy = (req as any).user.id;

      const creator = await userRepository.findOne({ where: { id: createdBy } });

      const assignees = await resolveAssigneeIds(assigneeIds);

      // 有负责人则直接设为进行中，否则待处理
      const initialStatus = (assigneeIds && assigneeIds.length > 0) ? "in_progress" : "pending";

      const task = taskRepository.create({
        title,
        description,
        priority: priority || "medium",
        status: initialStatus,
        dueDate,
        category: category || null,
        project: projectId ? { id: projectId } : undefined,
        assignees,
        creator: { id: createdBy },
        parentTask: parentTaskId ? { id: parentTaskId } : undefined,
      });

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        createdBy,
        creator?.realName || "未知用户",
        "create"
      );

      dingTalkService.sendNotification("create", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        priority: task.priority,
        creator: creator?.realName || "未知用户",
        time: new Date().toLocaleString("zh-CN")
      });

      const savedTask = await taskRepository.findOne({
        where: { id: task.id },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.status(201).json(savedTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  },

  async getAllTasks(req: Request, res: Response) {
    try {
      const { projectId, status, assigneeId, creatorId, priority, sortBy, sortOrder, category } = req.query;
      const where: any = {};

      if (projectId) where.project = { id: projectId };
      if (status) where.status = status;
      if (creatorId) where.creator = { id: creatorId };
      if (priority) where.priority = priority;
      if (category) where.category = category;

      const validSortFields = ["createdAt", "updatedAt", "priority", "dueDate", "status", "title"];
      const sortField = sortBy && validSortFields.includes(sortBy as string) ? sortBy as string : "createdAt";
      const order = sortOrder === "ASC" ? "ASC" : "DESC";

      // 如果按 assigneeId 过滤，需要通过关联表查询
      if (assigneeId) {
        const tasks = await taskRepository
          .createQueryBuilder("task")
          .leftJoinAndSelect("task.project", "project")
          .leftJoinAndSelect("project.managers", "project_manager")
          .leftJoinAndSelect("task.assignees", "assignees")
          .leftJoinAndSelect("task.creator", "creator")
          .leftJoinAndSelect("task.parentTask", "parentTask")
          .leftJoinAndSelect("task.subtasks", "subtasks")
          .leftJoin("task.assignees", "filterAssignee", "filterAssignee.id = :aid", { aid: assigneeId })
          .where("filterAssignee.id IS NOT NULL")
          .andWhere(projectId ? "project.id = :pid" : "1=1", { pid: projectId })
          .andWhere(status ? "task.status = :status" : "1=1", { status })
          .andWhere(priority ? "task.priority = :priority" : "1=1", { priority })
          .andWhere(category ? "task.category = :category" : "1=1", { category })
          .orderBy(`task.${sortField}`, order)
          .getMany();
        return res.json(tasks);
      }

      const tasks = await taskRepository.find({
        where,
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
        order: { [sortField]: order },
      });

      res.json(tasks);
    } catch (error) {
      console.error("Error getting tasks:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  },

  async getTaskById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const logs = await getTaskLogs(task.id);

      res.json({ ...task, operationLogs: logs });
    } catch (error) {
      console.error("Error getting task:", error);
      res.status(500).json({ error: "Failed to get task" });
    }
  },

  async updateTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as any).user.id;

      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignees", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      // 处理 assignees 变更
      if (updateData.assigneeIds) {
        const oldAssigneeNames = getAssigneeNames(task.assignees);
        const newAssignees = await resolveAssigneeIds(updateData.assigneeIds);
        const newAssigneeNames = getAssigneeNames(newAssignees);

        await createOperationLog(
          task.id,
          userId,
          userName,
          "assign",
          {
            oldAssignee: oldAssigneeNames,
            newAssignee: newAssigneeNames,
            remark: updateData.log?.remark || "",
          }
        );

        dingTalkService.sendNotification("assignee_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldAssignee: oldAssigneeNames,
          newAssignee: newAssigneeNames,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });

        task.assignees = newAssignees;

        // 待处理 → 指派后自动升级为进行中
        if (task.status === "pending" && newAssignees.length > 0) {
          task.status = "in_progress";
        }

        // 清空负责人联动：in_progress/completed → pending
        if (newAssignees.length === 0 && (task.status === "in_progress" || task.status === "completed")) {
          const oldStatus = task.status;
          task.status = "pending";
          // 防止后续 Object.assign 覆盖此状态
          updateData.status = "pending";

          // 同步记录状态变更日志
          await createOperationLog(
            task.id,
            userId,
            userName,
            "status_change",
            {
              oldStatus: oldStatus,
              newStatus: "pending",
              remark: "清空负责人，状态自动变更为待处理",
            }
          );
        }

        delete updateData.assigneeIds;
      }

      // 处理创建人变更
      if (updateData.creatorId) {
        const newCreator = await userRepository.findOne({ where: { id: updateData.creatorId } });
        if (newCreator) {
          await createOperationLog(
            task.id,
            userId,
            userName,
            "creator_change",
            {
              oldAssignee: task.creator?.realName || "未知用户",
              newAssignee: newCreator.realName,
              remark: updateData.log?.remark || "",
            }
          );

          task.creator = newCreator;
        }
        delete updateData.creatorId;
      }

      // 处理截止日期变更
      if (updateData.dueDate !== undefined) {
        const oldDueDate = task.dueDate;
        const newDueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;

        if (oldDueDate?.getTime() !== newDueDate?.getTime()) {
          await createOperationLog(
            task.id,
            userId,
            userName,
            "due_date_change",
            {
              oldDueDate: oldDueDate ? oldDueDate.toISOString() : undefined,
              newDueDate: newDueDate ? newDueDate.toISOString() : undefined,
              remark: updateData.log?.remark || "",
            }
          );
        }

        task.dueDate = newDueDate as Date;
        delete updateData.dueDate;
      }

      // 处理分类变更
      if (updateData.category !== undefined) {
        const oldCategory = task.category;
        const newCategory = updateData.category || null;

        if (oldCategory !== newCategory) {
          await createOperationLog(
            task.id,
            userId,
            userName,
            "category_change",
            {
              remark: `分类从「${oldCategory || '未设置'}」变更为「${newCategory || '未设置'}」${updateData.log?.remark ? ' - ' + updateData.log.remark : ''}`,
            }
          );
        }

        task.category = newCategory;
        delete updateData.category;
      }

      // 状态变更联动校验
      if (updateData.status && updateData.status !== task.status) {
        const targetStatus = updateData.status;

        if (targetStatus === "in_progress" && (!task.assignees || task.assignees.length === 0)) {
          return res.status(400).json({ error: "进行中的任务必须至少有一位负责人" });
        }

        if (targetStatus === "completed" && (!task.assignees || task.assignees.length === 0)) {
          // 无负责人时自动将创建人设为负责人
          if (task.creator) {
            task.assignees = [task.creator];
          }
        }
      }

      if (updateData.status && updateData.status !== task.status) {
        await createOperationLog(
          task.id,
          userId,
          userName,
          "status_change",
          {
            oldStatus: task.status,
            newStatus: updateData.status,
            remark: updateData.log?.remark || "",
          }
        );

        dingTalkService.sendNotification("status_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldStatus: task.status,
          newStatus: updateData.status,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      }

      if (updateData.priority && updateData.priority !== task.priority) {
        await createOperationLog(
          task.id,
          userId,
          userName,
          "priority_change",
          {
            oldPriority: task.priority,
            newPriority: updateData.priority,
          }
        );

        dingTalkService.sendNotification("priority_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldPriority: task.priority,
          newPriority: updateData.priority,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      }

      Object.assign(task, updateData);
      await taskRepository.save(task);

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  },

  async updateTaskStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, log } = req.body;
      const userId = (req as any).user.id;

      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignees", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const extraFields: Partial<OperationLog> = {
        oldStatus: task.status,
        newStatus: status,
        remark: log?.remark || "",
      };

      if (log?.oldAssignee) extraFields.oldAssignee = log.oldAssignee;
      if (log?.newAssignee) extraFields.newAssignee = log.newAssignee;
      if (log?.oldPriority) extraFields.oldPriority = log.oldPriority;
      if (log?.newPriority) extraFields.newPriority = log.newPriority;

      // 多负责人完成逻辑：逐人退出
      if (status === "completed") {
        const isCurrentAssignee = task.assignees.some(a => a.id === userId);

        if (isCurrentAssignee && task.assignees.length > 1) {
          // 多个负责人 → 部分完成：移除当前用户，不改变状态
          const oldAssigneeNames = getAssigneeNames(task.assignees);
          task.assignees = task.assignees.filter(a => a.id !== userId);
          const newAssigneeNames = getAssigneeNames(task.assignees);

          await taskRepository.save(task);

          await createOperationLog(
            task.id,
            userId,
            userName,
            "partial_complete",
            {
              oldAssignee: oldAssigneeNames,
              newAssignee: newAssigneeNames,
              remark: log?.remark || "",
            }
          );

          const updatedTask = await taskRepository.findOne({
            where: { id: parseInt(id as string) },
            relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
          });

          return res.json(updatedTask);
        }

        // 最后一个负责人 → 真正完成，负责人改为创建人
        task.status = status;
        if (task.creator) {
          extraFields.oldAssignee = getAssigneeNames(task.assignees);
          extraFields.newAssignee = task.creator.realName;
          task.assignees = [task.creator];
        }
      } else if (status === "closed") {
        // 关闭任务：清空负责人
        extraFields.oldAssignee = getAssigneeNames(task.assignees);
        extraFields.newAssignee = "无";
        task.status = "closed";
        task.assignees = [];
      } else {
        task.status = status;
      }

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        userId,
        userName,
        log?.action || "status_change",
        extraFields
      );

      dingTalkService.sendNotification("status_change", {
        type: "任务",
        id: String(task.id),
        oldStatus: extraFields.oldStatus || task.status,
        newStatus: status,
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      });

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ error: "Failed to update task status" });
    }
  },

  async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const log = req.body;
      const userId = (req as any).user.id;

      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignees", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const extraFields: Partial<OperationLog> = {
        remark: log.remark || "",
      };

      if (log.action === "assign" && log.newAssigneeIds) {
        const newAssignees = await resolveAssigneeIds(log.newAssigneeIds);
        const oldAssigneeNames = getAssigneeNames(task.assignees);
        const newAssigneeNames = getAssigneeNames(newAssignees);
        extraFields.oldAssignee = oldAssigneeNames;
        extraFields.newAssignee = newAssigneeNames;
        task.assignees = newAssignees;

        dingTalkService.sendNotification("assignee_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldAssignee: oldAssigneeNames,
          newAssignee: newAssigneeNames,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      }

      if (log.action === "priority_change" && log.newPriority) {
        extraFields.oldPriority = task.priority;
        extraFields.newPriority = log.newPriority;
        task.priority = log.newPriority;

        dingTalkService.sendNotification("priority_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldPriority: extraFields.oldPriority,
          newPriority: log.newPriority,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      }

      if (log.newStatus && log.action !== "status_change") {
        extraFields.oldStatus = task.status;
        extraFields.newStatus = log.newStatus;
        task.status = log.newStatus;

        dingTalkService.sendNotification("status_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldStatus: extraFields.oldStatus,
          newStatus: log.newStatus,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      }

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        userId,
        userName,
        log.action || "comment",
        extraFields
      );

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  },

  async deleteTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await taskRepository.delete(id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  },

  async rejectTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assigneeIds, remark } = req.body;
      const userId = (req as any).user.id;

      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignees", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.status !== "completed") {
        return res.status(400).json({ error: "只有已完成的任务才能打回" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      // 设置新负责人
      const oldAssigneeNames = getAssigneeNames(task.assignees);
      const newAssignees = assigneeIds && assigneeIds.length > 0 ? await resolveAssigneeIds(assigneeIds) : [];
      const newAssigneeNames = getAssigneeNames(newAssignees);

      task.assignees = newAssignees;
      task.status = "in_progress";

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        userId,
        userName,
        "reject",
        {
          oldStatus: "completed",
          newStatus: "in_progress",
          oldAssignee: oldAssigneeNames,
          newAssignee: newAssigneeNames,
          remark: remark || "",
        }
      );

      dingTalkService.sendNotification("status_change", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        oldStatus: "completed",
        newStatus: "in_progress",
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      });

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error rejecting task:", error);
      res.status(500).json({ error: "Failed to reject task" });
    }
  },

  async restartTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assigneeIds, remark } = req.body;
      const userId = (req as any).user.id;

      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignees", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.status !== "closed") {
        return res.status(400).json({ error: "只有已关闭的任务才能重启" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      // 设置新负责人，有负责人则进行中，否则待处理
      const oldAssigneeNames = getAssigneeNames(task.assignees);
      const newAssignees = assigneeIds && assigneeIds.length > 0 ? await resolveAssigneeIds(assigneeIds) : [];
      const newAssigneeNames = getAssigneeNames(newAssignees);
      const newStatus = newAssignees.length > 0 ? "in_progress" : "pending";

      task.assignees = newAssignees;
      task.status = newStatus;

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        userId,
        userName,
        "restart",
        {
          oldStatus: "closed",
          newStatus: newStatus,
          oldAssignee: oldAssigneeNames,
          newAssignee: newAssigneeNames,
          remark: remark || "",
        }
      );

      dingTalkService.sendNotification("status_change", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        oldStatus: "closed",
        newStatus: newStatus,
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      });

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error restarting task:", error);
      res.status(500).json({ error: "Failed to restart task" });
    }
  },

  async addSubtask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const subtaskData = req.body;
      const userId = (req as any).user.id;

      const parentTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
      });

      if (!parentTask) {
        return res.status(404).json({ error: "Parent task not found" });
      }

      const subtask = taskRepository.create({
        ...subtaskData,
        status: "pending",
        parentTask: { id: parseInt(id as string) },
        creator: { id: userId },
      });

      await taskRepository.save(subtask);
      res.status(201).json(subtask);
    } catch (error) {
      console.error("Error adding subtask:", error);
      res.status(500).json({ error: "Failed to add subtask" });
    }
  },

  async extendDueDate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newDueDate, remark } = req.body;
      const userId = (req as any).user.id;

      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignees", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const oldDueDate = task.dueDate;
      task.dueDate = new Date(newDueDate);

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        userId,
        userName,
        "extend_due_date",
        {
          oldDueDate: oldDueDate ? oldDueDate.toISOString() : undefined,
          newDueDate: task.dueDate.toISOString(),
          remark: remark || "",
        }
      );

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error extending task due date:", error);
      res.status(500).json({ error: "Failed to extend task due date" });
    }
  },

  async getCategories(req: Request, res: Response) {
    try {
      const result = await taskRepository
        .createQueryBuilder("task")
        .select("DISTINCT task.category", "category")
        .where("task.category IS NOT NULL AND task.category != ''")
        .getRawMany();
      const categories = result.map((r: any) => r.category).filter(Boolean);
      res.json(categories);
    } catch (error) {
      console.error("Error getting task categories:", error);
      res.status(500).json({ error: "Failed to get task categories" });
    }
  },
};
