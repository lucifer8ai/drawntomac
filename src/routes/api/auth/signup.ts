import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  extractClientIp,
  passwordSignIn,
  validateSignupInput,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limiter";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

export const Route = createFileRoute("/api/auth/signup")({
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
            { error: "Enter a valid email and password." },
            { status: 400 },
          );
        }

        const { email, password } = parsed.data;
        const validationError = validateSignupInput(email, password);
        if (validationError) {
          return Response.json({ error: validationError }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const ip = extractClientIp(request);

        if (!(await checkRateLimit(`auth:signup:ip:${ip}`, 10, 60))) {
          return Response.json(
            { error: "Too many attempts. Try again later." },
            { status: 429 },
          );
        }
        if (
          !(await checkRateLimit(`auth:signup:email:${normalizedEmail}`, 5, 60))
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

        const { error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
          });

        if (createError) {
          if (
            createError.message.toLowerCase().includes("already") ||
            createError.message.toLowerCase().includes("registered")
          ) {
            return Response.json(
              { error: "An account with this email already exists." },
              { status: 409 },
            );
          }
          return Response.json(
            { error: "Could not create account." },
            { status: 500 },
          );
        }

        const result = await passwordSignIn(
          supabaseAnonServer,
          normalizedEmail,
          password,
        );
        if ("error" in result) {
          return Response.json(
            { error: "Account created. Please sign in." },
            { status: 400 },
          );
        }

        return Response.json({ session: result.session, user: result.user });
      },
    },
  },
});
