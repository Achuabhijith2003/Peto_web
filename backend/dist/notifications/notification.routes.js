import { Router } from "express";
import { getAllNotifications, unreadCount, readNotification, readAllNotifications, removeNotification, getSettings, updateSettings, getVapidKey, subscribePush, unsubscribePush, } from "./notification.controller";
import { authenticate } from "../auth/auth.middleware";
const router = Router();
// Static & collection endpoints (must be defined BEFORE parameterized /:id routes)
router.get("/", authenticate, getAllNotifications);
router.get("/unread-count", authenticate, unreadCount);
router.patch("/read-all", authenticate, readAllNotifications);
// Notification Settings
router.get("/settings", authenticate, getSettings);
router.put("/settings", authenticate, updateSettings);
// Web Push Subscription
router.get("/vapid-key", getVapidKey);
router.post("/push-subscribe", authenticate, subscribePush);
router.post("/push-unsubscribe", authenticate, unsubscribePush);
// Parameterized item endpoints
router.patch("/:id/read", authenticate, readNotification);
router.delete("/:id", authenticate, removeNotification);
export default router;
