import express from "express";
import {
  getDLRs,
  getDLRById,
  createDLR,
  updateDLR,
  submitDLR,
  deleteDraftDLR,
} from "../controllers/dlrController";

const router = express.Router();

router.get("/", getDLRs);
router.get("/:id", getDLRById);
router.post("/", createDLR);
router.patch("/:id", updateDLR);
router.patch("/:id/submit", submitDLR);
router.delete("/:id", deleteDraftDLR);

export default router;
