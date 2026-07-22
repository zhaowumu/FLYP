import axios from "axios";
import crypto from "crypto";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";
import { logger } from "./logger";

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

interface DingTalkConfig {
  enabled: boolean;
  webhook: string;
  secret: string;
  keyword: string;
  baseUrl: string;
  notify: Record<string, { enabled: boolean; template: string }>;
}

export class DingTalkService {
  private async getConfigRepository() {
    return AppDataSource.getRepository(SystemConfig);
  }

  private async getDingTalkConfig(): Promise<DingTalkConfig> {
    const configRepo = await this.getConfigRepository();
    const webhookConfig = await configRepo.findOne({ where: { key: "dingtalk_webhook" } });
    const secretConfig = await configRepo.findOne({ where: { key: "dingtalk_secret" } });
    const keywordConfig = await configRepo.findOne({ where: { key: "dingtalk_keyword" } });
    const baseUrlConfig = await configRepo.findOne({ where: { key: "dingtalk_base_url" } });
    const enabledConfig = await configRepo.findOne({ where: { key: "dingtalk_enabled" } });

    const notifyTypes = ["create_task", "create_bug", "assign_task", "complete_task", "reject_task", "submit_test_task", "pass_test_task", "restart_task", "feedback_task", "reject_test_task", "assign_bug", "fix_bug", "verify_bug", "reject_bug", "restart_bug", "feedback_bug"];
    const notify: Record<string, { enabled: boolean; template: string }> = {};
    for (const type of notifyTypes) {
      const cfg = await configRepo.findOne({ where: { key: `dingtalk_notify_${type}` } });
      notify[type] = cfg ? JSON.parse(cfg.value) : { enabled: true, template: "" };
    }

    return {
      enabled: enabledConfig?.value !== "false",
      webhook: webhookConfig?.value || "",
      secret: secretConfig?.value || "",
      keyword: keywordConfig?.value || "",
      baseUrl: baseUrlConfig?.value || "",
      notify
    };
  }

  private generateSignature(timestamp: number, secret: string): string {
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(stringToSign);
    return encodeURIComponent(hmac.digest("base64"));
  }

  private async buildUrlWithSignature(webhookUrl: string, secret: string): Promise<string> {
    if (!secret) return webhookUrl;
    
    const timestamp = Date.now();
    const sign = this.generateSignature(timestamp, secret);
    
    const separator = webhookUrl.includes("?") ? "&" : "?";
    return `${webhookUrl}${separator}timestamp=${timestamp}&sign=${sign}`;
  }

  private addKeyword(text: string, keyword: string): string {
    if (!keyword) return text;
    return `${keyword}\n${text}`;
  }

