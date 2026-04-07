import { Request, Response } from "express";
export declare const projectController: {
    createProject(req: Request, res: Response): Promise<void>;
    getAllProjects(req: Request, res: Response): Promise<void>;
    getProjectById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    archiveProject(req: Request, res: Response): Promise<void>;
    deleteProject(req: Request, res: Response): Promise<void>;
    changeManager(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=projectController.d.ts.map