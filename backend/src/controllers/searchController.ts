import { Request, Response } from "express";
import { logger } from "../services/logger";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";

const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);

/** 计算相关性分数：分值越低越靠前 */
function getRelevanceScore(item: any, query: string, isNumeric: boolean, numericId: number): number {
  const title = (item.title || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const q = query.toLowerCase();

  if (isNumeric && item.id === numericId) return 0; // ID 精确匹配
  if (title === q) return 1; // 标题精确匹配
  if (title.startsWith(q)) return 2; // 标题前缀匹配
  if (title.includes(q)) return 3; // 标题包含
  if (desc.includes(q)) return 4; // 描述包含
  return 5;
}

function sortByRelevance<T extends { id: number; title: string; description: string }>(
  items: T[],
  query: string
): T[] {
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

export const searchController = {
  async globalSearch(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const query = q as string;

      if (!query || query.trim().length === 0) {
        return res.json({ tasks: [], bugs: [] });
      }

      const trimmed = query.trim();
      const searchTerm = `%${trimmed}%`;
      const isNumeric = /^\d+$/.test(trimmed);

      const [tasks, bugs] = await Promise.all([
        // -------- 任务搜索 --------
        (async () => {
          const qb = taskRepository
            .createQueryBuilder("task")
            .leftJoinAndSelect("task.project", "project")
            .leftJoinAndSelect("task.assignees", "assignees")
            .leftJoinAndSelect("task.creator", "creator");

          if (isNumeric) {
            qb.where("task.id = :id", { id: parseInt(trimmed) })
              .orWhere("task.title LIKE :term", { term: searchTerm })
              .orWhere("task.description LIKE :term", { term: searchTerm });
          } else {
            qb.where("task.title LIKE :term", { term: searchTerm })
              .orWhere("task.description LIKE :term", { term: searchTerm });
          }

          const raw = await qb.orderBy("task.updatedAt", "DESC").limit(20).getMany();
          return sortByRelevance(raw, trimmed);
        })(),

        // -------- Bug 搜索 --------
        (async () => {
          const qb = bugRepository
            .createQueryBuilder("bug")
            .leftJoinAndSelect("bug.project", "project")
            .leftJoinAndSelect("bug.assignee", "assignee")
            .leftJoinAndSelect("bug.reporter", "reporter");

          if (isNumeric) {
            qb.where("bug.id = :id", { id: parseInt(trimmed) })
              .orWhere("bug.title LIKE :term", { term: searchTerm })
              .orWhere("bug.description LIKE :term", { term: searchTerm });
          } else {
            qb.where("bug.title LIKE :term", { term: searchTerm })
              .orWhere("bug.description LIKE :term", { term: searchTerm });
          }

          const raw = await qb.orderBy("bug.updatedAt", "DESC").limit(20).getMany();
          return sortByRelevance(raw, trimmed);
        })(),
      ]);

      res.json({ tasks, bugs });
    } catch (error) {
      logger.error("Error performing global search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  },
};
