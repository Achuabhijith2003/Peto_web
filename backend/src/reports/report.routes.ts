import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { submitUserReport } from "./report.controller";

const router = Router();

// All reporting operations mandate user authentication
router.post("/", authenticate, submitUserReport);

export default router;
