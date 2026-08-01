import webpush from "web-push";
import { supabase } from "../config/supabase";
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDnA45dfg_fake_key_for_dev_only";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "fake_private_key_for_dev_only";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@peto.app";
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}
export function getVapidPublicKey() {
    return vapidPublicKey;
}
export async function savePushSubscription(userId, subscription) {
    const { data, error } = await supabase
        .from("user_push_subscriptions")
        .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: subscription.user_agent || null,
    }, { onConflict: "endpoint" })
        .select()
        .single();
    if (error) {
        console.error("Failed to save push subscription:", error.message);
        throw error;
    }
    return data;
}
export async function removePushSubscription(userId, endpoint) {
    const { error } = await supabase
        .from("user_push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
    if (error) {
        console.error("Failed to remove push subscription:", error.message);
        throw error;
    }
    return { success: true };
}
export async function sendPushNotificationToUser(userId, title, body, url = "/social") {
    try {
        const { data: subscriptions, error } = await supabase
            .from("user_push_subscriptions")
            .select("*")
            .eq("user_id", userId);
        if (error || !subscriptions || subscriptions.length === 0) {
            return;
        }
        const payload = JSON.stringify({
            title,
            body,
            icon: "/icon.png",
            url,
        });
        for (const sub of subscriptions) {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };
            webpush.sendNotification(pushConfig, payload).catch(async (err) => {
                console.warn(`Push delivery failed for endpoint ${sub.endpoint}:`, err.statusCode);
                // If subscription expired or invalid (410 Gone / 404 Not Found), clean it up
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabase
                        .from("user_push_subscriptions")
                        .delete()
                        .eq("endpoint", sub.endpoint);
                }
            });
        }
    }
    catch (err) {
        console.error("Error sending push notification:", err);
    }
}
