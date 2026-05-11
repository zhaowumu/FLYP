import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Bug } from "../entities/Bug";
import { OperationLog } from "../entities/OperationLog";
import { User } from "../entities/User";
import { DingTalkService } from "../services/dingtalkService";

const dingTalkService = new DingTalkService();

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
      const { title, description, severity, reproduceSteps, projectId, assigneeId, category } = req.body;
      const reportedBy = (req as any).user.id;

      const reporter = await userRepository.findOne({ where: { id: reportedBy } });

      const initialStatus = assigneeId ? "in_progress" : "pending";

      const bug = bugRepository.create({
        title,
        description,
        severity: severity || "medium",
        status: initialStatus,
        reproduceSteps,
        category: category || null,
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

      // 构建钉钉通知用的负责人信息
      const assigneePhone = bug.assignee?.phone || "";
      const assigneeName = bug.assignee?.realName || "未分配";

      dingTalkService.sendNotification("create", {
        type: "BUG",
        id: String(bug.id),
        title: bug.title,
        priority: bug.severity,
        creator: reporter?.realName || "未知用户",
        assigneeName: assigneeName,
        assigneePhones: assigneePhone ? `@${assigneePhone}` : "",
        time: new Date().toLocaleString("zh-CN")
      }, assigneePhone ? [assigneePhone] : undefined);

      const savedBug = await bugRepository.findOne({
        where: { id: bug.id },
        relations: ["project", "project.managers", "assignee", "reporter"],
      });

      res.status(201).json(savedBug);
    } catch (error) {
      console.error("Error creating bug:", error);
      res.status(500).json({ error: "Failed to create bug" });
    }
  },

  async getAllBugs(req: Request, res: Response) {
    try {
      const { projectId, status, severity, assigneeId, reporterId, sortBy, sortOrder, category } = req.query;
      const where: any = {};

      if (projectId) where.project = { id: projectId };
      if (status) where.status = status;
      if (severity) where.severity = severity;
      if (assigneeId) where.assignee = { id: assigneeId };
      if (reporterId) where.reporter = { id: reporterId };
      if (category) where.category = category;

      const validSortFields = ["createdAt", "updatedAt", "severity", "dueDate", "status", "title"];
      const sortField = sortBy && validSortFields.includes(sortBy as string) ? sortBy as string : "createdAt";
      const order = sortOrder === "ASC" ? "ASC" : "DESC";

      const bugs = await bugRepository.find({
        where,
        relations: ["project", "project.managers", "assignee", "reporter"],
        order: { [sortField]: order },
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
        relations: ["project", "project.managers", "assignee", "reporter"],
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

        const newAssigneePhone = newAssignee?.phone || "";

        dingTalkService.sendNotification("assignee_change", {
          type: "BUG",
          id: String(bug.id),
          title: bug.title,
          oldAssignee: oldAssignee?.realName || "未处理",
          newAssignee: newAssignee?.realName || "未知",
          assigneePhones: newAssigneePhone ? `@${newAssigneePhone}` : "",
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        }, newAssigneePhone ? [newAssigneePhone] : undefined);
        
        bug.assignee = newAssignee!;

        // 待处理 → 分配后自动升级为处理中
        if (bug.status === "pending") {
          bug.status = "in_progress";
        }

        delete updateData.assigneeId;
      }

      // 状态变更处理（校验 + 日志 + 钉钉通知）
      if (updateData.status && updateData.status !== bug.status) {
        const targetStatus = updateData.status;

        if (targetStatus === "in_progress" && !bug.assignee) {
          return res.status(400).json({ error: "处理中的缺陷必须设置负责人" });
        }

        if (targetStatus === "verified" && !bug.assignee) {
          // 无负责人时自动将报告人设为负责人
          if (bug.reporter) {
            bug.assignee = bug.reporter;
          }
        }

        await createOperationLog(
          bug.id,
          userId,
          userName,
          targetStatus === "closed" ? "close" : "status_change",
          {
            oldStatus: bug.status,
            newStatus: targetStatus,
            oldAssignee: targetStatus === "closed" ? bug.assignee?.realName : undefined,
            newAssignee: targetStatus === "closed" ? "无" : undefined,
            remark: updateData.log?.remark || "",
          }
        );

        dingTalkService.sendNotification("status_change", {
          type: "BUG",
          id: String(bug.id),
          title: bug.title,
          oldStatus: bug.status,
          newStatus: targetStatus,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });

        // 关闭时清空负责人
        if (targetStatus === "closed") {
          Object.assign(bug, { assignee: null });
        }
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
        relations: ["project", "project.managers", "assignee", "reporter"],
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

      const prevStatus = bug.status;
      bug.status = status;

      // 关闭时清空负责人
      if (status === "closed") {
        extraFields.oldAssignee = bug.assignee?.realName || "未知";
        extraFields.newAssignee = "无";
        Object.assign(bug, { assignee: null });
      }

      // 修复完成时负责人改为报告人
      if (status === "fixed") {
        if (bug.reporter) {
          extraFields.oldAssignee = bug.assignee?.realName || "未知";
          extraFields.newAssignee = bug.reporter.realName;
          bug.assignee = bug.reporter;
        }
      }

      await bugRepository.save(bug);

      await createOperationLog(
        bug.id,
        userId,
        userName,
        log?.action || "status_change",
        extraFields
      );

      dingTalkService.sendNotification("status_change", {
        type: "BUG",
        id: String(bug.id),
        title: bug.title,
        oldStatus: prevStatus,
        newStatus: status,
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      });

      const updatedBug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignee", "reporter"],
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
        bug.status = "in_progress";

        const newAssigneePhone = newAssignee?.phone || "";

        dingTalkService.sendNotification("assignee_change", {
          type: "BUG",
          id: String(bug.id),
          title: bug.title,
          oldAssignee: bug.assignee?.realName || "未处理",
          newAssignee: newAssignee?.realName || "未知",
          assigneePhones: newAssigneePhone ? `@${newAssigneePhone}` : "",
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        }, newAssigneePhone ? [newAssigneePhone] : undefined);
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

        dingTalkService.sendNotification("status_change", {
          type: "BUG",
          id: String(bug.id),
          title: bug.title,
          oldStatus: extraFields.oldStatus,
          newStatus: log.newStatus,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
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
        relations: ["project", "project.managers", "assignee", "reporter"],
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
        relations: ["assignee"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      const assignee = await userRepository.findOne({ where: { id: assigneeId } });
      if (!assignee) {
        return res.status(404).json({ error: "Assignee not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });

      const oldAssigneeName = bug.assignee?.realName || "未分配";

      bug.assignee = assignee;
      bug.status = "in_progress";
      await bugRepository.save(bug);

      await createOperationLog(
        bug.id,
        userId,
        user?.realName || "未知用户",
        "assign",
        {
          oldAssignee: oldAssigneeName,
          newAssignee: assignee.realName,
          remark: `分配给 ${assignee.realName}`,
        }
      );

      const assigneePhone = assignee.phone || "";

      dingTalkService.sendNotification("assignee_change", {
        type: "BUG",
        id: String(bug.id),
        title: bug.title,
        oldAssignee: "未分配",
        newAssignee: assignee.realName,
        assigneePhones: assigneePhone ? `@${assigneePhone}` : "",
        operator: user?.realName || "未知用户",
        time: new Date().toLocaleString("zh-CN")
      }, assigneePhone ? [assigneePhone] : undefined);

      const savedBug = await bugRepository.findOne({
        where: { id: bug.id },
        relations: ["project", "project.managers", "assignee", "reporter"],
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

  async rejectBug(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assigneeId, remark } = req.body;
      const userId = (req as any).user.id;

      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignee", "reporter"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      if (bug.status !== "fixed") {
        return res.status(400).json({ error: "只有已修复的缺陷才能打回" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const oldAssigneeName = bug.assignee?.realName || "未分配";
      const newAssignee = assigneeId ? await userRepository.findOne({ where: { id: assigneeId } }) : null;
      const newAssigneeName = newAssignee?.realName || "未分配";

      if (newAssignee) {
        bug.assignee = newAssignee;
      } else {
        Object.assign(bug, { assignee: null });
      }
      bug.status = "in_progress";

      await bugRepository.save(bug);

      await createOperationLog(
        bug.id, userId, userName, "reject",
        {
          oldStatus: "fixed", newStatus: "in_progress",
          oldAssignee: oldAssigneeName, newAssignee: newAssigneeName,
          remark: remark || "",
        }
      );

      dingTalkService.sendNotification("status_change", {
        type: "BUG", id: String(bug.id), title: bug.title,
        oldStatus: "fixed", newStatus: "in_progress",
        operator: userName, time: new Date().toLocaleString("zh-CN")
      });

      const updatedBug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignee", "reporter"],
      });

      res.json(updatedBug);
    } catch (error) {
      console.error("Error rejecting bug:", error);
      res.status(500).json({ error: "Failed to reject bug" });
    }
  },

  async restartBug(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assigneeId, remark } = req.body;
      const userId = (req as any).user.id;

      const bug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignee", "reporter"],
      });

      if (!bug) {
        return res.status(404).json({ error: "Bug not found" });
      }

      if (bug.status !== "closed") {
        return res.status(400).json({ error: "只有已关闭的缺陷才能重启" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      const oldAssigneeName = bug.assignee?.realName || "未分配";
      const newAssignee = assigneeId ? await userRepository.findOne({ where: { id: assigneeId } }) : null;
      const newAssigneeName = newAssignee?.realName || "未分配";
      const newStatus = newAssignee ? "in_progress" : "pending";

      if (newAssignee) {
        bug.assignee = newAssignee;
      } else {
        Object.assign(bug, { assignee: null });
      }
      bug.status = newStatus;

      await bugRepository.save(bug);

      await createOperationLog(
        bug.id, userId, userName, "restart",
        {
          oldStatus: "closed", newStatus,
          oldAssignee: oldAssigneeName, newAssignee: newAssigneeName,
          remark: remark || "",
        }
      );

      dingTalkService.sendNotification("status_change", {
        type: "BUG", id: String(bug.id), title: bug.title,
        oldStatus: "closed", newStatus,
        operator: userName, time: new Date().toLocaleString("zh-CN")
      });

      const updatedBug = await bugRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignee", "reporter"],
      });

      res.json(updatedBug);
    } catch (error) {
      console.error("Error restarting bug:", error);
      res.status(500).json({ error: "Failed to restart bug" });
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
        in_progress: bugs.filter(b => b.status === "in_progress").length,
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
        relations: ["project", "project.managers", "assignee", "reporter"],
      });

      res.json(updatedBug);
    } catch (error) {
      console.error("Error extending bug due date:", error);
      res.status(500).json({ error: "Failed to extend bug due date" });
    }
  },

  async getCategories(req: Request, res: Response) {
    try {
      const result = await bugRepository
        .createQueryBuilder("bug")
        .select("DISTINCT bug.category", "category")
        .where("bug.category IS NOT NULL AND bug.category != ''")
        .getRawMany();
      const categories = result.map((r: any) => r.category).filter(Boolean);
      res.json(categories);
    } catch (error) {
      console.error("Error getting bug categories:", error);
      res.status(500).json({ error: "Failed to get bug categories" });
    }
  },
};
