import express from "express";
import { getDLRs, createDLR } from "../controllers/dlrController";

const router = express.Router();

router.get("/", getDLRs);
router.post("/", createDLR);

export default router;