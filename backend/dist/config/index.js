"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
exports.config = {
    server: {
        port: parseInt(process.env.PORT || "3000"),
    },
    jwt: {
        secret: process.env.JWT_SECRET || "your_jwt_secret_key",
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
    dingtalk: {
        webhook: process.env.DINGTALK_WEBHOOK || "",
    },
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    },
};
//# sourceMappingURL=index.js.map