import { supabase } from "../config/supabase";
import {
    CreateNotificationInput
} from "./notification.types";

/*
|--------------------------------------------------------------------------
| Create Notification
|--------------------------------------------------------------------------
*/

export async function createNotification(
    input: CreateNotificationInput
) {

    // Don't notify yourself

    if (
        input.actorId &&
        input.actorId === input.recipientId
    ) {
        return null;
    }

    const { data, error } = await supabase
        .from("notifications")
        .insert({

            recipient_id: input.recipientId,

            actor_id: input.actorId,

            post_id: input.postId,

            comment_id: input.commentId,

            type: input.type,

            message: input.message

        })
        .select()
        .single();

    if (error)
        throw error;

    return data;

}

/*
|--------------------------------------------------------------------------
| Get Notifications
|--------------------------------------------------------------------------
*/

export async function getNotifications(

    userId: string,

    page: number,

    limit: number

) {

    const from = (page - 1) * limit;

    const to = from + limit - 1;

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

        .order("created_at", {
            ascending: false
        })

        .range(from, to);

    if (error)
        throw error;

    return data;

}

/*
|--------------------------------------------------------------------------
| Unread Count
|--------------------------------------------------------------------------
*/

export async function getUnreadCount(
    userId: string
) {

    const { count, error } = await supabase

        .from("notifications")

        .select("*", {

            count: "exact",

            head: true

        })

        .eq("recipient_id", userId)

        .eq("is_read", false);

    if (error)
        throw error;

    return count ?? 0;

}

/*
|--------------------------------------------------------------------------
| Mark Read
|--------------------------------------------------------------------------
*/

export async function markNotificationRead(

    userId: string,

    notificationId: string

) {

    const { data, error } = await supabase

        .from("notifications")

        .update({

            is_read: true

        })

        .eq("id", notificationId)

        .eq("recipient_id", userId)

        .select()

        .single();

    if (error)
        throw error;

    return data;

}

/*
|--------------------------------------------------------------------------
| Mark All Read
|--------------------------------------------------------------------------
*/

export async function markAllNotificationsRead(
    userId: string
) {

    const { error } = await supabase

        .from("notifications")

        .update({

            is_read: true

        })

        .eq("recipient_id", userId)

        .eq("is_read", false);

    if (error)
        throw error;

    return {

        success: true

    };

}

/*
|--------------------------------------------------------------------------
| Delete Notification
|--------------------------------------------------------------------------
*/

export async function deleteNotification(

    userId: string,

    notificationId: string

) {

    const { error } = await supabase

        .from("notifications")

        .delete()

        .eq("recipient_id", userId)

        .eq("id", notificationId);

    if (error)
        throw error;

    return {

        success: true

    };

}