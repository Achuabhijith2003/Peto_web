import { supabase } from "../config/supabase";
import {
    CreateNotificationInput,
    NotificationSettings,
    UpdateNotificationSettingsInput,
} from "./notification.types";
import { sendPushNotificationToUser } from "./push.service";

/*
|--------------------------------------------------------------------------
| Notification Settings Service
|--------------------------------------------------------------------------
*/

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching notification settings:", error.message);
    }

    if (!data) {
        // Return default settings if user doesn't have a record yet
        return {
            user_id: userId,
            likes_enabled: true,
            comments_enabled: true,
            follows_enabled: true,
            mentions_enabled: true,
            push_enabled: true,
            sound_enabled: true,
        };
    }

    return data;
}

export async function updateNotificationSettings(
    userId: string,
    settingsInput: UpdateNotificationSettingsInput
): Promise<NotificationSettings> {
    const { data, error } = await supabase
        .from("notification_settings")
        .upsert(
            {
                user_id: userId,
                ...settingsInput,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        )
        .select()
        .single();

    if (error) throw error;
    return data;
}

/*
|--------------------------------------------------------------------------
| Create Notification (With Preference Check & Push Dispatch)
|--------------------------------------------------------------------------
*/

export async function createNotification(input: CreateNotificationInput) {
    // 1. Don't notify yourself
    if (input.actorId && input.actorId === input.recipientId) {
        return null;
    }

    // 2. Check recipient notification settings
    const settings = await getNotificationSettings(input.recipientId);

    // Verify if this notification category is enabled by the recipient
    if (input.type === "like" && !settings.likes_enabled) return null;
    if (input.type === "comment" && !settings.comments_enabled) return null;
    if (input.type === "reply" && !settings.comments_enabled) return null;
    if (input.type === "follow" && !settings.follows_enabled) return null;
    if (input.type === "mention" && !settings.mentions_enabled) return null;

    // 3. Insert notification record into DB
    const { data, error } = await supabase
        .from("notifications")
        .insert({
            recipient_id: input.recipientId,
            actor_id: input.actorId,
            post_id: input.postId,
            comment_id: input.commentId,
            type: input.type,
            message: input.message,
        })
        .select(`
            *,
            actor:profiles!notifications_actor_id_fkey(
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `)
        .single();

    if (error) {
        console.error("Error creating notification:", error.message);
        throw error;
    }

    // 4. Send Web Push Notification if push is enabled
    if (settings.push_enabled) {
        const actorName = data.actor?.full_name || data.actor?.username || "Someone";
        const pushTitle = `Peto Notification`;
        const pushBody = `${actorName} ${input.message}`;
        sendPushNotificationToUser(input.recipientId, pushTitle, pushBody, "/social");
    }

    return data;
}

/*
|--------------------------------------------------------------------------
| Delete Notification by Event (Unlike / Unfollow cleanup)
|--------------------------------------------------------------------------
*/

export async function removeNotificationByEvent(params: {
    recipientId: string;
    actorId: string;
    type: "like" | "follow" | "comment";
    postId?: string;
    commentId?: string;
}) {
    let query = supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", params.recipientId)
        .eq("actor_id", params.actorId)
        .eq("type", params.type);

    if (params.postId) {
        query = query.eq("post_id", params.postId);
    }
    if (params.commentId) {
        query = query.eq("comment_id", params.commentId);
    }

    const { error } = await query;
    if (error) {
        console.error("Error deleting event notification:", error.message);
    }
}

/*
|--------------------------------------------------------------------------
| Get Notifications (With Pagination Metadata)
|--------------------------------------------------------------------------
*/

export async function getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Fetch total count
    const { count: totalCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId);

    // Fetch paginated notification items
    const { data, error } = await supabase
        .from("notifications")
        .select(`
            *,
            actor:profiles!notifications_actor_id_fkey(
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) throw error;

    const total = totalCount ?? 0;
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
        notifications: data || [],
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore,
        },
    };
}

/*
|--------------------------------------------------------------------------
| Unread Count
|--------------------------------------------------------------------------
*/

export async function getUnreadCount(userId: string) {
    const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false);

    if (error) throw error;
    return count ?? 0;
}

/*
|--------------------------------------------------------------------------
| Mark Notification Read
|--------------------------------------------------------------------------
*/

export async function markNotificationRead(userId: string, notificationId: string) {
    const { data, error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("recipient_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/*
|--------------------------------------------------------------------------
| Mark All Notifications Read
|--------------------------------------------------------------------------
*/

export async function markAllNotificationsRead(userId: string) {
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", userId)
        .eq("is_read", false);

    if (error) throw error;
    return { success: true };
}

/*
|--------------------------------------------------------------------------
| Delete Notification
|--------------------------------------------------------------------------
*/

export async function deleteNotification(userId: string, notificationId: string) {
    const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", userId)
        .eq("id", notificationId);

    if (error) throw error;
    return { success: true };
}