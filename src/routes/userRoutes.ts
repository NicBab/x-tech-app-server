import { Router } from "express";
import { getUsers } from "../controllers/userControllers";

const router = Router();

router.get("/", getUsers)
// router.get("/", (req, res) => {
//   res.json({ message: "User routes endpoint" });
// });

export default router;
