"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userControllers_1 = require("../controllers/userControllers");
const router = (0, express_1.Router)();
router.get("/", userControllers_1.getUsers);
// router.get("/", (req, res) => {
//   res.json({ message: "User routes endpoint" });
// });
exports.default = router;
