import express from "express";
import { getTimeEntryGroups } from "../controllers/timesController";

const router = express.Router();

router.get("/", getTimeEntryGroups);

export default router;
