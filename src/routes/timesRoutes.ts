// src/routes/timesRoutes.ts
import express from "express";
import {
  getTimeEntryGroups,
  upsertTimeEntryGroup,
  submitTimeEntryGroup,
  deleteDraftTimeEntryGroup,
  getTimeEntryGroupById,
  updateDraftTimeEntryGroup,
  resubmitTimeEntryGroup, // <-- add
} from "../controllers/timesController";

const router = express.Router();

// Collection
router.get("/", getTimeEntryGroups);                // list with filters
router.post("/", upsertTimeEntryGroup);             // create/update draft or direct submit

// Item-specific (put the more specific paths before the generic :id)
router.post("/:id/resubmit", resubmitTimeEntryGroup); // SUBMITTED -> replace with new SUBMITTED
router.patch("/:id/submit", submitTimeEntryGroup);    // DRAFT -> SUBMITTED
router.patch("/:id", updateDraftTimeEntryGroup);      // edit only if DRAFT
router.delete("/:id", deleteDraftTimeEntryGroup);     // delete only if DRAFT
router.get("/:id", getTimeEntryGroupById);            // fetch by id

export default router;
