"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const markdownController_1 = require("../controllers/markdownController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/read", authMiddleware_1.authMiddleware, markdownController_1.markdownController.readMarkdown);
router.get("/list", authMiddleware_1.authMiddleware, markdownController_1.markdownController.listMarkdown);
router.post("/upload", authMiddleware_1.authMiddleware, markdownController_1.markdownController.uploadMarkdown);
exports.default = router;
//# sourceMappingURL=markdownRoutes.js.map