export declare class ExcelService {
    private stripHtml;
    private getTaskStatusText;
    private getTaskPriorityText;
    private getBugStatusText;
    private getBugSeverityText;
    exportTasksToExcel(projectId?: number): Promise<Buffer>;
    exportBugsToExcel(projectId?: number): Promise<Buffer>;
    exportAllToExcel(): Promise<Buffer>;
    importTasksFromExcel(fileBuffer: Buffer, projectId: number): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
    importBugsFromExcel(fileBuffer: Buffer, projectId: number): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
    generateTaskTemplate(): Buffer;
    generateBugTemplate(): Buffer;
    private convertToTaskPriority;
    private convertToTaskStatus;
    private convertToBugSeverity;
    private convertToBugStatus;
}
//# sourceMappingURL=excelService.d.ts.map