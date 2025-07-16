import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "User routes endpoint" });
});

export default router;
