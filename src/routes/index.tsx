import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import signBg from "../../picture/Untitled - 11 July 2026 at 08.54.03.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "#drawnTo — i don't just listen, i feel it" },
      {
        name: "description",
        content:
          "#drawnTo — a space for people who feel music deeply. Log, review, and find your people.",
      },
      { property: "og:title", content: "#drawnTo — i don't just listen, i feel it" },
      {
        property: "og:description",
        content: "A space for people who feel music deeply.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

// --- ListenerWall — preserved as loading state + fallback ---

const LEGENDARY_SONGS = [
  "Bohemian Rhapsody", "Billie Jean", "Like a Prayer", "Purple Rain",
  "Superstition", "Dreams", "Fast Car", "Smells Like Teen Spirit",
  "Juicy", "Alright", "Redbone", "HUMBLE.", "Good Days",
  "N95", "Bad Habit", "WAP", "Blinding Lights", "Sticky",
  "Not Like Us", "Espresso", "BIRDS OF A FEATHER", "Pink Pony Club",
  "HOT TO GO!", "A Bar Song", "Please Please Please", "Million Dollar Baby",
  "What Was I Made For?", "Flowers", "Anti-Hero", "As It Was",
  "Levitating", "Old Town Road", "thank u, next", "SICKO MODE",
  "God's Plan", "Bodak Yellow", "Formation", "Alright",
  "Runaway", "Nights", "Swimming Pools", "Alright",
  "Paper Planes", "Dancing On My Own", "We Found Love", "Royals",
  "Get Lucky", "Uptown Funk", "Rolling in the Deep", "Rehab",
  "Seven Nation Army", "Mr. Brightside", "Hey Ya!", "Lose Yourself",
  "Empire State of Mind", "Pursuit of Happiness", "XO Tour Llif3", "Lucid Dreams",
  "SICKO MODE", "rockstar", "This Is America", "Old Town Road",
  "Hotline Bling", "Thinking Out Loud", "Shake It Off", "Rolling in the Deep",
  "Need You Now", "Use Somebody", "Chasing Cars", "Yellow",
  "Wonderwall", "Creep", "Zombie", "Linger",
  "No Scrubs", "Waterfalls", "Killing Me Softly", "I Will Always Love You",
  "Run the World", "Single Ladies", "Cranes in the Sky", "Formation",
].join(" · ").repeat(3);

function ListenerWall() {
  return (
    <div className="relative h-full w-full overflow-hidden select-none" style={{ backgroundColor: "oklch(0.05 0.005 280)" }}>
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
      <div className="absolute inset-0 opacity-[0.04]">
        {Array.from({ length: 20 }, (_, i) => (
          <div key={`h-${i}`} className="absolute left-0 right-0" style={{ top: `${(i / 19) * 100}%`, height: "1px", backgroundColor: "oklch(0.90 0.01 90)" }} />
        ))}
        {[8, 22, 38, 52, 68, 78, 92].map((x, i) => (
          <div key={`v-${i}`} className="absolute top-0 bottom-0" style={{ left: `${x}%`, width: "1px", backgroundColor: "oklch(0.90 0.01 90)" }} />
        ))}
      </div>
      <div className="absolute top-0 left-0 right-0 h-[3px] opacity-60" style={{ backgroundColor: "oklch(0.85 0 0)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-[3px] opacity-40" style={{ backgroundColor: "oklch(0.85 0 0)" }} />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-70"
        style={{
          fontSize: "clamp(10px, 1.6vw, 15px)",
          lineHeight: "2.2",
          letterSpacing: "0.05em",
          color: "oklch(0.90 0.01 90)",
          textAlign: "justify",
          wordBreak: "break-all",
          padding: "4% 3%",
          fontWeight: 900,
        }}
      >
        {LEGENDARY_SONGS}
      </div>
      <div className="absolute left-[52%] top-[55%] -translate-x-1/2 -translate-y-1/2 z-20">
        <div
          className="h-3 w-3 rounded-full"
          style={{
            backgroundColor: "oklch(0.85 0 0)",
            boxShadow: "0 0 28px 6px oklch(0.85 0 0 / 0.5), 0 0 70px 14px oklch(0.85 0 0 / 0.18)",
          }}
        />
        <div
          className="absolute -inset-4 animate-pulse rounded-full"
          style={{
            border: "1.5px solid oklch(0.85 0 0 / 0.3)",
            animationDuration: "3s",
          }}
        />
        <div
          className="absolute -inset-8 animate-pulse rounded-full"
          style={{
            border: "1px solid oklch(0.85 0 0 / 0.12)",
            animationDuration: "4s",
          }}
        />
      </div>
      <div className="absolute bottom-[16%] left-[8%] z-20">
        <div className="text-[10px] uppercase tracking-[0.15em] opacity-40" style={{ color: "oklch(0.90 0.01 90)" }}>
          Songs Logged
        </div>
        <div className="text-xl font-bold opacity-60" style={{ fontWeight: 800, letterSpacing: "-0.02em", color: "oklch(0.85 0 0)" }}>
          2.4M+
        </div>
      </div>
      <div className="absolute right-[10%] top-[18%] text-right z-20">
        <div className="text-[10px] uppercase tracking-[0.15em] opacity-40" style={{ color: "oklch(0.90 0.01 90)" }}>
          Honest Reviews
        </div>
        <div className="text-xl font-bold opacity-60" style={{ fontWeight: 800, letterSpacing: "-0.02em", color: "oklch(0.85 0 0)" }}>
          180K+
        </div>
      </div>
    </div>
  );
}

// --- Auth Form ---

function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

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
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) toast.error(error.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-8 grid grid-cols-2 rounded-full bg-input/50 p-1">
        {(["signin", "signup"] as const).map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => setMode(opt)}
            className={`rounded-full py-2.5 text-sm font-semibold transition-all ${
              mode === opt ? "bg-foreground text-background" : "bg-transparent text-foreground/60"
            }`}
          >
            {opt === "signin" ? "Sign in" : "Sign up"}
          </button>
        ))}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
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
            className="w-full rounded-xl border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
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
            className="w-full rounded-xl border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? "Hang tight…" : mode === "signin" ? "Come in" : "Join the wall"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-widest text-foreground/40">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border bg-input/25 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </form>
    </>
  );
}

