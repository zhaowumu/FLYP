import { Request, Response } from "express";
export declare const systemConfigController: {
    getConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getDingTalkConfig(req: Request, res: Response): Promise<void>;
    updateDingTalkConfig(req: Request, res: Response): Promise<void>;
    testDingTalkNotification(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=systemConfigController.d.ts.map