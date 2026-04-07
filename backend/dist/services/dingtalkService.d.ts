export interface DingTalkMessage {
    msgtype: "text" | "markdown";
    text?: {
        content: string;
    };
    markdown?: {
        title: string;
        text: string;
    };
    at?: {
        atMobiles?: string[];
        isAtAll?: boolean;
    };
}
export declare class DingTalkService {
    private getConfigRepository;
    private getDingTalkConfig;
    private generateSignature;
    private buildUrlWithSignature;
    private addKeyword;
    private renderTemplate;
    private getDefaultTemplate;
    sendNotification(type: string, variables: Record<string, string>): Promise<boolean>;
    sendTextMessage(content: string, atMobiles?: string[], isAtAll?: boolean): Promise<boolean>;
    sendMarkdownMessage(title: string, text: string, atMobiles?: string[], isAtAll?: boolean): Promise<boolean>;
}
//# sourceMappingURL=dingtalkService.d.ts.map