import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
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
  backup: {
    autoBackup: process.env.AUTO_BACKUP_ENABLED !== "false",
  },
};