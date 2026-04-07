import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { SystemConfig } from "../entities/SystemConfig";
import { DingTalkService } from "../services/dingtalkService";
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
      
      const notifyTypes = ["create", "status_change", "assignee_change", "priority_change"];
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
      const webhookConfig = await configRepository.findOne({ where: { key: "dingtalk_webhook" } });
      const secretConfig = await configRepository.findOne({ where: { key: "dingtalk_secret" } });
      const keywordConfig = await configRepository.findOne({ where: { key: "dingtalk_keyword" } });
      
      const webhookUrl = webhookConfig?.value;
      const secret = secretConfig?.value;
      const keyword = keywordConfig?.value;

      if (!webhookUrl) {
        return res.status(400).json({ success: false, error: "Webhook地址未配置" });
      }

      let text = `### 测试通知\n\n这是一条测试消息，配置成功！\n\n**发送时间：** ${new Date().toLocaleString("zh-CN")}`;
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

      const message = {
        msgtype: "markdown",
        markdown: {
          title: keyword ? `${keyword} 测试通知` : "测试通知",
          text,
        },
      };

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
};