// --- Main Auth Page ---

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading");
  const imageRef = useRef<HTMLImageElement>(null);

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

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImageState("loaded");
    img.onerror = () => setImageState("error");
    img.src = signBg;
  }, []);

  if (checking) return null;

  const showListenerWall = imageState !== "loaded";

  return (
    <main className="relative h-dvh w-full overflow-hidden" style={{ backgroundColor: "oklch(0.04 0.002 280)" }}>
      {/* ListenerWall — loading state & fallback */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          showListenerWall ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          animationDuration:
            typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "0.01ms"
              : undefined,
        }}
      >
        <ListenerWall />
      </div>

      {/* Background image */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          imageState === "loaded" ? "opacity-100" : "opacity-0"
        }`}
        style={{
          animationDuration:
            typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "0.01ms"
              : undefined,
        }}
      >
        <img
          ref={imageRef}
          src={signBg}
          alt=""
          className="h-full w-full object-cover object-[center_30%]"
        />
      </div>

      {/* Gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            transparent 0%,
            oklch(0.04 0.002 280 / 0.15) 35%,
            oklch(0.04 0.002 280 / 0.45) 55%,
            oklch(0.04 0.002 280 / 0.75) 70%,
            oklch(0.04 0.002 280 / 0.92) 85%,
            oklch(0.04 0.002 280) 100%
          )`,
        }}
      />

      {/* Radial vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, oklch(0 0 0 / 0.25) 100%)",
        }}
      />

      {/* Auth card */}
      <div
        className="absolute z-20 right-[clamp(1.5rem,6vw,6rem)] top-1/2 -translate-y-1/2
                   w-[min(420px,88vw)] rounded-2xl border bg-background
                   p-[clamp(1.5rem,4vw,2.5rem)]
                   max-md:right-0 max-md:left-0 max-md:top-auto max-md:bottom-0
                   max-md:translate-y-0 max-md:w-full
                   max-md:rounded-b-none max-md:rounded-t-[20px]
                   max-md:border-transparent max-md:border-t max-md:pb-10
                   shadow-2xl shadow-black/20"
      >
        <AuthForm />
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
