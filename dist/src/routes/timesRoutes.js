"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/timesRoutes.ts
const express_1 = __importDefault(require("express"));
const timesController_1 = require("../controllers/timesController");
const router = express_1.default.Router();
// Collection
router.get("/", timesController_1.getTimeEntryGroups); // list with filters
router.post("/", timesController_1.upsertTimeEntryGroup); // create/update draft or direct submit
// Item-specific (put the more specific paths before the generic :id)
router.post("/:id/resubmit", timesController_1.resubmitTimeEntryGroup); // SUBMITTED -> replace with new SUBMITTED
router.patch("/:id/submit", timesController_1.submitTimeEntryGroup); // DRAFT -> SUBMITTED
router.patch("/:id", timesController_1.updateDraftTimeEntryGroup); // edit only if DRAFT
router.delete("/:id", timesController_1.deleteDraftTimeEntryGroup); // delete only if DRAFT
router.get("/:id", timesController_1.getTimeEntryGroupById); // fetch by id
exports.default = router;
