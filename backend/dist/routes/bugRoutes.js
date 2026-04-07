"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bugController_1 = require("../controllers/bugController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/", (0, authMiddleware_1.bugPermissionMiddleware)("create"), bugController_1.bugController.createBug);
router.get("/", bugController_1.bugController.getAllBugs);
router.get("/:id", bugController_1.bugController.getBugById);
router.put("/:id", bugController_1.bugController.updateBug);
router.patch("/:id/status", bugController_1.bugController.updateBugStatus);
router.post("/:id/comments", bugController_1.bugController.addComment);
router.patch("/:id/assign", bugController_1.bugController.assignBug);
router.delete("/:id", (0, authMiddleware_1.bugPermissionMiddleware)("delete"), bugController_1.bugController.deleteBug);
router.get("/stats", bugController_1.bugController.getBugStats);
router.patch("/:id/extend", bugController_1.bugController.extendDueDate);
exports.default = router;
//# sourceMappingURL=bugRoutes.js.map