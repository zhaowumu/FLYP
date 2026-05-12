import * as XLSX from "xlsx";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { User } from "../entities/User";
import { Project } from "../entities/Project";
import { OperationLog } from "../entities/OperationLog";
import { SystemConfig } from "../entities/SystemConfig";

export class ExcelService {
  // 去除HTML标签
  private stripHtml(html: string): string {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  }

  // 获取任务状态中文
  private getTaskStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: "待处理",
      in_progress: "进行中",
      completed: "已完成",
      testing: "测试中",
      closed: "已关闭",
    };
    return map[status] || status;
  }

  // 获取任务优先级中文
  private getTaskPriorityText(priority: string): string {
    const map: Record<string, string> = {
      low: "低",
      medium: "中",
      high: "高",
      urgent: "紧急",
    };
    return map[priority] || priority;
  }

  // 获取BUG状态中文
  private getBugStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: "待处理",
      assigned: "已分配",
      fixing: "修复中",
      fixed: "已修复",
      verified: "已验证",
      closed: "已关闭",
    };
    return map[status] || status;
  }

  // 获取BUG严重程度中文
  private getBugSeverityText(severity: string): string {
    const map: Record<string, string> = {
      low: "低",
      medium: "中",
      high: "高",
      critical: "严重",
    };
    return map[severity] || severity;
  }

  // 导出任务到Excel
  async exportTasksToExcel(projectId?: number): Promise<Buffer> {
    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const where: any = {};
      if (projectId) where.project = { id: projectId };

      const tasks = await taskRepository.find({
        where,
        relations: ["project", "assignees", "creator", "parentTask"],
      });

      // 准备数据
      const data = tasks.map(task => ({
        "任务ID": task.id,
        "任务标题": task.title,
        "任务描述": this.stripHtml(task.description),
        "优先级": this.getTaskPriorityText(task.priority),
        "状态": this.getTaskStatusText(task.status),
        "负责人": task.assignees?.map((a: any) => a.realName).join('、') || "未分配",
        "创建人": task.creator?.realName,
        "所属项目": task.project?.name,
        "父任务": task.parentTask ? task.parentTask.title : "无",
        "截止日期": task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "无",
        "创建时间": new Date(task.createdAt).toLocaleString(),
        "更新时间": new Date(task.updatedAt).toLocaleString(),
      }));

      // 创建工作簿
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "任务列表");

      // 生成Buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return buffer;
    } catch (error) {
      console.error("Error exporting tasks to Excel:", error);
      throw error;
    }
  }

  // 导出BUG到Excel
  async exportBugsToExcel(projectId?: number): Promise<Buffer> {
    try {
      const bugRepository = AppDataSource.getRepository(Bug);
      const where: any = {};
      if (projectId) where.project = { id: projectId };

      const bugs = await bugRepository.find({
        where,
        relations: ["project", "assignee", "reporter"],
      });

      // 准备数据
      const data = bugs.map(bug => ({
        "BUG ID": bug.id,
        "BUG标题": bug.title,
        "BUG描述": this.stripHtml(bug.description),
        "严重程度": this.getBugSeverityText(bug.severity),
        "状态": this.getBugStatusText(bug.status),
        "重现步骤": this.stripHtml(bug.reproduceSteps),
        "负责人": bug.assignee?.realName || "未分配",
        "报告人": bug.reporter?.realName,
        "所属项目": bug.project?.name,
        "创建时间": new Date(bug.createdAt).toLocaleString(),
        "更新时间": new Date(bug.updatedAt).toLocaleString(),
      }));

      // 创建工作簿
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BUG列表");

      // 生成Buffer
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return buffer;
    } catch (error) {
      console.error("Error exporting bugs to Excel:", error);
      throw error;
    }
  }

  // 导出全部数据到Excel（多Sheet）
  async exportAllToExcel(): Promise<Buffer> {
    try {
      const userRepository = AppDataSource.getRepository(User);
      const projectRepository = AppDataSource.getRepository(Project);
      const taskRepository = AppDataSource.getRepository(Task);
      const bugRepository = AppDataSource.getRepository(Bug);
      const operationLogRepository = AppDataSource.getRepository(OperationLog);
      const systemConfigRepository = AppDataSource.getRepository(SystemConfig);

      const users = await userRepository.find();
      const projects = await projectRepository.find();
      const tasks = await taskRepository.find({
        relations: ["project", "assignees", "creator", "parentTask"],
      });
      const bugs = await bugRepository.find({
        relations: ["project", "assignee", "reporter"],
      });
      const logs = await operationLogRepository.find({
        relations: ["user"],
        order: { createdAt: "DESC" },
      });
      const configs = await systemConfigRepository.find();

      const workbook = XLSX.utils.book_new();

      const usersData = users.map(user => ({
        "用户ID": user.id,
        "用户名": user.username,
        "真实姓名": user.realName,
        "手机号": user.phone || "",
        "角色": user.role,
        "状态": user.isActive ? "启用" : "禁用",
        "创建时间": user.createdAt ? new Date(user.createdAt).toLocaleString() : "",
        "更新时间": user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "",
      }));
      const usersSheet = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(workbook, usersSheet, "用户信息");

      const projectsData = projects.map(project => ({
        "项目ID": project.id,
        "项目名称": project.name,
        "项目描述": this.stripHtml(project.description || ""),
        "状态": project.status,
        "创建人ID": project.createdBy,
        "创建时间": project.createdAt ? new Date(project.createdAt).toLocaleString() : "",
        "更新时间": project.updatedAt ? new Date(project.updatedAt).toLocaleString() : "",
      }));
      const projectsSheet = XLSX.utils.json_to_sheet(projectsData);
      XLSX.utils.book_append_sheet(workbook, projectsSheet, "项目信息");

      const tasksData = tasks.map(task => ({
        "任务ID": task.id,
        "任务标题": task.title,
        "任务描述": this.stripHtml(task.description),
        "优先级": this.getTaskPriorityText(task.priority),
        "状态": this.getTaskStatusText(task.status),
        "负责人": task.assignees?.map((a: any) => a.realName).join('、') || "未分配",
        "创建人": task.creator?.realName,
        "所属项目": task.project?.name,
        "父任务": task.parentTask ? task.parentTask.title : "无",
        "截止日期": task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "无",
        "创建时间": new Date(task.createdAt).toLocaleString(),
        "更新时间": new Date(task.updatedAt).toLocaleString(),
      }));
      const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
      XLSX.utils.book_append_sheet(workbook, tasksSheet, "任务信息");

      const bugsData = bugs.map(bug => ({
        "缺陷ID": bug.id,
        "缺陷标题": bug.title,
        "缺陷描述": this.stripHtml(bug.description),
        "严重程度": this.getBugSeverityText(bug.severity),
        "状态": this.getBugStatusText(bug.status),
        "重现步骤": this.stripHtml(bug.reproduceSteps),
        "负责人": bug.assignee?.realName || "未分配",
        "报告人": bug.reporter?.realName,
        "所属项目": bug.project?.name,
        "截止日期": bug.dueDate ? new Date(bug.dueDate).toLocaleDateString() : "无",
        "创建时间": new Date(bug.createdAt).toLocaleString(),
        "更新时间": new Date(bug.updatedAt).toLocaleString(),
      }));
      const bugsSheet = XLSX.utils.json_to_sheet(bugsData);
      XLSX.utils.book_append_sheet(workbook, bugsSheet, "缺陷信息");

      const logsData = logs.map(log => ({
        "日志ID": log.id,
        "目标类型": log.targetType === "task" ? "任务" : "缺陷",
        "目标ID": log.targetId,
        "操作类型": log.action,
        "操作人": log.user?.realName || "未知",
        "旧状态": log.oldStatus || "",
        "新状态": log.newStatus || "",
        "旧优先级": log.oldPriority || "",
        "新优先级": log.newPriority || "",
        "备注": log.remark || "",
        "创建时间": log.createdAt ? new Date(log.createdAt).toLocaleString() : "",
      }));
      const logsSheet = XLSX.utils.json_to_sheet(logsData);
      XLSX.utils.book_append_sheet(workbook, logsSheet, "操作日志");

      const configsData = configs.map(config => ({
        "配置ID": config.id,
        "配置键": config.key,
        "配置值": config.value,
        "描述": config.description || "",
        "创建时间": config.createdAt ? new Date(config.createdAt).toLocaleString() : "",
        "更新时间": config.updatedAt ? new Date(config.updatedAt).toLocaleString() : "",
      }));
      const configsSheet = XLSX.utils.json_to_sheet(configsData);
      XLSX.utils.book_append_sheet(workbook, configsSheet, "系统配置");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return buffer;
    } catch (error) {
      console.error("Error exporting all data to Excel:", error);
      throw error;
    }
  }

  // 从Excel导入任务
  async importTasksFromExcel(fileBuffer: Buffer, projectId: number): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const taskRepository = AppDataSource.getRepository(Task);
      const userRepository = AppDataSource.getRepository(User);

      // 读取Excel文件
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of data as any[]) {
        try {
          // 查找负责人（支持多个，用、或,分隔）
          let assignees: User[] = [];
          if (row["负责人"] && row["负责人"] !== "未分配") {
            const names = row["负责人"].split(/[、,]/).map((n: string) => n.trim()).filter(Boolean);
            for (const name of names) {
              const user = await userRepository.findOne({ where: { realName: name } });
              if (user) assignees.push(user);
            }
          }

          // 创建任务
          const task = taskRepository.create({
            title: row["任务标题"],
            description: row["任务描述"] || "",
            priority: this.convertToTaskPriority(row["优先级"]),
            status: this.convertToTaskStatus(row["状态"]),
            dueDate: row["截止日期"] ? new Date(row["截止日期"]) : undefined,
            project: { id: projectId } as any,
            assignees: assignees.length > 0 ? assignees : [],
          });

          await taskRepository.save(task);
          success++;
        } catch (error) {
          failed++;
          errors.push(`行 ${data.indexOf(row) + 1}: ${(error as Error).message}`);
        }
      }

      return { success, failed, errors };
    } catch (error) {
      console.error("Error importing tasks from Excel:", error);
      throw error;
    }
  }

  // 从Excel导入BUG
  async importBugsFromExcel(fileBuffer: Buffer, projectId: number): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const bugRepository = AppDataSource.getRepository(Bug);
      const userRepository = AppDataSource.getRepository(User);

      // 读取Excel文件
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of data as any[]) {
        try {
          // 查找负责人
          let assignee = null;
          if (row["负责人"] && row["负责人"] !== "未分配") {
            assignee = await userRepository.findOne({
              where: { realName: row["负责人"] },
            });
          }

          // 查找报告人
          let reporter = null;
          if (row["报告人"]) {
            reporter = await userRepository.findOne({
              where: { realName: row["报告人"] },
            });
          }

          // 创建BUG
          const bug = bugRepository.create({
            title: row["BUG标题"],
            description: row["BUG描述"] || "",
            severity: this.convertToBugSeverity(row["严重程度"]),
            status: this.convertToBugStatus(row["状态"]),
            reproduceSteps: row["重现步骤"] || "",
            project: { id: projectId } as any,
            assignee: assignee ? { id: assignee.id } as any : null,
            reporter: reporter ? { id: reporter.id } as any : null,
          });

          await bugRepository.save(bug);
          success++;
        } catch (error) {
          failed++;
          errors.push(`行 ${data.indexOf(row) + 1}: ${(error as Error).message}`);
        }
      }

      return { success, failed, errors };
    } catch (error) {
      console.error("Error importing bugs from Excel:", error);
      throw error;
    }
  }

  // 生成任务Excel模板
  generateTaskTemplate(): Buffer {
    const templateData = [
      {
        "任务标题": "示例任务标题",
        "任务描述": "示例任务描述",
        "优先级": "中",
        "状态": "待处理",
        "负责人": "张三",
        "截止日期": "2024-12-31",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "任务导入模板");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return buffer;
  }

  // 生成BUG Excel模板
  generateBugTemplate(): Buffer {
    const templateData = [
      {
        "BUG标题": "示例BUG标题",
        "BUG描述": "示例BUG描述",
        "严重程度": "中",
        "状态": "待处理",
        "重现步骤": "1. 打开页面\n2. 点击按钮\n3. 观察错误",
        "负责人": "李四",
        "报告人": "王五",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BUG导入模板");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return buffer;
  }

  // 辅助方法：转换任务优先级
  private convertToTaskPriority(priority: string): string {
    switch (priority?.toLowerCase()) {
      case "低":
        return "low";
      case "中":
        return "medium";
      case "高":
        return "high";
      case "紧急":
        return "urgent";
      default:
        return "medium";
    }
  }

  // 辅助方法：转换任务状态
  private convertToTaskStatus(status: string): string {
    switch (status?.toLowerCase()) {
      case "待处理":
        return "pending";
      case "进行中":
        return "in_progress";
      case "已完成":
        return "completed";
      case "测试中":
        return "testing";
      case "已关闭":
        return "closed";
      default:
        return "pending";
    }
  }

  // 辅助方法：转换BUG严重程度
  private convertToBugSeverity(severity: string): string {
    switch (severity?.toLowerCase()) {
      case "低":
        return "low";
      case "中":
        return "medium";
      case "高":
        return "high";
      case "严重":
        return "critical";
      default:
        return "medium";
    }
  }

  // 辅助方法：转换BUG状态
  private convertToBugStatus(status: string): string {
    switch (status?.toLowerCase()) {
      case "待处理":
        return "pending";
      case "已分配":
        return "assigned";
      case "修复中":
        return "fixing";
      case "已修复":
        return "fixed";
      case "已验证":
        return "verified";
      case "已关闭":
        return "closed";
      default:
        return "pending";
    }
  }
}