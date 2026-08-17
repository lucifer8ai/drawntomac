// Server-only Supabase client built on the anon/publishable key.
// Used exclusively for the email/password grant, which GoTrue requires to be
// issued with the anon key. Never use this client for admin operations, and
// never use supabaseAdmin for signInWithPassword.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) =>
        headers.set(key, value),
      );
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseAnonServerClient() {
  const SUPABASE_URL =
    process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set the required Supabase environment variables.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAnonServer:
  ReturnType<typeof createSupabaseAnonServerClient> | undefined;

// Load inside server handlers: const { supabaseAnonServer } = await import("@/integrations/supabase/anon.server");
export const supabaseAnonServer = new Proxy(
  {} as ReturnType<typeof createSupabaseAnonServerClient>,
  {
    get(_, prop, receiver) {
      if (!_supabaseAnonServer)
        _supabaseAnonServer = createSupabaseAnonServerClient();
      return Reflect.get(_supabaseAnonServer, prop, receiver);
    },
  },
);
