"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchController = void 0;
const database_1 = require("../config/database");
const Task_1 = require("../entities/Task");
const Bug_1 = require("../entities/Bug");
const Project_1 = require("../entities/Project");
const taskRepository = database_1.AppDataSource.getRepository(Task_1.Task);
const bugRepository = database_1.AppDataSource.getRepository(Bug_1.Bug);
const projectRepository = database_1.AppDataSource.getRepository(Project_1.Project);
exports.searchController = {
    async globalSearch(req, res) {
        try {
            const { q } = req.query;
            const query = q;
            if (!query || query.trim().length === 0) {
                return res.json({ tasks: [], bugs: [], projects: [] });
            }
            const searchTerm = `%${query}%`;
            const [tasks, bugs, projects] = await Promise.all([
                taskRepository
                    .createQueryBuilder("task")
                    .leftJoinAndSelect("task.project", "project")
                    .leftJoinAndSelect("task.assignee", "assignee")
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
        }
        catch (error) {
            console.error("Error performing global search:", error);
            res.status(500).json({ error: "Failed to perform search" });
        }
    },
};
//# sourceMappingURL=searchController.js.map