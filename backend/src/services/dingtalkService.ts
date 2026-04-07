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
    
    const notifyTypes = ["create", "status_change", "assignee_change", "priority_change"];
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
    const link = baseUrl && id ? `\n\n[查看详情](${baseUrl}/${variables.type === "任务" ? "tasks" : "bugs"}/${id})` : "";
    
    const defaults: Record<string, string> = {
      create: `### 新建{type}通知\n\n**标题:** {title}\n**优先级:** {priority}\n**创建人:** {creator}\n**时间:** {time}${link}`,
      status_change: `### {type}状态变更通知\n\n**标题:** {title}\n**原状态:** {oldStatus}\n**新状态:** {newStatus}\n**操作人:** {operator}\n**时间:** {time}${link}`,
      assignee_change: `### {type}负责人变更通知\n\n**标题:** {title}\n**原负责人:** {oldAssignee}\n**新负责人:** {newAssignee}\n**操作人:** {operator}\n**时间:** {time}${link}`,
      priority_change: `### {type}优先级变更通知\n\n**标题:** {title}\n**原优先级:** {oldPriority}\n**新优先级:** {newPriority}\n**操作人:** {operator}\n**时间:** {time}${link}`
    };
    return this.renderTemplate(defaults[type] || "", variables);
  }

  async sendNotification(type: string, variables: Record<string, string>): Promise<boolean> {
    try {
      const config = await this.getDingTalkConfig();
      if (!config.webhook) return false;

      if (!variables.baseUrl && config.baseUrl) {
        variables.baseUrl = config.baseUrl;
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
