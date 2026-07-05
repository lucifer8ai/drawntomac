import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getArtistImages } from "@/lib/spotify.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const artistImagesQuery = queryOptions({
  queryKey: ["spotify-collage-images"],
  queryFn: () => getArtistImages(),
  staleTime: 1000 * 60 * 60,
  // Refetch when the previously cached response has no images (e.g. earlier
  // token failure). Once we have images, no re-fetching needed.
  refetchOnMount: (query) => {
    const data = query.state.data as { images?: string[] } | undefined;
    return !data?.images || data.images.length === 0;
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "#drawnto — true music chooses you" },
      {
        name: "description",
        content:
          "Sign in to #drawnto — choose your music and your community. A platform for artists and listeners.",
      },
      { property: "og:title", content: "#drawnto — true music chooses you" },
      {
        property: "og:description",
        content: "Choose your music and your community.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistImagesQuery),
  component: AuthPage,
});

// Deterministic pseudo-random for stable layout per-index
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

type Tile = {
  src: string;
  top: number;
  left: number;
  size: number;
  rotate: number;
  z: number;
};

function buildTiles(images: string[], replacements: string[] = []): Tile[] {
  // Merge primary + replacements, dedupe, so every tile is a unique image.
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const src of [...images, ...replacements]) {
    if (!src || seen.has(src)) continue;
    seen.add(src);
    unique.push(src);
  }
  if (unique.length === 0) return [];

  // Scatter organically across a 4-col x ceil(N/4)-row loose grid.
  const cols = 4;
  const rows = Math.max(3, Math.ceil(unique.length / cols));
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  const tiles: Tile[] = [];
  for (let i = 0; i < unique.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const seed = i + 1;
    const jitterX = (rand(seed) - 0.5) * cellW * 0.7;
    const jitterY = (rand(seed + 11) - 0.5) * cellH * 0.7;
    const sizeVar = 15 + rand(seed + 23) * 12;
    const rot = (rand(seed + 37) - 0.5) * 18;
    tiles.push({
      src: unique[i],
      left: c * cellW + cellW / 2 + jitterX,
      top: r * cellH + cellH / 2 + jitterY,
      size: sizeVar,
      rotate: rot,
      z: Math.floor(rand(seed + 51) * 10),
    });
  }
  return tiles;
}


function AuthPage() {
  const { data } = useSuspenseQuery(artistImagesQuery);
  const tiles = useMemo(() => buildTiles(data.images, data.replacements ?? []), [data.images, data.replacements]);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/home" });
      } else {
        setChecking(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/home" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error(error.message);
        else navigate({ to: "/home" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/home" },
        });
        if (error) toast.error(error.message);
        else toast.success("Check your email to confirm your account.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
  if (busy) return;
  setBusy(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/home" },
    });
    if (error) toast.error(error.message ?? "Google sign-in failed");
  } finally {
    setBusy(false);
  }
}


if (checking) return null;  
return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: "#0D0A06" }}>
      {/* Collage layer */}
      <div className="pointer-events-none absolute inset-0">
        {tiles.map((t, idx) => (
          <img
            key={idx}
            src={t.src}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute rounded-2xl object-cover shadow-2xl"
            style={{
              top: `${t.top}%`,
              left: `${t.left}%`,
              width: `clamp(120px, ${t.size}vw, 320px)`,
              height: `clamp(120px, ${t.size}vw, 320px)`,
              transform: `translate(-50%, -50%) rotate(${t.rotate}deg)`,
              zIndex: t.z,
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ))}
      </div>

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <h1
          className="mb-8 max-w-3xl text-center font-black tracking-tight"
          style={{
            fontSize: "clamp(2rem, 5.5vw, 4.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "#E8624A",
            textShadow: "0 2px 16px rgba(0,0,0,0.95)",
          }}
        >
          Choose your music
          <br />
          and your community
        </h1>

        <div
          className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
          style={{
            backgroundColor: "rgba(26, 21, 16, 0.85)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Tabs */}
          <div
            className="mb-6 grid grid-cols-2 rounded-full p-1"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="rounded-full py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: mode === "signin" ? "#0D0A06" : "transparent",
                color: mode === "signin" ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="rounded-full py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: mode === "signup" ? "#0D0A06" : "transparent",
                color: mode === "signup" ? "#fff" : "rgba(255,255,255,0.6)",
              }}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-white/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@drawnto.fm"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:ring-2"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-white/70">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition focus:ring-2"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: "#E8624A" }}
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
            </button>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              <span className="text-xs uppercase tracking-widest text-white/40">or</span>
              <div className="h-px flex-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-60"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}



function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.68 4.1-5.5 4.1-3.3 0-6-2.73-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.48l2.63-2.53C16.86 3.38 14.65 2.4 12 2.4c-5.3 0-9.6 4.3-9.6 9.6s4.3 9.6 9.6 9.6c5.54 0 9.2-3.9 9.2-9.38 0-.63-.07-1.11-.16-1.62H12z"
      />
    </svg>
  );
}
