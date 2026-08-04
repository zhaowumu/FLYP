import { Request, Response } from "express";
import { logger } from "../services/logger";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";

const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);

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

          return qb.orderBy("task.updatedAt", "DESC").limit(20).getMany();
        })(),

        // -------- 缺陷搜索 --------
        (async () => {
          const qb = bugRepository
            .createQueryBuilder("bug")
            .leftJoinAndSelect("bug.project", "project")
            .leftJoinAndSelect("bug.assignee", "assignee")
            .leftJoinAndSelect("bug.reporter", "reporter");

          buildKeywordQuery(qb, "bug", keywords, ["reproduceSteps"]);

          return qb.orderBy("bug.updatedAt", "DESC").limit(20).getMany();
        })(),
      ]);

      res.json({ tasks, bugs });
    } catch (error) {
      logger.error("Error performing global search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  },
};
