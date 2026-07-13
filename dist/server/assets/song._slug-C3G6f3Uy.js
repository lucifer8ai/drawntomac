import { t as supabase } from "./client-BSC3GyEp.js";
import { t as Route } from "./song._slug-zSAgPsk8.js";
import { n as cn, t as Button } from "./button-KZXYNBVn.js";
import { t as Shell } from "./song._slug-BJ3j-Xna.js";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { BookmarkCheck, BookmarkPlus, ChevronLeft, ChevronRight, Eye, Heart, MessageCircle, Pause, Pencil, Play, ThumbsDown } from "lucide-react";
//#region src/components/song/CoverArt.tsx
function useAudio(url) {
	const [audio, setAudio] = useState(null);
	useEffect(() => {
		if (!url || typeof Audio === "undefined") return;
		const a = new Audio(url);
		setAudio(a);
		return () => {
			a.pause();
		};
	}, [url]);
	return audio;
}
function CoverArt({ url, title, previewUrl }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-[320px] md:mx-0",
		children: [/* @__PURE__ */ jsx("div", {
			className: "aspect-square w-full overflow-hidden rounded-2xl border bg-raised",
			children: url ? /* @__PURE__ */ jsx("img", {
				src: url,
				alt: title,
				className: "h-full w-full object-cover",
				loading: "lazy",
				decoding: "async"
			}) : /* @__PURE__ */ jsx("div", {
				className: "flex h-full w-full items-center justify-center text-6xl text-white/20",
				children: "♫"
			})
		}), /* @__PURE__ */ jsx(PreviewButton, { url: previewUrl })]
	});
}
function PreviewButton({ url }) {
	const [playing, setPlaying] = useState(false);
	const audio = useAudio(url);
	const onEnded = useCallback(() => setPlaying(false), []);
	useEffect(() => {
		if (!audio) return;
		audio.addEventListener("ended", onEnded);
		return () => {
			audio.pause();
			audio.removeEventListener("ended", onEnded);
		};
	}, [audio, onEnded]);
	if (!url || !audio) return null;
	return /* @__PURE__ */ jsxs(Button, {
		type: "button",
		shape: "pill",
		onClick: () => {
			if (playing) {
				audio.pause();
				setPlaying(false);
			} else {
				audio.play().catch(() => {});
				setPlaying(true);
			}
		},
		className: "mt-4 w-full",
		children: [playing ? /* @__PURE__ */ jsx(Pause, { size: 14 }) : /* @__PURE__ */ jsx(Play, { size: 14 }), playing ? "Pause preview" : "Play 30s preview"]
	});
}
//#endregion
//#region src/components/song/SongHeader.tsx
function SongHeader({ song }) {
	return /* @__PURE__ */ jsxs("div", { children: [
		/* @__PURE__ */ jsx("h1", {
			className: "font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight italic break-words hyphens-auto text-white",
			children: song.title
		}),
		/* @__PURE__ */ jsx("p", {
			className: "mt-2 text-base md:text-lg font-medium text-artist",
			children: song.artist?.name ?? "Unknown artist"
		}),
		song.release_date && /* @__PURE__ */ jsx("p", {
			className: "mt-2 text-xs uppercase tracking-wider text-muted-foreground",
			children: new Date(song.release_date).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric"
			})
		}),
		song.genre_tags && song.genre_tags.length > 0 && /* @__PURE__ */ jsx("div", {
			className: "mt-4 flex flex-wrap gap-1.5",
			children: song.genre_tags.map((tag) => /* @__PURE__ */ jsx("span", {
				className: "rounded-full bg-border px-3 py-1 text-xs font-medium text-muted-foreground",
				children: tag
			}, tag))
		})
	] });
}
//#endregion
//#region src/components/song/ActionButtons.tsx
function HeardButton({ songId, userId, entry, wantEntry, onUpdate }) {
	const [loading, setLoading] = useState(false);
	const [optimisticEntry, setOptimisticEntry] = useState(null);
	const isActive = optimisticEntry ? !!optimisticEntry : !!entry;
	async function toggle() {
		if (!userId) return toast.error("Sign in to log listens.");
		setLoading(true);
		const wasActive = isActive;
		setOptimisticEntry(wasActive ? null : { id: crypto.randomUUID() });
		try {
			if (wasActive) {
				const realEntry = entry ?? optimisticEntry;
				if (realEntry) await supabase.from("diary_entries").delete().eq("id", realEntry.id);
			} else {
				if (wantEntry) await supabase.from("diary_entries").delete().eq("id", wantEntry.id);
				const { error } = await supabase.from("diary_entries").insert({
					user_id: userId,
					song_id: songId,
					type: "heard"
				});
				if (error) throw error;
			}
			setOptimisticEntry(null);
			onUpdate();
		} catch (err) {
			setOptimisticEntry(null);
			toast.error(err?.message ?? "Something went wrong");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		onClick: toggle,
		disabled: loading,
		className: `flex items-center gap-2 rounded-lg min-h-[44px] px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed border ${isActive ? "bg-heard text-heard-foreground border-heard" : "bg-raised text-foreground hover:bg-white/5"}`,
		children: [isActive ? /* @__PURE__ */ jsx(BookmarkCheck, { size: 14 }) : /* @__PURE__ */ jsx(BookmarkPlus, { size: 14 }), "Heard"]
	});
}
function WantButton({ songId, userId, entry, onUpdate }) {
	const [loading, setLoading] = useState(false);
	const [optimisticEntry, setOptimisticEntry] = useState(null);
	const isActive = optimisticEntry ? !!optimisticEntry : !!entry;
	async function handleClick() {
		if (!userId) return toast.error("Sign in to interact.");
		const wasActive = isActive;
		setLoading(true);
		setOptimisticEntry(wasActive ? null : { id: crypto.randomUUID() });
		try {
			if (wasActive) {
				const realEntry = entry ?? optimisticEntry;
				if (realEntry) await supabase.from("diary_entries").delete().eq("id", realEntry.id);
			} else {
				const { data: heardEntry } = await supabase.from("diary_entries").select("id").eq("user_id", userId).eq("song_id", songId).eq("type", "heard").maybeSingle();
				if (heardEntry) await supabase.from("diary_entries").delete().eq("id", heardEntry.id);
				const { error } = await supabase.from("diary_entries").insert({
					user_id: userId,
					song_id: songId,
					type: "want"
				});
				if (error) throw error;
			}
			setOptimisticEntry(null);
			onUpdate();
		} catch (err) {
			setOptimisticEntry(null);
			toast.error(err?.message ?? "Something went wrong");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		onClick: handleClick,
		disabled: loading,
		className: `flex items-center gap-2 rounded-lg min-h-[44px] px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed border ${isActive ? "bg-want text-want-foreground border-want" : "bg-raised text-foreground hover:bg-white/5"}`,
		children: [isActive ? /* @__PURE__ */ jsx(BookmarkCheck, { size: 14 }) : /* @__PURE__ */ jsx(BookmarkPlus, { size: 14 }), "Want to hear"]
	});
}
//#endregion
//#region src/components/song/LikeDislike.tsx
function LikeDislike({ songId, userId, likeEntry, dislikeEntry, onUpdate }) {
	const [loading, setLoading] = useState(false);
	const [optimisticLike, setOptimisticLike] = useState(null);
	const [optimisticDislike, setOptimisticDislike] = useState(null);
	const isLiked = optimisticLike ? !!optimisticLike : !!likeEntry;
	const isDisliked = optimisticDislike ? !!optimisticDislike : !!dislikeEntry;
	async function setSentiment(type) {
		if (!userId) return toast.error("Sign in to interact.");
		setLoading(true);
		const currentActive = type === "like" ? isLiked : isDisliked;
		const setOptimistic = type === "like" ? setOptimisticLike : setOptimisticDislike;
		const clearOpposite = type === "like" ? setOptimisticDislike : setOptimisticLike;
		setOptimistic(currentActive ? null : { id: crypto.randomUUID() });
		if (!currentActive) clearOpposite(null);
		try {
			const existingEntry = type === "like" ? likeEntry : dislikeEntry;
			const oppositeEntry = type === "like" ? dislikeEntry : likeEntry;
			if (existingEntry) await supabase.from("diary_entries").delete().eq("id", existingEntry.id);
			else {
				if (oppositeEntry) await supabase.from("diary_entries").delete().eq("id", oppositeEntry.id);
				const { error } = await supabase.from("diary_entries").insert({
					user_id: userId,
					song_id: songId,
					type
				});
				if (error) throw error;
			}
			if (type === "like") setOptimisticLike(null);
			else setOptimisticDislike(null);
			onUpdate();
		} catch (err) {
			if (type === "like") setOptimisticLike(null);
			else setOptimisticDislike(null);
			toast.error(err?.message ?? "Something went wrong");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "mt-3 flex gap-2",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			"aria-label": isLiked ? "Unlike" : "Like",
			onClick: () => setSentiment("like"),
			disabled: loading,
			className: "flex items-center gap-1.5 rounded-lg min-h-[44px] min-w-[44px] justify-center border bg-raised px-3 py-2 text-sm font-semibold transition-all active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5",
			children: /* @__PURE__ */ jsx(Heart, {
				size: 16,
				fill: isLiked ? "var(--color-like)" : "none",
				color: isLiked ? "var(--color-like)" : "var(--color-muted-foreground)"
			})
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			"aria-label": isDisliked ? "Remove dislike" : "Dislike",
			onClick: () => setSentiment("dislike"),
			disabled: loading,
			className: "flex items-center gap-1.5 rounded-lg min-h-[44px] min-w-[44px] justify-center border bg-raised px-3 py-2 text-sm font-semibold transition-all active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5",
			children: /* @__PURE__ */ jsx(ThumbsDown, {
				size: 16,
				fill: isDisliked ? "var(--color-dislike)" : "none",
				color: isDisliked ? "var(--color-dislike)" : "var(--color-muted-foreground)"
			})
		})]
	});
}
//#endregion
//#region src/components/song/ReviewComposer.tsx
var REVIEW_EDIT_WINDOW_MS = 2880 * 60 * 1e3;
function ReviewComposer({ songId, userId, entry, onPosted }) {
	const [body, setBody] = useState(entry?.body ?? "");
	const [submitting, setSubmitting] = useState(false);
	const [mode, setMode] = useState(entry ? "collapsed" : "write");
	useEffect(() => {
		if (entry) {
			setBody(entry.body ?? "");
			setMode("collapsed");
		} else {
			setBody("");
			setMode("write");
		}
	}, [entry?.id]);
	const canEdit = entry ? new Date(entry.created_at).getTime() + REVIEW_EDIT_WINDOW_MS > Date.now() : true;
	async function submit() {
		setSubmitting(true);
		const { data: dbEntry } = await supabase.from("diary_entries").select("id, created_at").eq("user_id", userId).eq("song_id", songId).eq("type", "review").maybeSingle();
		const targetId = entry?.id ?? dbEntry?.id;
		if (!!targetId) {
			if (!canEdit) {
				setSubmitting(false);
				return toast.error("Reviews can only be edited within 48 hours.");
			}
			const { error } = await supabase.from("diary_entries").update({ body: body.trim() || null }).eq("id", targetId);
			setSubmitting(false);
			if (error) return toast.error(error.message);
		} else {
			const { error } = await supabase.from("diary_entries").insert({
				user_id: userId,
				song_id: songId,
				type: "review",
				body: body.trim() || null
			});
			setSubmitting(false);
			if (error) return toast.error(error.message);
		}
		setBody("");
		onPosted();
	}
	if (mode === "write") return /* @__PURE__ */ jsxs("div", {
		className: "mt-8 rounded-2xl border bg-raised p-5",
		children: [/* @__PURE__ */ jsx("textarea", {
			value: body,
			onChange: (e) => setBody(e.target.value),
			placeholder: "Write a review…",
			rows: 3,
			className: "w-full resize-none rounded-xl border bg-transparent p-3 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
		}), /* @__PURE__ */ jsxs("div", {
			className: "mt-3 flex justify-end gap-2",
			children: [entry && /* @__PURE__ */ jsx(Button, {
				type: "button",
				variant: "raised",
				shape: "pill",
				onClick: () => {
					setBody(entry.body ?? "");
					setMode("viewing");
				},
				children: "Cancel"
			}), /* @__PURE__ */ jsx(Button, {
				type: "button",
				disabled: submitting,
				shape: "pill",
				onClick: submit,
				children: submitting ? "Posting…" : entry ? "Save" : "Post review"
			})]
		})]
	});
	if (mode === "collapsed") return /* @__PURE__ */ jsx("div", {
		className: "mt-8",
		children: /* @__PURE__ */ jsxs(Button, {
			type: "button",
			variant: "raised",
			shape: "pill",
			onClick: () => setMode(canEdit ? "viewing" : "locked"),
			children: [/* @__PURE__ */ jsx(Eye, { size: 14 }), "See your review"]
		})
	});
	if (mode === "locked") return /* @__PURE__ */ jsxs("div", {
		className: "mt-8 rounded-2xl border bg-raised p-5",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-xs font-medium text-muted-foreground",
			children: "Your review is locked — editing is only available for 48 hours after posting."
		}), entry?.body && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
			className: "mt-3 whitespace-pre-wrap text-sm text-foreground/90",
			children: entry.body
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: () => setMode("collapsed"),
			className: "mt-3 text-xs font-semibold text-muted-foreground",
			children: "Collapse"
		})] })]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "mt-8 rounded-2xl border bg-raised p-5",
		children: [entry?.body && /* @__PURE__ */ jsx("p", {
			className: "whitespace-pre-wrap text-base text-foreground/90",
			children: entry.body
		}), /* @__PURE__ */ jsxs("div", {
			className: "mt-3 flex items-center gap-3",
			children: [/* @__PURE__ */ jsxs(Button, {
				type: "button",
				shape: "pill",
				size: "sm",
				onClick: () => setMode("write"),
				children: [/* @__PURE__ */ jsx(Pencil, { size: 14 }), "Edit"]
			}), /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: () => setMode("collapsed"),
				className: "text-xs font-semibold text-muted-foreground",
				children: "Collapse"
			})]
		})]
	});
}
function ReviewPrompt() {
	return /* @__PURE__ */ jsxs("div", {
		className: "mt-8 rounded-2xl border bg-raised p-5 text-sm text-muted-foreground",
		children: [
			/* @__PURE__ */ jsx(Link, {
				to: "/",
				className: "font-semibold text-primary",
				children: "Sign in"
			}),
			" ",
			"to review or log a listen."
		]
	});
}
//#endregion
//#region src/components/song/ReviewList.tsx
function ReviewList({ reviews, userId, onToggleLike }) {
	if (reviews.length === 0) return /* @__PURE__ */ jsx("div", {
		className: "rounded-2xl border bg-raised p-8 text-center text-sm text-muted-foreground",
		children: "No reviews yet. Be the first."
	});
	return /* @__PURE__ */ jsx("ul", {
		className: "space-y-3",
		children: reviews.map((r) => /* @__PURE__ */ jsx(ReviewCard, {
			review: r,
			userId,
			onToggleLike: () => onToggleLike(r)
		}, r.id))
	});
}
function ReviewCard({ review, userId, onToggleLike }) {
	const [showComments, setShowComments] = useState(false);
	const [comments, setComments] = useState([]);
	const [newComment, setNewComment] = useState("");
	async function loadComments() {
		const { data } = await supabase.from("review_comments").select("id, body, user_id, created_at, profile:profiles(username,display_name,avatar_url)").eq("entry_id", review.id).order("created_at", { ascending: true });
		setComments(data ?? []);
	}
	async function postComment() {
		if (!userId) return toast.error("Sign in to comment.");
		const body = newComment.trim();
		if (!body) return;
		const { error } = await supabase.from("review_comments").insert({
			entry_id: review.id,
			user_id: userId,
			body
		});
		if (error) return toast.error(error.message);
		setNewComment("");
		loadComments();
	}
	const name = review.profile?.display_name || review.profile?.username || "Someone";
	return /* @__PURE__ */ jsx("li", {
		className: "rounded-2xl border bg-raised p-4 transition-colors hover:border-foreground/12",
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ jsx(Link, {
				to: "/user/$username",
				params: { username: review.profile?.username ?? "" },
				className: "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-want text-xs font-bold text-want-foreground hover:opacity-80 transition-opacity",
				onClick: (e) => e.stopPropagation(),
				children: review.profile?.avatar_url ? /* @__PURE__ */ jsx("img", {
					src: review.profile.avatar_url,
					alt: `${name} avatar`,
					className: "h-full w-full object-cover",
					loading: "lazy"
				}) : name.slice(0, 1).toUpperCase()
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(Link, {
							to: "/user/$username",
							params: { username: review.profile?.username ?? "" },
							className: "text-sm font-semibold hover:underline",
							children: name
						}), /* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted-foreground",
							children: new Date(review.created_at).toLocaleDateString()
						})]
					}),
					review.body && /* @__PURE__ */ jsx("p", {
						className: "mt-1 whitespace-pre-wrap text-base text-foreground/90",
						children: review.body
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 flex items-center gap-4",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: onToggleLike,
							className: "flex items-center gap-1.5 text-xs",
							style: { color: review.liked_by_me ? "var(--color-like)" : "var(--color-muted-foreground)" },
							children: [/* @__PURE__ */ jsx(Heart, {
								size: 14,
								fill: review.liked_by_me ? "var(--color-like)" : "none"
							}), review.like_count]
						}), /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								setShowComments((s) => {
									const next = !s;
									if (next) loadComments();
									return next;
								});
							},
							className: "flex items-center gap-1.5 text-xs text-muted-foreground",
							children: [/* @__PURE__ */ jsx(MessageCircle, { size: 14 }), review.comment_count]
						})]
					}),
					showComments && /* @__PURE__ */ jsxs("div", {
						className: "mt-3 space-y-2 border-t pt-3 animate-fade-in-up",
						children: [comments.map((c) => /* @__PURE__ */ jsxs("div", {
							className: "text-xs",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "font-semibold text-foreground",
									children: c.profile?.display_name || c.profile?.username || "Someone"
								}),
								" ",
								/* @__PURE__ */ jsx("span", {
									className: "text-foreground/80",
									children: c.body
								})
							]
						}, c.id)), userId ? /* @__PURE__ */ jsxs("div", {
							className: "flex gap-2 pt-1",
							children: [/* @__PURE__ */ jsx("input", {
								type: "text",
								value: newComment,
								onChange: (e) => setNewComment(e.target.value),
								placeholder: "Reply…",
								className: "flex-1 rounded-lg border bg-transparent px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring",
								onKeyDown: (e) => e.key === "Enter" && postComment()
							}), /* @__PURE__ */ jsx(Button, {
								type: "button",
								shape: "pill",
								size: "sm",
								onClick: postComment,
								children: "Send"
							})]
						}) : /* @__PURE__ */ jsxs("div", {
							className: "text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ jsx(Link, {
									to: "/",
									className: "text-primary",
									children: "Sign in"
								}),
								" ",
								"to reply."
							]
						})]
					})
				]
			})]
		})
	});
}
//#endregion
//#region src/components/song/Pagination.tsx
function Pagination({ page, totalPages, onPageChange }) {
	if (totalPages <= 1) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "mt-8 flex items-center justify-center gap-2",
		children: [
			/* @__PURE__ */ jsx("button", {
				type: "button",
				"aria-label": "Previous page",
				disabled: page <= 1,
				onClick: () => onPageChange(page - 1),
				className: "flex h-10 w-10 items-center justify-center rounded-lg border bg-raised text-muted-foreground transition-all active:scale-[0.95] hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed",
				children: /* @__PURE__ */ jsx(ChevronLeft, { size: 16 })
			}),
			/* @__PURE__ */ jsxs("span", {
				className: "min-w-[4rem] text-center text-sm text-muted-foreground",
				children: [
					page,
					" / ",
					totalPages
				]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				"aria-label": "Next page",
				disabled: page >= totalPages,
				onClick: () => onPageChange(page + 1),
				className: "flex h-10 w-10 items-center justify-center rounded-lg border bg-raised text-muted-foreground transition-all active:scale-[0.95] hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed",
				children: /* @__PURE__ */ jsx(ChevronRight, { size: 16 })
			})
		]
	});
}
//#endregion
//#region src/components/ui/skeleton.tsx
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("animate-pulse rounded-md bg-primary/10", className),
		...props
	});
}
//#endregion
//#region src/routes/song.$slug.tsx?tsr-split=component
var REVIEWS_PER_PAGE = 10;
function ReviewSkeletons() {
	return /* @__PURE__ */ jsx("div", {
		className: "space-y-3",
		children: [
			1,
			2,
			3
		].map((i) => /* @__PURE__ */ jsx("div", {
			className: "rounded-2xl border bg-raised p-4",
			children: /* @__PURE__ */ jsxs("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ jsx(Skeleton, { className: "h-9 w-9 rounded-full" }), /* @__PURE__ */ jsxs("div", {
					className: "flex-1 space-y-2",
					children: [
						/* @__PURE__ */ jsx(Skeleton, { className: "h-4 w-32" }),
						/* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-full" }),
						/* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-3/4" })
					]
				})]
			})
		}, i))
	});
}
function SongPage() {
	const { song } = Route.useLoaderData();
	const [userId, setUserId] = useState(null);
	const [reviews, setReviews] = useState([]);
	const [totalReviewCount, setTotalReviewCount] = useState(0);
	const [reviewPage, setReviewPage] = useState(1);
	const [loadingReviews, setLoadingReviews] = useState(true);
	const [myEntries, setMyEntries] = useState({
		heard: null,
		want: null,
		like: null,
		dislike: null,
		review: null
	});
	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
		const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
		return () => sub.subscription.unsubscribe();
	}, []);
	const loadReviews = useCallback(async () => {
		setLoadingReviews(true);
		const from = (reviewPage - 1) * REVIEWS_PER_PAGE;
		const to = from + REVIEWS_PER_PAGE - 1;
		const { data, count, error } = await supabase.from("diary_entries").select("*", { count: "exact" }).eq("song_id", song.id).eq("type", "review").order("created_at", { ascending: false }).range(from, to);
		if (error) {
			setLoadingReviews(false);
			return;
		}
		const rows = data ?? [];
		setTotalReviewCount(count ?? 0);
		const ids = rows.map((r) => r.id);
		const userIds = [...new Set(rows.map((r) => r.user_id))];
		let profileMap = /* @__PURE__ */ new Map();
		if (userIds.length > 0) {
			const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
			(profiles ?? []).forEach((p) => profileMap.set(p.id, p));
		}
		let likeMap = /* @__PURE__ */ new Map();
		let myLikeSet = /* @__PURE__ */ new Set();
		let commentMap = /* @__PURE__ */ new Map();
		if (ids.length > 0) {
			const [{ data: likes }, { data: comments }] = await Promise.all([supabase.from("review_likes").select("entry_id, user_id").in("entry_id", ids), supabase.from("review_comments").select("entry_id").in("entry_id", ids)]);
			(likes ?? []).forEach((l) => {
				likeMap.set(l.entry_id, (likeMap.get(l.entry_id) ?? 0) + 1);
				if (userId && l.user_id === userId) myLikeSet.add(l.entry_id);
			});
			(comments ?? []).forEach((c) => commentMap.set(c.entry_id, (commentMap.get(c.entry_id) ?? 0) + 1));
		}
		setReviews(rows.map((r) => ({
			...r,
			profile: profileMap.get(r.user_id) ?? null,
			like_count: likeMap.get(r.id) ?? 0,
			liked_by_me: myLikeSet.has(r.id),
			comment_count: commentMap.get(r.id) ?? 0
		})));
		setLoadingReviews(false);
	}, [
		song.id,
		reviewPage,
		userId
	]);
	const loadMyEntries = useCallback(async () => {
		if (!userId) {
			setMyEntries({
				heard: null,
				want: null,
				like: null,
				dislike: null,
				review: null
			});
			return;
		}
		const { data } = await supabase.from("diary_entries").select("*").eq("user_id", userId).eq("song_id", song.id).order("created_at", { ascending: false });
		let heard = null;
		let want = null;
		let like = null;
		let dislike = null;
		let review = null;
		(data ?? []).forEach((e) => {
			const entry = e;
			switch (entry.type) {
				case "heard":
					heard = entry;
					break;
				case "want":
					want = entry;
					break;
				case "like":
					like = entry;
					break;
				case "dislike":
					dislike = entry;
					break;
				case "review":
					review = entry;
					break;
			}
		});
		setMyEntries({
			heard,
			want,
			like,
			dislike,
			review
		});
	}, [userId, song.id]);
	useEffect(() => {
		loadReviews();
		loadMyEntries();
	}, [loadReviews, loadMyEntries]);
	async function toggleLike(entry) {
		if (!userId) return toast.error("Sign in to like.");
		if (entry.liked_by_me) await supabase.from("review_likes").delete().eq("entry_id", entry.id).eq("user_id", userId);
		else await supabase.from("review_likes").insert({
			entry_id: entry.id,
			user_id: userId
		});
		setReviews((prev) => prev.map((x) => x.id === entry.id ? {
			...x,
			liked_by_me: !x.liked_by_me,
			like_count: x.like_count + (x.liked_by_me ? -1 : 1)
		} : x));
	}
	const heardToday = myEntries.heard !== null;
	const hasInteractions = myEntries.like !== null || myEntries.dislike !== null || myEntries.review !== null;
	const totalPages = Math.max(1, Math.ceil(totalReviewCount / REVIEWS_PER_PAGE));
	return /* @__PURE__ */ jsx(Shell, { children: /* @__PURE__ */ jsxs("main", {
		className: "mx-auto max-w-5xl px-4 py-8",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "grid gap-8 md:grid-cols-[320px_1fr]",
			children: [/* @__PURE__ */ jsx(CoverArt, {
				url: song.genius_thumbnail_url,
				title: song.title,
				previewUrl: song.preview_url
			}), /* @__PURE__ */ jsxs("div", { children: [
				/* @__PURE__ */ jsx(SongHeader, { song: {
					title: song.title,
					release_date: song.release_date,
					genre_tags: song.genre_tags,
					preview_url: song.preview_url,
					artist: song.artist
				} }),
				!userId && /* @__PURE__ */ jsx(ReviewPrompt, {}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-5 flex flex-wrap gap-2",
					children: [!myEntries.want && /* @__PURE__ */ jsx(HeardButton, {
						songId: song.id,
						userId,
						entry: myEntries.heard,
						wantEntry: myEntries.want,
						onUpdate: loadMyEntries
					}), !heardToday && !hasInteractions && /* @__PURE__ */ jsx(WantButton, {
						songId: song.id,
						userId,
						entry: myEntries.want,
						onUpdate: loadMyEntries
					})]
				}),
				userId && (heardToday || hasInteractions) && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(LikeDislike, {
					songId: song.id,
					userId,
					likeEntry: myEntries.like,
					dislikeEntry: myEntries.dislike,
					onUpdate: loadMyEntries
				}), /* @__PURE__ */ jsx(ReviewComposer, {
					songId: song.id,
					userId,
					entry: myEntries.review,
					onPosted: () => {
						setReviewPage(1);
						loadReviews();
						loadMyEntries();
					}
				})] }),
				userId && !heardToday && !hasInteractions && !myEntries.want && /* @__PURE__ */ jsx("p", {
					className: "mt-4 text-sm text-muted-foreground",
					children: "Log a listen to like, dislike, or review this song."
				})
			] })]
		}), /* @__PURE__ */ jsxs("section", {
			className: "mt-12",
			children: [/* @__PURE__ */ jsxs("h2", {
				className: "mb-4 text-lg font-bold text-white",
				children: ["Reviews", totalReviewCount > 0 ? ` (${totalReviewCount})` : ""]
			}), loadingReviews ? /* @__PURE__ */ jsx(ReviewSkeletons, {}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(ReviewList, {
				reviews,
				userId,
				onToggleLike: toggleLike
			}), /* @__PURE__ */ jsx(Pagination, {
				page: reviewPage,
				totalPages,
				onPageChange: (p) => {
					setReviewPage(p);
					window.scrollTo({
						top: 0,
						behavior: "smooth"
					});
				}
			})] })]
		})]
	}) });
}
//#endregion
export { SongPage as component };
