"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/", (0, authMiddleware_1.projectPermissionMiddleware)("create"), projectController_1.projectController.createProject);
router.get("/", projectController_1.projectController.getAllProjects);
router.get("/:id", projectController_1.projectController.getProjectById);
router.put("/:id", projectController_1.projectController.updateProject);
router.patch("/:id/archive", projectController_1.projectController.archiveProject);
router.patch("/:id/manager", projectController_1.projectController.changeManager);
router.delete("/:id", (0, authMiddleware_1.projectPermissionMiddleware)("delete"), projectController_1.projectController.deleteProject);
exports.default = router;
//# sourceMappingURL=projectRoutes.js.map