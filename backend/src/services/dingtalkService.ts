import axios from "axios";
import { config } from "../config";

export interface DingTalkMessage {
  msgtype: "text" | "markdown";
  text?: {
    content: string;
  };
  markdown?: {
    title: string;
    text: string;
  };
  at?: {
    atMobiles?: string[];
    isAtAll?: boolean;
  };
}

export class DingTalkService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = config.dingtalk.webhook;
  }

  // 发送文本消息
  async sendTextMessage(content: string, atMobiles?: string[], isAtAll?: boolean): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        console.warn("DingTalk webhook URL is not configured");
        return false;
      }

      const message: DingTalkMessage = {
        msgtype: "text",
        text: {
          content,
        },
        at: {
          atMobiles,
          isAtAll,
        },
      };

      const response = await axios.post(this.webhookUrl, message, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data.errcode === 0;
    } catch (error) {
      console.error("Error sending DingTalk message:", error);
      return false;
    }
  }

  // 发送Markdown消息
  async sendMarkdownMessage(title: string, text: string, atMobiles?: string[], isAtAll?: boolean): Promise<boolean> {
    try {
      if (!this.webhookUrl) {
        console.warn("DingTalk webhook URL is not configured");
        return false;
      }

      const message: DingTalkMessage = {
        msgtype: "markdown",
        markdown: {
          title,
          text,
        },
        at: {
          atMobiles,
          isAtAll,
        },
      };

      const response = await axios.post(this.webhookUrl, message, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data.errcode === 0;
    } catch (error) {
      console.error("Error sending DingTalk markdown message:", error);
      return false;
    }
  }

  // 发送任务状态变更通知
  async sendTaskStatusChangeNotification(taskTitle: string, oldStatus: string, newStatus: string, userName: string): Promise<boolean> {
    const text = `### 任务状态变更通知\n\n**任务标题:** ${taskTitle}\n**原状态:** ${oldStatus}\n**新状态:** ${newStatus}\n**操作人:** ${userName}\n**时间:** ${new Date().toLocaleString()}`;
    return this.sendMarkdownMessage("任务状态变更通知", text);
  }

  // 发送BUG提交通知
  async sendBugCreatedNotification(bugTitle: string, severity: string, reporterName: string): Promise<boolean> {
    const text = `### 新BUG提交通知\n\n**BUG标题:** ${bugTitle}\n**严重程度:** ${severity}\n**提交人:** ${reporterName}\n**时间:** ${new Date().toLocaleString()}`;
    return this.sendMarkdownMessage("新BUG提交通知", text);
  }

  // 发送BUG分配通知
  async sendBugAssignedNotification(bugTitle: string, assigneeName: string, assignerName: string): Promise<boolean> {
    const text = `### BUG分配通知\n\n**BUG标题:** ${bugTitle}\n**分配给:** ${assigneeName}\n**分配人:** ${assignerName}\n**时间:** ${new Date().toLocaleString()}`;
    return this.sendMarkdownMessage("BUG分配通知", text);
  }

  // 发送每日报告通知
  async sendDailyReportNotification(reportDate: string, stats: any): Promise<boolean> {
    const text = `### 每日工作报告 - ${reportDate}\n\n**新增任务:** ${stats.newTasks}\n**完成任务:** ${stats.completedTasks}\n**新增BUG:** ${stats.newBugs}\n**修复BUG:** ${stats.fixedBugs}\n**待处理BUG:** ${stats.pendingBugs}`;
    return this.sendMarkdownMessage(`每日工作报告 - ${reportDate}`, text);
  }

  // 发送每周报告通知
  async sendWeeklyReportNotification(weekRange: string, stats: any): Promise<boolean> {
    const text = `### 每周工作报告 - ${weekRange}\n\n**总任务数:** ${stats.totalTasks}\n**完成任务:** ${stats.completedTasks}\n**总BUG数:** ${stats.totalBugs}\n**修复BUG:** ${stats.fixedBugs}\n**项目进度:** ${stats.projectProgress}%`;
    return this.sendMarkdownMessage(`每周工作报告 - ${weekRange}`, text);
  }
}