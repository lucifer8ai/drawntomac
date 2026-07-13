import { t as supabase } from "./client-BSC3GyEp.js";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/index.tsx?tsr-split=component
var LEGENDARY_SONGS = [
	"Bohemian Rhapsody",
	"Billie Jean",
	"Like a Prayer",
	"Purple Rain",
	"Superstition",
	"Dreams",
	"Fast Car",
	"Smells Like Teen Spirit",
	"Juicy",
	"Alright",
	"Redbone",
	"HUMBLE.",
	"Good Days",
	"N95",
	"Bad Habit",
	"WAP",
	"Blinding Lights",
	"Sticky",
	"Not Like Us",
	"Espresso",
	"BIRDS OF A FEATHER",
	"Pink Pony Club",
	"HOT TO GO!",
	"A Bar Song",
	"Please Please Please",
	"Million Dollar Baby",
	"What Was I Made For?",
	"Flowers",
	"Anti-Hero",
	"As It Was",
	"Levitating",
	"Old Town Road",
	"thank u, next",
	"SICKO MODE",
	"God's Plan",
	"Bodak Yellow",
	"Formation",
	"Alright",
	"Runaway",
	"Nights",
	"Swimming Pools",
	"Alright",
	"Paper Planes",
	"Dancing On My Own",
	"We Found Love",
	"Royals",
	"Get Lucky",
	"Uptown Funk",
	"Rolling in the Deep",
	"Rehab",
	"Seven Nation Army",
	"Mr. Brightside",
	"Hey Ya!",
	"Lose Yourself",
	"Empire State of Mind",
	"Pursuit of Happiness",
	"XO Tour Llif3",
	"Lucid Dreams",
	"SICKO MODE",
	"rockstar",
	"This Is America",
	"Old Town Road",
	"Hotline Bling",
	"Thinking Out Loud",
	"Shake It Off",
	"Rolling in the Deep",
	"Need You Now",
	"Use Somebody",
	"Chasing Cars",
	"Yellow",
	"Wonderwall",
	"Creep",
	"Zombie",
	"Linger",
	"No Scrubs",
	"Waterfalls",
	"Killing Me Softly",
	"I Will Always Love You",
	"Run the World",
	"Single Ladies",
	"Cranes in the Sky",
	"Formation"
].join(" · ").repeat(3);
function ListenerWall() {
	return /* @__PURE__ */ jsxs("div", {
		className: "relative h-full w-full overflow-hidden select-none",
		style: { backgroundColor: "oklch(0.05 0.005 280)" },
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "pointer-events-none absolute inset-0 z-10",
				style: {
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
					backgroundRepeat: "repeat",
					backgroundSize: "128px 128px"
				}
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "absolute inset-0 opacity-[0.04]",
				children: [Array.from({ length: 20 }, (_, i) => /* @__PURE__ */ jsx("div", {
					className: "absolute left-0 right-0",
					style: {
						top: `${i / 19 * 100}%`,
						height: "1px",
						backgroundColor: "oklch(0.90 0.01 90)"
					}
				}, `h-${i}`)), [
					8,
					22,
					38,
					52,
					68,
					78,
					92
				].map((x, i) => /* @__PURE__ */ jsx("div", {
					className: "absolute top-0 bottom-0",
					style: {
						left: `${x}%`,
						width: "1px",
						backgroundColor: "oklch(0.90 0.01 90)"
					}
				}, `v-${i}`))]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "absolute top-0 left-0 right-0 h-[3px] opacity-60",
				style: { backgroundColor: "oklch(0.85 0 0)" }
			}),
			/* @__PURE__ */ jsx("div", {
				className: "absolute bottom-0 left-0 right-0 h-[3px] opacity-40",
				style: { backgroundColor: "oklch(0.85 0 0)" }
			}),
			/* @__PURE__ */ jsx("div", {
				className: "pointer-events-none absolute inset-0 overflow-hidden opacity-70",
				style: {
					fontSize: "clamp(10px, 1.6vw, 15px)",
					lineHeight: "2.2",
					letterSpacing: "0.05em",
					color: "oklch(0.90 0.01 90)",
					textAlign: "justify",
					wordBreak: "break-all",
					padding: "4% 3%",
					fontWeight: 900
				},
				children: LEGENDARY_SONGS
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "absolute left-[52%] top-[55%] -translate-x-1/2 -translate-y-1/2 z-20",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "h-3 w-3 rounded-full",
						style: {
							backgroundColor: "oklch(0.85 0 0)",
							boxShadow: "0 0 28px 6px oklch(0.85 0 0 / 0.5), 0 0 70px 14px oklch(0.85 0 0 / 0.18)"
						}
					}),
					/* @__PURE__ */ jsx("div", {
						className: "absolute -inset-4 animate-pulse rounded-full",
						style: {
							border: "1.5px solid oklch(0.85 0 0 / 0.3)",
							animationDuration: "3s"
						}
					}),
					/* @__PURE__ */ jsx("div", {
						className: "absolute -inset-8 animate-pulse rounded-full",
						style: {
							border: "1px solid oklch(0.85 0 0 / 0.12)",
							animationDuration: "4s"
						}
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "absolute bottom-[16%] left-[8%] z-20",
				children: [/* @__PURE__ */ jsx("div", {
					className: "text-[10px] uppercase tracking-[0.15em] opacity-40",
					style: { color: "oklch(0.90 0.01 90)" },
					children: "Songs Logged"
				}), /* @__PURE__ */ jsx("div", {
					className: "text-xl font-bold opacity-60",
					style: {
						fontWeight: 800,
						letterSpacing: "-0.02em",
						color: "oklch(0.85 0 0)"
					},
					children: "2.4M+"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "absolute right-[10%] top-[18%] text-right z-20",
				children: [/* @__PURE__ */ jsx("div", {
					className: "text-[10px] uppercase tracking-[0.15em] opacity-40",
					style: { color: "oklch(0.90 0.01 90)" },
					children: "Honest Reviews"
				}), /* @__PURE__ */ jsx("div", {
					className: "text-xl font-bold opacity-60",
					style: {
						fontWeight: 800,
						letterSpacing: "-0.02em",
						color: "oklch(0.85 0 0)"
					},
					children: "180K+"
				})]
			})
		]
	});
}
function AuthForm() {
	const [mode, setMode] = useState("signin");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const navigate = useNavigate();
	async function handleSubmit(e) {
		e.preventDefault();
		if (busy) return;
		setBusy(true);
		try {
			if (mode === "signin") {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password
				});
				if (error) toast.error(error.message);
				else navigate({ to: "/home" });
			} else {
				const { error } = await supabase.auth.signUp({
					email,
					password,
					options: { emailRedirectTo: window.location.origin + "/home" }
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
				options: { redirectTo: window.location.origin + "/auth/callback" }
			});
			if (error) toast.error(error.message ?? "Google sign-in failed");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col justify-center px-[clamp(2rem,10%,5rem)] py-12",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "mb-1 text-[clamp(2rem,4vw,2.75rem)] font-extrabold italic tracking-tight",
				style: { color: "oklch(0.85 0 0)" },
				children: "#drawnTo"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mb-3 font-light italic text-[clamp(1rem,1.5vw,1.25rem)] text-muted-foreground",
				children: "i don't just listen, i feel it"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mb-8 text-xs font-medium tracking-wide uppercase text-muted-foreground/60",
				children: "Log · Review · Connect"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mb-8 grid grid-cols-2 rounded-full bg-input/50 p-1",
				children: ["signin", "signup"].map((opt) => /* @__PURE__ */ jsx("button", {
					type: "button",
					type: "button",
					onClick: () => setMode(opt),
					className: `rounded-full py-2.5 text-sm font-semibold transition-all ${mode === opt ? "bg-foreground text-background" : "bg-transparent text-foreground/50"}`,
					children: opt === "signin" ? "Sign in" : "Sign up"
				}, opt))
			}),
			/* @__PURE__ */ jsxs("form", {
				className: "space-y-4",
				onSubmit: handleSubmit,
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx("label", {
							htmlFor: "email",
							className: "text-xs font-medium text-muted-foreground",
							children: "Email"
						}), /* @__PURE__ */ jsx("input", {
							id: "email",
							type: "email",
							autoComplete: "email",
							required: true,
							value: email,
							onChange: (e) => setEmail(e.target.value),
							placeholder: "you@drawnto.fm",
							className: "w-full rounded-xl border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx("label", {
							htmlFor: "password",
							className: "text-xs font-medium text-muted-foreground",
							children: "Password"
						}), /* @__PURE__ */ jsx("input", {
							id: "password",
							type: "password",
							required: true,
							minLength: 6,
							value: password,
							onChange: (e) => setPassword(e.target.value),
							autoComplete: mode === "signin" ? "current-password" : "new-password",
							placeholder: "••••••••",
							className: "w-full rounded-xl border bg-input/40 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						disabled: busy,
						className: "mt-2 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed",
						children: busy ? "Hang tight…" : mode === "signin" ? "Come in" : "Join the wall"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-3 py-1",
						children: [
							/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" }),
							/* @__PURE__ */ jsx("span", {
								className: "text-xs uppercase tracking-widest text-foreground/40",
								children: "or"
							}),
							/* @__PURE__ */ jsx("div", { className: "h-px flex-1 bg-border" })
						]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: handleGoogle,
						disabled: busy,
						className: "flex w-full items-center justify-center gap-3 rounded-xl border bg-input/25 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 disabled:opacity-60",
						children: [/* @__PURE__ */ jsx(GoogleIcon, {}), "Continue with Google"]
					})
				]
			})
		]
	});
}
function PhilosophyLine() {
	return /* @__PURE__ */ jsx("div", {
		className: "absolute bottom-8 left-0 right-0 z-10 text-center font-light italic text-[clamp(0.875rem,1.2vw,1.1rem)] text-muted-foreground",
		children: "Music hits different when you share it with the right people."
	});
}
function AuthPage() {
	const navigate = useNavigate();
	const [checking, setChecking] = useState(true);
	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) navigate({ to: "/home" });
			else setChecking(false);
		});
		const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
			if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) navigate({ to: "/home" });
		});
		return () => sub.subscription.unsubscribe();
	}, [navigate]);
	if (checking) return null;
	return /* @__PURE__ */ jsxs("main", {
		className: "relative flex min-h-screen w-full flex-col md:flex-row",
		style: { backgroundColor: "oklch(0.05 0.005 280)" },
		children: [/* @__PURE__ */ jsxs("div", {
			className: "relative h-[45vh] md:h-screen md:w-[55%] overflow-hidden",
			children: [/* @__PURE__ */ jsx(ListenerWall, {}), /* @__PURE__ */ jsx("div", {
				className: "absolute inset-x-0 bottom-0 h-16 md:hidden",
				style: { background: "linear-gradient(to bottom, transparent, oklch(0.04 0.002 280))" }
			})]
		}), /* @__PURE__ */ jsxs("div", {
			className: "relative flex min-h-[55vh] md:min-h-screen md:w-[45%] flex-col bg-background",
			children: [/* @__PURE__ */ jsx(AuthForm, {}), /* @__PURE__ */ jsx(PhilosophyLine, {})]
		})]
	});
}
function GoogleIcon() {
	return /* @__PURE__ */ jsx("svg", {
		width: "18",
		height: "18",
		viewBox: "0 0 24 24",
		"aria-hidden": true,
		children: /* @__PURE__ */ jsx("path", {
			fill: "#EA4335",
			d: "M12 10.2v3.9h5.5c-.24 1.4-1.68 4.1-5.5 4.1-3.3 0-6-2.73-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.48l2.63-2.53C16.86 3.38 14.65 2.4 12 2.4c-5.3 0-9.6 4.3-9.6 9.6s4.3 9.6 9.6 9.6c5.54 0 9.2-3.9 9.2-9.38 0-.63-.07-1.11-.16-1.62H12z"
		})
	});
}
//#endregion
export { AuthPage as component };
