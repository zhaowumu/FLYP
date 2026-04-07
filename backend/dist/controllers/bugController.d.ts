import { Request, Response } from "express";
export declare const bugController: {
    createBug(req: Request, res: Response): Promise<void>;
    getAllBugs(req: Request, res: Response): Promise<void>;
    getBugById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateBug(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateBugStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    addComment(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    assignBug(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteBug(req: Request, res: Response): Promise<void>;
    getBugStats(req: Request, res: Response): Promise<void>;
    extendDueDate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=bugController.d.ts.map