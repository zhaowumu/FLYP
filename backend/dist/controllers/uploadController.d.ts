import { Request, Response } from "express";
import multer from "multer";
export declare const upload: multer.Multer;
export declare const uploadVideo: multer.Multer;
export declare const uploadController: {
    uploadImage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    uploadImages(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    uploadVideo(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=uploadController.d.ts.map