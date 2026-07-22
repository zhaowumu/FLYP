import { Request, Response } from "express";
import { logger } from "../services/logger";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";

const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);

/** 单关键词相关性分数：分值越低越靠前 */
function getRelevanceScore(item: any, query: string, isNumeric: boolean, numericId: number): number {
  const title = (item.title || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const q = query.toLowerCase();

  if (isNumeric && item.id === numericId) return 0;
  if (title === q) return 1;
  if (title.startsWith(q)) return 2;
  if (title.includes(q)) return 3;
  if (desc.includes(q)) return 4;
  return 5;
}

function sortByRelevance(items: any[], query: string): any[] {
  const isNumeric = /^\d+$/.test(query.trim());
  const numericId = isNumeric ? parseInt(query.trim()) : 0;
  return items
    .map((item) => ({
      item,
      score: getRelevanceScore(item, query, isNumeric, numericId),
    }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.item);
}

/** 多关键词相关性排序：每个关键词在标题中匹配+1，仅在描述中匹配+2 */
function sortByMultiKeywords(items: any[], keywords: string[]): any[] {
  return items
    .map((item) => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        const k = kw.toLowerCase();
        if (title.includes(k)) score += 1;
        else score += 2;
      }
      return { item, score };
    })
    .sort((a, b) => a.score - b.score)
    .map((x) => x.item);
}

/** 对多个关键词构建 AND 查询条件 */
function buildKeywordQuery(qb: any, alias: string, keywords: string[], extraFields: string[] = []): void {
  keywords.forEach((keyword, i) => {
    const paramName = "kw" + i;
    const term = "%" + keyword + "%";

    const conditions = [
      alias + ".title LIKE :" + paramName,
      alias + ".description LIKE :" + paramName,
    ];
    for (const field of extraFields) {
      conditions.push(alias + "." + field + " LIKE :" + paramName);
    }

    if (/^\d+$/.test(keyword)) {
      qb.andWhere(
        "(" + conditions.join(" OR ") + " OR " + alias + ".id = :id" + i + ")",
        { [paramName]: term, ["id" + i]: parseInt(keyword) }
      );
    } else {
      qb.andWhere("(" + conditions.join(" OR ") + ")", { [paramName]: term });
    }
  });
}

export const searchController = {
  async globalSearch(req: Request, res: Response) {
    try {
      const query = req.query.q as string;

      if (!query || query.trim().length === 0) {
        return res.json({ tasks: [], bugs: [] });
      }

      const trimmed = query.trim();
      const keywords = trimmed.split(/\s+/).filter((k) => k.length > 0);

      if (keywords.length === 0) {
        return res.json({ tasks: [], bugs: [] });
      }

      const [tasks, bugs] = await Promise.all([
        // -------- 任务搜索 --------
        (async () => {
          const qb = taskRepository
            .createQueryBuilder("task")
            .leftJoinAndSelect("task.project", "project")
            .leftJoinAndSelect("task.assignees", "assignees")
            .leftJoinAndSelect("task.creator", "creator");

          buildKeywordQuery(qb, "task", keywords);

          const raw = await qb.orderBy("task.updatedAt", "DESC").limit(20).getMany();

          if (keywords.length === 1) {
            return sortByRelevance(raw, keywords[0]);
          }
          return sortByMultiKeywords(raw, keywords);
        })(),

        // -------- 缺陷搜索 --------
        (async () => {
          const qb = bugRepository
            .createQueryBuilder("bug")
            .leftJoinAndSelect("bug.project", "project")
            .leftJoinAndSelect("bug.assignee", "assignee")
            .leftJoinAndSelect("bug.reporter", "reporter");

          buildKeywordQuery(qb, "bug", keywords, ["reproduceSteps"]);

          const raw = await qb.orderBy("bug.updatedAt", "DESC").limit(20).getMany();

          if (keywords.length === 1) {
            return sortByRelevance(raw, keywords[0]);
          }
          return sortByMultiKeywords(raw, keywords);
        })(),
      ]);

      res.json({ tasks, bugs });
    } catch (error) {
      logger.error("Error performing global search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  },
};
