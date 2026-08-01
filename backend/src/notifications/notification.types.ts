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