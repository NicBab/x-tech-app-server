"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const timesController_1 = require("../controllers/timesController");
const router = express_1.default.Router();
router.get("/", timesController_1.getTimeEntryGroups); // list with filters
router.post("/", timesController_1.upsertTimeEntryGroup); // create/update draft or direct submit
router.patch("/:id/submit", timesController_1.submitTimeEntryGroup); // DRAFT -> SUBMITTED
router.delete("/:id", timesController_1.deleteDraftTimeEntryGroup); // delete only if DRAFT
router.get("/:id", timesController_1.getTimeEntryGroupById);
router.patch("/:id", timesController_1.updateDraftTimeEntryGroup);
exports.default = router;
