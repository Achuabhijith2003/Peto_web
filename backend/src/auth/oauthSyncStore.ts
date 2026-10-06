import crypto from "crypto";
import { supabase } from "../config/supabase.js";

export interface PendingGoogleSession {
  token: string;
  refreshToken: string;
  user: any;
  profile: any;
  expiresAt: number;
}

interface StoredHashedSession {
  payload: PendingGoogleSession;
  expiresAt: number;
}

// In-memory fallback map keyed by SHA-256 hash (never stores raw plaintext tokens)
export const inMemoryHashedSyncCodes = new Map<string, StoredHashedSession>();

/**
 * Computes SHA-256 hash of raw exchange token.
 * Plaintext tokens are never stored in the database or memory.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Saves an OAuth sync session.
 * Stores exclusively SHA-256(token) with 60-second TTL.
 */
export async function saveSyncSession(
  rawToken: string,
  session: {
    token: string;
    refreshToken: string;
    user: any;
    profile: any;
  },
  ttlMs: number = 60 * 1000
): Promise<string> {
  const codeHash = hashToken(rawToken);
  const expiresAt = Date.now() + ttlMs;

  const sessionData: PendingGoogleSession = {
    ...session,
    expiresAt,
  };

  // 1. Store in memory fallback (keyed by SHA-256 hash)
  inMemoryHashedSyncCodes.set(codeHash, {
    payload: sessionData,
    expiresAt,
  });

  // 2. Persist to shared database table if available (PETO-SEC-12)
  try {
    const expiresAtIso = new Date(expiresAt).toISOString();
    await supabase
      .from("oauth_exchange_codes")
      .upsert({
        code_hash: codeHash,
        payload: sessionData,
        expires_at: expiresAtIso,
      });
  } catch (err: any) {
    // Graceful fallback to memory store
    console.warn("[OAuthSyncStore] Database notice, using in-memory hashed store:", err.message);
  }

  return rawToken;
}

/**
 * Atomically consumes an OAuth sync code using SHA-256 hash lookup.
 * Single-use: immediately deletes upon retrieval.
 * Returns null if missing, expired, or already consumed.
 */
export async function consumeSyncSession(rawToken: string): Promise<PendingGoogleSession | null> {
  if (!rawToken || typeof rawToken !== "string") {
    return null;
  }

  const codeHash = hashToken(rawToken);
  const now = Date.now();

  // 1. Attempt atomic consumption from shared database table (if available)
  try {
    // Try RPC first
    const { data: rpcPayload, error: rpcErr } = await supabase.rpc(
      "consume_oauth_exchange_code",
      { p_code_hash: codeHash }
    );

    if (!rpcErr && rpcPayload) {
      inMemoryHashedSyncCodes.delete(codeHash);
      return rpcPayload as PendingGoogleSession;
    }

    // Direct atomic DELETE query: only deletes if unexpired and exists
    const { data: deletedRows, error: delErr } = await supabase
      .from("oauth_exchange_codes")
      .delete()
      .eq("code_hash", codeHash)
      .gt("expires_at", new Date(now).toISOString())
      .select();

    if (!delErr && deletedRows && deletedRows.length > 0) {
      inMemoryHashedSyncCodes.delete(codeHash);
      return deletedRows[0].payload as PendingGoogleSession;
    }
  } catch {
    // Fall through to memory store
  }

  // 2. Atomic consumption from in-memory hashed store
  const memSession = inMemoryHashedSyncCodes.get(codeHash);
  if (!memSession) {
    return null;
  }

  // Single-use: delete immediately to prevent replay
  inMemoryHashedSyncCodes.delete(codeHash);

  if (memSession.expiresAt < now) {
    return null;
  }

  return memSession.payload;
}

// Periodic background cleanup of expired codes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [hash, item] of inMemoryHashedSyncCodes.entries()) {
    if (item.expiresAt < now) {
      inMemoryHashedSyncCodes.delete(hash);
    }
  }
}, 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}
