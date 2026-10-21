import { supabase } from "../config/supabase";

export const isMediaRequestId = (value: unknown): value is string =>
    typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function findOwnedMedia(id: string, userId: string) {
    const { data, error } = await supabase.from("media").select("*")
        .eq("id", id).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data;
}

/** The primary key arbitrates retries, even if an earlier HTTP response was lost. */
export async function saveMediaRecord(values: Record<string, unknown>, requestId?: string) {
    const { data, error } = await supabase.from("media")
        .insert({ ...values, ...(requestId ? { id: requestId } : {}) }).select().single();
    if (!error) return { data, created: true };
    if (error.code === "23505" && requestId) {
        const existing = await findOwnedMedia(requestId, values.user_id as string);
        if (existing) return { data: existing, created: false };
    }
    throw error;
}
