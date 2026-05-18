import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { Project } from "../entities/Project";
import { User } from "../entities/User";
import { OperationLog } from "../entities/OperationLog";

const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);
const projectRepository = AppDataSource.getRepository(Project);
const userRepository = AppDataSource.getRepository(User);
const operationLogRepository = AppDataSource.getRepository(OperationLog);

/**
 * GET /api/dashboard
 * 返回工作台数据，按角色返回不同内容
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const uid = (req as any).user.id;
    const role = (req as any).user.role;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ===== 各角色通用的日志 =====
    const recentLogs = await operationLogRepository.find({
      relations: ["user"],
      order: { createdAt: "DESC" },
      take: 10,
    });

    // ===== Admin 视图 =====
    if (role === "admin") {
      const [
        totalTasks,
        totalBugs,
        activeProjects,
        totalUsers,
        completedThisWeek,
        pendingItems,
      ] = await Promise.all([
        taskRepository.count(),
        bugRepository.count(),
        projectRepository.count({ where: { status: "active" } }),
        userRepository.count(),
        taskRepository
          .createQueryBuilder("task")
          .where("task.status IN (:...statuses)", { statuses: ["completed", "closed"] })
          .andWhere("task.updatedAt >= :weekAgo", { weekAgo })
          .getCount(),
        // 待处理 = 未完成的任务 + 未关闭的 Bug
        Promise.all([
          taskRepository
            .createQueryBuilder("task")
            .where("task.status NOT IN (:...done)", { done: ["completed", "closed"] })
            .getCount(),
          bugRepository
            .createQueryBuilder("bug")
            .where("bug.status NOT IN (:...done)", { done: ["closed", "verified"] })
            .getCount(),
        ]).then(([t, b]) => t + b),
      ]);

      // 活跃项目列表（带进度）
      const projects = await projectRepository.find({
        where: { status: "active" },
        relations: ["managers"],
        take: 8,
        order: { updatedAt: "DESC" },
      });
      const projectIds = projects.map(p => p.id);
      // 批量查每个项目的任务数
      const taskCounts = projectIds.length
        ? await taskRepository
            .createQueryBuilder("task")
            .select("task.projectId", "projectId")
            .addSelect("COUNT(*)", "total")
            .addSelect("SUM(CASE WHEN task.status IN ('completed','closed') THEN 1 ELSE 0 END)", "done")
            .where("task.projectId IN (:...ids)", { ids: projectIds })
            .groupBy("task.projectId")
            .getRawMany()
        : [];
      const taskCountMap: Record<number, { total: number; done: number }> = {};
      taskCounts.forEach((r: any) => {
        taskCountMap[r.projectId] = { total: Number(r.total), done: Number(r.done) };
      });
      const recentProjects = projects.map(p => {
        const tc = taskCountMap[p.id] || { total: 0, done: 0 };
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          managers: (p.managers || []).map((m: any) => ({ id: m.id, realName: m.realName, avatar: m.avatar })),
          progress: tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0,
        };
      });

      // 急迫缺陷 TOP5 — 查询后在 JS 层按严重程度排序（TypeORM orderBy 不支持 CASE WHEN）
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const allUrgentBugs = await bugRepository
        .createQueryBuilder("bug")
        .leftJoinAndSelect("bug.project", "bugProject")
        .leftJoinAndSelect("bug.assignee", "bugAssignee")
        .where("bug.status IN (:...statuses)", { statuses: ["pending", "in_progress"] })
        .orderBy("bug.createdAt", "DESC")
        .limit(50)
        .getMany();
      const urgentBugs = allUrgentBugs
        .sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // 即将到期任务 TOP5
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const dueSoonTasks = await taskRepository
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.project", "tsProject")
        .leftJoinAndSelect("task.assignees", "tsAssignees")
        .leftJoinAndSelect("task.creator", "tsCreator")
        .where("task.dueDate IS NOT NULL")
        .andWhere("task.dueDate <= :threeDaysLater", { threeDaysLater })
        .andWhere("task.status NOT IN (:...closedStatuses)", { closedStatuses: ["completed", "closed"] })
        .orderBy("task.dueDate", "ASC")
        .take(5)
        .getMany();

      // 非管理员团队成员
      const allNonAdminUsers = await userRepository
        .createQueryBuilder("user")
        .where("user.role != :adminRole", { adminRole: "admin" })
        .getMany();

      // 批量统计每个成员的任务/缺陷
      const userIds = allNonAdminUsers.map(u => u.id);
      const userTaskStats = userIds.length
        ? await taskRepository
            .createQueryBuilder("task")
            .leftJoin("task.assignees", "statAssignee")
            .select("statAssignee.id", "userId")
            .addSelect("COUNT(*)", "total")
            .addSelect("SUM(CASE WHEN task.status = 'pending' THEN 1 ELSE 0 END)", "pending")
            .addSelect("SUM(CASE WHEN task.status = 'in_progress' THEN 1 ELSE 0 END)", "inProgress")
            .addSelect("SUM(CASE WHEN task.status = 'testing' THEN 1 ELSE 0 END)", "testing")
            .addSelect("SUM(CASE WHEN task.status IN ('completed','closed') THEN 1 ELSE 0 END)", "completed")
            .where("statAssignee.id IN (:...ids)", { ids: userIds })
            .groupBy("statAssignee.id")
            .getRawMany()
        : [];
      const userBugStats = userIds.length
        ? await bugRepository
            .createQueryBuilder("bug")
            .leftJoin("bug.assignee", "statBAssignee")
            .select("statBAssignee.id", "userId")
            .addSelect("COUNT(*)", "total")
            .addSelect("SUM(CASE WHEN bug.status NOT IN ('closed','verified') THEN 1 ELSE 0 END)", "open")
            .where("statBAssignee.id IN (:...ids)", { ids: userIds })
            .groupBy("statBAssignee.id")
            .getRawMany()
        : [];
      const taskStatMap: Record<number, any> = {};
      const bugStatMap: Record<number, number> = {};
      userTaskStats.forEach((r: any) => {
        taskStatMap[Number(r.userId)] = r;
      });
      userBugStats.forEach((r: any) => {
        bugStatMap[Number(r.userId)] = Number(r.open);
      });

      const teamMembers = allNonAdminUsers.map(u => {
        const ts = taskStatMap[u.id] || { total: 0, pending: 0, inProgress: 0, testing: 0, completed: 0 };
        const totalTasks = Number(ts.total);
        const completedCount = Number(ts.completed);
        return {
          id: u.id,
          name: u.realName,
          role: u.role,
          avatar: u.avatar,
          taskCount: Number(ts.pending) + Number(ts.inProgress),
          pendingCount: Number(ts.pending),
          inProgressCount: Number(ts.inProgress),
          testingCount: Number(ts.testing),
          completedCount,
          totalTasks,
          completionRate: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0,
          openBugCount: bugStatMap[u.id] || 0,
        };
      }).sort((a, b) => b.completionRate - a.completionRate);

      return res.json({
        stats: {
          activeProjects,
          totalTasks,
          totalBugs,
          teamMemberCount: totalUsers,
          pendingItems,
          completedThisWeek,
        },
        recentProjects,
        teamMembers,
        urgentBugs: urgentBugs.map(b => ({
          id: b.id,
          title: b.title,
          severity: b.severity,
          status: b.status,
          project: b.project ? { id: b.project.id, name: b.project.name } : null,
          assignee: b.assignee ? { id: b.assignee.id, realName: b.assignee.realName } : null,
        })),
        dueSoonTasks: dueSoonTasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          assignees: (t.assignees || []).map((a: any) => ({ id: a.id, realName: a.realName })),
          project: t.project ? { id: t.project.id, name: t.project.name } : null,
        })),
        recentLogs,
      });
    }

    // ===== PM 视图 =====
    if (role === "project_manager") {
      // 我管理的项目
      const myProjects = await projectRepository
        .createQueryBuilder("project")
        .leftJoin("project.managers", "pmManager")
        .where("pmManager.id = :uid", { uid })
        .getMany();
      const pmProjectIds = myProjects.map(p => p.id);

      // PM 统计 — 待指派/待关闭
      const [unassignedTasks, closeableTasks, unassignedBugs, closeableBugs] = await Promise.all([
        // 待指派的任务：pending 状态且无 assignee（通过 LEFT JOIN 中间表判断）
        pmProjectIds.length
          ? taskRepository
              .createQueryBuilder("task")
              .leftJoin("task.assignees", "uaAssignee")
              .where("task.projectId IN (:...ids)", { ids: pmProjectIds })
              .andWhere("task.status = :status", { status: "pending" })
              .andWhere("uaAssignee.id IS NULL")
              .getCount()
          : Promise.resolve(0),
        // 待关闭的任务：completed 状态
        pmProjectIds.length
          ? taskRepository
              .createQueryBuilder("task")
              .where("task.projectId IN (:...ids)", { ids: pmProjectIds })
              .andWhere("task.status = :status", { status: "completed" })
              .getCount()
          : Promise.resolve(0),
        // 待指派的 Bug：非关闭状态且无 assignee
        pmProjectIds.length
          ? bugRepository
              .createQueryBuilder("bug")
              .leftJoin("bug.assignee", "ubAssignee")
              .where("bug.projectId IN (:...ids)", { ids: pmProjectIds })
              .andWhere("bug.status NOT IN (:...closedStatuses)", { closedStatuses: ["closed", "verified"] })
              .andWhere("ubAssignee.id IS NULL")
              .getCount()
          : Promise.resolve(0),
        // 待关闭的 Bug：verified 状态
        pmProjectIds.length
          ? bugRepository
              .createQueryBuilder("bug")
              .where("bug.projectId IN (:...ids)", { ids: pmProjectIds })
              .andWhere("bug.status = :status", { status: "verified" })
              .getCount()
          : Promise.resolve(0),
      ]);

      // PM 视图中团队成员 = 所管理项目中被分配了任务的用户 + 管理者自己
      const assignedMemberIds = pmProjectIds.length
        ? await taskRepository
            .createQueryBuilder("task")
            .leftJoin("task.assignees", "amAssignee")
            .select("DISTINCT amAssignee.id", "userId")
            .where("task.projectId IN (:...ids)", { ids: pmProjectIds })
            .getRawMany()
        : [];
      const uniqueMemberIds = [...new Set(assignedMemberIds.map((r: any) => Number(r.userId)))];
      // 始终包含 PM 自己
      if (!uniqueMemberIds.includes(Number(uid))) uniqueMemberIds.push(Number(uid));

      const memberUsers = uniqueMemberIds.length
        ? await userRepository.findByIds(uniqueMemberIds)
        : [];

      const memberTaskStats = uniqueMemberIds.length
        ? await taskRepository
            .createQueryBuilder("task")
            .leftJoin("task.assignees", "mtAssignee")
            .select("mtAssignee.id", "userId")
            .addSelect("COUNT(*)", "total")
            .addSelect("SUM(CASE WHEN task.status = 'pending' THEN 1 ELSE 0 END)", "pending")
            .addSelect("SUM(CASE WHEN task.status = 'in_progress' THEN 1 ELSE 0 END)", "inProgress")
            .addSelect("SUM(CASE WHEN task.status = 'testing' THEN 1 ELSE 0 END)", "testing")
            .addSelect("SUM(CASE WHEN task.status IN ('completed','closed') THEN 1 ELSE 0 END)", "done")
            .where("mtAssignee.id IN (:...ids)", { ids: uniqueMemberIds })
            .groupBy("mtAssignee.id")
            .getRawMany()
        : [];
      const memberBugStats = uniqueMemberIds.length
        ? await bugRepository
            .createQueryBuilder("bug")
            .leftJoin("bug.assignee", "mbAssignee")
            .select("mbAssignee.id", "userId")
            .addSelect("SUM(CASE WHEN bug.status NOT IN ('closed','verified') THEN 1 ELSE 0 END)", "open")
            .where("mbAssignee.id IN (:...ids)", { ids: uniqueMemberIds })
            .groupBy("mbAssignee.id")
            .getRawMany()
        : [];

      const mTaskMap: Record<number, any> = {};
      const mBugMap: Record<number, number> = {};
      memberTaskStats.forEach((r: any) => { mTaskMap[Number(r.userId)] = r; });
      memberBugStats.forEach((r: any) => { mBugMap[Number(r.userId)] = Number(r.open); });

      const teamMembers = memberUsers.map(u => {
        const ts = mTaskMap[u.id] || { total: 0, pending: 0, inProgress: 0, testing: 0, done: 0 };
        const totalTasks = Number(ts.total);
        const activeCount = Number(ts.pending) + Number(ts.inProgress);
        return {
          id: u.id,
          name: u.realName,
          role: u.role,
          avatar: u.avatar,
          taskCount: activeCount,
          pendingCount: Number(ts.pending),
          inProgressCount: Number(ts.inProgress),
          testingCount: Number(ts.testing),
          totalTasks,
          completionRate: totalTasks > 0 ? Math.round((Number(ts.done) / totalTasks) * 100) : 0,
          openBugCount: mBugMap[u.id] || 0,
        };
      }).sort((a, b) => b.completionRate - a.completionRate);

      // PM 管理的项目进度
      const pmProjects = pmProjectIds.length
        ? await projectRepository.find({
            where: pmProjectIds.map(id => ({ id })),
            relations: ["managers"],
          })
        : [];
      const pmTaskCounts = pmProjectIds.length
        ? await taskRepository
            .createQueryBuilder("task")
            .select("task.projectId", "projectId")
            .addSelect("COUNT(*)", "total")
            .addSelect("SUM(CASE WHEN task.status IN ('completed','closed') THEN 1 ELSE 0 END)", "done")
            .where("task.projectId IN (:...ids)", { ids: pmProjectIds })
            .groupBy("task.projectId")
            .getRawMany()
        : [];
      const pmTaskCountMap: Record<number, { total: number; done: number }> = {};
      pmTaskCounts.forEach((r: any) => {
        pmTaskCountMap[r.projectId] = { total: Number(r.total), done: Number(r.done) };
      });
      const recentProjects = pmProjects.map(p => {
        const tc = pmTaskCountMap[p.id] || { total: 0, done: 0 };
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          managers: (p.managers || []).map((m: any) => ({ id: m.id, realName: m.realName, avatar: m.avatar })),
          progress: tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0,
        };
      });

      // PM 项目的紧急缺陷 TOP5 — JS 层排序（TypeORM orderBy 不支持 CASE WHEN）
      const pmSeverityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const allPmUrgentBugs = pmProjectIds.length
        ? await bugRepository
            .createQueryBuilder("bug")
            .leftJoinAndSelect("bug.project", "bugProject")
            .leftJoinAndSelect("bug.assignee", "bugAssignee")
            .where("bug.projectId IN (:...ids)", { ids: pmProjectIds })
            .andWhere("bug.status IN (:...statuses)", { statuses: ["pending", "in_progress"] })
            .orderBy("bug.createdAt", "DESC")
            .limit(50)
            .getMany()
        : [];
      const urgentBugs = allPmUrgentBugs
        .sort((a, b) => (pmSeverityOrder[a.severity] ?? 99) - (pmSeverityOrder[b.severity] ?? 99) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // PM 项目的即将到期任务 TOP5
      const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const dueSoonTasks = pmProjectIds.length
        ? await taskRepository
            .createQueryBuilder("task")
            .leftJoinAndSelect("task.project", "tsProject")
            .leftJoinAndSelect("task.assignees", "tsAssignees")
            .where("task.projectId IN (:...ids)", { ids: pmProjectIds })
            .andWhere("task.dueDate IS NOT NULL")
            .andWhere("task.dueDate <= :threeDaysLater", { threeDaysLater })
            .andWhere("task.status NOT IN (:...closedStatuses)", { closedStatuses: ["completed", "closed"] })
            .orderBy("task.dueDate", "ASC")
            .take(5)
            .getMany()
        : [];

      return res.json({
        stats: { unassignedTasks, closeableTasks, unassignedBugs, closeableBugs },
        recentProjects,
        teamMembers,
        urgentBugs: urgentBugs.map(b => ({
          id: b.id,
          title: b.title,
          severity: b.severity,
          status: b.status,
          project: b.project ? { id: b.project.id, name: b.project.name } : null,
          assignee: b.assignee ? { id: b.assignee.id, realName: b.assignee.realName } : null,
        })),
        dueSoonTasks: dueSoonTasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          assignees: (t.assignees || []).map((a: any) => ({ id: a.id, realName: a.realName })),
          project: t.project ? { id: t.project.id, name: t.project.name } : null,
        })),
        recentLogs,
      });
    }

    // ===== Developer/Designer/Artist/Tester 视图 =====
    const [myTasks, myBugs] = await Promise.all([
      taskRepository
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.project", "myTaskProject")
        .leftJoinAndSelect("task.assignees", "myTaskAssignees")
        .leftJoinAndSelect("task.creator", "myTaskCreator")
        .leftJoin("task.assignees", "myTaskFilter")
        .where("(myTaskFilter.id = :uid OR myTaskCreator.id = :uid)", { uid })
        .orderBy("task.updatedAt", "DESC")
        .limit(50)
        .getMany(),
      bugRepository
        .createQueryBuilder("bug")
        .leftJoinAndSelect("bug.project", "myBugProject")
        .leftJoinAndSelect("bug.assignee", "myBugAssignee")
        .leftJoinAndSelect("bug.reporter", "myBugReporter")
        .where("(myBugAssignee.id = :uid OR myBugReporter.id = :uid)", { uid })
        .orderBy("bug.updatedAt", "DESC")
        .limit(50)
        .getMany(),
    ]);

    // 统计数据
    const activeTasks = myTasks.filter(t => t.status !== "completed" && t.status !== "closed");
    const activeBugs = myBugs.filter(b => b.status !== "closed" && b.status !== "verified" && b.status !== "fixed");
    const completedTasksThisWeek = myTasks.filter(
      t => (t.status === "completed" || t.status === "closed") && t.updatedAt >= weekAgo
    ).length;

    // 按优先级/严重程度分组
    const workloadByPriority: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    activeTasks.forEach(t => { if (workloadByPriority[t.priority] !== undefined) workloadByPriority[t.priority]++; });

    const workloadBySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    activeBugs.forEach(b => { if (workloadBySeverity[b.severity] !== undefined) workloadBySeverity[b.severity]++; });

    // 待办列表（排序后取 10 条）
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const myPendingTasks = activeTasks
      .sort((a, b) => (severityOrder[a.priority] || 99) - (severityOrder[b.priority] || 99) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    const myPendingBugs = activeBugs
      .sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const totalTasksThisWeek = myTasks.length;
    const taskCompletionRate = totalTasksThisWeek > 0
      ? Math.round((myTasks.filter(t => t.status === "completed" || t.status === "closed").length / totalTasksThisWeek) * 100)
      : 0;

    return res.json({
      myPendingTasks,
      myPendingBugs,
      stats: {
        pendingTaskCount: activeTasks.filter(t => t.status === "pending").length,
        inProgressCount: activeTasks.filter(t => t.status === "in_progress").length,
        completedTaskCount: myTasks.filter(t => t.status === "completed").length,
        closedTaskCount: myTasks.filter(t => t.status === "closed").length,
        activeTaskCount: activeTasks.length,
        activeBugCount: activeBugs.length,
        totalTasksThisWeek,
        completedTasksThisWeek,
        taskCompletionRate,
      },
      workloadByPriority,
      workloadBySeverity,
      recentLogs,
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};
