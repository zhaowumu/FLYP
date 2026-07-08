import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Between, LessThanOrEqual, MoreThanOrEqual, In } from "typeorm";
import { Task } from "../entities/Task";
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

/** 辅助：获取 assignees 的手机号列表（用于钉钉 @ 提及） */
function getAssigneePhones(assignees: User[] | undefined): string[] {
  if (!assignees || assignees.length === 0) return [];
  return assignees.map(u => u.phone).filter(Boolean);
}

/** 辅助：将负责人列表格式化为飞书 @ 文本（<at id=phone>name</at>，无手机号则返回名字） */
function formatFeishuAt(assignees: User[] | undefined): string {
  if (!assignees || assignees.length === 0) return "未分配";
  return assignees.map(u => u.phone ? `<at id=${u.phone}>${u.realName}</at>` : u.realName).join(" ");
}

/** 辅助：将手机号列表格式化为钉钉 @ 文本（@phone1 @phone2 加末尾空格，无手机号则返回空字符串） */
function formatAtPhones(phones: string[]): string {
  if (!phones || phones.length === 0) return '';
  return phones.map(p => `@${p}`).join(' ') + ' ';
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

      const assigneeNames = getAssigneeNames(assignees);
      const assigneePhones = getAssigneePhones(assignees);

      sendNotifications("create_task", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        priority: task.priority,
        creator: creator?.realName || "未知用户",
        assigneeName: assigneeNames,
        assigneePhones: formatAtPhones(assigneePhones),
        feishuAt: formatFeishuAt(assignees),
        time: new Date().toLocaleString("zh-CN")
      }, assigneePhones.length > 0 ? assigneePhones : undefined);

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
      const { projectId, status, assigneeId, creatorId, priority, sortBy, sortOrder, category, page, pageSize, myUserId, recentUserId, updatedAfter, updatedBefore, unassigned } = req.query;
      const isUnassigned = unassigned === "true" || unassigned === "1";
      const where: any = {};

      const statuses = status ? (status as string).split(",").filter(Boolean) : [];

      if (projectId) where.project = { id: projectId };
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = In(statuses);
      }
      if (creatorId) where.creator = { id: creatorId };
      if (priority) where.priority = priority;
      if (category) where.category = category;
      if (updatedAfter && updatedBefore) {
        where.updatedAt = Between(new Date(updatedAfter as string), new Date(updatedBefore as string));
      } else if (updatedAfter) {
        where.updatedAt = MoreThanOrEqual(new Date(updatedAfter as string));
      } else if (updatedBefore) {
        where.updatedAt = LessThanOrEqual(new Date(updatedBefore as string));
      }

      const validSortFields = ["createdAt", "updatedAt", "priority", "dueDate", "status", "title"];
      const sortField = sortBy && validSortFields.includes(sortBy as string) ? sortBy as string : "createdAt";
      const order = sortOrder === "ASC" ? "ASC" : "DESC";
      let completedClosedCount = 0;
      // 在分页前先计算 completed_closed 数量，包含所有状态，不受筛选影响
      // 如果有状态筛选则根据筛选条件计算
      const completedClosedStatuses = statuses.length > 0 ? statuses : ["completed", "closed"];
      const completedClosedQuery = taskRepository.createQueryBuilder("task").where("task.status IN (:...s)", { s: completedClosedStatuses });
      if (projectId) completedClosedQuery.andWhere("task.projectId = :pid", { pid: projectId });
      completedClosedCount = await completedClosedQuery.getCount();
      
      // 分页参数
      const take = page ? Math.min(parseInt(pageSize as string) || 50, 200) : undefined;
      const currentPage = page ? parseInt(page as string) || 1 : undefined;
      const skip = currentPage ? (currentPage - 1) * (take || 50) : undefined;

      // 如果按 assigneeId 过滤或筛选待指派，需要通过 QueryBuilder 关联表查询
      if (assigneeId || isUnassigned) {
        const query = taskRepository
          .createQueryBuilder("task")
          .addSelect("task.transferred")
          .leftJoinAndSelect("task.assignees", "assignees")
          .leftJoinAndSelect("task.creator", "creator")
          .leftJoinAndSelect("task.subtasks", "subtasks");

        if (assigneeId) {
          query
            .leftJoin("task.assignees", "filterAssignee", "filterAssignee.id = :aid", { aid: assigneeId })
            .where("filterAssignee.id IS NOT NULL");
        }

        query
          .andWhere(projectId ? "task.projectId = :pid" : "1=1", { pid: projectId })
          .andWhere(statuses.length === 1 ? "task.status = :status" : statuses.length > 1 ? "task.status IN (:...statuses)" : "1=1", statuses.length === 1 ? { status: statuses[0] } : statuses.length > 1 ? { statuses } : {})
          .andWhere(priority ? "task.priority = :priority" : "1=1", { priority })
          .andWhere(category ? "task.category = :category" : "1=1", { category })
          .andWhere(updatedAfter ? "task.updatedAt >= :updatedAfter" : "1=1", { updatedAfter: updatedAfter ? new Date(updatedAfter as string) : undefined })
          .andWhere(updatedBefore ? "task.updatedAt <= :updatedBefore" : "1=1", { updatedBefore: updatedBefore ? new Date(updatedBefore as string) : undefined })
          .andWhere(isUnassigned ? "NOT EXISTS (SELECT 1 FROM task_assignees_user tau WHERE tau.taskId = task.id)" : "1=1")
          .orderBy(`task.${sortField}`, order);
        
        const finalTake = Math.min(take || 50, 200);
        const finalSkip = skip || 0;
        const finalPage = currentPage || 1;

        const [tasks, total] = await query.skip(finalSkip).take(finalTake).getManyAndCount();
        const uid = (req as any).user?.id;
        let tabs;
        if (finalPage === 1) {
          const allTotal = await taskRepository.count();
          let recentCount = 0;
          if (uid) {
            try {
              const recentRows = await operationLogRepository.createQueryBuilder("log")
                .select("log.targetId")
                .where("log.targetType = :tt", { tt: "task" })
                .andWhere("log.userId = :uid", { uid })
                .groupBy("log.targetId")
                .getRawMany();
              recentCount = recentRows.length;
            } catch { recentCount = 0; }
          }
          tabs = { assigned: 0, created: 0, my: 0, all: allTotal, recent: recentCount, completed_closed: completedClosedCount };
          if (uid) {
            const [assigned, created] = await Promise.all([
              taskRepository.createQueryBuilder("task")
                .leftJoin("task.assignees", "tabA")
                .where("tabA.id = :uid", { uid })
                .getCount(),
              taskRepository.count({ where: { creator: { id: uid } } }),
            ]);
            const myCount = await taskRepository.createQueryBuilder("task")
              .leftJoin("task.assignees", "tabM")
              .where("tabM.id = :uid OR task.creatorId = :uid", { uid })
              .getCount();
            tabs = { assigned, created, my: myCount, all: allTotal, recent: recentCount, completed_closed: completedClosedCount };
          }
        }
        return res.json({ data: tasks, total, page: finalPage, pageSize: finalTake, tabs });
      }

      // "最近打开"：查询当前用户最近操作过的任务（从 OperationLog 取最近30条）
      if (recentUserId) {
        const recentLogs = await operationLogRepository
          .createQueryBuilder("log")
          .select("log.targetId", "targetId")
          .addSelect("MAX(log.createdAt)", "lastOpened")
          .where("log.targetType = :targetType", { targetType: "task" })
          .andWhere("log.userId = :userId", { userId: recentUserId })
          .groupBy("log.targetId")
          .orderBy("lastOpened", "DESC")
          .getRawMany();

        const recentIds = recentLogs.map((r) => Number(r.targetId)).filter((id) => id > 0);

        if (recentIds.length === 0) {
          const allTotal = await taskRepository.count();
          return res.json({ data: [], total: 0, page: 1, pageSize: 20, tabs: { assigned: 0, created: 0, my: 0, all: allTotal, recent: 0, completed_closed: completedClosedCount } });
        }

        const query = taskRepository
          .createQueryBuilder("task")
          .addSelect("task.transferred")
          .leftJoinAndSelect("task.assignees", "assignees")
          .leftJoinAndSelect("task.creator", "creator")
          .leftJoinAndSelect("task.subtasks", "subtasks")
          .where("task.id IN (:...ids)", { ids: recentIds })
          .andWhere(projectId ? "task.projectId = :pid" : "1=1", { pid: projectId })
          .andWhere(statuses.length === 1 ? "task.status = :status" : statuses.length > 1 ? "task.status IN (:...statuses)" : "1=1", statuses.length === 1 ? { status: statuses[0] } : statuses.length > 1 ? { statuses } : {})
          .andWhere(priority ? "task.priority = :priority" : "1=1", { priority })
          .andWhere(category ? "task.category = :category" : "1=1", { category })
          .andWhere(updatedAfter ? "task.updatedAt >= :updatedAfter" : "1=1", { updatedAfter: updatedAfter ? new Date(updatedAfter as string) : undefined })
          .andWhere(updatedBefore ? "task.updatedAt <= :updatedBefore" : "1=1", { updatedBefore: updatedBefore ? new Date(updatedBefore as string) : undefined })
          .orderBy("task.updatedAt", "DESC");

        const finalTake = Math.min(take || 50, 200);
        const finalSkip = skip || 0;
        const finalPage = currentPage || 1;

        const [tasks, total] = await query.skip(finalSkip).take(finalTake).getManyAndCount();

        const idOrder = new Map(recentIds.map((id, idx) => [id, idx]));
        tasks.sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999));

        const uid = (req as any).user?.id;
        let tabs;
        if (finalPage === 1) {
          const allTotal = await taskRepository.count();
          tabs = { assigned: 0, created: 0, my: 0, all: allTotal, recent: recentIds.length, completed_closed: completedClosedCount };
          if (uid) {
            const [assigned, created] = await Promise.all([
              taskRepository.createQueryBuilder("task")
                .leftJoin("task.assignees", "tabA")
                .where("tabA.id = :uid", { uid })
                .getCount(),
              taskRepository.count({ where: { creator: { id: uid } } }),
            ]);
            const myCount = await taskRepository.createQueryBuilder("task")
              .leftJoin("task.assignees", "tabM")
              .where("tabM.id = :uid OR task.creatorId = :uid", { uid })
              .getCount();
            tabs = { assigned, created, my: myCount, all: allTotal, recent: recentIds.length, completed_closed: completedClosedCount };
          }
        }
        return res.json({ data: tasks, total: total > recentIds.length ? recentIds.length : total, page: finalPage, pageSize: finalTake, tabs });
      }

      // "我参与的"：OR 逻辑（我是负责人 OR 我是创建人），必须用 QueryBuilder
      if (myUserId) {
        const query = taskRepository
          .createQueryBuilder("task")
          .addSelect("task.transferred")
          .leftJoinAndSelect("task.assignees", "assignees")
          .leftJoinAndSelect("task.creator", "creator")
          .leftJoinAndSelect("task.subtasks", "subtasks")
          .leftJoin("task.assignees", "myAssignee", "myAssignee.id = :myUid", { myUid: myUserId })
          .where("myAssignee.id IS NOT NULL OR task.creatorId = :myUid", { myUid: myUserId })
          .andWhere(projectId ? "task.projectId = :pid" : "1=1", { pid: projectId })
          .andWhere(statuses.length === 1 ? "task.status = :status" : statuses.length > 1 ? "task.status IN (:...statuses)" : "1=1", statuses.length === 1 ? { status: statuses[0] } : statuses.length > 1 ? { statuses } : {})
          .andWhere(priority ? "task.priority = :priority" : "1=1", { priority })
          .andWhere(category ? "task.category = :category" : "1=1", { category })
          .andWhere(updatedAfter ? "task.updatedAt >= :updatedAfter" : "1=1", { updatedAfter: updatedAfter ? new Date(updatedAfter as string) : undefined })
          .andWhere(updatedBefore ? "task.updatedAt <= :updatedBefore" : "1=1", { updatedBefore: updatedBefore ? new Date(updatedBefore as string) : undefined })
          .andWhere(isUnassigned ? "NOT EXISTS (SELECT 1 FROM task_assignees_user tau WHERE tau.taskId = task.id)" : "1=1")
          .orderBy(`task.${sortField}`, order);

        const finalTake = Math.min(take || 50, 200);
        const finalSkip = skip || 0;
        const finalPage = currentPage || 1;

        const [tasks, total] = await query.skip(finalSkip).take(finalTake).getManyAndCount();
        const uid = (req as any).user?.id;
        let tabs;
        if (finalPage === 1) {
          const allTotal = await taskRepository.count();
          let recentCount = 0;
          if (uid) {
            try {
              const recentRows = await operationLogRepository.createQueryBuilder("log")
                .select("log.targetId")
                .where("log.targetType = :tt", { tt: "task" })
                .andWhere("log.userId = :uid", { uid })
                .groupBy("log.targetId")
                .getRawMany();
              recentCount = recentRows.length;
            } catch { recentCount = 0; }
          }
          tabs = { assigned: 0, created: 0, my: 0, all: allTotal, recent: recentCount, completed_closed: completedClosedCount };
          if (uid) {
            const [assigned, created] = await Promise.all([
              taskRepository.createQueryBuilder("task")
                .leftJoin("task.assignees", "tabA")
                .where("tabA.id = :uid", { uid })
                .getCount(),
              taskRepository.count({ where: { creator: { id: uid } } }),
            ]);
            const myCount = await taskRepository.createQueryBuilder("task")
              .leftJoin("task.assignees", "tabM")
              .where("tabM.id = :uid OR task.creatorId = :uid", { uid })
              .getCount();
            tabs = { assigned, created, my: myCount, all: allTotal, recent: recentCount, completed_closed: completedClosedCount };
          }
        }
        return res.json({ data: tasks, total, page: finalPage, pageSize: finalTake, tabs });
      }

      // 始终分页，默认 pageSize=50
      const finalTake = take || 50;
      const finalSkip = skip || 0;
      const finalPage = currentPage || 1;

      const [tasks, total] = await taskRepository.findAndCount({
        where,
        relations: ["assignees", "creator", "subtasks"],
        order: { [sortField]: order },
        skip: finalSkip,
        take: finalTake,
      });

      const uid = (req as any).user?.id;
      let tabs;
      if (finalPage === 1) {
        const allTotal = await taskRepository.count();
          let recentCount = 0;
          if (uid) {
            try {
              const recentRows = await operationLogRepository.createQueryBuilder("log")
                .select("log.targetId")
                .where("log.targetType = :tt", { tt: "task" })
                .andWhere("log.userId = :uid", { uid })
                .groupBy("log.targetId")
                .getRawMany();
              recentCount = recentRows.length;
            } catch { recentCount = 0; }
          }
        tabs = { assigned: 0, created: 0, my: 0, all: allTotal, recent: recentCount, completed_closed: completedClosedCount };
        if (uid) {
          const [assigned, created] = await Promise.all([
            taskRepository.createQueryBuilder("task")
              .leftJoin("task.assignees", "tabA")
              .where("tabA.id = :uid", { uid })
              .getCount(),
            taskRepository.count({ where: { creator: { id: uid } } }),
          ]);
          const myCount = await taskRepository.createQueryBuilder("task")
            .leftJoin("task.assignees", "tabM")
            .where("tabM.id = :uid OR task.creatorId = :uid", { uid })
            .getCount();
          tabs = { assigned, created, my: myCount, all: allTotal, recent: recentCount, completed_closed: completedClosedCount };
        }
      }
      return res.json({ data: tasks, total, page: finalPage, pageSize: finalTake, tabs });
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
      // user 为 null 时（用户已删除）显示"已删除人员"
      const normalizedLogs = logs.map(log => ({
        ...log,
        user: log.user
          ? { id: log.user.id, username: log.user.username, realName: log.user.realName, avatar: log.user.avatar || undefined, role: log.user.role || '' }
          : { id: 0, username: '', realName: '已删除人员', avatar: undefined, role: '' }
      }));

      res.json({ ...task, operationLogs: normalizedLogs });
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

        const newAssigneePhones = getAssigneePhones(newAssignees);

        sendNotifications("assign_task", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          oldAssignee: oldAssigneeNames,
          newAssignee: newAssigneeNames,
          newAssigneePhones: formatAtPhones(newAssigneePhones),
          feishuAt: formatFeishuAt(newAssignees),
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        }, newAssigneePhones.length > 0 ? newAssigneePhones : undefined);

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
            relations: ["assignees", "creator", "subtasks"],
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
      } else if (status === "testing") {
        // 提测：替换负责人为测试人员
        if (task.status !== "completed") {
          return res.status(400).json({ error: "只有已完成的任务才能提测" });
        }
        const { assigneeIds } = req.body;
        if (!assigneeIds || assigneeIds.length === 0) {
          return res.status(400).json({ error: "请指定测试负责人" });
        }
        const testAssignees = await resolveAssigneeIds(assigneeIds);
        extraFields.oldAssignee = getAssigneeNames(task.assignees);
        extraFields.newAssignee = getAssigneeNames(testAssignees);
        task.assignees = testAssignees;
        task.status = "testing";
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

      // 根据实际状态发送对应的通知
      const currentAssigneePhones = getAssigneePhones(task.assignees);
      if (status === "completed") {
        sendNotifications("complete_task", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        });
      } else if (status === "testing") {
        sendNotifications("submit_test_task", {
          type: "任务",
          id: String(task.id),
          title: task.title,
          assigneeName: log?.newAssignee || "未分配",
          assigneePhones: formatAtPhones(currentAssigneePhones),
          feishuAt: formatFeishuAt(task.assignees),
          operator: userName,
          time: new Date().toLocaleString("zh-CN")
        }, currentAssigneePhones.length > 0 ? currentAssigneePhones : undefined);
      }

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

      if ((log.action === "assign" || log.action === "feedback") && log.newAssigneeIds) {
        const newAssignees = await resolveAssigneeIds(log.newAssigneeIds);
        const oldAssigneeNames = getAssigneeNames(task.assignees);
        const newAssigneeNames = getAssigneeNames(newAssignees);
        extraFields.oldAssignee = oldAssigneeNames;
        extraFields.newAssignee = newAssigneeNames;

        // 反馈操作发钉钉通知
        if (log.action === "feedback") {
          const newAssigneePhones = getAssigneePhones(newAssignees);
          sendNotifications("feedback_task", {
            type: "任务",
            id: String(task.id),
            title: task.title,
            oldAssignee: oldAssigneeNames,
            newAssignee: newAssigneeNames,
            newAssigneePhones: formatAtPhones(newAssigneePhones),
            feishuAt: formatFeishuAt(newAssignees),
            operator: userName,
            time: new Date().toLocaleString("zh-CN")
          }, newAssigneePhones.length > 0 ? newAssigneePhones : undefined);
        }

        task.assignees = newAssignees;
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

      // 删除前提取任务描述中的图片URL
      const task = await taskRepository.findOne({ where: { id: parseInt(id as string) } });
      const imageUrls = task ? extractUploadUrls(task.description || '') : [];

      await taskRepository.delete(id);

      // 后台异步清理孤儿文件，不阻塞响应
      if (imageUrls.length > 0) {
        deleteUnreferencedFiles([...new Set(imageUrls)]).catch(err => {
          console.error('清理孤儿文件失败:', err);
        });
      }

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

      const newAssigneePhones = getAssigneePhones(newAssignees);

      sendNotifications("reject_task", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        assigneeName: newAssigneeNames || "未分配",
        assigneePhones: formatAtPhones(newAssigneePhones),
        feishuAt: formatFeishuAt(newAssignees),
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      }, newAssigneePhones.length > 0 ? newAssigneePhones : undefined);

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

      const newAssigneePhones = getAssigneePhones(newAssignees);

      sendNotifications("restart_task", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        assigneeName: newAssigneeNames,
        assigneePhones: formatAtPhones(newAssigneePhones),
        feishuAt: formatFeishuAt(newAssignees),
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      }, newAssigneePhones.length > 0 ? newAssigneePhones : undefined);

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

  async passTestTask(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { remark } = req.body;
      const userId = (req as any).user.id;

      const task = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["assignees", "creator"],
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.status !== "testing") {
        return res.status(400).json({ error: "只有测试中的任务才能通过" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      task.status = "closed";
      task.assignees = [];

      await taskRepository.save(task);

      await createOperationLog(
        task.id,
        userId,
        userName,
        "pass_test",
        {
          oldStatus: "testing",
          newStatus: "closed",
          oldAssignee: getAssigneeNames(task.assignees),
          newAssignee: "无",
          remark: remark || "",
        }
      );

      sendNotifications("pass_test_task", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      });

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error passing test task:", error);
      res.status(500).json({ error: "Failed to pass test task" });
    }
  },

  async rejectTestTask(req: Request, res: Response) {
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

      if (task.status !== "testing") {
        return res.status(400).json({ error: "只有测试中的任务才能打回" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      const userName = user?.realName || "未知用户";

      // 设置新负责人（开发人员）
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
        "reject_test",
        {
          oldStatus: "testing",
          newStatus: "in_progress",
          oldAssignee: oldAssigneeNames,
          newAssignee: newAssigneeNames,
          remark: remark || "",
        }
      );

      const newAssigneePhones = getAssigneePhones(newAssignees);

      sendNotifications("reject_test_task", {
        type: "任务",
        id: String(task.id),
        title: task.title,
        assigneeName: newAssigneeNames,
        assigneePhones: formatAtPhones(newAssigneePhones),
        feishuAt: formatFeishuAt(newAssignees),
        operator: userName,
        time: new Date().toLocaleString("zh-CN")
      }, newAssigneePhones.length > 0 ? newAssigneePhones : undefined);

      const updatedTask = await taskRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["project", "project.managers", "assignees", "creator", "parentTask", "subtasks"],
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error rejecting test task:", error);
      res.status(500).json({ error: "Failed to reject test task" });
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
