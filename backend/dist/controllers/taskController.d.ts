import { Request, Response } from "express";
export declare const taskController: {
    createTask(req: Request, res: Response): Promise<void>;
    getAllTasks(req: Request, res: Response): Promise<void>;
    getTaskById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateTask(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateTaskStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    addComment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteTask(req: Request, res: Response): Promise<void>;
    addSubtask(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getTaskDependencies(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    extendDueDate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=taskController.d.ts.map