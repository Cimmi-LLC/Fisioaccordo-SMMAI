// Shared utility to log generation events to public.generation_history.
// Used by all generative edge functions. Non-blocking: errors are logged
// but never bubbled up — the history is observability, not critical path.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type GenerationType =
  | "post"
  | "carousel"
  | "story"
  | "reel"
  | "competitor"
  | "viral_analysis"
  | "image_swap"
  | "expand_topic";

export interface LogEntry {
  userId: string;
  brandId?: string | null;
  type: GenerationType;
  topic?: string | null;
  title?: string | null;
  preview?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: "success" | "failed" | "partial";
  errorMessage?: string | null;
}

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (_admin) return _admin;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  _admin = createClient(url, key);
  return _admin;
}

export async function logGeneration(entry: LogEntry): Promise<void> {
  const client = admin();
  if (!client) return;
  try {
    await client.from("generation_history").insert({
      user_id: entry.userId,
      brand_id: entry.brandId ?? null,
      generation_type: entry.type,
      topic: entry.topic ?? null,
      title: entry.title ?? null,
      preview: entry.preview ?? {},
      metadata: entry.metadata ?? {},
      status: entry.status ?? "success",
      error_message: entry.errorMessage ?? null,
    });
  } catch (err) {
    console.warn("[historyLogger] insert failed:", err);
  }
}

/**
 * Resolve the user from an authorization header. Returns null if missing/invalid.
 * Used by edge functions that already have JWT-based user context.
 */
export async function resolveUserFromAuth(authHeader: string | null): Promise<{
  userId: string | null;
}> {
  if (!authHeader?.startsWith("Bearer ")) return { userId: null };
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return { userId: null };

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    return { userId: user?.id ?? null };
  } catch {
    return { userId: null };
  }
}
