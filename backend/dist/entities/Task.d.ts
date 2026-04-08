import { Project } from "./Project";
import { User } from "./User";
export declare class Task {
    id: number;
    title: string;
    description: string;
    priority: string;
    status: string;
    dueDate: Date;
    project: Project;
    assignee: User;
    creator: User;
    parentTask: Task;
    subtasks: Task[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Task.d.ts.map