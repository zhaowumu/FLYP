import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Project } from "../entities/Project";

const projectRepository = AppDataSource.getRepository(Project);

export const projectController = {
  // 创建项目
  async createProject(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      const createdBy = (req as any).user.id;

      // 创建项目
      const project = projectRepository.create({
        name,
        description,
        status: "active",
        createdBy,
      });

      await projectRepository.save(project);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  },

  // 获取所有项目
  async getAllProjects(req: Request, res: Response) {
    try {
      const projects = await projectRepository.find({
        relations: ["manager", "tasks", "bugs"],
      });
      res.json(projects);
    } catch (error) {
      console.error("Error getting projects:", error);
      res.status(500).json({ error: "Failed to get projects" });
    }
  },

  // 获取项目详情
  async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["manager", "tasks", "bugs"],
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error getting project:", error);
      res.status(500).json({ error: "Failed to get project" });
    }
  },

  // 更新项目
  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const project = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      await projectRepository.update(id, updateData);
      const updatedProject = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["manager", "tasks", "bugs"],
      });

      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  },

  // 归档项目
  async archiveProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await projectRepository.update(id, { status: "archived" });
      res.json({ message: "Project archived successfully" });
    } catch (error) {
      console.error("Error archiving project:", error);
      res.status(500).json({ error: "Failed to archive project" });
    }
  },

  // 删除项目
  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await projectRepository.delete(id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  },

  // 更改项目负责人（仅管理员）
  async changeManager(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { managerId } = req.body;
      const user = (req as any).user;

      if (user.role !== "admin") {
        return res.status(403).json({ error: "只有管理员可以更改项目负责人" });
      }

      const project = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      await projectRepository.update(id, { manager: { id: managerId } });
      const updatedProject = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["manager", "tasks", "bugs"],
      });

      res.json(updatedProject);
    } catch (error) {
      console.error("Error changing project manager:", error);
      res.status(500).json({ error: "Failed to change project manager" });
    }
  },
};