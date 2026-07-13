import { t as supabase } from "./client-BSC3GyEp.js";
import { r as useTabContext } from "./route-DKTgVvq3.js";
import { n as cn, t as Button } from "./button-KZXYNBVn.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { CheckCircle, Circle, Flame, Headphones, Heart, Pencil, Star, ThumbsDown, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
//#region src/components/feed/EntryCard.tsx
function relativeTime(dateStr) {
	const then = new Date(dateStr).getTime();
	const seconds = Math.floor((Date.now() - then) / 1e3);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	const weeks = Math.floor(days / 7);
	if (weeks < 52) return `${weeks}w ago`;
	return `${Math.floor(weeks / 52)}y ago`;
}
function getActionLabel(type) {
	switch (type) {
		case "heard": return "listened to";
		case "like": return "liked";
		case "review": return "reviewed";
		case "want": return "wants to hear";
		default: return "";
	}
}
function EntryCard({ data }) {
	const name = data.displayName ?? data.username;
	const initial = (name[0] ?? "?").toUpperCase();
	return /* @__PURE__ */ jsx(Link, {
		to: "/song/$slug",
		params: { slug: data.songSlug },
		className: "block transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg",
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex gap-3 border-b px-4 py-3",
			style: { borderColor: "var(--color-border)" },
			children: [
				/* @__PURE__ */ jsx(Link, {
					to: "/user/$username",
					params: { username: data.username },
					className: "flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-primary-foreground hover:opacity-80 transition-opacity",
					style: { backgroundColor: data.avatarUrl ? "transparent" : "var(--color-primary)" },
					onClick: (e) => e.stopPropagation(),
					children: data.avatarUrl ? /* @__PURE__ */ jsx("img", {
						src: data.avatarUrl,
						alt: `${name} avatar`,
						className: "h-full w-full object-cover",
						loading: "lazy"
					}) : initial
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "text-base leading-snug",
							children: [
								/* @__PURE__ */ jsx(Link, {
									to: "/user/$username",
									params: { username: data.username },
									className: "font-semibold text-foreground hover:underline",
									onClick: (e) => e.stopPropagation(),
									children: name
								}),
								" ",
								/* @__PURE__ */ jsx("span", {
									className: "text-muted-foreground",
									children: getActionLabel(data.entryType)
								})
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "mt-0.5 text-base font-semibold font-serif text-foreground truncate",
							title: data.songTitle,
							children: data.songTitle
						}),
						data.artistName && /* @__PURE__ */ jsx("div", {
							className: "text-xs text-muted-foreground truncate",
							title: data.artistName,
							children: data.artistName
						}),
						data.reviewBody && /* @__PURE__ */ jsx("div", {
							className: "mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground",
							children: data.reviewBody
						}),
						/* @__PURE__ */ jsx("div", {
							className: "mt-1 text-xs text-muted-foreground",
							children: relativeTime(data.createdAt)
						})
					]
				}),
				data.albumArtUrl && /* @__PURE__ */ jsx("img", {
					src: data.albumArtUrl,
					alt: `${data.songTitle} album art`,
					className: "h-14 w-14 flex-shrink-0 rounded-lg object-cover",
					loading: "lazy",
					decoding: "async"
				})
			]
		})
	});
}
//#endregion
//#region src/components/feed/FeedPage.tsx
function FeedPage() {
	const [entries, setEntries] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	async function load() {
		setLoading(true);
		setError(null);
		const { data: userData } = await supabase.auth.getUser();
		const userId = userData.user?.id;
		if (!userId) {
			setLoading(false);
			return;
		}
		const { data: follows, error: followsError } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
		if (followsError) {
			setError(followsError.message);
			setLoading(false);
			return;
		}
		const followingIds = (follows ?? []).map((f) => f.following_id);
		if (followingIds.length === 0) {
			setEntries([]);
			setLoading(false);
			return;
		}
		const { data, error: entriesError } = await supabase.from("diary_entries").select(`
        id, type, body, created_at, user_id,
        song:songs ( id, title, slug, genius_thumbnail_url, artist:artists ( name ) )
      `).in("user_id", followingIds).in("type", [
			"heard",
			"like",
			"review"
		]).order("created_at", { ascending: false }).limit(50);
		if (entriesError) {
			setError(entriesError.message);
			setLoading(false);
			return;
		}
		const userIds = [...new Set((data ?? []).map((e) => e.user_id).filter(Boolean))];
		const profileMap = /* @__PURE__ */ new Map();
		if (userIds.length > 0) {
			const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
			(profiles ?? []).forEach((p) => profileMap.set(p.id, p));
		}
		const mapped = (data ?? []).map((e) => {
			const p = profileMap.get(e.user_id);
			return {
				entryId: e.id,
				entryType: e.type,
				songTitle: e.song?.title ?? "Unknown",
				songSlug: e.song?.slug ?? "",
				artistName: e.song?.artist?.name ?? null,
				albumArtUrl: e.song?.genius_thumbnail_url ?? null,
				username: p?.username ?? "unknown",
				displayName: p?.display_name ?? null,
				avatarUrl: p?.avatar_url ?? null,
				reviewBody: e.body ?? null,
				createdAt: e.created_at
			};
		});
		setEntries(mapped);
		setLoading(false);
	}
	useEffect(() => {
		load();
	}, []);
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "mx-auto max-w-2xl px-4 py-16",
		children: [
			1,
			2,
			3
		].map((i) => /* @__PURE__ */ jsx("div", { className: "mb-3 h-20 rounded-xl animate-skeleton" }, i))
	});
	if (error) return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-md px-4 py-16 text-center",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground",
			children: "Something went wrong loading your feed."
		}), /* @__PURE__ */ jsx(Button, {
			variant: "secondary",
			size: "sm",
			shape: "pill",
			className: "mt-3",
			onClick: load,
			children: "Try again"
		})]
	});
	if (entries.length === 0) return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-md px-4 py-16 text-center",
		children: [/* @__PURE__ */ jsx("h2", {
			className: "font-serif text-xl font-bold italic text-primary",
			children: "Your Feed is quiet."
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-2 text-sm text-muted-foreground",
			children: "Follow friends and artists — their listens and reviews land here."
		})]
	});
	return /* @__PURE__ */ jsx("div", {
		className: "mx-auto max-w-2xl",
		children: entries.map((entry) => /* @__PURE__ */ jsx(EntryCard, { data: entry }, entry.entryId))
	});
}
//#endregion
//#region src/components/ui/badge.tsx
var badgeVariants = cva("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
	variants: {
		variant: {
			default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
			secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
			destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
			outline: "text-foreground",
			heard: "border-transparent bg-heard/15 text-heard",
			like: "border-transparent bg-like/15 text-like",
			dislike: "border-transparent bg-dislike/15 text-dislike",
			want: "border-transparent bg-want/15 text-want"
		},
		shape: {
			default: "rounded-md",
			pill: "rounded-full"
		}
	},
	defaultVariants: {
		variant: "default",
		shape: "default"
	}
});
function Badge({ className, variant, shape, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn(badgeVariants({
			variant,
			shape
		}), className),
		...props
	});
}
//#endregion
//#region src/components/feed/DiaryCard.tsx
function DiaryCard({ data }) {
	return /* @__PURE__ */ jsx(Link, {
		to: "/song/$slug",
		params: { slug: data.songSlug },
		className: "block transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg",
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-3 border-b px-4 py-3",
			children: [data.albumArtUrl ? /* @__PURE__ */ jsx("img", {
				src: data.albumArtUrl,
				alt: `${data.songTitle} album art`,
				className: "h-14 w-14 flex-shrink-0 rounded-lg object-cover",
				loading: "lazy",
				decoding: "async"
			}) : /* @__PURE__ */ jsx("div", {
				className: "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground",
				children: "—"
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "truncate text-base font-semibold font-serif text-foreground",
						title: data.songTitle,
						children: data.songTitle
					}),
					data.artistName && /* @__PURE__ */ jsx("div", {
						className: "truncate text-xs text-muted-foreground",
						title: data.artistName,
						children: data.artistName
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-1.5 flex flex-wrap gap-2",
						children: [
							data.heard && /* @__PURE__ */ jsxs(Badge, {
								variant: "heard",
								shape: "pill",
								children: [/* @__PURE__ */ jsx(Headphones, { size: 12 }), "heard"]
							}),
							data.liked && /* @__PURE__ */ jsxs(Badge, {
								variant: "like",
								shape: "pill",
								children: [/* @__PURE__ */ jsx(Heart, { size: 12 }), "liked"]
							}),
							data.disliked && /* @__PURE__ */ jsxs(Badge, {
								variant: "dislike",
								shape: "pill",
								children: [/* @__PURE__ */ jsx(ThumbsDown, { size: 12 }), "disliked"]
							}),
							data.reviewed && /* @__PURE__ */ jsxs(Badge, {
								variant: "like",
								shape: "pill",
								children: [/* @__PURE__ */ jsx(Pencil, { size: 12 }), "reviewed"]
							}),
							data.want && /* @__PURE__ */ jsxs(Badge, {
								variant: "want",
								shape: "pill",
								children: [/* @__PURE__ */ jsx(Circle, { size: 12 }), "want"]
							})
						]
					})
				]
			})]
		})
	});
}
//#endregion
//#region src/components/feed/DiaryPage.tsx
function DiaryPage() {
	const [activeSub, setActiveSub] = useState("activity");
	const [activityCards, setActivityCards] = useState([]);
	const [wantCards, setWantCards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	async function load() {
		setLoading(true);
		setError(null);
		const { data: userData } = await supabase.auth.getUser();
		const userId = userData.user?.id;
		if (!userId) {
			setLoading(false);
			return;
		}
		const { data, error: entriesError } = await supabase.from("diary_entries").select(`
        id, type, created_at, song_id,
        song:songs ( id, title, slug, genius_thumbnail_url, artist:artists ( name ) )
      `).eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
		if (entriesError) {
			setError(entriesError.message);
			setLoading(false);
			return;
		}
		const entries = data ?? [];
		const songMap = /* @__PURE__ */ new Map();
		for (const e of entries) {
			const existing = songMap.get(e.song_id);
			if (existing) switch (e.type) {
				case "heard":
					existing.heard = true;
					break;
				case "like":
					existing.liked = true;
					break;
				case "dislike":
					existing.disliked = true;
					break;
				case "review":
					existing.reviewed = true;
					break;
				case "want":
					existing.want = true;
					break;
			}
			else songMap.set(e.song_id, {
				songId: e.song_id,
				songTitle: e.song?.title ?? "Unknown",
				songSlug: e.song?.slug ?? "",
				artistName: e.song?.artist?.name ?? null,
				albumArtUrl: e.song?.genius_thumbnail_url ?? null,
				heard: e.type === "heard",
				liked: e.type === "like",
				disliked: e.type === "dislike",
				reviewed: e.type === "review",
				want: e.type === "want"
			});
		}
		const allCards = Array.from(songMap.values());
		setActivityCards(allCards.filter((c) => c.heard || c.liked || c.disliked || c.reviewed));
		setWantCards(allCards.filter((c) => c.want));
		setLoading(false);
	}
	useEffect(() => {
		load();
	}, []);
	return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
		className: "flex gap-2 bg-background px-3 py-2",
		children: [{
			id: "activity",
			label: "Activity"
		}, {
			id: "want",
			label: "Want to Hear"
		}].map((t) => {
			return /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: () => setActiveSub(t.id),
				className: `rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${t.id === activeSub ? "bg-primary text-primary-foreground" : "border bg-raised text-muted-foreground"}`,
				children: t.label
			}, t.id);
		})
	}), error ? /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-md px-4 py-16 text-center",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground",
			children: "Something went wrong loading your diary."
		}), /* @__PURE__ */ jsx(Button, {
			variant: "secondary",
			size: "sm",
			shape: "pill",
			className: "mt-3",
			onClick: load,
			children: "Try again"
		})]
	}) : loading ? /* @__PURE__ */ jsx("div", {
		className: "mx-auto max-w-2xl px-4 py-16",
		children: [
			1,
			2,
			3
		].map((i) => /* @__PURE__ */ jsx("div", { className: "mb-3 h-20 rounded-xl animate-skeleton" }, i))
	}) : activeSub === "activity" ? activityCards.length === 0 ? /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-md px-4 py-16 text-center",
		children: [/* @__PURE__ */ jsx("h2", {
			className: "font-serif text-xl font-bold italic text-primary",
			children: "No activity yet."
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-2 text-sm text-muted-foreground",
			children: "Log your first listen, like, or review a song."
		})]
	}) : /* @__PURE__ */ jsx("div", {
		className: "mx-auto max-w-2xl",
		children: activityCards.map((card) => /* @__PURE__ */ jsx(DiaryCard, { data: card }, card.songId))
	}) : wantCards.length === 0 ? /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-md px-4 py-16 text-center",
		children: [/* @__PURE__ */ jsx("h2", {
			className: "font-serif text-xl font-bold italic text-want",
			children: "No songs saved."
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-2 text-sm text-muted-foreground",
			children: "Mark songs you want to hear — they'll show up here."
		})]
	}) : /* @__PURE__ */ jsx("div", {
		className: "mx-auto max-w-2xl",
		children: wantCards.map((card) => /* @__PURE__ */ jsx(DiaryCard, { data: card }, card.songId))
	})] });
}
//#endregion
//#region src/hooks/useTrendingSongs.ts
function useTrendingSongs(windowDays = 30) {
	const [songs, setSongs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const fetch = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data: trending, error: rpcError } = await supabase.rpc("get_trending_songs", { window_days: windowDays });
			if (rpcError) throw rpcError;
			if (!trending || trending.length === 0) {
				setSongs([]);
				setLoading(false);
				return;
			}
			const songIds = trending.map((t) => t.song_id);
			const { data: songData, error: songsError } = await supabase.from("songs").select("id, title, slug, genius_thumbnail_url, genre_tags, artist:artists(name)").in("id", songIds);
			if (songsError) throw songsError;
			const songMap = new Map((songData ?? []).map((s) => [s.id, s]));
			const mapped = trending.map((t) => {
				const s = songMap.get(t.song_id);
				return {
					id: t.song_id,
					title: s?.title ?? "Unknown",
					slug: s?.slug ?? "",
					artistName: s?.artist?.name ?? null,
					albumArtUrl: s?.genius_thumbnail_url ?? null,
					genreTags: s?.genre_tags ?? null,
					likeCount: t.like_count,
					heardCount: t.heard_count,
					reviewCount: t.review_count,
					dislikeCount: t.dislike_count,
					trendingScore: t.trending_score
				};
			});
			setSongs(mapped);
		} catch (e) {
			setError(e?.message ?? "Failed to load trending songs");
		} finally {
			setLoading(false);
		}
	}, [windowDays]);
	useEffect(() => {
		fetch();
	}, [fetch]);
	return {
		songs,
		loading,
		error,
		retry: fetch,
		isEmpty: !loading && !error && songs.length === 0
	};
}
//#endregion
//#region src/hooks/useCompatibleUsers.ts
var CACHE_TTL = 300 * 1e3;
function useCompatibleUsers(userId, sortMode, page) {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [hasMore, setHasMore] = useState(true);
	const [diaryCount, setDiaryCount] = useState(0);
	const cacheRef = useRef(null);
	const latestRequestRef = useRef({
		userId,
		sortMode,
		page
	});
	const fetch = useCallback(async () => {
		const requestKey = {
			userId,
			sortMode,
			page
		};
		latestRequestRef.current = requestKey;
		if (!userId) {
			setUsers([]);
			setLoading(false);
			setHasMore(false);
			setDiaryCount(0);
			return;
		}
		if (page === 0) {
			const cached = cacheRef.current;
			if (cached && cached.userId === userId && cached.sortMode === sortMode && Date.now() - cached.fetchedAt < CACHE_TTL) {
				if (!(requestKey.userId !== latestRequestRef.current.userId || requestKey.sortMode !== latestRequestRef.current.sortMode || requestKey.page !== latestRequestRef.current.page)) {
					setUsers(cached.data);
					setHasMore(cached.data.length === 20);
					setLoading(false);
					return;
				}
			}
		}
		setLoading(true);
		setError(null);
		try {
			const { data, error: rpcError } = await supabase.rpc("get_compatible_users", {
				current_user_id: userId,
				sort_mode: sortMode,
				page_offset: page * 20
			});
			if (rpcError) throw rpcError;
			if (latestRequestRef.current.userId !== requestKey.userId || latestRequestRef.current.sortMode !== requestKey.sortMode || latestRequestRef.current.page !== requestKey.page) return;
			const mapped = (data ?? []).map((u) => ({
				userId: u.user_id,
				username: u.username,
				displayName: u.display_name,
				avatarUrl: u.avatar_url,
				sharedSongs: u.shared_songs,
				sharedHeard: u.shared_heard,
				sharedLiked: u.shared_liked,
				sharedDisliked: u.shared_disliked,
				sharedWant: u.shared_want,
				sharedReviewed: u.shared_reviewed,
				likedSongs: u.liked_songs ?? [],
				wantSongs: u.want_songs ?? [],
				lastActiveAt: u.last_active_at ?? null,
				topSharedArtist: u.top_shared_artist ?? null
			}));
			const diaryTotal = data?.[0]?.current_user_total ?? 0;
			setDiaryCount(Number(diaryTotal));
			const filtered = mapped.filter((u) => u.userId);
			if (page === 0) {
				setUsers(filtered);
				cacheRef.current = {
					fetchedAt: Date.now(),
					data: filtered,
					userId,
					sortMode
				};
			} else setUsers((prev) => [...prev, ...filtered]);
			setHasMore(mapped.length === 20);
		} catch (e) {
			setError(e?.message ?? "Failed to load compatible users");
		} finally {
			setLoading(false);
		}
	}, [
		userId,
		sortMode,
		page
	]);
	const retry = useCallback(() => {
		cacheRef.current = null;
		fetch();
	}, [fetch]);
	useEffect(() => {
		fetch();
	}, [fetch]);
	return {
		users,
		loading,
		error,
		retry,
		isEmpty: !loading && !error && users.length === 0 && userId !== null,
		hasMore,
		diaryCount
	};
}
//#endregion
//#region src/hooks/useConnectingSongs.ts
function useConnectingSongs(userId) {
	const [songs, setSongs] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const fetch = useCallback(async () => {
		if (!userId) {
			setSongs([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const { data, error: rpcError } = await supabase.rpc("get_connecting_songs", { current_user_id: userId });
			if (rpcError) throw rpcError;
			const mapped = (data ?? []).map((s) => ({
				id: s.song_id,
				title: s.title ?? "Unknown",
				slug: s.slug ?? "",
				artistName: s.artist_name ?? null,
				albumArtUrl: s.album_art_url ?? null,
				sourceDisplayName: s.source_display_name ?? null
			}));
			setSongs(mapped);
		} catch (e) {
			setError(e?.message ?? "Failed to load connecting songs");
		} finally {
			setLoading(false);
		}
	}, [userId]);
	useEffect(() => {
		fetch();
	}, [fetch]);
	return {
		songs,
		loading,
		error,
		retry: fetch,
		isEmpty: !loading && !error && songs.length === 0 && userId !== null
	};
}
//#endregion
//#region src/hooks/useTopMovers.ts
function useTopMovers() {
	const [songs, setSongs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const fetch = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data, error: rpcError } = await supabase.rpc("get_top_movers");
			if (rpcError) throw rpcError;
			const mapped = (data ?? []).map((s) => ({
				id: s.song_id,
				title: s.title ?? "Unknown",
				slug: s.slug ?? "",
				artistName: s.artist_name ?? null,
				albumArtUrl: s.album_art_url ?? null,
				rankDelta: s.rank_delta,
				currentScore: s.current_score
			}));
			setSongs(mapped);
		} catch (e) {
			setError(e?.message ?? "Failed to load top movers");
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		fetch();
	}, [fetch]);
	return {
		songs,
		loading,
		error,
		retry: fetch,
		isEmpty: !loading && !error && songs.length === 0
	};
}
//#endregion
//#region src/hooks/useTrendingSocialProof.ts
function useTrendingSocialProof(userId, songIds) {
	const [socialProof, setSocialProof] = useState(/* @__PURE__ */ new Map());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const fetch = useCallback(async () => {
		if (!userId || songIds.length === 0) {
			setSocialProof(/* @__PURE__ */ new Map());
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const { data, error: rpcError } = await supabase.rpc("get_trending_social_proof", {
				current_user_id: userId,
				song_ids: songIds
			});
			if (rpcError) throw rpcError;
			const map = /* @__PURE__ */ new Map();
			for (const row of data ?? []) map.set(row.song_id, Number(row.match_count));
			setSocialProof(map);
		} catch (e) {
			setError(e?.message ?? "Failed to load social proof");
		} finally {
			setLoading(false);
		}
	}, [userId, songIds.join(",")]);
	useEffect(() => {
		fetch();
	}, [fetch]);
	return {
		socialProof,
		loading,
		error
	};
}
//#endregion
//#region src/hooks/useDiaryInteractions.ts
function useDiaryInteractions(userId, songIds) {
	const [interactions, setInteractions] = useState(/* @__PURE__ */ new Map());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const fetch = useCallback(async () => {
		if (!userId || songIds.length === 0) {
			setInteractions(/* @__PURE__ */ new Map());
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const { data, error: queryError } = await supabase.from("diary_entries").select("song_id, type").in("song_id", songIds).eq("user_id", userId);
			if (queryError) throw queryError;
			const map = /* @__PURE__ */ new Map();
			for (const row of data ?? []) {
				if (!map.has(row.song_id)) map.set(row.song_id, /* @__PURE__ */ new Set());
				map.get(row.song_id).add(row.type);
			}
			setInteractions(map);
		} catch (e) {
			setError(e?.message ?? "Failed to load diary interactions");
		} finally {
			setLoading(false);
		}
	}, [userId, songIds.join(",")]);
	useEffect(() => {
		fetch();
	}, [fetch]);
	return {
		interactions,
		loading,
		error
	};
}
//#endregion
//#region src/components/feed/TrendingList.tsx
function SongSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-3 rounded-xl border bg-raised p-3",
		children: [/* @__PURE__ */ jsx("div", { className: "h-12 w-12 rounded-lg flex-shrink-0 animate-skeleton" }), /* @__PURE__ */ jsxs("div", {
			className: "flex-1 min-w-0 space-y-2",
			children: [/* @__PURE__ */ jsx("div", { className: "h-3 w-2/3 rounded animate-skeleton" }), /* @__PURE__ */ jsx("div", { className: "h-3 w-1/3 rounded animate-skeleton" })]
		})]
	});
}
function whyTrending(song) {
	if (song.likeCount >= song.reviewCount && song.likeCount >= song.heardCount) return `${song.likeCount} people liked this this week`;
	if (song.reviewCount >= song.likeCount) return `${song.reviewCount} new reviews`;
	return `${song.heardCount} people heard this for the first time`;
}
function YourTakeBadge({ songId, interactions }) {
	const types = interactions.get(songId);
	if (!types) return null;
	const size = 14;
	const badgeClass = "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-background p-px";
	if (types.has("like")) return /* @__PURE__ */ jsx("span", {
		className: badgeClass,
		children: /* @__PURE__ */ jsx(Heart, {
			size,
			className: "text-red-500 fill-red-500"
		})
	});
	if (types.has("heard")) return /* @__PURE__ */ jsx("span", {
		className: badgeClass,
		children: /* @__PURE__ */ jsx(CheckCircle, {
			size,
			className: "text-green-500 fill-green-500"
		})
	});
	if (types.has("want")) return /* @__PURE__ */ jsx("span", {
		className: badgeClass,
		children: /* @__PURE__ */ jsx(Star, {
			size,
			className: "text-purple-500 fill-purple-500"
		})
	});
	if (types.has("dislike")) return /* @__PURE__ */ jsx("span", {
		className: badgeClass,
		children: /* @__PURE__ */ jsx(X, {
			size,
			className: "text-muted-foreground"
		})
	});
	return null;
}
function TrendingList({ songs, loading, error, retry, isEmpty, emptyMessage, socialProof, userInteractions, currentUserId, onSearch }) {
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "space-y-2",
		children: [
			1,
			2,
			3,
			4,
			5
		].map((i) => /* @__PURE__ */ jsx(SongSkeleton, {}, i))
	});
	if (error) return /* @__PURE__ */ jsxs("div", {
		className: "text-center py-8",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-sm mb-3 text-muted-foreground",
			children: error
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: retry,
			className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
			children: "Try Again"
		})]
	});
	if (isEmpty) return /* @__PURE__ */ jsxs("div", {
		className: "text-center py-8",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground mb-3",
			children: emptyMessage ?? "Nothing here yet."
		}), onSearch && /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: onSearch,
			className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
			children: "Search"
		})]
	});
	return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
		className: "md:hidden space-y-2",
		children: songs.map((song, i) => {
			const rank = i + 1;
			const matchCount = socialProof.get(song.id);
			return /* @__PURE__ */ jsxs(Link, {
				to: "/song/$slug",
				params: { slug: song.slug },
				className: "flex items-start gap-3 rounded-xl border bg-raised p-3 transition-colors hover:border-foreground/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "relative flex-shrink-0",
					children: [
						song.albumArtUrl ? /* @__PURE__ */ jsx("img", {
							src: song.albumArtUrl,
							alt: `${song.title} album art`,
							className: "h-12 w-12 rounded-lg object-cover",
							loading: "lazy",
							decoding: "async"
						}) : /* @__PURE__ */ jsx("div", {
							className: "flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground",
							children: "—"
						}),
						/* @__PURE__ */ jsx("span", {
							className: `absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ${rank <= 3 ? "ring-2 ring-primary/30" : ""}`,
							children: rank
						}),
						/* @__PURE__ */ jsx(YourTakeBadge, {
							songId: song.id,
							interactions: userInteractions
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "truncate text-sm font-semibold text-foreground",
							title: song.title,
							children: song.title
						}),
						song.artistName && /* @__PURE__ */ jsx("div", {
							className: "truncate text-xs text-muted-foreground",
							title: song.artistName,
							children: song.artistName
						}),
						/* @__PURE__ */ jsx("div", {
							className: "mt-0.5 text-[11px] text-muted-foreground/80",
							children: whyTrending(song)
						}),
						matchCount && matchCount > 0 && currentUserId && /* @__PURE__ */ jsxs("div", {
							className: "mt-0.5 text-[11px] text-primary/80",
							children: [
								matchCount,
								" of your matches ",
								matchCount === 1 ? "likes" : "like",
								" this"
							]
						})
					]
				})]
			}, song.id);
		})
	}), /* @__PURE__ */ jsxs("div", {
		className: "hidden md:block overflow-hidden rounded-xl border bg-raised",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "w-8 text-center",
					children: "#"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "flex-1",
					children: "Song"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "w-12 text-center",
					children: "Take"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "w-24 text-right",
					children: "Why"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "w-16 text-right",
					children: "Likes"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "w-16 text-right",
					children: "Heard"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "w-16 text-right",
					children: "Reviews"
				})
			]
		}), songs.map((song, i) => {
			const rank = i + 1;
			const matchCount = socialProof.get(song.id);
			const types = userInteractions.get(song.id);
			return /* @__PURE__ */ jsxs(Link, {
				to: "/song/$slug",
				params: { slug: song.slug },
				className: `flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${i < songs.length - 1 ? "border-b" : ""}`,
				children: [
					/* @__PURE__ */ jsx("span", {
						className: `w-8 text-center text-xs ${rank <= 3 ? "font-bold text-primary" : "text-muted-foreground"}`,
						children: rank
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-1 items-center gap-3 min-w-0",
						children: [song.albumArtUrl ? /* @__PURE__ */ jsx("img", {
							src: song.albumArtUrl,
							alt: `${song.title} album art`,
							className: "h-8 w-8 flex-shrink-0 rounded object-cover",
							loading: "lazy",
							decoding: "async"
						}) : /* @__PURE__ */ jsx("div", {
							className: "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground",
							children: "—"
						}), /* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "truncate font-semibold text-foreground",
									title: song.title,
									children: song.title
								}),
								song.artistName && /* @__PURE__ */ jsx("div", {
									className: "truncate text-xs text-muted-foreground",
									title: song.artistName,
									children: song.artistName
								}),
								matchCount && matchCount > 0 && currentUserId && /* @__PURE__ */ jsxs("div", {
									className: "text-[11px] text-primary/80",
									children: [
										matchCount,
										" match",
										matchCount !== 1 ? "es" : "",
										" like this"
									]
								})
							]
						})]
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "w-12 text-center",
						children: [
							types?.has("like") && /* @__PURE__ */ jsx(Heart, {
								size: 14,
								className: "inline text-red-500 fill-red-500"
							}),
							types?.has("heard") && !types.has("like") && /* @__PURE__ */ jsx(CheckCircle, {
								size: 14,
								className: "inline text-green-500 fill-green-500"
							}),
							types?.has("want") && !types.has("like") && !types.has("heard") && /* @__PURE__ */ jsx(Star, {
								size: 14,
								className: "inline text-purple-500 fill-purple-500"
							}),
							types?.has("dislike") && !types.has("like") && !types.has("heard") && !types.has("want") && /* @__PURE__ */ jsx(X, {
								size: 14,
								className: "inline text-muted-foreground"
							}),
							!types && /* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground",
								children: "—"
							})
						]
					}),
					/* @__PURE__ */ jsx("span", {
						className: "w-24 text-right text-[11px] text-muted-foreground/80",
						children: whyTrending(song)
					}),
					/* @__PURE__ */ jsx("span", {
						className: "w-16 text-right text-muted-foreground",
						children: song.likeCount > 0 ? /* @__PURE__ */ jsx("span", {
							className: "font-semibold text-primary",
							children: song.likeCount
						}) : "—"
					}),
					/* @__PURE__ */ jsx("span", {
						className: "w-16 text-right text-muted-foreground",
						children: song.heardCount > 0 ? song.heardCount : "—"
					}),
					/* @__PURE__ */ jsx("span", {
						className: "w-16 text-right text-muted-foreground",
						children: song.reviewCount > 0 ? song.reviewCount : "—"
					})
				]
			}, song.id);
		})]
	})] });
}
//#endregion
//#region src/utils/compatibility.ts
function computeCompatibilityScore(user) {
	return user.sharedHeard * 1 + user.sharedLiked * 2 + user.sharedReviewed * 3 + user.sharedWant * 1.5 + user.sharedDisliked * .5;
}
function getCompatibilityTier(score, maxScore) {
	if (maxScore < 10) return null;
	const pct = score / maxScore;
	if (pct >= .85) return {
		label: "Taste Twin",
		color: "#a855f7"
	};
	if (pct >= .65) return {
		label: "High Match",
		color: "#facc15"
	};
	if (pct >= .4) return {
		label: "Good Match",
		color: "#8A8276"
	};
	return null;
}
//#endregion
//#region src/components/feed/CompatibleUsersList.tsx
function UserSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-3 rounded-xl border bg-raised p-3",
		children: [/* @__PURE__ */ jsx("div", { className: "h-12 w-12 rounded-full flex-shrink-0 animate-skeleton" }), /* @__PURE__ */ jsxs("div", {
			className: "flex-1 min-w-0 space-y-2",
			children: [/* @__PURE__ */ jsx("div", { className: "h-3 w-1/3 rounded animate-skeleton" }), /* @__PURE__ */ jsx("div", { className: "h-3 w-1/2 rounded animate-skeleton" })]
		})]
	});
}
function UserCard({ user, maxScore }) {
	const score = computeCompatibilityScore(user);
	const tier = getCompatibilityTier(score, maxScore);
	const pct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
	const whyPreview = buildWhyPreview(user);
	const total = user.sharedSongs;
	const heardPct = total > 0 ? user.sharedHeard / total * 100 : 0;
	const likedPct = total > 0 ? user.sharedLiked / total * 100 : 0;
	const reviewedPct = total > 0 ? user.sharedReviewed / total * 100 : 0;
	const wantPct = total > 0 ? user.sharedWant / total * 100 : 0;
	const activityLabel = user.lastActiveAt ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true }) : null;
	return /* @__PURE__ */ jsx(Link, {
		to: "/user/$username",
		params: { username: user.username },
		className: "block rounded-xl border bg-raised p-3 transition-colors hover:border-foreground/12",
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex items-start gap-3",
			children: [user.avatarUrl ? /* @__PURE__ */ jsx("img", {
				src: user.avatarUrl,
				alt: `${user.displayName ?? user.username} avatar`,
				className: "h-10 w-10 rounded-full object-cover flex-shrink-0",
				loading: "lazy"
			}) : /* @__PURE__ */ jsx("div", {
				className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground",
				children: (user.displayName ?? user.username)[0]?.toUpperCase()
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx("span", {
							className: "truncate text-sm font-semibold text-foreground",
							children: user.displayName ?? user.username
						}), tier && /* @__PURE__ */ jsxs("span", {
							className: "flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
							style: {
								backgroundColor: `${tier.color}20`,
								color: tier.color
							},
							children: [
								tier.label,
								" (",
								pct,
								"%)"
							]
						})]
					}),
					whyPreview && /* @__PURE__ */ jsx("div", {
						className: "mt-0.5 truncate text-xs text-muted-foreground",
						children: whyPreview
					}),
					total > 0 && /* @__PURE__ */ jsxs("div", {
						className: "mt-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex h-1.5 rounded-full overflow-hidden",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "bg-muted-foreground/30",
									style: { width: `${heardPct}%` }
								}),
								/* @__PURE__ */ jsx("div", {
									className: "bg-primary",
									style: { width: `${likedPct}%` }
								}),
								/* @__PURE__ */ jsx("div", {
									className: "bg-[#a855f7]",
									style: { width: `${reviewedPct}%` }
								}),
								/* @__PURE__ */ jsx("div", {
									className: "bg-muted-foreground/50",
									style: { width: `${wantPct}%` }
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "mt-0.5 text-[10px] text-muted-foreground",
							children: [
								"Heard ",
								user.sharedHeard,
								" · Liked ",
								user.sharedLiked,
								" · Reviewed ",
								user.sharedReviewed
							]
						})]
					}),
					activityLabel && /* @__PURE__ */ jsx("div", {
						className: "mt-1 text-[11px] text-muted-foreground",
						children: activityLabel
					}),
					user.topSharedArtist && /* @__PURE__ */ jsxs("div", {
						className: "mt-0.5 text-[11px] text-muted-foreground",
						children: ["Into: ", /* @__PURE__ */ jsx("span", {
							className: "text-foreground",
							children: user.topSharedArtist
						})]
					})
				]
			})]
		})
	});
}
function buildWhyPreview(user) {
	if (user.likedSongs.length > 0) return `Both liked: ${user.likedSongs.slice(0, 2).join(", ")}`;
	if (user.sharedReviewed > 0) return `Both reviewed ${user.sharedReviewed} songs`;
	if (user.wantSongs.length > 0) return `Both want: ${user.wantSongs.slice(0, 2).join(", ")}`;
	if (user.sharedSongs > 0) return `Both heard ${user.sharedSongs} songs`;
	return null;
}
function CompatibleUsersList({ users, loading, error, retry, isEmpty, isAnonymous, hasMore, onShowMore, loadingMore, diaryCount, maxScore, onSearch }) {
	if (isAnonymous) return null;
	if (loading && users.length === 0) return /* @__PURE__ */ jsx("div", {
		className: "space-y-2",
		children: [
			1,
			2,
			3
		].map((i) => /* @__PURE__ */ jsx(UserSkeleton, {}, i))
	});
	if (error) return /* @__PURE__ */ jsxs("div", {
		className: "text-center py-8",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-sm mb-3 text-muted-foreground",
			children: error
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: retry,
			className: "rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
			children: "Try Again"
		})]
	});
	if (isEmpty) return /* @__PURE__ */ jsx("div", {
		className: "text-center py-8",
		children: diaryCount === 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground mb-2",
			children: "Log your first song to find people who share your taste."
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: onSearch,
			className: "text-xs font-medium text-primary underline",
			children: "Search for a song →"
		})] }) : diaryCount < 5 ? /* @__PURE__ */ jsxs("p", {
			className: "text-sm text-muted-foreground",
			children: [
				"Heard ",
				diaryCount,
				" songs. Hear ",
				5 - diaryCount,
				" more to unlock compatible listeners."
			]
		}) : /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground",
			children: "No compatible listeners found yet. More people join every day."
		})
	});
	return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
		className: "space-y-2",
		children: users.map((user) => /* @__PURE__ */ jsx(UserCard, {
			user,
			maxScore
		}, user.userId))
	}), hasMore && /* @__PURE__ */ jsx("button", {
		onClick: onShowMore,
		disabled: loadingMore,
		className: "mt-3 w-full rounded-lg border py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.03] disabled:opacity-50",
		children: loadingMore ? "Loading..." : "Show more"
	})] });
}
//#endregion
//#region src/components/feed/ConnectingSongsSection.tsx
function ConnectingSongsSection({ songs, loading }) {
	if (loading) return null;
	if (songs.length === 0) return /* @__PURE__ */ jsx("div", {
		className: "text-xs text-muted-foreground/60",
		children: "Your matches haven't discovered anything new for you yet."
	});
	return /* @__PURE__ */ jsxs("div", { children: [
		/* @__PURE__ */ jsx("h3", {
			className: "text-sm font-semibold",
			children: "Songs connecting you"
		}),
		/* @__PURE__ */ jsx("p", {
			className: "text-xs text-muted-foreground mb-3",
			children: "What your top matches are into that you haven't heard yet."
		}),
		/* @__PURE__ */ jsx("div", {
			className: "flex gap-3 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible",
			children: songs.map((song) => /* @__PURE__ */ jsxs(Link, {
				to: "/song/$slug",
				params: { slug: song.slug },
				className: "flex-shrink-0 w-[140px] rounded-xl border bg-raised p-2 transition-colors hover:border-foreground/12",
				children: [
					song.albumArtUrl ? /* @__PURE__ */ jsx("img", {
						src: song.albumArtUrl,
						alt: `${song.title} album art`,
						className: "h-16 w-full rounded-lg object-cover mb-1",
						loading: "lazy"
					}) : /* @__PURE__ */ jsx("div", {
						className: "h-16 w-full rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground mb-1",
						children: "—"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "truncate text-xs font-semibold",
						children: song.title
					}),
					/* @__PURE__ */ jsx("div", {
						className: "truncate text-[11px] text-muted-foreground",
						children: song.artistName
					}),
					song.sourceDisplayName && /* @__PURE__ */ jsxs("div", {
						className: "truncate text-[10px] text-muted-foreground/60",
						children: ["via ", song.sourceDisplayName]
					})
				]
			}, song.id))
		})
	] });
}
//#endregion
//#region src/components/feed/TopMoversStrip.tsx
function TopMoversStrip({ songs, loading, error }) {
	if (loading || error || songs.length === 0) return null;
	return /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-2 mb-2",
		children: [/* @__PURE__ */ jsx(Flame, {
			size: 14,
			className: "text-orange-400"
		}), /* @__PURE__ */ jsx("span", {
			className: "text-xs font-semibold uppercase tracking-wide",
			children: "Rising fast"
		})]
	}), /* @__PURE__ */ jsx("div", {
		className: "flex gap-2 overflow-x-auto pb-1",
		children: songs.map((song) => /* @__PURE__ */ jsxs(Link, {
			to: "/song/$slug",
			params: { slug: song.slug },
			className: "flex-shrink-0 w-[140px] rounded-xl border bg-raised p-2 transition-colors hover:border-foreground/12",
			children: [
				song.albumArtUrl ? /* @__PURE__ */ jsx("img", {
					src: song.albumArtUrl,
					alt: `${song.title} album art`,
					className: "h-16 w-full rounded-lg object-cover mb-1",
					loading: "lazy"
				}) : /* @__PURE__ */ jsx("div", {
					className: "h-16 w-full rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground mb-1",
					children: "—"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "text-xs font-medium text-green-400",
					children: song.rankDelta !== null && song.rankDelta > 0 ? `↑${song.rankDelta}` : "New"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "truncate text-xs font-semibold",
					children: song.title
				}),
				/* @__PURE__ */ jsx("div", {
					className: "truncate text-[11px] text-muted-foreground",
					children: song.artistName
				})
			]
		}, song.id))
	})] });
}
//#endregion
//#region src/components/feed/DiscoverPage.tsx
function DiscoverPage() {
	const { triggerSearch } = useTabContext();
	const [userId, setUserId] = useState(null);
	const [compatSort, setCompatSort] = useState("composite");
	const [compatPage, setCompatPage] = useState(0);
	const [allUsers, setAllUsers] = useState([]);
	const [trendingWindow, setTrendingWindow] = useState(30);
	const trending = useTrendingSongs(trendingWindow);
	const compatibleUsers = useCompatibleUsers(userId, compatSort, compatPage);
	const connectingSongs = useConnectingSongs(userId);
	const topMovers = useTopMovers();
	const { socialProof } = useTrendingSocialProof(userId, trending.songs.map((s) => s.id));
	const { interactions: userInteractions } = useDiaryInteractions(userId, trending.songs.map((s) => s.id));
	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			setUserId(data.user?.id ?? null);
		});
	}, []);
	useEffect(() => {
		if (compatPage === 0) setAllUsers(compatibleUsers.users);
		else setAllUsers((prev) => [...prev, ...compatibleUsers.users]);
	}, [compatibleUsers.users, compatPage]);
	const isAnonymous = userId === null;
	const maxScore = allUsers.length > 0 ? Math.max(...allUsers.map((u) => computeCompatibilityScore(u))) : 0;
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-full px-2 md:max-w-4xl md:px-4 py-4 pb-20",
		children: [
			!isAnonymous && /* @__PURE__ */ jsxs("section", {
				className: "mb-8",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between mb-4",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-sm font-semibold",
							children: "Your People"
						}), /* @__PURE__ */ jsx("div", {
							className: "flex gap-1",
							children: [
								{
									mode: "composite",
									label: "Best Match"
								},
								{
									mode: "count",
									label: "Most Shared"
								},
								{
									mode: "recent",
									label: "Recent"
								}
							].map(({ mode, label }) => /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => {
									setCompatSort(mode);
									setCompatPage(0);
								},
								className: `rounded-full px-2.5 py-1 text-[11px] font-medium ${compatSort === mode ? "bg-primary/15 text-primary" : "text-muted-foreground"}`,
								children: label
							}, mode))
						})]
					}),
					/* @__PURE__ */ jsx(CompatibleUsersList, {
						users: allUsers,
						loading: compatibleUsers.loading && compatPage === 0,
						error: compatibleUsers.error,
						retry: compatibleUsers.retry,
						isEmpty: compatibleUsers.isEmpty,
						isAnonymous,
						hasMore: compatibleUsers.hasMore,
						onShowMore: () => setCompatPage((p) => p + 1),
						loadingMore: compatibleUsers.loading && compatPage > 0,
						diaryCount: compatibleUsers.diaryCount,
						maxScore,
						onSearch: triggerSearch
					}),
					allUsers.length > 0 && /* @__PURE__ */ jsx("div", {
						className: "mt-6",
						children: /* @__PURE__ */ jsx(ConnectingSongsSection, {
							songs: connectingSongs.songs,
							loading: connectingSongs.loading
						})
					})
				]
			}),
			isAnonymous && /* @__PURE__ */ jsxs("div", {
				className: "mb-8 rounded-xl border bg-raised p-5 text-center",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-sm font-semibold mb-1",
						children: "Find your people."
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted-foreground mb-3",
						children: "drawnTo matches you with listeners who share your taste. Sign up to discover your taste twins."
					}),
					/* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground",
						children: "Sign Up"
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", { children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between mb-2",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "text-sm font-semibold",
						children: "What's Hot"
					}), /* @__PURE__ */ jsx("div", {
						className: "flex gap-1",
						children: [
							{
								label: "Week",
								days: 7
							},
							{
								label: "Month",
								days: 30
							},
							{
								label: "All Time",
								days: 365
							}
						].map((w) => /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setTrendingWindow(w.days),
							className: `rounded-full px-2.5 py-1 text-[11px] font-medium ${trendingWindow === w.days ? "bg-primary/15 text-primary" : "text-muted-foreground"}`,
							children: w.label
						}, w.days))
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mb-4",
					children: /* @__PURE__ */ jsx(TopMoversStrip, {
						songs: topMovers.songs,
						loading: topMovers.loading,
						error: topMovers.error
					})
				}),
				/* @__PURE__ */ jsx(TrendingList, {
					songs: trending.songs,
					loading: trending.loading,
					error: trending.error,
					retry: trending.retry,
					isEmpty: trending.isEmpty,
					emptyMessage: "No trending songs yet. Search for a song to get started.",
					socialProof,
					userInteractions,
					currentUserId: userId,
					onSearch: triggerSearch
				})
			] })
		]
	});
}
//#endregion
//#region src/routes/_authenticated/home.tsx?tsr-split=component
function HomePage() {
	const { activeTab: tab } = useTabContext();
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		tab === "feed" && /* @__PURE__ */ jsx(FeedPage, {}),
		tab === "diary" && /* @__PURE__ */ jsx(DiaryPage, {}),
		tab === "discover" && /* @__PURE__ */ jsx(DiscoverPage, {})
	] });
}
//#endregion
export { HomePage as component };
