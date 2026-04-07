"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customLinkController_1 = require("../controllers/customLinkController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authMiddleware, customLinkController_1.customLinkController.getCustomLinks);
router.put("/", authMiddleware_1.authMiddleware, customLinkController_1.customLinkController.updateCustomLinks);
exports.default = router;
//# sourceMappingURL=customLinkRoutes.js.map