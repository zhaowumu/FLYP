import { Request, Response } from "express";
import { logger } from "../services/logger";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";
import { DingTalkService } from "../services/dingtalkService";
import { FeishuService } from "../services/feishuService";
import {
  getGiteeBackupConfig,
  saveGiteeBackupConfig,
  testGiteeConnection,
} from "../services/giteeBackupService";
import axios from "axios";
import crypto from "crypto";

const configRepository = AppDataSource.getRepository(SystemConfig);
const dingTalkService = new DingTalkService();
const feishuService = new FeishuService();

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
      logger.error("Error getting config:", error);
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
      logger.error("Error updating config:", error);
      res.status(500).json({ error: "Failed to update config" });
    }
  },

  async getDingTalkConfig(req: Request, res: Response) {
    try {
      const config = await configRepository.findOne({ where: { key: "dingtalk_webhook" } });
      const secretConfig = await configRepository.findOne({ where: { key: "dingtalk_secret" } });
      const keywordConfig = await configRepository.findOne({ where: { key: "dingtalk_keyword" } });
      const baseUrlConfig = await configRepository.findOne({ where: { key: "dingtalk_base_url" } });
      
      const notifyTypes = ["create_task", "create_bug", "assign_task", "complete_task", "reject_task", "submit_test_task", "pass_test_task", "restart_task", "feedback_task", "reject_test_task", "assign_bug", "fix_bug", "verify_bug", "reject_bug", "restart_bug", "feedback_bug"];
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
      logger.error("Error getting DingTalk config:", error);
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
      logger.error("Error updating DingTalk config:", error);
      res.status(500).json({ error: "Failed to update DingTalk config" });
    }
  },

  async testDingTalkNotification(req: Request, res: Response) {
    try {
      const { type, template } = req.body;
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
      const isTaskType = type ? type.includes("task") || type === "create_task" : true;
      const typeSegment = isTaskType ? "tasks" : "bugs";
      const detailLink = `${baseUrl}/${typeSegment}/123`;

      // 测试用的变量（与实际代码传入的变量保持一致）
      const testVariables: Record<string, string> = {
        type: isTaskType ? "任务" : "BUG",
        id: "123",
        title: "这是一个测试通知的标题",
        priority: "medium",
        severity: "high",
        creator: "测试用户",
        assigneeName: "张三",
        time: now,
        baseUrl,
        detailLink,
        operator: "测试用户",
        oldAssignee: "张三",
        newAssignee: "李四",
      };

      // 简单的 renderTemplate 实现
      const renderTemplate = (tmpl: string, vars: Record<string, string>): string => {
        let result = tmpl;
        for (const [key, value] of Object.entries(vars)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        }
        return result;
      };

      // 通知类型对应的中文标题
      const typeLabels: Record<string, string> = {
        create_task: "新建任务通知",
        create_bug: "新建缺陷通知",
        assign_task: "指派任务通知",
        complete_task: "完成任务通知",
        reject_task: "打回任务通知",
        submit_test_task: "提测任务通知",
        pass_test_task: "任务测试通过通知",
        restart_task: "重启任务通知",
        feedback_task: "反馈任务通知",
        reject_test_task: "测试打回通知",
        assign_bug: "分配缺陷通知",
        fix_bug: "修复缺陷通知",
        verify_bug: "验证通过通知",
        reject_bug: "打回缺陷通知",
        restart_bug: "重启缺陷通知",
        feedback_bug: "反馈缺陷通知",
      };

      let title: string;
      let text: string;

      if (template) {
        text = renderTemplate(template, testVariables);
        title = `【测试】${typeLabels[type] || "钉钉通知"}`;
      } else {
        const defaultTemplates: Record<string, { title: string; text: string }> = {
          create_task: {
            title: "【测试】新建任务通知",
            text: `### 🆕 新建任务\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🚩 优先级 → **medium**\n- ✍️ 创建人 → **测试用户**\n- 🎯 负责人 → **张三**\n\n---\n@13800138000 请及时处理 📢`,
          },
          create_bug: {
            title: "【测试】新建缺陷通知",
            text: `### 🐛 新建缺陷\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- ⚠️ 严重程度 → **high**\n- ✍️ 报告人 → **测试用户**\n- 🎯 负责人 → **张三**\n\n---\n@13800138000 请及时处理 📢`,
          },
          assign_task: {
            title: "【测试】指派任务通知",
            text: `### 👥 指派任务\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🔄 负责人 → **张三** → **李四**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13900139000 请及时处理 📢`,
          },
          complete_task: {
            title: "【测试】完成任务通知",
            text: `### ✅ 完成任务\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎉 完成人 → **测试用户**`,
          },
          reject_task: {
            title: "【测试】打回任务通知",
            text: `### ↩️ 打回任务\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎯 负责人 → **张三**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13800138000 请及时处理 📢`,
          },
          submit_test_task: {
            title: "【测试】提测任务通知",
            text: `### 🧪 提测任务\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎯 测试负责人 → **张三**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13800138000 请及时处理 📢`,
          },
          pass_test_task: {
            title: "【测试】任务测试通过通知",
            text: `### ✅ 测试通过\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- ✍️ 操作人 → **测试用户**`,
          },
          restart_task: {
            title: "【测试】重启任务通知",
            text: `### 🔄 重启任务\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎯 负责人 → **张三**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13800138000 请及时处理 📢`,
          },
          feedback_task: {
            title: "【测试】反馈任务通知",
            text: `### 💬 反馈任务\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🔄 负责人 → **张三** → **李四**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13900139000 请及时处理 📢`,
          },
          reject_test_task: {
            title: "【测试】测试打回通知",
            text: `### 🔙 测试打回\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎯 负责人 → **张三**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13800138000 请及时处理 📢`,
          },
          assign_bug: {
            title: "【测试】分配缺陷通知",
            text: `### 👥 分配缺陷\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🔄 负责人 → **未分配** → **张三**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13800138000 请及时处理 📢`,
          },
          fix_bug: {
            title: "【测试】修复缺陷通知",
            text: `### 🔧 修复缺陷\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎉 修复人 → **测试用户**`,
          },
          verify_bug: {
            title: "【测试】验证通过通知",
            text: `### ✅ 验证通过\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- ✍️ 操作人 → **测试用户**`,
          },
          reject_bug: {
            title: "【测试】打回缺陷通知",
            text: `### ↩️ 打回缺陷\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎯 负责人 → **张三**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13800138000 请及时处理 📢`,
          },
          restart_bug: {
            title: "【测试】重启缺陷通知",
            text: `### 🔄 重启缺陷\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🎯 负责人 → **张三**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13800138000 请及时处理 📢`,
          },
          feedback_bug: {
            title: "【测试】反馈缺陷通知",
            text: `### 💬 反馈缺陷\n\n> 📎 **[这是一个测试通知的标题](${detailLink})**\n\n- 🔄 负责人 → **张三** → **李四**\n- ✍️ 操作人 → **测试用户**\n\n---\n@13900139000 请及时处理 📢`,
          },
        };

        if (type && defaultTemplates[type]) {
          const t = defaultTemplates[type];
          title = t.title;
          text = t.text;
        } else {
          title = "【测试】钉钉通知";
          text = `这是一条测试消息，配置成功！\n\n**发送时间：** ${now}\n\n**系统地址：** ${baseUrl}`;
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
      logger.error("Error testing DingTalk notification:", error);
      res.json({ success: false, error: error.response?.data?.errmsg || error.message || "发送失败" });
    }
  },

  // ========== Gitee 云备份 ==========

  async getGiteeBackupConfig(req: Request, res: Response) {
    try {
      const config = await getGiteeBackupConfig();
      res.json(config);
    } catch (error) {
      logger.error("Error getting Gitee backup config:", error);
      res.status(500).json({ error: "获取 Gitee 备份配置失败" });
    }
  },

  async updateGiteeBackupConfig(req: Request, res: Response) {
    try {
      const { enabled, token, owner, repo, branch } = req.body;
      await saveGiteeBackupConfig({ enabled, token, owner, repo, branch });
      res.json({ success: true, message: "Gitee 备份配置已保存" });
    } catch (error) {
      logger.error("Error updating Gitee backup config:", error);
      res.status(500).json({ error: "保存 Gitee 备份配置失败" });
    }
  },

  async testGiteeBackupConnection(req: Request, res: Response) {
    try {
      const { token, owner, repo, branch } = req.body;
      const result = await testGiteeConnection({ enabled: true, token, owner, repo, branch });
      res.json(result);
    } catch (error: any) {
      logger.error("Error testing Gitee connection:", error);
      res.json({ success: false, message: error.message || "测试失败" });
    }
  },

  async testFeishuNotification(req: Request, res: Response) {
    try {
      const webhookCfg = await configRepository.findOne({ where: { key: "feishu_webhook" } });
      if (!webhookCfg?.value) {
        return res.json({ success: false, error: "飞书 Webhook 地址未配置" });
      }

      const now = new Date().toLocaleString("zh-CN");
      const { type } = req.body;
      const testType = type || "create_task";
      const isTaskType = testType.includes("task");
      const testVars: Record<string, string> = {
        type: isTaskType ? "任务" : "BUG",
        id: "123",
        title: "这是一条飞书测试通知",
        priority: "medium",
        severity: "high",
        creator: "测试用户",
        assigneeName: "张三",
        oldAssignee: "张三",
        newAssignee: "李四",
        operator: "测试用户",
        time: now,
      };

      const result = await feishuService.sendNotification(testType, testVars);

      res.json({ success: result.success, message: result.success ? "发送成功" : (result.error || "发送失败") });
    } catch (error: any) {
      logger.error("Error testing Feishu notification:", error);
      res.json({ success: false, message: error.message || "测试失败" });
    }
  },
};
