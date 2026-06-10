import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Between, LessThanOrEqual, MoreThanOrEqual, In, IsNull } from "typeorm";
import { Bug } from "../entities/Bug";
import { OperationLog } from "../entities/OperationLog";
import { User } from "../entities/User";
import { DingTalkService } from "../services/dingtalkService";
import { FeishuService } from "../services/feishuService";
import { extractUploadUrls, deleteUnreferencedFiles } from "../utils/orphanCleaner";

const dingTalkService = new DingTalkService();
const feishuService = new FeishuService();

function sendNotifications(type: string, variables: Record<string, string>, atMobiles?: string[]) {
  dingTalkService.sendNotification(type, variables, atMobiles);
  feishuService.sendNotification(type, variables);
}

/** 单个负责人飞书 @ 文本 */
function feishuAtOne(user: User | null | undefined): string {
  if (!user) return "未分配";
  if (user.phone) return `<at id=${user.phone}>${user.realName}</at>`;
  return `**${user.realName}**`;
}

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

/** 辅助：将手机号格式化为钉钉 @ 文本（@phone 加末尾空格，无手机号则返回空字符串） */
function formatAtPhone(phone: string): string {
  if (!phone) return '';
  return `@${phone} `;
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

      // 构建通知用的负责人信息
      let assigneePhone = "";
      let assigneeName = "未分配";
      let assigneeUser: User | null = null;
      if (assigneeId) {
        assigneeUser = await userRepository.findOne({ where: { id: assigneeId } });
        if (assigneeUser) {
          assigneePhone = assigneeUser.phone || "";
          assigneeName = assigneeUser.realName || "未分配";
        }
      }

      sendNotifications("create_bug", {
        type: "BUG",
        id: String(bug.id),
        title: bug.title,
        severity: bug.severity,
        creator: reporter?.realName || "未知用户",
        assigneeName: assigneeName,
        assigneePhones: formatAtPhone(assigneePhone),
        feishuAt: feishuAtOne(assigneeUser),
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
      const { projectId, status, severity, assigneeId, reporterId, sortBy, sortOrder, category, page, pageSize, myUserId, recentUserId, updatedAfter, updatedBefore, unassigned } = req.query;
      const where: any = {};
      const statuses = status ? (status as string).split(",").filter(Boolean) : [];
      const isUnassigned = unassigned === "true" || unassigned === "1";

      if (projectId) where.project = { id: projectId };
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = In(statuses);
      }
      if (severity) where.severity = severity;
      if (isUnassigned) where.assignee = IsNull();
      if (assigneeId) where.assignee = { id: assigneeId };
      if (reporterId) where.reporter = { id: reporterId };
      if (category) where.category = category;
      if (updatedAfter && updatedBefore) {
        where.updatedAt = Between(new Date(updatedAfter as string), new Date(updatedBefore as string));
      } else if (updatedAfter) {
        where.updatedAt = MoreThanOrEqual(new Date(updatedAfter as string));
      } else if (updatedBefore) {
        where.updatedAt = LessThanOrEqual(new Date(updatedBefore as string));
      }

      const validSortFields = ["createdAt", "updatedAt", "severity", "dueDate", "status", "title"];
      const sortField = sortBy && validSortFields.includes(sortBy as string) ? sortBy as string : "createdAt";
      const order = sortOrder === "ASC" ? "ASC" : "DESC";

      // "最近打开"：查询当前用户最近操作过的缺陷（从 OperationLog 取最近30条）
      if (recentUserId) {
        const recentLogs = await operationLogRepository
          .createQueryBuilder("log")
          .select("log.targetId", "targetId")
          .addSelect("MAX(log.createdAt)", "lastOpened")
          .where("log.targetType = :targetType", { targetType: "bug" })
          .andWhere("log.userId = :userId", { userId: recentUserId })
          .groupBy("log.targetId")
          .orderBy("lastOpened", "DESC")
          .getRawMany();

        const recentIds = recentLogs.map((r) => Number(r.targetId)).filter((id) => id > 0);

        if (recentIds.length === 0) {
          const allTotal = await bugRepository.count();
          return res.json({ data: [], total: 0, page: 1, pageSize: 20, tabs: { assigned: 0, reported: 0, my: 0, all: allTotal, recent: 0 } });
        }

        const query = bugRepository
          .createQueryBuilder("bug")
          .leftJoinAndSelect("bug.assignee", "assignee")
          .leftJoinAndSelect("bug.reporter", "reporter")
          .where("bug.id IN (:...ids)", { ids: recentIds })
          .andWhere(projectId ? "bug.projectId = :pid" : "1=1", { pid: projectId })
          .andWhere(statuses.length === 1 ? "bug.status = :status" : statuses.length > 1 ? "bug.status IN (:...statuses)" : "1=1", statuses.length === 1 ? { status: statuses[0] } : statuses.length > 1 ? { statuses } : {})
          .andWhere(isUnassigned ? "bug.assigneeId IS NULL" : "1=1")
          .andWhere(severity ? "bug.severity = :severity" : "1=1", { severity })
          .andWhere(category ? "bug.category = :category" : "1=1", { category })
          .andWhere(updatedAfter ? "bug.updatedAt >= :updatedAfter" : "1=1", { updatedAfter: updatedAfter ? new Date(updatedAfter as string) : undefined })
          .andWhere(updatedBefore ? "bug.updatedAt <= :updatedBefore" : "1=1", { updatedBefore: updatedBefore ? new Date(updatedBefore as string) : undefined })
          .orderBy("bug.updatedAt", "DESC");

        const finalTake = Math.min(parseInt(pageSize as string) || 50, 200);
        const finalPage = parseInt(page as string) || 1;
        const finalSkip = (finalPage - 1) * finalTake;

        const [bugs, total] = await query.skip(finalSkip).take(finalTake).getManyAndCount();

        const idOrder = new Map(recentIds.map((id, idx) => [id, idx]));
        bugs.sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));

        const uid = (req as any).user?.id;
        let tabs;
        if (finalPage === 1) {
          const allTotal = await bugRepository.count();
          tabs = { assigned: 0, reported: 0, my: 0, all: allTotal, recent: recentIds.length };
          if (uid) {
            const [assigned, reported] = await Promise.all([
              bugRepository.count({ where: { assignee: { id: uid } } }),
              bugRepository.count({ where: { reporter: { id: uid } } }),
            ]);
            const myCount = await bugRepository
              .createQueryBuilder("bug")
              .leftJoin("bug.assignee", "tabAssignee")
              .leftJoin("bug.reporter", "tabReporter")
              .where("tabAssignee.id = :uid OR tabReporter.id = :uid", { uid })
              .getCount();
            tabs = { assigned, reported, my: myCount, all: allTotal, recent: recentIds.length };
          }
        }
        return res.json({ data: bugs, total: total > recentIds.length ? recentIds.length : total, page: finalPage, pageSize: finalTake, tabs });
      }

      // "我参与的"：OR 逻辑（我是负责人 OR 我是报告人），需用 QueryBuilder
      if (myUserId) {
        const query = bugRepository
          .createQueryBuilder("bug")
          .leftJoinAndSelect("bug.assignee", "assignee")
          .leftJoinAndSelect("bug.reporter", "reporter")
          .where("bug.assigneeId = :myUid OR bug.reporterId = :myUid", { myUid: myUserId })
          .andWhere(projectId ? "bug.projectId = :pid" : "1=1", { pid: projectId })
          .andWhere(statuses.length === 1 ? "bug.status = :status" : statuses.length > 1 ? "bug.status IN (:...statuses)" : "1=1", statuses.length === 1 ? { status: statuses[0] } : statuses.length > 1 ? { statuses } : {})
          .andWhere(isUnassigned ? "bug.assigneeId IS NULL" : "1=1")
          .andWhere(severity ? "bug.severity = :severity" : "1=1", { severity })
          .andWhere(category ? "bug.category = :category" : "1=1", { category })
          .andWhere(updatedAfter ? "bug.updatedAt >= :updatedAfter" : "1=1", { updatedAfter: updatedAfter ? new Date(updatedAfter as string) : undefined })
          .andWhere(updatedBefore ? "bug.updatedAt <= :updatedBefore" : "1=1", { updatedBefore: updatedBefore ? new Date(updatedBefore as string) : undefined })
          .orderBy(`bug.${sortField}`, order);

        const finalTake = Math.min(parseInt(pageSize as string) || 50, 200);
        const finalPage = parseInt(page as string) || 1;
        const finalSkip = (finalPage - 1) * finalTake;

        const [bugs, total] = await query.skip(finalSkip).take(finalTake).getManyAndCount();
        const uid = (req as any).user?.id;
        let tabs;
        if (finalPage === 1) {
          const allTotal = await bugRepository.count();
          let recentCount = 0;
          if (uid) {
            try {
              const recentRows = await operationLogRepository.createQueryBuilder("log")
                .select("log.targetId")
                .where("log.targetType = :tt", { tt: "bug" })
                .andWhere("log.userId = :uid", { uid })
                .groupBy("log.targetId")
                .getRawMany();
              recentCount = recentRows.length;
            } catch { recentCount = 0; }
          }
          tabs = { assigned: 0, reported: 0, my: 0, all: allTotal, recent: recentCount };
          if (uid) {
            const [assigned, reported] = await Promise.all([
              bugRepository.count({ where: { assignee: { id: uid } } }),
              bugRepository.count({ where: { reporter: { id: uid } } }),
            ]);
            const myCount = await bugRepository
              .createQueryBuilder("bug")
              .leftJoin("bug.assignee", "tabAssignee")
              .leftJoin("bug.reporter", "tabReporter")
              .where("tabAssignee.id = :uid OR tabReporter.id = :uid", { uid })
              .getCount();
            tabs = { assigned, reported, my: myCount, all: allTotal, recent: recentCount };
          }
        }
        return res.json({ data: bugs, total, page: finalPage, pageSize: finalTake, tabs });
      }

      // 始终分页，默认 pageSize=50
      const finalTake = Math.min(parseInt(pageSize as string) || 50, 200);
      const finalPage = parseInt(page as string) || 1;
      const finalSkip = (finalPage - 1) * finalTake;

      const [bugs, total] = await bugRepository.findAndCount({
        where,
        relations: ["assignee", "reporter"],
        order: { [sortField]: order },
        skip: finalSkip,
        take: finalTake,
      });

      const uid = (req as any).user?.id;
      let tabs;
      if (finalPage === 1) {
        const allTotal = await bugRepository.count();
          let recentCount = 0;
          if (uid) {
            try {
              const recentRows = await operationLogRepository.createQueryBuilder("log")
                .select("log.targetId")
                .where("log.targetType = :tt", { tt: "bug" })
                .andWhere("log.userId = :uid", { uid })
                .groupBy("log.targetId")
                .getRawMany();
              recentCount = recentRows.length;
            } catch { recentCount = 0; }
          }
        tabs = { assigned: 0, reported: 0, my: 0, all: allTotal, recent: recentCount };
        if (uid) {
          const [assigned, reported] = await Promise.all([
            bugRepository.count({ where: { assignee: { id: uid } } }),
            bugRepository.count({ where: { reporter: { id: uid } } }),
          ]);
          const myCount = await bugRepository
            .createQueryBuilder("bug")
            .leftJoin("bug.assignee", "tabAssignee")
            .leftJoin("bug.reporter", "tabReporter")
            .where("tabAssignee.id = :uid OR tabReporter.id = :uid", { uid })
            .getCount();
          tabs = { assigned, reported, my: myCount, all: allTotal, recent: recentCount };
        }
      }
      return res.json({ data: bugs, total, page: finalPage, pageSize: finalTake, tabs });
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

            // 记录最近查看（用于"最近打开"标签）
      const viewerId = (req as any).user?.id;
      if (viewerId) {
        createOperationLog(bug.id, viewerId, "", "view").catch(() => {});
      }

      const logs = await getBugLogs(bug.id);
      // user 为 null 时（用户已删除）显示"已删除人员"
      const normalizedLogs = logs.map(log => ({
        ...log,
        user: log.user
          ? { id: log.user.id, username: log.user.username, realName: log.user.realName, avatar: log.user.avatar || undefined, role: log.user.role || '' }
          : { id: 0, username: '', realName: '已删除人员', avatar: undefined, role: '' }
      }));

      res.json({ ...bug, operationLogs: normalizedLogs });
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

        sendNotifications("assign_bug", {
          type: "BUG",
          id: String(bug.id),
          title: bug.title,
          oldAssignee: oldAssignee?.realName || "未处理",
          newAssignee: newAssignee?.realName || "未知",
          newAssigneePhones: formatAtPhone(newAssigneePhone),
          feishuAt: feishuAtOne(newAssignee),
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

        // 根据状态发送对应的通知
        if (targetStatus === "fixed") {
          sendNotifications("fix_bug", {
            type: "BUG",
            id: String(bug.id),
            title: bug.title,
            operator: userName,
            time: new Date().toLocaleString("zh-CN")
          });
        } else if (targetStatus === "verified") {
          sendNotifications("verify_bug", {
            type: "BUG",
            id: String(bug.id),
            title: bug.title,
            operator: userName,
            time: new Date().toLocaleString("zh-CN")
          });
        }

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

      // 根据状态发送对应的通知
      if (status === "fixed") {
        sendNotifications("fix_bug", {
          type: "BUG",
          id: String(bug.id),
          title: bug.title,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      } else if (status === "verified") {
        sendNotifications("verify_bug", {
          type: "BUG",
          id: String(bug.id),
          title: bug.title,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      }

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

      if ((log.action === "assign" || log.action === "transfer" || log.action === "feedback") && log.newAssigneeId) {
        const newAssignee = await userRepository.findOne({ where: { id: log.newAssigneeId } });
        const oldAssigneeName = bug.assignee?.realName || "未处理";
        const newAssigneeName = newAssignee?.realName || "未知";
        extraFields.oldAssignee = oldAssigneeName;
        extraFields.newAssignee = newAssigneeName;

        // 反馈操作发钉钉通知
        if (log.action === "feedback") {
          const newAssigneePhone = newAssignee?.phone || "";
          sendNotifications("feedback_bug", {
            type: "BUG",
            id: String(bug.id),
            title: bug.title,
            oldAssignee: oldAssigneeName,
            newAssignee: newAssigneeName,
            newAssigneePhones: formatAtPhone(newAssigneePhone),
            feishuAt: feishuAtOne(newAssignee),
            operator: userName,
            time: new Date().toLocaleString("zh-CN")
          }, newAssigneePhone ? [newAssigneePhone] : undefined);
        }

        bug.assignee = newAssignee!;
        // 只有 assign/transfer 才强制设为 in_progress，feedback 保持状态不变
        if (log.action !== "feedback") {
          bug.status = "in_progress";
        }
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

      sendNotifications("assign_bug", {
        type: "BUG",
        id: String(bug.id),
        title: bug.title,
        oldAssignee: "未分配",
        newAssignee: assignee.realName,
        newAssigneePhones: formatAtPhone(assigneePhone),
        feishuAt: feishuAtOne(assignee),
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

      // 删除前提取Bug描述和重现步骤中的图片URL
      const bug = await bugRepository.findOne({ where: { id: parseInt(id as string) } });
      const imageUrls: string[] = [];
      if (bug) {
        imageUrls.push(...extractUploadUrls(bug.description || ''));
        imageUrls.push(...extractUploadUrls(bug.reproduceSteps || ''));
      }

      await bugRepository.delete(id);

      // 后台异步清理孤儿文件，不阻塞响应
      if (imageUrls.length > 0) {
        deleteUnreferencedFiles([...new Set(imageUrls)]).catch(err => {
          console.error('清理孤儿文件失败:', err);
        });
      }

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

      if (!bug.reporter || bug.reporter.id !== userId) {
        return res.status(403).json({ error: "只有缺陷创建人才能打回" });
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

      const newAssigneePhone = newAssignee?.phone || "";

      sendNotifications("reject_bug", {
        type: "BUG", id: String(bug.id), title: bug.title,
        assigneeName: newAssigneeName, assigneePhones: formatAtPhone(newAssigneePhone), feishuAt: feishuAtOne(newAssignee), operator: userName, time: new Date().toLocaleString("zh-CN")
      }, newAssigneePhone ? [newAssigneePhone] : undefined);

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

      const newAssigneePhone = newAssignee?.phone || "";

      sendNotifications("restart_bug", {
        type: "BUG",
        id: String(bug.id),
        title: bug.title,
        assigneeName: newAssigneeName,
        assigneePhones: formatAtPhone(newAssigneePhone),
        feishuAt: feishuAtOne(newAssignee),
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      }, newAssigneePhone ? [newAssigneePhone] : undefined);

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

      const qb = bugRepository.createQueryBuilder("bug")
        .select("COUNT(*)", "total")
        .addSelect("SUM(CASE WHEN bug.status = 'pending' THEN 1 ELSE 0 END)", "pending")
        .addSelect("SUM(CASE WHEN bug.status = 'in_progress' THEN 1 ELSE 0 END)", "in_progress")
        .addSelect("SUM(CASE WHEN bug.status = 'fixed' THEN 1 ELSE 0 END)", "fixed")
        .addSelect("SUM(CASE WHEN bug.status = 'verified' THEN 1 ELSE 0 END)", "verified")
        .addSelect("SUM(CASE WHEN bug.status = 'closed' THEN 1 ELSE 0 END)", "closed");

      if (projectId) {
        qb.where("bug.projectId = :pid", { pid: projectId });
      }

      const raw = await qb.getRawOne();
      const stats = {
        total: Number(raw.total),
        pending: Number(raw.pending),
        in_progress: Number(raw.in_progress),
        fixed: Number(raw.fixed),
        verified: Number(raw.verified),
        closed: Number(raw.closed),
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
