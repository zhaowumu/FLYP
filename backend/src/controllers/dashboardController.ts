import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { Project } from "../entities/Project";
import { User } from "../entities/User";
import { OperationLog } from "../entities/OperationLog";
import { MoreThanOrEqual } from "typeorm";

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
    const weekAgoStr = weekAgo.toISOString();

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
    // 1. 本周操作统计 + 每日趋势 + 操作分类
    const [myOpsThisWeek, totalOpsThisWeek, dailyRaw, actionRaw] = await Promise.all([
      operationLogRepository.count({ where: { user: { id: uid } as any, createdAt: MoreThanOrEqual(weekAgo) } }),
      operationLogRepository.count({ where: { createdAt: MoreThanOrEqual(weekAgo) } }),
      // 7日操作趋势（每日我的操作数+总操作数）
      AppDataSource.query(
        `SELECT DATE(createdAt) AS day,
                SUM(CASE WHEN userId = ${uid} THEN 1 ELSE 0 END) AS myCount,
                COUNT(*) AS totalCount
         FROM operation_log
         WHERE createdAt >= ?
         GROUP BY DATE(createdAt)
         ORDER BY day ASC`,
        [weekAgoStr]
      ),
      // 操作分类：按 action 分组的我的+团队统计
      AppDataSource.query(
        `SELECT action,
                COUNT(*) AS totalCount,
                SUM(CASE WHEN userId = ${uid} THEN 1 ELSE 0 END) AS myCount
         FROM operation_log
         WHERE createdAt >= ?
         GROUP BY action
         ORDER BY totalCount DESC`,
        [weekAgoStr]
      ),
    ]);

    // 操作分类归组（补全全部18种操作类型）
    const actionCategories: Record<string, string[]> = {
      '创建': ['create'],
      '指派': ['assign', 'restart', 'transfer'],
      '修复': ['fix'],
      '完成': ['complete', 'partial_complete'],
      '查验': ['verify', 'close', 'reject', 'pass_test', 'submit_test', 'reject_test'],
      '沟通': ['comment', 'feedback', 'description_change', 'reproduce_steps_change'],
      '管理': ['priority_change', 'creator_change', 'status_change', 'severity_change'],
    };
    // 每个分类包含的具体 action 列表（中文，用于前端 tooltip）
    const actionLabels: Record<string, string> = {
      '创建': '创建',
      '指派': '指派、重启、转交',
      '修复': '修复',
      '完成': '完成、部分完成',
      '查验': '验证、关闭、打回、提测、测试通过、驳回测试',
      '沟通': '评论、反馈、修改描述、修改复现步骤',
      '管理': '修改优先级、修改创建人、修改状态、修改严重度',
    };
    const categoryMyCounts: Record<string, number> = {};
    const categoryTotalCounts: Record<string, number> = {};
    for (const cat of Object.keys(actionCategories)) {
      categoryMyCounts[cat] = 0;
      categoryTotalCounts[cat] = 0;
    }
    for (const row of actionRaw) {
      const action = (row as any).action;
      const my = Number((row as any).myCount);
      const total = Number((row as any).totalCount);
      for (const [cat, actions] of Object.entries(actionCategories)) {
        if (actions.includes(action)) {
          categoryMyCounts[cat] += my;
          categoryTotalCounts[cat] += total;
          break;
        }
      }
    }
    const actionBreakdown = Object.entries(categoryMyCounts)
      .filter(([cat]) => categoryTotalCounts[cat] > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([category, myCount]) => ({
        category,
        myCount,
        totalCount: categoryTotalCounts[category],
        actions: actionLabels[category] || '',
      }));

    // 格式化每日趋势（补齐7天空白天）
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dailyMap: Record<string, { myCount: number; totalCount: number }> = {};
    for (const row of dailyRaw) {
      dailyMap[(row as any).day] = {
        myCount: Number((row as any).myCount),
        totalCount: Number((row as any).totalCount),
      };
    }
    const dailyOps: { day: string; label: string; myCount: number; totalCount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyOps.push({
        day: key,
        label: dayNames[d.getDay()],
        myCount: dailyMap[key]?.myCount || 0,
        totalCount: dailyMap[key]?.totalCount || 0,
      });
    }

    // 2. 本周头衔（每类操作排名第一的用户获得对应头衔）
    // prettier-ignore
    const titleMap: Record<string, string> = {
      create: '造物主', assign: '钦差大臣', fix: '补天匠人', close: '终结者',
      verify: '鉴黄师', complete: '交卷狂人', partial_complete: '助攻王',
      comment: '话痨评论家', reject: '冷面判官', feedback: '怼怼侠',
      description_change: '说书先生', submit_test: '送检大师', pass_test: '真品收藏家',
      priority_change: '插队艺术家', restart: '回档大师', status_change: '变脸艺人',
      reproduce_steps_change: '考古学家', creator_change: '夺舍仙人',
    };
    const titlePriority = Object.keys(titleMap); // 靠前的优先级更高
    const topUsersRaw = await AppDataSource.query(
      `SELECT action, userId, COUNT(*) AS cnt
       FROM operation_log WHERE createdAt >= ? GROUP BY action, userId
       ORDER BY action, cnt DESC`,
      [weekAgoStr]
    );
    const topByAction: Record<string, { userId: number; cnt: number }> = {};
    for (const row of topUsersRaw) {
      if (!topByAction[(row as any).action]) {
        topByAction[(row as any).action] = { userId: Number((row as any).userId), cnt: Number((row as any).cnt) };
      }
    }
    const weeklyTitles: string[] = [];
    for (const action of titlePriority) {
      if (topByAction[action] && topByAction[action].userId === uid) {
        weeklyTitles.push(titleMap[action]);
      }
    }

    // 3. 我的任务（当前负责人是我 OR 我创建的）
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

    // 待办列表（排序后取 10 条）
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const myPendingTasks = activeTasks
      .sort((a, b) => (severityOrder[a.priority] || 99) - (severityOrder[b.priority] || 99) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
    const myPendingBugs = activeBugs
      .sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // 按优先级/严重程度分组
    const workloadByPriority: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
    activeTasks.forEach(t => { if (workloadByPriority[t.priority] !== undefined) workloadByPriority[t.priority]++; });

    const workloadBySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    activeBugs.forEach(b => { if (workloadBySeverity[b.severity] !== undefined) workloadBySeverity[b.severity]++; });

    const efficiencyRate = totalOpsThisWeek > 0 ? Math.round((myOpsThisWeek / totalOpsThisWeek) * 100) : 0;

    return res.json({
      myPendingTasks,
      myPendingBugs,
      stats: {
        activeTaskCount: activeTasks.length,
        activeBugCount: activeBugs.length,
        workloadCount: activeTasks.length + activeBugs.length,
        pendingTaskCount: activeTasks.filter(t => t.status === "pending").length,
        inProgressCount: activeTasks.filter(t => t.status === "in_progress").length,
        myOpsThisWeek,
        totalOpsThisWeek,
        efficiencyRate,
      },
      dailyOps,
      actionBreakdown,
      weeklyTitles,
      workloadByPriority,
      workloadBySeverity,
      recentLogs,
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};

/**
 * GET /api/dashboard/leaderboard
 * 本周排行榜：每类操作的第一名用户
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const weekAgoStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // prettier-ignore
    const titleMap: Record<string, string> = {
      create: '造物主', assign: '钦差大臣', fix: '补天匠人', close: '终结者',
      verify: '鉴黄师', complete: '交卷狂人', partial_complete: '助攻王',
      comment: '话痨评论家', reject: '冷面判官', feedback: '怼怼侠',
      description_change: '说书先生', submit_test: '送检大师', pass_test: '真品收藏家',
      priority_change: '插队艺术家', restart: '回档大师', status_change: '变脸艺人',
      reproduce_steps_change: '考古学家', creator_change: '夺舍仙人',
    };
    const titleOrder = Object.keys(titleMap);

    const raw = await AppDataSource.query(
      `SELECT ol.action, ol.userId, u.realName, u.avatar, COUNT(*) AS cnt
       FROM operation_log ol
       LEFT JOIN user u ON u.id = ol.userId
       WHERE ol.createdAt >= ?
       GROUP BY ol.action, ol.userId
       ORDER BY ol.action, cnt DESC`,
      [weekAgoStr]
    );

    // 取每类操作的第一名
    const leaderboard = titleOrder.map(action => {
      const tops = raw.filter((r: any) => r.action === action);
      const first = tops[0];
      return {
        action,
        title: titleMap[action],
        user: first ? {
          id: Number(first.userId),
          realName: first.realName,
          avatar: first.avatar,
        } : null,
        count: first ? Number(first.cnt) : 0,
      };
    });

    return res.json(leaderboard);
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
};
