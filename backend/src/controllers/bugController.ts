import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Bug } from "../entities/Bug";
import { OperationLog } from "../entities/OperationLog";
import { User } from "../entities/User";

const bugRepository = AppDataSource.getRepository(Bug);
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
    targetType: "bug",
    targetId,
    user: { id: userId },
    action,
    ...extraFields,
  });
  return operationLogRepository.save(log);
}

async function getBugLogs(bugId: number): Promise<OperationLog[]> {
  return operationLogRepository.find({
    where: { targetType: "bug", targetId: bugId },
    relations: ["user"],
    order: { createdAt: "ASC" },
  });
}

export const bugController = {
  async createBug(req: Request, res: Response) {
    try {
      const { title, description, severity, reproduceSteps, projectId, assigneeId } = req.body;
      const reportedBy = (req as any).user.id;

      const reporter = await userRepository.findOne({ where: { id: reportedBy } });

      const bug = bugRepository.create({
        title,
        description,
        severity: severity || "medium",
        status: "pending",
        reproduceSteps,
        project: projectId ? { id: projectId } : undefined,
        assignee: assigneeId ? { id: assigneeId } : undefined,
        reporter: { id: reportedBy },
      });

      await bugRepository.save(bug);

      await createOperationLog(
        bug.id,
        reportedBy,
        reporter?.realName || "未知用户",
        "create"
      );

      const savedBug = await bugRepository.findOne({
        where: { id: bug.id },
        relations: ["project", "project.manager", "assignee", "reporter"],
      });

      res.status(201).json(savedBug);
    } catch (error) {
      console.error("Error creating bug:", error);
      res.status(500).json({ error: "Failed to create bug" });
    }
  },

  async getAllBugs(req: Request, res: Response) {
    try {
      const { projectId, status, severity, assigneeId } = req.query;
      const where: any = {};

      if (projectId) where.project = { id: projectId };
      if (status) where.status = status;
      if (severity) where.severity = severity;
      if (assigneeId) where.assignee = { id: assigneeId };

      const bugs = await bugRepository.find({
        where,
        relations: ["project", "project.manager", "assignee", "reporter"],
        order: { createdAt: "DESC" },
      });

      res.json(bugs);
    } catch (error) {
      console.error("Error getting bugs:", error);
      res.status(500).json({ error: "Failed to get bugs" });
    }
  },

  async getBugById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "reporter"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const logs = await getBugLogs(bug.id);

      res.json({ ...bug, operationLogs: logs });
    } catch (error) {
      console.error("Error getting bug:", error);
      res.status(500).json({ error: "Failed to get bug" });
    }
  },

  async updateBug(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = (req as any).user.id;

      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignee", "reporter"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      if (updateData.assigneeId) {
        const oldAssignee = bug.assignee;
        const newAssignee = await userRepository.findOne({ where: { id: updateData.assigneeId } });
        
        await createOperationLog(
          bug.id,
          userId,
          userName,
          "assign",
          {
            oldAssignee: oldAssignee?.realName || "未处理",
            newAssignee: newAssignee?.realName || "未知",
            remark: updateData.log?.remark || "",
          }
        );
        
        bug.assignee = newAssignee!;
        delete updateData.assigneeId;
      }

      if (updateData.status && updateData.status !== bug.status) {
        await createOperationLog(
          bug.id,
          userId,
          userName,
          "status_change",
          {
            oldStatus: bug.status,
            newStatus: updateData.status,
            remark: updateData.log?.remark || "",
          }
        );
      }

      if (updateData.severity && updateData.severity !== bug.severity) {
        await createOperationLog(
          bug.id,
          userId,
          userName,
          "severity_change",
          {
            oldSeverity: bug.severity,
            newSeverity: updateData.severity,
          }
        );
      }

      Object.assign(bug, updateData);
      await bugRepository.save(bug);

      const updatedBug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "reporter"],
      });

      res.json(updatedBug);
    } catch (error) {
      console.error("Error updating bug:", error);
      res.status(500).json({ error: "Failed to update bug" });
    }
  },

  async updateBugStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, log } = req.body;
      const userId = (req as any).user.id;

      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignee", "reporter"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const extraFields: Partial<OperationLog> = {
        oldStatus: bug.status,
        newStatus: status,
        remark: log?.remark || "",
      };

      if (log?.oldAssignee) extraFields.oldAssignee = log.oldAssignee;
      if (log?.newAssignee) extraFields.newAssignee = log.newAssignee;
      if (log?.oldSeverity) extraFields.oldSeverity = log.oldSeverity;
      if (log?.newSeverity) extraFields.newSeverity = log.newSeverity;

      bug.status = status;
      await bugRepository.save(bug);

      await createOperationLog(
        bug.id,
        userId,
        userName,
        log?.action || "status_change",
        extraFields
      );

      const updatedBug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "reporter"],
      });

      res.json(updatedBug);
    } catch (error) {
      console.error("Error updating bug status:", error);
      res.status(500).json({ error: "Failed to update bug status" });
    }
  },

  async addComment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const log = req.body;
      const userId = (req as any).user.id;

      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignee", "reporter"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const extraFields: Partial<OperationLog> = {
        remark: log.remark || "",
      };

      if ((log.action === "assign" || log.action === "transfer") && log.newAssigneeId) {
        const newAssignee = await userRepository.findOne({ where: { id: log.newAssigneeId } });
        extraFields.oldAssignee = bug.assignee?.realName || "未处理";
        extraFields.newAssignee = newAssignee?.realName || "未知";
        bug.assignee = newAssignee!;
        bug.status = "assigned";
      }

      if (log.action === "severity_change" && log.newSeverity) {
        extraFields.oldSeverity = bug.severity;
        extraFields.newSeverity = log.newSeverity;
        bug.severity = log.newSeverity;
      }

      if (log.newStatus && log.action !== "status_change") {
        extraFields.oldStatus = bug.status;
        extraFields.newStatus = log.newStatus;
        bug.status = log.newStatus;
      }

      await bugRepository.save(bug);

      await createOperationLog(
        bug.id,
        userId,
        userName,
        log.action || "comment",
        extraFields
      );

      const updatedBug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "reporter"],
      });

      res.json(updatedBug);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  },

  async assignBug(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assigneeId } = req.body;
      const userId = (req as any).user.id;

      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const assignee = await userRepository.findOne({ where: { id: assigneeId } });
      if (!assignee) {
        return res.status(404).json({ error: "Assignee not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });

      bug.assignee = assignee;
      bug.status = "assigned";
      await bugRepository.save(bug);

      await createOperationLog(
        bug.id,
        userId,
        user?.realName || "未知用户",
        "assign",
        {
          remark: `分配给 ${assignee.realName}`,
        }
      );

      const savedBug = await bugRepository.findOne({
        where: { id: bug.id },
        relations: ["project", "project.manager", "assignee", "reporter"],
      });

      res.json(savedBug);
    } catch (error) {
      console.error("Error assigning bug:", error);
      res.status(500).json({ error: "Failed to assign bug" });
    }
  },

  async deleteBug(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await bugRepository.delete(id);
      res.json({ message: "Bug deleted successfully" });
    } catch (error) {
      console.error("Error deleting bug:", error);
      res.status(500).json({ error: "Failed to delete bug" });
    }
  },

  async getBugStats(req: Request, res: Response) {
    try {
      const { projectId } = req.query;
      const where: any = {};
      if (projectId) where.project = { id: projectId };

      const bugs = await bugRepository.find({ where });

      const stats = {
        total: bugs.length,
        pending: bugs.filter(b => b.status === "pending").length,
        assigned: bugs.filter(b => b.status === "assigned").length,
        fixing: bugs.filter(b => b.status === "fixing").length,
        fixed: bugs.filter(b => b.status === "fixed").length,
        verified: bugs.filter(b => b.status === "verified").length,
        closed: bugs.filter(b => b.status === "closed").length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error getting bug stats:", error);
      res.status(500).json({ error: "Failed to get bug stats" });
    }
  },

  async extendDueDate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newDueDate, remark } = req.body;
      const userId = (req as any).user.id;

      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignee", "reporter"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const oldDueDate = bug.dueDate;
      bug.dueDate = new Date(newDueDate);

      await bugRepository.save(bug);

      await createOperationLog(
        bug.id,
        userId,
        userName,
        "extend_due_date",
        {
          oldDueDate: oldDueDate ? oldDueDate.toISOString() : undefined,
          newDueDate: bug.dueDate.toISOString(),
          remark: remark || "",
        }
      );

      const updatedBug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.manager", "assignee", "reporter"],
      });

      res.json(updatedBug);
    } catch (error) {
      console.error("Error extending bug due date:", error);
      res.status(500).json({ error: "Failed to extend bug due date" });
    }
  },
};
