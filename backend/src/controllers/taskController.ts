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

export const taskController = {
  async createTask(req: Request, res: Response) {
    try {
      const { title, description, priority, dueDate, projectId, assigneeId, parentTaskId } = req.body;
      const createdBy = (req as any).user.id;

      const creator = await userRepository.findOne({ where: { id: createdBy } });
      
      const task = taskRepository.create({
        title,
        description,
        priority: priority || "medium",
        status: "pending",
        dueDate,
        project: projectId ? { id: projectId } : undefined,
        assignee: assigneeId ? { id: assigneeId } : undefined,
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks"],
      });

      res.status(201).json(savedTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  },

  async getAllTasks(req: Request, res: Response) {
    try {
      const { projectId, status, assigneeId, creatorId, priority, sortBy, sortOrder } = req.query;
      const where: any = {};

      if (projectId) where.project = { id: projectId };
      if (status) where.status = status;
      if (assigneeId) where.assignee = { id: assigneeId };
      if (creatorId) where.creator = { id: creatorId };
      if (priority) where.priority = priority;

      const validSortFields = ["createdAt", "updatedAt", "priority", "dueDate", "status", "title"];
      const sortField = sortBy && validSortFields.includes(sortBy as string) ? sortBy as string : "createdAt";
      const order = sortOrder === "ASC" ? "ASC" : "DESC";

      const tasks = await taskRepository.find({
        where,
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks"],
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks"],
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
        relations: ["assignee", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      if (updateData.assigneeId) {
        const oldAssignee = task.assignee;
        const newAssignee = await userRepository.findOne({ where: { id: updateData.assigneeId } });
        
        await createOperationLog(
          task.id,
          userId,
          userName,
          "assign",
          {
            oldAssignee: oldAssignee?.realName || "未处理",
            newAssignee: newAssignee?.realName || "未知",
            remark: updateData.log?.remark || "",
          }
        );

        dingTalkService.sendNotification("assignee_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldAssignee: oldAssignee?.realName || "未处理",
          newAssignee: newAssignee?.realName || "未知",
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
        
        task.assignee = newAssignee!;
        delete updateData.assigneeId;
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks"],
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
        relations: ["assignee", "creator"],
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

      if (status === "completed" && task.creator) {
        extraFields.oldAssignee = task.assignee?.realName || "未处理";
        extraFields.newAssignee = task.creator.realName;
        task.assignee = task.creator;
      }

      task.status = status;
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
        title: task.title,
        oldStatus: task.status,
        newStatus: status,
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      });

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks"],
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
        relations: ["assignee", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const extraFields: Partial<OperationLog> = {
        remark: log.remark || "",
      };

      if (log.action === "assign" && log.newAssigneeId) {
        const newAssignee = await userRepository.findOne({ where: { id: log.newAssigneeId } });
        extraFields.oldAssignee = task.assignee?.realName || "未处理";
        extraFields.newAssignee = newAssignee?.realName || "未知";
        task.assignee = newAssignee!;

        dingTalkService.sendNotification("assignee_change", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldAssignee: task.assignee?.realName || "未处理",
          newAssignee: newAssignee?.realName || "未知",
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks"],
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
        relations: ["assignee", "creator"],
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error extending task due date:", error);
      res.status(500).json({ error: "Failed to extend task due date" });
    }
  },
};
