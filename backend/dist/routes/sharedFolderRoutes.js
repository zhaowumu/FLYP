"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sharedFolderController_1 = require("../controllers/sharedFolderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/list", authMiddleware_1.authMiddleware, sharedFolderController_1.sharedFolderController.listFolder);
router.get("/download", authMiddleware_1.authMiddleware, sharedFolderController_1.sharedFolderController.downloadFile);
exports.default = router;
//# sourceMappingURL=sharedFolderRoutes.js.map