"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const excelController_1 = require("../controllers/excelController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/export/all", authMiddleware_1.authMiddleware, excelController_1.excelController.exportAll);
exports.default = router;
//# sourceMappingURL=excelRoutes.js.map