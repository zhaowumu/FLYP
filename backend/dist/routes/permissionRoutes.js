"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permissionController_1 = require("../controllers/permissionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authMiddleware, permissionController_1.permissionController.getPermissions);
router.put("/", authMiddleware_1.authMiddleware, permissionController_1.permissionController.updatePermissions);
exports.default = router;
//# sourceMappingURL=permissionRoutes.js.map