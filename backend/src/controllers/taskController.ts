import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { OperationLog } from "../entities/OperationLog";
import { User } from "../entities/User";

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
      const { title, description, priority, dueDate, projectId, assigneeId, parentTaskId, dependencyIds } = req.body;
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

      if (dependencyIds && dependencyIds.length > 0) {
        const dependencies = await taskRepository.findByIds(dependencyIds);
        task.dependencies = dependencies;
      }

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        createdBy,
        creator?.realName || "未知用户",
        "create"
      );

      const savedTask = await taskRepository.findOne({
        where: { id: task.id },
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks", "dependencies"],
      });

      res.status(201).json(savedTask);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  },

  async getAllTasks(req: Request, res: Response) {
    try {
      const { projectId, status, assigneeId } = req.query;
      const where: any = {};

      if (projectId) where.project = { id: projectId };
      if (status) where.status = status;
      if (assigneeId) where.assignee = { id: assigneeId };

      const tasks = await taskRepository.find({
        where,
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks", "dependencies"],
        order: { createdAt: "DESC" },
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks", "dependencies"],
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
      }

      Object.assign(task, updateData);
      await taskRepository.save(task);

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks", "dependencies"],
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

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks", "dependencies"],
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
      }

      if (log.action === "priority_change" && log.newPriority) {
        extraFields.oldPriority = task.priority;
        extraFields.newPriority = log.newPriority;
        task.priority = log.newPriority;
      }

      if (log.newStatus && log.action !== "status_change") {
        extraFields.oldStatus = task.status;
        extraFields.newStatus = log.newStatus;
        task.status = log.newStatus;
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks", "dependencies"],
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

  async getTaskDependencies(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["dependencies"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task.dependencies);
    } catch (error) {
      console.error("Error getting task dependencies:", error);
      res.status(500).json({ error: "Failed to get task dependencies" });
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
        relations: ["project", "project.manager", "assignee", "creator", "parentTask", "subtasks", "dependencies"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error extending task due date:", error);
      res.status(500).json({ error: "Failed to extend task due date" });
    }
  },
};
