import { Request, Response } from "express";
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    getNotificationSettings,
    updateNotificationSettings,
} from "./notification.service";
import {
    savePushSubscription,
    removePushSubscription,
    getVapidPublicKey,
} from "./push.service";

/*
|--------------------------------------------------------------------------
| GET Notifications
|--------------------------------------------------------------------------
*/

export async function getAllNotifications(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;

        const result = await getNotifications(userId, page, limit);

        return res.json({
            success: true,
            data: result.notifications,
            pagination: result.pagination,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/*
|--------------------------------------------------------------------------
| GET Unread Count
|--------------------------------------------------------------------------
*/

export async function unreadCount(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const count = await getUnreadCount(userId);

        return res.json({
            success: true,
            unread: count,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/*
|--------------------------------------------------------------------------
| PATCH Read One
|--------------------------------------------------------------------------
*/

export async function readNotification(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const notificationId = req.params.id as string;

        const notification = await markNotificationRead(userId, notificationId);

        return res.json({
            success: true,
            data: notification,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/*
|--------------------------------------------------------------------------
| PATCH Read All
|--------------------------------------------------------------------------
*/

export async function readAllNotifications(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        await markAllNotificationsRead(userId);

        return res.json({
            success: true,
            message: "All notifications marked as read.",
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/*
|--------------------------------------------------------------------------
| DELETE Notification
|--------------------------------------------------------------------------
*/

export async function removeNotification(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const notificationId = req.params.id as string;

        await deleteNotification(userId, notificationId);

        return res.json({
            success: true,
            message: "Notification deleted.",
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/*
|--------------------------------------------------------------------------
| GET / PUT Notification Settings
|--------------------------------------------------------------------------
*/

export async function getSettings(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const settings = await getNotificationSettings(userId);

        return res.json({
            success: true,
            settings,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export async function updateSettings(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const settings = await updateNotificationSettings(userId, req.body);

        return res.json({
            success: true,
            settings,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

/*
|--------------------------------------------------------------------------
| Web Push Subscription Handlers
|--------------------------------------------------------------------------
*/

export async function getVapidKey(req: Request, res: Response) {
    return res.json({
        success: true,
        publicKey: getVapidPublicKey(),
    });
}

export async function subscribePush(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const subscription = req.body;

        const data = await savePushSubscription(userId, subscription);

        return res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

export async function unsubscribePush(req: Request, res: Response) {
    try {
        const userId = (req as any).user.id;
        const { endpoint } = req.body;

        await removePushSubscription(userId, endpoint);

        return res.json({
            success: true,
            message: "Push subscription removed.",
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}