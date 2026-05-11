import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Project } from "../entities/Project";
import { User } from "../entities/User";

const projectRepository = AppDataSource.getRepository(Project);

export const projectController = {
  // 创建项目
  async createProject(req: Request, res: Response) {
    try {
      const { name, description, managerIds } = req.body;
      const createdBy = (req as any).user.id;

      let managers: User[] = [];
      if (managerIds && Array.isArray(managerIds) && managerIds.length > 0) {
        const userRepo = AppDataSource.getRepository(User);
        managers = await userRepo.findByIds(managerIds);
      }

      const project = projectRepository.create({
        name,
        description,
        status: "active",
        createdBy,
        managers,
      });
      await projectRepository.save(project);
      const savedProject = await projectRepository.findOne({
        where: { id: project.id },
        relations: ["managers", "tasks", "bugs"],
      });
      res.status(201).json(savedProject);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  },

  // 获取所有项目
  async getAllProjects(req: Request, res: Response) {
    try {
      const projects = await projectRepository.find({
        relations: ["managers", "tasks", "bugs"],
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
        relations: ["managers", "tasks", "bugs"],
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
        relations: ["managers", "tasks", "bugs"],
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

  // 更新项目负责人（支持多人）
  async updateManagers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { managerIds } = req.body;

      const project = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
      });
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      if (!Array.isArray(managerIds)) {
        return res.status(400).json({ error: "managerIds 必须是数组" });
      }

      const userRepo = AppDataSource.getRepository(User);
      const managers = await userRepo.findByIds(managerIds);
      project.managers = managers;
      await projectRepository.save(project);

      const updatedProject = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["managers", "tasks", "bugs"],
      });
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project managers:", error);
      res.status(500).json({ error: "Failed to update project managers" });
    }
  },
};
