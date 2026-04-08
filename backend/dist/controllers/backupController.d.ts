import { Request, Response } from "express";
export declare const backupController: {
    backup(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    restore(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    clearDatabase(req: Request, res: Response): Promise<void>;
    clearAllDatabase(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=backupController.d.ts.map