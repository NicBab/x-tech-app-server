import express from "express";
import {
  getTimeEntryGroups,
  upsertTimeEntryGroup,
  submitTimeEntryGroup,
  deleteDraftTimeEntryGroup,
  getTimeEntryGroupById,
} from "../controllers/timesController";

const router = express.Router();

router.get("/", getTimeEntryGroups);               // list with filters
router.post("/", upsertTimeEntryGroup);            // create/update draft or direct submit
router.patch("/:id/submit", submitTimeEntryGroup); // DRAFT -> SUBMITTED
router.delete("/:id", deleteDraftTimeEntryGroup);  // delete only if DRAFT
router.get("/:id", getTimeEntryGroupById);

export default router;