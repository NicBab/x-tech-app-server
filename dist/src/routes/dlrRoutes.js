"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dlrController_1 = require("../controllers/dlrController");
const router = express_1.default.Router();
router.get("/", dlrController_1.getDLRs);
router.post("/", dlrController_1.createDLR);
exports.default = router;
