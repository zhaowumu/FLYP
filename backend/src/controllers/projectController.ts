import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Project } from "../entities/Project";
import { User } from "../entities/User";

const projectRepository = AppDataSource.getRepository(Project);
const userRepository = AppDataSource.getRepository(User);

export const projectController = {
  // 创建项目
  async createProject(req: Request, res: Response) {
    try {
      const { name, description, teamId, memberIds } = req.body;
      const createdBy = (req as any).user.id;

      // 创建项目
      const project = projectRepository.create({
        name,
        description,
        status: "active",
        createdBy,
        team: teamId ? { id: teamId } : undefined,
      });

      // 添加成员
      if (memberIds && memberIds.length > 0) {
        const members = await userRepository.findByIds(memberIds);
        project.members = members;
      }

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
        relations: ["team", "members", "manager", "tasks", "bugs"],
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
        relations: ["team", "members", "manager", "tasks", "bugs"],
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
        relations: ["team", "members", "manager", "tasks", "bugs"],
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

  // 添加项目成员
  async addProjectMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const project = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["members"],
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      project.members.push(user);
      await projectRepository.save(project);

      res.json(project);
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ error: "Failed to add project member" });
    }
  },

  // 移除项目成员
  async removeProjectMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;

      const project = await projectRepository.findOne({
        where: { id: parseInt(id as string) },
        relations: ["members"],
      });

      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      project.members = project.members.filter(member => member.id !== parseInt(userId as string));
      await projectRepository.save(project);

      res.json(project);
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ error: "Failed to remove project member" });
    }
  },
};