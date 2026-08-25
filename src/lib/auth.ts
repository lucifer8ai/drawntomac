import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export type Identifier =
  { kind: "email"; value: string } | { kind: "username"; value: string };

export function normalizeIdentifier(raw: string): Identifier {
  const value = raw.trim().toLowerCase();
  return value.includes("@")
    ? { kind: "email", value }
    : { kind: "username", value };
}

export function validateSignupInput(
  email: string,
  password: string,
): string | null {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Enter a valid email address.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "Password must be 72 bytes or fewer.";
  }
  return null;
}

export function validateSigninInput(
  identifier: string,
  password: string,
): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return "Enter your email or username.";
  }
  if (password.length < 1) {
    return "Enter your password.";
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "Invalid credentials.";
  }
  return null;
}

export function validateResetPassword(
  password: string,
  confirm: string,
): string | null {
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (new TextEncoder().encode(password).length > 72) {
    return "Password must be 72 bytes or fewer.";
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

export function extractClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function resolveUserEmail(
  admin: SupabaseClient<Database>,
  username: string,
): Promise<{ email: string } | { error: string }> {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Invalid email/username or password" };
  }

  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error || !data.user?.email) {
    return { error: "Invalid email/username or password" };
  }

  return { email: data.user.email };
}

export async function isUserAdmin(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return profile?.is_admin === true;
}

export async function passwordSignIn(
  anonClient: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<
  | {
      session: { access_token: string; refresh_token: string };
      user: { id: string; email?: string; role?: string };
    }
  | { error: string }
> {
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session?.access_token || !data.session?.refresh_token) {
    return { error: "Invalid email/username or password" };
  }

  if (data.session.user?.role !== "authenticated") {
    return { error: "Invalid credentials" };
  }

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    user: {
      id: data.session.user.id,
      email: data.session.user.email,
      role: data.session.user.role,
    },
  };
}
