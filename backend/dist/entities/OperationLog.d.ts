import { User } from "./User";
export declare class OperationLog {
    id: number;
    targetType: string;
    targetId: number;
    user: User;
    action: string;
    oldStatus: string;
    newStatus: string;
    oldAssignee: string;
    newAssignee: string;
    oldPriority: string;
    newPriority: string;
    oldSeverity: string;
    newSeverity: string;
    oldDueDate: string;
    newDueDate: string;
    remark: string;
    createdAt: Date;
}
//# sourceMappingURL=OperationLog.d.ts.map