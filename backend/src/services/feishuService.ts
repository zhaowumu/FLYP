import axios from "axios";
import crypto from "crypto";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";

interface FeishuConfig {
  webhook: string;
  secret: string;
  keyword: string;
  baseUrl: string;
  notify: Record<string, { enabled: boolean; template: string }>;
}

const NOTIFY_TYPES = [
  "create_task", "create_bug", "assign_task", "complete_task",
  "reject_task", "submit_test_task", "pass_test_task", "restart_task",
  "feedback_task", "reject_test_task",
  "assign_bug", "fix_bug", "verify_bug", "reject_bug", "restart_bug", "feedback_bug",
];

const CARD_COLORS: Record<string, "blue" | "green" | "red" | "orange" | "purple"> = {
  create_task: "blue", create_bug: "red",
  assign_task: "orange", complete_task: "green",
  reject_task: "red", submit_test_task: "purple",
  pass_test_task: "green", restart_task: "orange",
  feedback_task: "orange", reject_test_task: "red",
  assign_bug: "orange", fix_bug: "green",
  verify_bug: "blue", reject_bug: "red",
  restart_bug: "orange", feedback_bug: "orange",
};

export class FeishuService {
  private async getConfig(): Promise<FeishuConfig> {
    const configRepo = AppDataSource.getRepository(SystemConfig);
    const keys = ["feishu_webhook", "feishu_secret", "feishu_keyword", "feishu_base_url"];
    const [webhookCfg, secretCfg, keywordCfg, baseUrlCfg] = await Promise.all(
      keys.map(k => configRepo.findOne({ where: { key: k } }))
    );

    const notify: Record<string, { enabled: boolean; template: string }> = {};
    for (const type of NOTIFY_TYPES) {
      const cfg = await configRepo.findOne({ where: { key: `feishu_notify_${type}` } });
      notify[type] = cfg ? JSON.parse(cfg.value) : { enabled: true, template: "" };
    }

    return {
      webhook: webhookCfg?.value || "",
      secret: secretCfg?.value || "",
      keyword: keywordCfg?.value || "",
      baseUrl: baseUrlCfg?.value || "",
      notify,
    };
  }

  private generateSignature(timestamp: number, secret: string): string {
    // Feishu 签名算法: base64(hmac_sha256(secret, timestamp + "\n" + secret))
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(stringToSign, "utf-8");
    return hmac.digest("base64");
  }

