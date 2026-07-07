import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { OperationLog } from "../entities/OperationLog";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";

const userRepository = AppDataSource.getRepository(User);
const taskRepository = AppDataSource.getRepository(Task);
const bugRepository = AppDataSource.getRepository(Bug);
const operationLogRepository = AppDataSource.getRepository(OperationLog);

export const userController = {
  // 用户注册
  async register(req: Request, res: Response) {
    try {
      const { username, password, realName, phone, role } = req.body;

      // 检查用户名是否已存在
      const existingUser = await userRepository.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建用户
      const user = userRepository.create({
        username,
        password: hashedPassword,
        realName,
        phone,
        role: role || "developer",
      });

      await userRepository.save(user);

      // 返回用户信息（不包含密码）
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  },

  // 用户登录
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      // 查找用户
      const user = await userRepository.findOne({ where: { username } });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // 生成JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          avatar: user.avatar,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  },

  // 获取所有用户
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await userRepository.find({
        select: ["id", "username", "realName", "avatar", "phone", "role", "isActive", "createdAt"],
      });
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  },

  // 获取用户详情
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await userRepository.findOne({
        where: { id: parseInt(id as string) },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  },

  // 更新用户信息
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // 如果更新密码，需要加密
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      await userRepository.update(id, updateData);
      const updatedUser = await userRepository.findOne({
        where: { id: parseInt(id as string) },
        select: ["id", "username", "realName", "phone", "role", "isActive", "createdAt"],
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  },

  // 删除用户
  async deleteUser(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.id as string, 10);

      // 检查是否存在
      const user = await userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: "用户不存在" });
      }

      // 统计关联任务数（作为负责人 assignees）
      const assignedTaskCount = await taskRepository
        .createQueryBuilder("task")
        .innerJoin("task.assignees", "assignee")
        .where("assignee.id = :userId", { userId })
        .getCount();

      // 统计创建的任务数（creator）
      const createdTaskCount = await taskRepository
        .createQueryBuilder("task")
        .innerJoin("task.creator", "creator")
        .where("creator.id = :userId", { userId })
        .getCount();

      // 统计关联 Bug 数（作为负责人 assignee）
      const assignedBugCount = await bugRepository
        .createQueryBuilder("bug")
        .innerJoin("bug.assignee", "assignee")
        .where("assignee.id = :userId", { userId })
        .getCount();

      // 统计提报的 Bug 数（reporter）
      const reportedBugCount = await bugRepository
        .createQueryBuilder("bug")
        .innerJoin("bug.reporter", "reporter")
        .where("reporter.id = :userId", { userId })
        .getCount();

      // 统计项目管理员关联数（project_managers_user junction table）
      const pmCount = await AppDataSource.query(
        `SELECT COUNT(*) as count FROM project_managers_user WHERE userId = ?`,
        [userId]
      );

      const taskCount = assignedTaskCount + createdTaskCount;
      const bugCount = assignedBugCount + reportedBugCount;
      const projectManagerCount = pmCount[0]?.count || 0;

      // 操作日志不阻止删除，但删除前将 userId 置空（保留历史记录）
      // 清除该用户的操作日志关联（userId 置 null）
      await AppDataSource.query(
        `UPDATE operation_log SET userId = NULL WHERE userId = ?`,
        [userId]
      );

      console.log(`[deleteUser] userId=${userId}, assignedTasks=${assignedTaskCount}, createdTasks=${createdTaskCount}, assignedBugs=${assignedBugCount}, reportedBugs=${reportedBugCount}, pm=${projectManagerCount}`);

      const reasons: string[] = [];
      if (taskCount > 0) reasons.push(`${taskCount} 个关联任务`);
      if (bugCount > 0) reasons.push(`${bugCount} 个关联 Bug`);
      if (projectManagerCount > 0) reasons.push(`${projectManagerCount} 个项目管理员身份`);

      if (reasons.length > 0) {
        return res.status(400).json({
          error: `该用户还有 ${reasons.join("、")}，请先处理后再删除`,
        });
      }

      await userRepository.delete(userId);
      res.json({ message: "用户删除成功" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "删除用户失败，请稍后重试" });
    }
  },

  // 获取当前登录用户信息
  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const user = await userRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "realName", "avatar", "phone", "role", "isActive", "createdAt"],
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error getting current user:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  },

  // 更新当前用户个人资料（姓名、头像）
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { avatar } = req.body;

      const updateData: any = {};
      if (avatar !== undefined) updateData.avatar = avatar;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "没有需要更新的字段" });
      }

      await userRepository.update(userId, updateData);

      const updatedUser = await userRepository.findOne({
        where: { id: userId },
        select: ["id", "username", "realName", "avatar", "phone", "role", "isActive", "createdAt"],
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  },


  // 批量转移任务/缺陷负责人
  async transferTasks(req: Request, res: Response) {
    try {
      const { sourceUserId, targetUserId } = req.body;

      if (!sourceUserId || !targetUserId) {
        return res.status(400).json({ error: "请提供 sourceUserId 和 targetUserId" });
      }
      if (sourceUserId === targetUserId) {
        return res.status(400).json({ error: "源用户和目标用户不能相同" });
      }

      // 检查用户是否存在
      const [sourceUser, targetUser] = await Promise.all([
        userRepository.findOne({ where: { id: sourceUserId } }),
        userRepository.findOne({ where: { id: targetUserId } }),
      ]);
      if (!sourceUser) return res.status(404).json({ error: "源用户不存在" });
      if (!targetUser) return res.status(404).json({ error: "目标用户不存在" });

      const details: string[] = [];

      // 查询源用户未完成的任务（作为负责人）
      const activeStatuses = ["pending", "in_progress", "testing"];
      const uncompletedTasks = await taskRepository
        .createQueryBuilder("task")
        .innerJoinAndSelect("task.assignees", "assignee")
        .where("assignee.id = :uid", { uid: sourceUserId })
        .andWhere("task.status IN (:...statuses)", { statuses: activeStatuses })
        .getMany();

      // 转移任务负责人
      const operatorId = (req as any).user?.id;
      for (const task of uncompletedTasks) {
        task.assignees = task.assignees.filter((a: any) => a.id !== sourceUserId);
        if (!task.assignees.some((a: any) => a.id === targetUserId)) {
          task.assignees.push(targetUser);
        }
        await taskRepository.save(task);
        details.push("任务 #" + task.id + " 负责人已转移");
        if (operatorId) {
          await operationLogRepository.save({
            targetType: "task",
            targetId: task.id,
            user: { id: operatorId },
            action: "transferred",
            remark: "从 " + sourceUser.realName + " 转移至 " + targetUser.realName,
            createdAt: new Date(),
          } as any);
        }
      }

      // 查询源用户未完成的缺陷（作为负责人）
      const uncompletedBugs = await bugRepository
        .createQueryBuilder("bug")
        .leftJoinAndSelect("bug.assignee", "assignee")
        .where("assignee.id = :uid", { uid: sourceUserId })
        .andWhere("bug.status IN (:...statuses)", { statuses: activeStatuses })
        .getMany();

      // 转移缺陷负责人
      for (const bug of uncompletedBugs) {
        bug.assignee = targetUser;
        await bugRepository.save(bug);
        details.push("缺陷 #" + bug.id + " 负责人已转移");
        if (operatorId) {
          await operationLogRepository.save({
            targetType: "bug",
            targetId: bug.id,
            user: { id: operatorId },
            action: "transferred",
            remark: "从 " + sourceUser.realName + " 转移至 " + targetUser.realName,
            createdAt: new Date(),
          } as any);
        }
      }

      // 记录操作日志
      const detailsStr = "任务" + uncompletedTasks.length + "个，缺陷" + uncompletedBugs.length + "个";
      if (operatorId) {
        await AppDataSource.query(
          "INSERT INTO operation_log (targetType, targetId, userId, action, remark, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
          ["user", sourceUserId, operatorId, "transfer_tasks",
           "从 " + sourceUser.realName + " 转移至 " + targetUser.realName + "：" + detailsStr,
           new Date().toISOString().replace("T", " ").replace("Z", "")]
        );
      }

      res.json({
        tasksTransferred: uncompletedTasks.length,
        bugsTransferred: uncompletedBugs.length,
        details,
      });
    } catch (error) {
      console.error("Error transferring tasks:", error);
      res.status(500).json({ error: "转移失败，请查看服务端日志" });
    }
  },

  // 修改密码
  async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "当前密码和新密码不能为空" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "新密码长度不能少于6位" });
      }

      // 获取用户（需要密码字段）
      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // 验证当前密码
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "当前密码错误" });
      }

      // 加密新密码并更新
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await userRepository.update(userId, { password: hashedPassword });

      res.json({ message: "密码修改成功" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  },
};