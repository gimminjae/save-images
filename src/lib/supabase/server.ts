import { createClient } from "@supabase/supabase-js";

import { env, isSupabaseConfigured } from "@/lib/env";

// Supabase 타입 생성 전까지는 느슨한 제네릭으로 클라이언트를 유지한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseSupabaseClient = ReturnType<typeof createClient<any>>;

let adminClient: LooseSupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  if (!adminClient) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminClient = createClient<any>(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
