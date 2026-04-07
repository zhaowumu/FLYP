import { User } from "./User";
import { Task } from "./Task";
import { Bug } from "./Bug";
export declare class Project {
    id: number;
    name: string;
    description: string;
    status: string;
    createdBy: number;
    manager: User;
    tasks: Task[];
    bugs: Bug[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Project.d.ts.map