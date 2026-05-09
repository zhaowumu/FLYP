import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { Project } from "../entities/Project";

const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);
const projectRepository = AppDataSource.getRepository(Project);

export const searchController = {
  async globalSearch(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const query = q as string;

      if (!query || query.trim().length === 0) {
        return res.json({ tasks: [], bugs: [], projects: [] });
      }

      const searchTerm = `%${query}%`;

      const [tasks, bugs, projects] = await Promise.all([
        taskRepository
          .createQueryBuilder("task")
          .leftJoinAndSelect("task.project", "project")
          .leftJoinAndSelect("task.assignees", "assignees")
          .leftJoinAndSelect("task.creator", "creator")
          .where("task.title LIKE :term", { term: searchTerm })
          .orWhere("task.description LIKE :term", { term: searchTerm })
          .orderBy("task.createdAt", "DESC")
          .limit(20)
          .getMany(),

        bugRepository
          .createQueryBuilder("bug")
          .leftJoinAndSelect("bug.project", "project")
          .leftJoinAndSelect("bug.assignee", "assignee")
          .leftJoinAndSelect("bug.reporter", "reporter")
          .where("bug.title LIKE :term", { term: searchTerm })
          .orWhere("bug.description LIKE :term", { term: searchTerm })
          .orderBy("bug.createdAt", "DESC")
          .limit(20)
          .getMany(),

        projectRepository
          .createQueryBuilder("project")
          .leftJoinAndSelect("project.manager", "manager")
          .where("project.name LIKE :term", { term: searchTerm })
          .orWhere("project.description LIKE :term", { term: searchTerm })
          .orderBy("project.createdAt", "DESC")
          .limit(20)
          .getMany(),
      ]);

      res.json({ tasks, bugs, projects });
    } catch (error) {
      console.error("Error performing global search:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  },
};
