"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const Project_1 = require("../entities/Project");
const Task_1 = require("../entities/Task");
const Bug_1 = require("../entities/Bug");
const SystemConfig_1 = require("../entities/SystemConfig");
const OperationLog_1 = require("../entities/OperationLog");
const path_1 = __importDefault(require("path"));
exports.AppDataSource = new typeorm_1.DataSource({
    type: "better-sqlite3",
    database: path_1.default.join(__dirname, "../../data/flyp.db"),
    synchronize: true,
    logging: false,
    entities: [User_1.User, Project_1.Project, Task_1.Task, Bug_1.Bug, SystemConfig_1.SystemConfig, OperationLog_1.OperationLog],
    subscribers: [],
    migrations: [],
});
//# sourceMappingURL=database.js.map