  private renderTemplate(template: string, variables: Record<string, string>): string {
    if (!template) return "";
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  private getDefaultTemplate(type: string, variables: Record<string, string>): string {
    const { baseUrl, id } = variables;
    const typeSegment = variables.type === "任务" ? "tasks" : "bugs";
    const detailLink = baseUrl && id ? `${baseUrl}/${typeSegment}/${id}` : "";

    const titleLine = detailLink ? `> 📎 **[{title}]({detailLink})**` : `> 📎 **{title}**`;
    const defaults: Record<string, string> = {
      create_task: [
        `### 🆕 新建任务`, ``,
        titleLine, ``,
        `- 🚩 优先级 → **{priority}**`,
        `- ✍️ 创建人 → **{creator}**`,
        `- 🎯 负责人 → **{assigneeName}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      create_bug: [
        `### 🐛 新建缺陷`, ``,
        titleLine, ``,
        `- ⚠️ 严重程度 → **{severity}**`,
        `- ✍️ 报告人 → **{creator}**`,
        `- 🎯 负责人 → **{assigneeName}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      assign_task: [
        `### 👥 指派任务`, ``,
        titleLine, ``,
        `- 🔄 负责人 → **{oldAssignee}** → **{newAssignee}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{newAssigneePhones}请及时处理 📢`,
      ].join("\n"),

      complete_task: [
        `### ✅ 完成任务`, ``,
        titleLine, ``,
        `- 🎉 完成人 → **{operator}**`,
      ].join("\n"),

      reject_task: [
        `### ↩️ 打回任务`, ``,
        titleLine, ``,
        `- 🎯 负责人 → **{assigneeName}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      submit_test_task: [
        `### 🧪 提测任务`, ``,
        titleLine, ``,
        `- 🎯 测试负责人 → **{assigneeName}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      pass_test_task: [
        `### ✅ 测试通过`, ``,
        titleLine, ``,
        `- ✍️ 操作人 → **{operator}**`,
      ].join("\n"),

      restart_task: [
        `### 🔄 重启任务`, ``,
        titleLine, ``,
        `- 🎯 负责人 → **{assigneeName}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      feedback_task: [
        `### 💬 反馈任务`, ``,
        titleLine, ``,
        `- 🔄 负责人 → **{oldAssignee}** → **{newAssignee}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{newAssigneePhones}请及时处理 📢`,
      ].join("\n"),

      reject_test_task: [
        `### 🔙 测试打回`, ``,
        titleLine, ``,
        `- 🎯 负责人 → **{assigneeName}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      assign_bug: [
        `### 👥 分配缺陷`, ``,
        titleLine, ``,
        `- 🔄 负责人 → **{oldAssignee}** → **{newAssignee}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{newAssigneePhones}请及时处理 📢`,
      ].join("\n"),

      fix_bug: [
        `### 🔧 修复缺陷`, ``,
        titleLine, ``,
        `- 🎉 修复人 → **{operator}**`,
      ].join("\n"),

      verify_bug: [
        `### ✅ 验证通过`, ``,
        titleLine, ``,
        `- ✍️ 操作人 → **{operator}**`,
      ].join("\n"),

      reject_bug: [
        `### ↩️ 打回缺陷`, ``,
        titleLine, ``,
        `- 🎯 负责人 → **{assigneeName}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      restart_bug: [
        `### 🔄 重启缺陷`, ``,
        titleLine, ``,
        `- 🎯 负责人 → **{assigneeName}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{assigneePhones}请及时处理 📢`,
      ].join("\n"),

      feedback_bug: [
        `### 💬 反馈缺陷`, ``,
        titleLine, ``,
        `- 🔄 负责人 → **{oldAssignee}** → **{newAssignee}**`,
        `- ✍️ 操作人 → **{operator}**`,
        ``, `---`, `{newAssigneePhones}请及时处理 📢`,
      ].join("\n"),
    };
    return this.renderTemplate(defaults[type] || "", variables);
  }

  async sendNotification(
    type: string,
    variables: Record<string, string>,
    atMobiles?: string[]
  ): Promise<boolean> {
    try {
      const config = await this.getDingTalkConfig();
      if (!config.enabled) return false;
      if (!config.webhook) return false;

      if (!variables.baseUrl && config.baseUrl) {
        variables.baseUrl = config.baseUrl;
      }

      // 构建详情链接用于模板
      if (variables.baseUrl && variables.id && variables.type) {
        const typeSegment = variables.type === "任务" ? "tasks" : "bugs";
        variables.detailLink = `${variables.baseUrl}/${typeSegment}/${variables.id}`;
      }

      const notifyConfig = config.notify[type];
      if (!notifyConfig?.enabled) return false;

      const text = notifyConfig.template
        ? this.renderTemplate(notifyConfig.template, variables)
        : this.getDefaultTemplate(type, variables);

      if (!text) return false;

      const message: DingTalkMessage = {
        msgtype: "markdown",
        markdown: {
          title: config.keyword ? `${config.keyword} ${variables.title || "通知"}` : (variables.title || "通知"),
          text: this.addKeyword(text, config.keyword),
        },
      };

      // 如果有 @ 的手机号，添加到消息中
      if (atMobiles && atMobiles.length > 0) {
        message.at = { atMobiles };
      }

      const url = await this.buildUrlWithSignature(config.webhook, config.secret);
      const response = await axios.post(url, message, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data.errcode === 0;
    } catch (error) {
      logger.error("Error sending DingTalk notification:", error);
      return false;
    }
  }

  // 兼容旧方法
  async sendTextMessage(content: string, atMobiles?: string[], isAtAll?: boolean): Promise<boolean> {
    try {
      const config = await this.getDingTalkConfig();
      if (!config.webhook) {
        console.warn("DingTalk webhook URL is not configured");
        return false;
      }

      const message: DingTalkMessage = {
        msgtype: "text",
        text: {
          content: this.addKeyword(content, config.keyword),
        },
        at: {
          atMobiles,
          isAtAll,
        },
      };

      const url = await this.buildUrlWithSignature(config.webhook, config.secret);
      const response = await axios.post(url, message, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data.errcode === 0;
    } catch (error) {
      logger.error("Error sending DingTalk message:", error);
      return false;
    }
  }

  async sendMarkdownMessage(title: string, text: string, atMobiles?: string[], isAtAll?: boolean): Promise<boolean> {
    try {
      const config = await this.getDingTalkConfig();
      if (!config.webhook) {
        console.warn("DingTalk webhook URL is not configured");
        return false;
      }

      const message: DingTalkMessage = {
        msgtype: "markdown",
        markdown: {
          title,
          text: this.addKeyword(text, config.keyword),
        },
        at: {
          atMobiles,
          isAtAll,
        },
      };

      const url = await this.buildUrlWithSignature(config.webhook, config.secret);
      const response = await axios.post(url, message, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data.errcode === 0;
    } catch (error) {
      logger.error("Error sending DingTalk markdown message:", error);
      return false;
    }
  }
}
