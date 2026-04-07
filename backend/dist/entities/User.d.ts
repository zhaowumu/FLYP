import { Task } from "./Task";
import { Bug } from "./Bug";
export declare class User {
    id: number;
    username: string;
    password: string;
    realName: string;
    phone: string;
    role: string;
    isActive: boolean;
    assignedTasks: Task[];
    createdTasks: Task[];
    assignedBugs: Bug[];
    reportedBugs: Bug[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=User.d.ts.map