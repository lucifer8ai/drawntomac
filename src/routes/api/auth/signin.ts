import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  extractClientIp,
  isUserAdmin,
  normalizeIdentifier,
  passwordSignIn,
  resolveUserEmail,
  validateSigninInput,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limiter";

const bodySchema = z.object({
  identifier: z.string().min(1).max(320),
  password: z.string().min(1).max(72),
  adminOnly: z.boolean().optional(),
});

export const Route = createFileRoute("/api/auth/signin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid email/username or password" },
            { status: 400 },
          );
        }

        const { identifier, password, adminOnly } = parsed.data;
        const validationError = validateSigninInput(identifier, password);
        if (validationError) {
          return Response.json(
            { error: "Invalid email/username or password" },
            { status: 400 },
          );
        }

        const identifierKey = normalizeIdentifier(identifier).value;
        const ip = extractClientIp(request);

        if (!(await checkRateLimit(`auth:signin:ip:${ip}`, 10, 60))) {
          return Response.json(
            { error: "Too many attempts. Try again later." },
            { status: 429 },
          );
        }
        if (
          !(await checkRateLimit(`auth:signin:ident:${identifierKey}`, 5, 60))
        ) {
          return Response.json(
            { error: "Too many attempts. Try again later." },
            { status: 429 },
          );
        }

        const { supabaseAdmin } =
          await import("@/integrations/supabase/client.server");
        const { supabaseAnonServer } =
          await import("@/integrations/supabase/anon.server");

        let email: string;
        const normalized = normalizeIdentifier(identifier);
        if (normalized.kind === "email") {
          email = normalized.value;
        } else {
          const resolved = await resolveUserEmail(
            supabaseAdmin,
            normalized.value,
          );
          if ("error" in resolved) {
            return Response.json({ error: resolved.error }, { status: 400 });
          }
          email = resolved.email;
        }

        const result = await passwordSignIn(
          supabaseAnonServer,
          email,
          password,
        );
        if ("error" in result) {
          return Response.json({ error: result.error }, { status: 400 });
        }

        if (adminOnly) {
          const { supabaseAdmin } =
            await import("@/integrations/supabase/client.server");
          const isAdmin = await isUserAdmin(supabaseAdmin, result.user.id);
          if (!isAdmin) {
            return Response.json(
              { error: "This account isn't an admin." },
              { status: 403 },
            );
          }
        }

        return Response.json({ session: result.session, user: result.user });
      },
    },
  },
});
