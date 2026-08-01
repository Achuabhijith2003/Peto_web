import { Router } from "express";
import { heartbeat, offline, onlineFriends } from "./presence.controller";
import { authenticate } from "../auth/auth.middleware";
const router = Router();
router.post("/heartbeat", authenticate, heartbeat);
router.post("/offline", authenticate, offline);
router.get("/online", authenticate, onlineFriends);
export default router;
