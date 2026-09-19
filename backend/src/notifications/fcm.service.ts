import { initializeApp, cert, applicationDefault, getApps, App } from "firebase-admin/app";
import { getMessaging, MulticastMessage } from "firebase-admin/messaging";
import { supabase } from "../config/supabase";

let firebaseApp: App | null = null;

// Initialize Firebase Admin SDK
function initFirebase(): boolean {
    if (firebaseApp) return true;
    const existingApps = getApps();
    if (existingApps.length > 0) {
        firebaseApp = existingApps[0];
        return true;
    }

    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            let serviceAccount: any;
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            } catch {
                // If it's a file path
                serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
            }

            firebaseApp = initializeApp({
                credential: cert(serviceAccount),
            });
            console.log("[FCM] Firebase Admin initialized successfully via FIREBASE_SERVICE_ACCOUNT.");
            return true;
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            firebaseApp = initializeApp({
                credential: applicationDefault(),
            });
            console.log("[FCM] Firebase Admin initialized successfully via applicationDefault.");
            return true;
        } else {
            console.warn(
                "[FCM] Warning: FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS is not configured in backend/.env. Push notifications will be queued but not sent to FCM until credentials are provided."
            );
            return false;
        }
    } catch (err) {
        console.error("[FCM] Failed to initialize Firebase Admin:", err);
        return false;
    }
}

/**
 * Register or update an FCM device token for a user
 */
export async function saveDeviceToken(userId: string, fcmToken: string, platform: string = "android") {
    if (!fcmToken || !userId) return null;

    const { data, error } = await supabase
        .from("user_device_tokens")
        .upsert(
            {
                user_id: userId,
                fcm_token: fcmToken,
                platform: platform.toLowerCase(),
                updated_at: new Date().toISOString(),
            },
            { onConflict: "fcm_token" }
        )
        .select()
        .single();

    if (error) {
        console.error("[FCM] Failed to save device token:", error.message);
        throw error;
    }

    return data;
}

/**
 * Remove an FCM device token (e.g. on logout)
 */
export async function removeDeviceToken(userId: string, fcmToken: string) {
    if (!fcmToken || !userId) return;

    const { error } = await supabase
        .from("user_device_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("fcm_token", fcmToken);

    if (error) {
        console.error("[FCM] Failed to remove device token:", error.message);
        throw error;
    }

    return { success: true };
}

/**
 * Send High-Priority FCM Push Notification to all devices of a user.
 * This guarantees display by Google Play Services even if the app is completely closed.
 */
export async function sendFcmNotificationToUser(
    userId: string,
    payload: {
        title: string;
        body: string;
        data?: Record<string, string>;
    }
) {
    try {
        // 1. Fetch all active device tokens for the user
        const { data: records, error } = await supabase
            .from("user_device_tokens")
            .select("fcm_token")
            .eq("user_id", userId);

        if (error || !records || records.length === 0) {
            return;
        }

        const tokens: string[] = records.map((r) => r.fcm_token).filter(Boolean);
        if (tokens.length === 0) return;

        if (!initFirebase() || !firebaseApp) {
            console.log(`[FCM Mock] Would send push to user ${userId} (${tokens.length} devices):`, payload.title, payload.body);
            return;
        }

        // 2. Prepare multicast message with High Priority and Notification payload
        const multicastMessage: MulticastMessage = {
            tokens,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data || {},
            android: {
                priority: "high",
                notification: {
                    channelId: "peto_high_importance_channel",
                    sound: "default",
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    priority: "high",
                    clickAction: "FLUTTER_NOTIFICATION_CLICK",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                        contentAvailable: true,
                    },
                },
            },
        };

        const messaging = getMessaging(firebaseApp);
        const response = await messaging.sendEachForMulticast(multicastMessage);
        console.log(`[FCM] Push sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);

        // 3. Clean up invalid/expired tokens
        if (response.failureCount > 0) {
            const badTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    const code = resp.error.code;
                    if (
                        code === "messaging/registration-token-not-registered" ||
                        code === "messaging/invalid-registration-token"
                    ) {
                        badTokens.push(tokens[idx]);
                    }
                }
            });

            if (badTokens.length > 0) {
                console.log(`[FCM] Removing ${badTokens.length} expired device tokens.`);
                await supabase
                    .from("user_device_tokens")
                    .delete()
                    .in("fcm_token", badTokens);
            }
        }
    } catch (err) {
        console.error("[FCM] Error sending push notification:", err);
    }
}
