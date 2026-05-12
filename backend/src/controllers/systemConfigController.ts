import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";
import { DingTalkService } from "../services/dingtalkService";
import {
  getGiteeBackupConfig,
  saveGiteeBackupConfig,
  testGiteeConnection,
} from "../services/giteeBackupService";
import axios from "axios";
import crypto from "crypto";

const configRepository = AppDataSource.getRepository(SystemConfig);
const dingTalkService = new DingTalkService();

export const systemConfigController = {
  async getConfig(req: Request, res: Response) {
    try {
      const { key } = req.query;
      
      if (key) {
        const config = await configRepository.findOne({ where: { key: key as string } });
        return res.json(config ? { key: config.key, value: config.value } : null);
      }
      
      const configs = await configRepository.find();
      const result: Record<string, string> = {};
      configs.forEach(c => {
        result[c.key] = c.value;
      });
      res.json(result);
    } catch (error) {
      console.error("Error getting config:", error);
      res.status(500).json({ error: "Failed to get config" });
    }
  },

  async updateConfig(req: Request, res: Response) {
    try {
      const { key, value } = req.body;
      
      if (!key) {
        return res.status(400).json({ error: "Key is required" });
      }

      let config = await configRepository.findOne({ where: { key } });
      
      if (config) {
        config.value = value;
      } else {
        config = configRepository.create({ key, value });
      }
      
      await configRepository.save(config);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ error: "Failed to update config" });
    }
  },

  async getDingTalkConfig(req: Request, res: Response) {
    try {
      const config = await configRepository.findOne({ where: { key: "dingtalk_webhook" } });
      const secretConfig = await configRepository.findOne({ where: { key: "dingtalk_secret" } });
      const keywordConfig = await configRepository.findOne({ where: { key: "dingtalk_keyword" } });
      const baseUrlConfig = await configRepository.findOne({ where: { key: "dingtalk_base_url" } });
      
      const notifyTypes = ["create_task", "create_bug", "assign_task", "complete_task", "reject_task", "submit_test_task", "pass_test_task", "restart_task", "assign_bug", "fix_bug", "verify_bug", "reject_bug", "restart_bug"];
      const notifyConfigs: Record<string, any> = {};
      for (const type of notifyTypes) {
        const cfg = await configRepository.findOne({ where: { key: `dingtalk_notify_${type}` } });
        notifyConfigs[type] = cfg ? JSON.parse(cfg.value) : { enabled: true, template: "" };
      }
      
      res.json({ 
        webhook: config?.value || "", 
        secret: secretConfig?.value || "",
        keyword: keywordConfig?.value || "",
        baseUrl: baseUrlConfig?.value || "",
        notify: notifyConfigs
      });
    } catch (error) {
      console.error("Error getting DingTalk config:", error);
      res.status(500).json({ error: "Failed to get DingTalk config" });
    }
  },

  async updateDingTalkConfig(req: Request, res: Response) {
    try {
      const { webhook, secret, keyword, baseUrl, notify } = req.body;
      
      let config = await configRepository.findOne({ where: { key: "dingtalk_webhook" } });
      if (config) {
        config.value = webhook;
      } else {
        config = configRepository.create({ 
          key: "dingtalk_webhook", 
          value: webhook,
          description: "钉钉机器人Webhook地址" 
        });
      }
      await configRepository.save(config);

      let secretConfig = await configRepository.findOne({ where: { key: "dingtalk_secret" } });
      if (secretConfig) {
        secretConfig.value = secret;
      } else {
        secretConfig = configRepository.create({ 
          key: "dingtalk_secret", 
          value: secret,
          description: "钉钉机器人加签密钥" 
        });
      }
      await configRepository.save(secretConfig);

      let keywordConfig = await configRepository.findOne({ where: { key: "dingtalk_keyword" } });
      if (keywordConfig) {
        keywordConfig.value = keyword;
      } else {
        keywordConfig = configRepository.create({ 
          key: "dingtalk_keyword", 
          value: keyword,
          description: "钉钉机器人关键字" 
        });
      }
      await configRepository.save(keywordConfig);

      let baseUrlConfig = await configRepository.findOne({ where: { key: "dingtalk_base_url" } });
      if (baseUrlConfig) {
        baseUrlConfig.value = baseUrl;
      } else {
        baseUrlConfig = configRepository.create({ 
          key: "dingtalk_base_url", 
          value: baseUrl,
          description: "系统访问地址（用于生成通知链接）" 
        });
      }
      await configRepository.save(baseUrlConfig);

      if (notify) {
        for (const [type, cfg] of Object.entries(notify)) {
          let notifyCfg = await configRepository.findOne({ where: { key: `dingtalk_notify_${type}` } });
          if (notifyCfg) {
            notifyCfg.value = JSON.stringify(cfg);
          } else {
            notifyCfg = configRepository.create({
              key: `dingtalk_notify_${type}`,
              value: JSON.stringify(cfg),
              description: `钉钉通知-${type}`
            });
          }
          await configRepository.save(notifyCfg);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating DingTalk config:", error);
      res.status(500).json({ error: "Failed to update DingTalk config" });
    }
  },

  async testDingTalkNotification(req: Request, res: Response) {
    try {
      const { type, template } = req.body; // 可选: "create_task" | "create_bug" | "assign_task" | "complete_task" | "reject_task" | "submit_test_task" | "pass_test_task" | "restart_task" | "assign_bug" | "fix_bug" | "verify_bug" | "reject_bug" | "restart_bug"
      const webhookConfig = await configRepository.findOne({ where: { key: "dingtalk_webhook" } });
      const secretConfig = await configRepository.findOne({ where: { key: "dingtalk_secret" } });
      const keywordConfig = await configRepository.findOne({ where: { key: "dingtalk_keyword" } });
      const baseUrlConfig = await configRepository.findOne({ where: { key: "dingtalk_base_url" } });
      
      const webhookUrl = webhookConfig?.value;
      const secret = secretConfig?.value;
      const keyword = keywordConfig?.value;
      const baseUrl = baseUrlConfig?.value || "http://localhost:3000";

      if (!webhookUrl) {
        return res.status(400).json({ success: false, error: "Webhook地址未配置" });
      }

      const now = new Date().toLocaleString("zh-CN");
      const typeSegment = type === "assignee_change" || !type ? "tasks" : type === "status_change" ? "tasks" : "tasks";
      const detailLink = `${baseUrl}/tasks/123`;

      // 测试用的变量
      const testVariables: Record<string, string> = {
        type: "任务",
        id: "123",
        title: "这是一个测试通知的标题",
        priority: "medium",
        creator: "测试用户",
        assigneeName: "张三",
        assigneePhones: "@13800138000",
        time: now,
        baseUrl,
        detailLink,
        oldStatus: "待处理",
        newStatus: "已完成",
        operator: "测试用户",
        oldAssignee: "张三",
        newAssignee: "李四",
        oldPriority: "low",
        newPriority: "high",
      };

      // 简单的 renderTemplate 实现
      const renderTemplate = (tmpl: string, vars: Record<string, string>): string => {
        let result = tmpl;
        for (const [key, value] of Object.entries(vars)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        }
        return result;
      };

      // 如果传了 template 就用它渲染，否则生成对应类型的固定测试内容
      let title: string;
      let text: string;

      if (template) {
        // 用户自定义模板 → 用测试变量渲染
        text = renderTemplate(template, testVariables);
        title = `【测试】${
          type === "create_task" ? "新建任务通知" :
          type === "create_bug" ? "新建缺陷通知" :
          type === "assign_task" ? "指派任务通知" :
          type === "complete_task" ? "完成任务通知" :
          type === "reject_task" ? "打回任务通知" :
          type === "submit_test_task" ? "提测任务通知" :
          type === "pass_test_task" ? "任务测试通过通知" :
          type === "restart_task" ? "重启任务通知" :
          type === "assign_bug" ? "分配缺陷通知" :
          type === "fix_bug" ? "修复缺陷通知" :
          type === "verify_bug" ? "验证通过通知" :
          type === "reject_bug" ? "打回缺陷通知" :
          type === "restart_bug" ? "重启缺陷通知" : "钉钉通知"
        }`;
      } else {
        // 无自定义模板 → 使用默认测试内容
        const defaultTemplates: Record<string, { title: string; text: string }> = {
          create_task: {
            title: "【测试】新建任务通知",
            text: `### 🔔 测试 - 新建任务通知\n\n[🔗 **这是一个测试任务的标题**](${baseUrl}/tasks/123)\n\n**操作：** 创建任务\n**创建人：** 测试用户\n**优先级：** medium\n**负责人：** 张三\n**时间：** ${now}`,
          },
          create_bug: {
            title: "【测试】新建缺陷通知",
            text: `### 🔔 测试 - 新建缺陷通知\n\n[🔗 **这是一个测试缺陷的标题**](${baseUrl}/bugs/123)\n\n**操作：** 创建缺陷\n**创建人：** 测试用户\n**严重程度：** high\n**负责人：** 张三\n**时间：** ${now}`,
          },
          assign_task: {
            title: "【测试】指派任务通知",
            text: `### 🔔 测试 - 指派任务通知\n\n[🔗 **这是一个测试任务的标题**](${baseUrl}/tasks/123)\n\n**操作：** 指派任务\n**李四** → **张三**\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          complete_task: {
            title: "【测试】完成任务通知",
            text: `### 🔔 测试 - 完成任务通知\n\n[🔗 **这是一个测试任务的标题**](${baseUrl}/tasks/123)\n\n**操作：** 完成任务\n**完成人：** 测试用户\n**时间：** ${now}`,
          },
          reject_task: {
            title: "【测试】打回任务通知",
            text: `### 🔔 测试 - 打回任务通知\n\n[🔗 **这是一个测试任务的标题**](${baseUrl}/tasks/123)\n\n**操作：** 打回任务\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          submit_test_task: {
            title: "【测试】提测任务通知",
            text: `### 🔔 测试 - 提测任务通知\n\n[🔗 **这是一个测试任务的标题**](${baseUrl}/tasks/123)\n\n**操作：** 提测\n**测试负责人：** 张三\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          pass_test_task: {
            title: "【测试】任务测试通过通知",
            text: `### 🔔 测试 - 任务测试通过通知\n\n[🔗 **这是一个测试任务的标题**](${baseUrl}/tasks/123)\n\n**操作：** 测试通过\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          assign_bug: {
            title: "【测试】分配缺陷通知",
            text: `### 🔔 测试 - 分配缺陷通知\n\n[🔗 **这是一个测试缺陷的标题**](${baseUrl}/bugs/123)\n\n**操作：** 分配缺陷\n**未分配** → **张三**\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          fix_bug: {
            title: "【测试】修复缺陷通知",
            text: `### 🔔 测试 - 修复缺陷通知\n\n[🔗 **这是一个测试缺陷的标题**](${baseUrl}/bugs/123)\n\n**操作：** 修复缺陷\n**修复人：** 测试用户\n**时间：** ${now}`,
          },
          verify_bug: {
            title: "【测试】验证通过通知",
            text: `### 🔔 测试 - 验证通过通知\n\n[🔗 **这是一个测试缺陷的标题**](${baseUrl}/bugs/123)\n\n**操作：** 验证通过\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          reject_bug: {
            title: "【测试】打回缺陷通知",
            text: `### 🔔 测试 - 打回缺陷通知\n\n[🔗 **这是一个测试缺陷的标题**](${baseUrl}/bugs/123)\n\n**操作：** 打回缺陷\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          restart_task: {
            title: "【测试】重启任务通知",
            text: `### 🔔 测试 - 重启任务通知\n\n[🔗 **这是一个测试任务的标题**](${baseUrl}/tasks/123)\n\n**操作：** 重启任务\n**负责人：** 张三\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
          restart_bug: {
            title: "【测试】重启缺陷通知",
            text: `### 🔔 测试 - 重启缺陷通知\n\n[🔗 **这是一个测试缺陷的标题**](${baseUrl}/bugs/123)\n\n**操作：** 重启缺陷\n**负责人：** 张三\n**操作人：** 测试用户\n**时间：** ${now}`,
          },
        };

        if (type && defaultTemplates[type]) {
          const t = defaultTemplates[type];
          title = t.title;
          text = t.text;
        } else {
          title = "【测试】钉钉通知";
          text = `### 🔔 测试通知\n\n这是一条测试消息，配置成功！\n\n**发送时间：** ${now}\n\n**系统地址：** ${baseUrl}`;
        }
      }

      if (keyword) {
        text = `${keyword}\n${text}`;
      }

      let url = webhookUrl;
      if (secret) {
        const timestamp = Date.now();
        const stringToSign = `${timestamp}\n${secret}`;
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(stringToSign);
        const sign = encodeURIComponent(hmac.digest("base64"));
        const separator = webhookUrl.includes("?") ? "&" : "?";
        url = `${webhookUrl}${separator}timestamp=${timestamp}&sign=${sign}`;
      }

      // 仅 create 和 assignee_change 类型附带 @ 手机号用于测试
      const message: any = {
        msgtype: "markdown",
        markdown: {
          title: keyword ? `${keyword} ${title}` : title,
          text,
        },
      };

      if (type === "create" || type === "assignee_change") {
        message.at = { atMobiles: ["13800138000"] };
      }

      const response = await axios.post(url, message, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data.errcode === 0) {
        res.json({ success: true });
      } else {
        res.json({ success: false, error: `钉钉返回错误码: ${response.data.errcode} - ${response.data.errmsg || '未知错误'}` });
      }
    } catch (error: any) {
      console.error("Error testing DingTalk notification:", error);
      res.json({ success: false, error: error.response?.data?.errmsg || error.message || "发送失败" });
    }
  },

  // ========== Gitee 云备份 ==========

  async getGiteeBackupConfig(req: Request, res: Response) {
    try {
      const config = await getGiteeBackupConfig();
      res.json(config);
    } catch (error) {
      console.error("Error getting Gitee backup config:", error);
      res.status(500).json({ error: "获取 Gitee 备份配置失败" });
    }
  },

  async updateGiteeBackupConfig(req: Request, res: Response) {
    try {
      const { enabled, token, owner, repo, branch } = req.body;
      await saveGiteeBackupConfig({ enabled, token, owner, repo, branch });
      res.json({ success: true, message: "Gitee 备份配置已保存" });
    } catch (error) {
      console.error("Error updating Gitee backup config:", error);
      res.status(500).json({ error: "保存 Gitee 备份配置失败" });
    }
  },

  async testGiteeBackupConnection(req: Request, res: Response) {
    try {
      const { token, owner, repo, branch } = req.body;
      const result = await testGiteeConnection({ enabled: true, token, owner, repo, branch });
      res.json(result);
    } catch (error: any) {
      console.error("Error testing Gitee connection:", error);
      res.json({ success: false, message: error.message || "测试失败" });
    }
  },
};
