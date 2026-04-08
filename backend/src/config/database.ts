import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Project } from "../entities/Project";
import { Task } from "../entities/Task";
import { Bug } from "../entities/Bug";
import { SystemConfig } from "../entities/SystemConfig";
import { OperationLog } from "../entities/OperationLog";
import path from "path";

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: path.join(__dirname, "../../data/newbee.db"),
  synchronize: true,
  logging: false,
  entities: [User, Project, Task, Bug, SystemConfig, OperationLog],
  subscribers: [],
  migrations: [],
});