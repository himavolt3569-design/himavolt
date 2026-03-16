import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const FOOD_IMAGES_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "food-images";

// S3-compatible endpoint for external tools (AWS CLI, boto3, etc.)
export const SUPABASE_S3_ENDPOINT = process.env.SUPABASE_S3_ENDPOINT || "";

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Keep backward-compatible named export — lazily resolved on first property access
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[
      prop
    ];
  },
});
