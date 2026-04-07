import { Project } from "./Project";
import { User } from "./User";
export declare class Bug {
    id: number;
    title: string;
    description: string;
    severity: string;
    status: string;
    reproduceSteps: string;
    project: Project;
    assignee: User;
    reporter: User;
    dueDate: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Bug.d.ts.map