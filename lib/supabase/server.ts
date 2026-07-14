import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/env";

// Supabase 타입 생성 전까지는 느슨한 제네릭으로 유지한다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseSupabaseClient = ReturnType<typeof createClient<any>>;

let supabasePublic: LooseSupabaseClient | null = null;

export function getSupabasePublic() {
  if (supabasePublic) {
    return supabasePublic;
  }

  const env = getSupabasePublicEnv();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabasePublic = createClient<any>(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return supabasePublic;
}
