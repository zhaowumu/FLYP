import axios from "axios";
import crypto from "crypto";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";

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
    
    // 移除 priority_change
    const notifyTypes = ["create_task", "create_bug", "assign_task", "complete_task", "reject_task", "submit_test_task", "pass_test_task", "restart_task", "assign_bug", "fix_bug", "verify_bug", "reject_bug", "restart_bug"];
    const notify: Record<string, { enabled: boolean; template: string }> = {};
    for (const type of notifyTypes) {
      const cfg = await configRepo.findOne({ where: { key: `dingtalk_notify_${type}` } });
      notify[type] = cfg ? JSON.parse(cfg.value) : { enabled: true, template: "" };
    }
    
    return {
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

    const defaults: Record<string, string> = {
      create_task: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 创建任务`,
        `**创建人：** {creator}`,
        `**优先级：** {priority}`,
        `**负责人：** {assigneeName}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      create_bug: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 创建缺陷`,
        `**创建人：** {creator}`,
        `**严重程度：** {severity}`,
        `**负责人：** {assigneeName}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      assign_task: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 指派任务`,
        `**{oldAssignee}** → **{newAssignee}**`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      complete_task: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 完成任务`,
        `**完成人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      reject_task: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 打回任务`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      submit_test_task: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 提测`,
        `**测试负责人：** {assigneeName}`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      pass_test_task: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 测试通过`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      assign_bug: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 分配缺陷`,
        `**{oldAssignee}** → **{newAssignee}**`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      fix_bug: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 修复缺陷`,
        `**修复人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      verify_bug: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 验证通过`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      reject_bug: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 打回缺陷`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      restart_task: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 重启任务`,
        `**负责人：** {assigneeName}`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),

      restart_bug: [
        detailLink ? `[🔗 **{title}**]({detailLink})` : `**{title}**`,
        ``,
        `**操作：** 重启缺陷`,
        `**负责人：** {assigneeName}`,
        `**操作人：** {operator}`,
        `**时间：** {time}`,
      ].filter(Boolean).join("\n"),
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
      console.error("Error sending DingTalk notification:", error);
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
      console.error("Error sending DingTalk message:", error);
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
      console.error("Error sending DingTalk markdown message:", error);
      return false;
    }
  }
}
