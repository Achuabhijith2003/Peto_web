export type NotificationType =
    | "like"
    | "comment"
    | "reply"
    | "follow"
    | "mention"
    | "post"
    | "system";

export interface CreateNotificationInput {
    recipientId: string;
    actorId?: string;
    postId?: string;
    commentId?: string;
    type: NotificationType;
    message: string;
}

export interface NotificationSettings {
    id?: string;
    user_id: string;
    likes_enabled: boolean;
    comments_enabled: boolean;
    follows_enabled: boolean;
    mentions_enabled: boolean;
    push_enabled: boolean;
    sound_enabled: boolean;
}

export interface UpdateNotificationSettingsInput {
    likes_enabled?: boolean;
    comments_enabled?: boolean;
    follows_enabled?: boolean;
    mentions_enabled?: boolean;
    push_enabled?: boolean;
    sound_enabled?: boolean;
}

export interface PushSubscriptionInput {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    user_agent?: string;
}