  private async buildSignedUrl(webhookUrl: string, secret: string): Promise<string> {
    if (!secret) return webhookUrl;
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = this.generateSignature(timestamp, secret);
    const sep = webhookUrl.includes("?") ? "&" : "?";
    // sign 中的 + / = 需要 URL 编码
    return `${webhookUrl}${sep}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  }

  private renderTemplate(template: string, variables: Record<string, string>): string {
    if (!template) return "";
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  async sendNotification(
    type: string,
    variables: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getConfig();
      if (!config.webhook) {
        return { success: false, error: "Webhook 地址未配置" };
      }

      if (!variables.baseUrl && config.baseUrl) {
        variables.baseUrl = config.baseUrl;
      }

      if (variables.baseUrl && variables.id && variables.type) {
        const segment = variables.type === "任务" ? "tasks" : "bugs";
        variables.detailLink = `${variables.baseUrl}/${segment}/${variables.id}`;
      }

      const notifyConfig = config.notify[type];
      if (!notifyConfig?.enabled) {
        return { success: false, error: `通知类型 ${type} 未启用` };
      }

      const color = CARD_COLORS[type] || "blue";

      let content = notifyConfig.template
        ? this.renderTemplate(notifyConfig.template, variables)
        : this.getDefaultContent(type, variables);

      // 关键词校验：飞书自定义机器人设置了关键词时，消息中必须包含至少一个关键词
      if (config.keyword) {
        content = `**${config.keyword}**\n${content}`;
      }

      const body = {
        msg_type: "interactive",
        card: {
          header: {
            title: { tag: "plain_text", content: this.getTitle(type) },
            template: color,
          },
          elements: [
            { tag: "markdown", content },
          ],
        },
      };

      const url = await this.buildSignedUrl(config.webhook, config.secret);
      console.log("[Feishu] Sending to:", url.replace(/sign=[^&]+/, "sign=***"));
      const response = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("[Feishu] Response:", JSON.stringify(response.data));
      if (response.data.code !== 0) {
        return { success: false, error: `飞书返回错误: code=${response.data.code} msg=${response.data.msg}` };
      }

      return { success: true };
    } catch (error: any) {
      console.error("[Feishu] Error:", error.message);
      return { success: false, error: error.message };
    }
  }

  private getTitle(type: string): string {
    const titles: Record<string, string> = {
      create_task: "🆕 新建任务", create_bug: "🐛 新建缺陷",
      assign_task: "👥 指派任务", complete_task: "✅ 完成任务",
      reject_task: "↩️ 打回任务", submit_test_task: "🧪 提测任务",
      pass_test_task: "🎉 测试通过", restart_task: "🔄 重启任务",
      feedback_task: "💬 反馈任务", reject_test_task: "🔙 测试打回",
      assign_bug: "👥 分配缺陷", fix_bug: "🔧 修复缺陷",
      verify_bug: "✅ 验证通过", reject_bug: "↩️ 打回缺陷",
      restart_bug: "🔄 重启缺陷", feedback_bug: "💬 反馈缺陷",
    };
    return titles[type] || "通知";
  }

  private getDefaultContent(type: string, vars: Record<string, string>): string {
    const detailLink = vars.detailLink || "";
    const titleLine = detailLink
      ? `[${vars.title || ""}](${detailLink})`
      : `**${vars.title || ""}**`;

    const lines: string[] = [titleLine, ""];

    switch (type) {
      case "create_task":
        lines.push(`优先级：**${vars.priority || "-"}**`);
        lines.push(`创建人：**${vars.creator || "-"}**`);
        lines.push(`负责人：${vars.feishuAt || "**" + (vars.assigneeName || "未分配") + "**"}`);
        break;
      case "create_bug":
        lines.push(`严重程度：**${vars.severity || "-"}**`);
        lines.push(`报告人：**${vars.creator || "-"}**`);
        lines.push(`负责人：${vars.feishuAt || "**" + (vars.assigneeName || "未分配") + "**"}`);
        break;
      case "assign_task":
      case "feedback_task":
        lines.push(`负责人：**${vars.oldAssignee || "-"}** → **${vars.newAssignee || "-"}**`);
        lines.push(`操作人：**${vars.operator || "-"}**`);
        break;
      case "complete_task":
      case "fix_bug":
      case "verify_bug":
      case "pass_test_task":
        lines.push(`操作人：**${vars.operator || "-"}**`);
        break;
      case "reject_task":
      case "reject_test_task":
        lines.push(`新负责人：**${vars.assigneeName || "未分配"}**`);
        lines.push(`操作人：**${vars.operator || "-"}**`);
        break;
      case "submit_test_task":
        lines.push(`测试负责人：**${vars.assigneeName || "未分配"}**`);
        lines.push(`操作人：**${vars.operator || "-"}**`);
        break;
      case "restart_task":
        lines.push(`新负责人：**${vars.assigneeName || "未分配"}**`);
        lines.push(`操作人：**${vars.operator || "-"}**`);
        break;
      case "assign_bug":
      case "feedback_bug":
      case "reject_bug":
        lines.push(`负责人：**${vars.oldAssignee || "-"}** → **${vars.newAssignee || "-"}**`);
        lines.push(`操作人：**${vars.operator || "-"}**`);
        break;
      case "restart_bug":
        lines.push(`新负责人：**${vars.assigneeName || "未分配"}**`);
        lines.push(`操作人：**${vars.operator || "-"}**`);
        break;
      default:
        break;
    }

    lines.push("", `时间：${vars.time || ""}`);
    return lines.join("\n");
  }

  // 兼容简单文本消息
  async sendTextMessage(content: string): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config.webhook) return false;

      const body = {
        msg_type: "text",
        content: { text: content },
      };

      const url = await this.buildSignedUrl(config.webhook, config.secret);
      const response = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data.code === 0;
    } catch (error) {
      console.error("Error sending Feishu text message:", error);
      return false;
    }
  }
}
