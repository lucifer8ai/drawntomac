import { t as supabase } from "./client-BSC3GyEp.js";
import { t as Route } from "./user._username-SGWRmP4i.js";
import { t as Button } from "./button-KZXYNBVn.js";
import { t as FollowListSheet } from "./FollowListSheet-oaH39Y5h.js";
import { useCallback, useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/hooks/useCompatibility.ts
function useCompatibility(viewerId, targetId) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const fetch = useCallback(async () => {
		if (!viewerId || !targetId) return;
		setLoading(true);
		setError(null);
		try {
			const { data: result, error: rpcError } = await supabase.rpc("get_user_compatibility", {
				viewer_id: viewerId,
				target_id: targetId
			});
			if (rpcError) throw rpcError;
			if (result && result.length > 0) {
				const r = result[0];
				setData({
					sharedSongs: r.shared_songs,
					sharedHeard: r.shared_heard,
					sharedLiked: r.shared_liked,
					sharedDisliked: r.shared_disliked,
					sharedReviewed: r.shared_reviewed
				});
			} else setData({
				sharedSongs: 0,
				sharedHeard: 0,
				sharedLiked: 0,
				sharedDisliked: 0,
				sharedReviewed: 0
			});
		} catch (e) {
			setError(e?.message ?? "Failed to load compatibility");
		} finally {
			setLoading(false);
		}
	}, [viewerId, targetId]);
	useEffect(() => {
		fetch();
	}, [fetch]);
	return {
		data,
		loading,
		error,
		retry: fetch
	};
}
function getCompatibilityTier(sharedSongs) {
	if (sharedSongs >= 8) return "High";
	if (sharedSongs >= 4) return "Medium";
	return "Low";
}
//#endregion
//#region src/components/profile/PublicProfile.tsx
var TIER_COLORS = {
	Low: "bg-amber-500/15 text-amber-400",
	Medium: "bg-orange-500/15 text-orange-400",
	High: "bg-red-500/15 text-red-500"
};
function PublicProfile({ username, viewerId }) {
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [isFollowing, setIsFollowing] = useState(false);
	const [followingCount, setFollowingCount] = useState(0);
	const [followerCount, setFollowerCount] = useState(0);
	const [followSheet, setFollowSheet] = useState(null);
	const [followLoading, setFollowLoading] = useState(false);
	const isOwnProfile = viewerId && profile?.id === viewerId;
	const { data: compatibility } = useCompatibility(isOwnProfile ? null : viewerId, isOwnProfile ? null : profile?.id ?? null);
	useEffect(() => {
		if (!username) return;
		setLoading(true);
		setError(null);
		supabase.from("profiles").select("id, username, display_name, display_name_visible, bio, avatar_url, banner_url, pronouns, country, city").eq("username", username).single().then(({ data, error: err }) => {
			if (err || !data) {
				setError("User not found");
				setLoading(false);
				return;
			}
			setProfile(data);
			setLoading(false);
			if (viewerId && data.id !== viewerId) supabase.from("follows").select("id").eq("follower_id", viewerId).eq("following_id", data.id).maybeSingle().then(({ data: followData }) => {
				setIsFollowing(!!followData);
			});
			Promise.all([supabase.from("follows").select("*", {
				count: "exact",
				head: true
			}).eq("follower_id", data.id), supabase.from("follows").select("*", {
				count: "exact",
				head: true
			}).eq("following_id", data.id)]).then(([{ count: fc }, { count: fr }]) => {
				setFollowingCount(fc ?? 0);
				setFollowerCount(fr ?? 0);
			});
		});
	}, [username, viewerId]);
	async function handleFollowToggle() {
		if (!viewerId || !profile) return;
		setFollowLoading(true);
		try {
			if (isFollowing) {
				await supabase.from("follows").delete().eq("follower_id", viewerId).eq("following_id", profile.id);
				setIsFollowing(false);
				setFollowerCount((c) => Math.max(0, c - 1));
			} else {
				await supabase.from("follows").insert({
					follower_id: viewerId,
					following_id: profile.id
				});
				setIsFollowing(true);
				setFollowerCount((c) => c + 1);
			}
		} catch {} finally {
			setFollowLoading(false);
		}
	}
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "flex items-center justify-center py-20",
		children: /* @__PURE__ */ jsx("div", {
			className: "text-sm text-muted-foreground",
			children: "Loading..."
		})
	});
	if (error || !profile) return /* @__PURE__ */ jsx("div", {
		className: "flex flex-col items-center justify-center py-20 gap-3",
		children: /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted-foreground",
			children: "User not found"
		})
	});
	const resolvedName = profile.display_name_visible ? profile.display_name ?? profile.username : profile.username;
	const locationText = profile.city && profile.country ? `${profile.city}, ${profile.country}` : profile.country ?? null;
	const tier = compatibility ? getCompatibilityTier(compatibility.sharedSongs) : null;
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
		className: "flex flex-col min-h-full",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "relative w-full aspect-[3/1] bg-black overflow-hidden",
				children: profile.banner_url ? /* @__PURE__ */ jsx("img", {
					src: profile.banner_url,
					alt: "",
					className: "w-full h-full object-cover"
				}) : /* @__PURE__ */ jsx("div", {
					className: "w-full h-full flex items-center justify-center bg-black",
					children: /* @__PURE__ */ jsx("span", {
						className: "text-4xl md:text-5xl font-['Instrument_Serif'] italic text-primary",
						children: "#d.You"
					})
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "px-4 -mt-12",
				children: /* @__PURE__ */ jsx("div", {
					className: "h-24 w-24 rounded-full overflow-hidden border-[3px] border-background bg-muted shrink-0",
					children: profile.avatar_url ? /* @__PURE__ */ jsx("img", {
						src: profile.avatar_url,
						alt: resolvedName,
						className: "h-full w-full object-cover"
					}) : /* @__PURE__ */ jsx("div", {
						className: "h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground",
						children: resolvedName.slice(0, 1).toUpperCase()
					})
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "px-4 pt-2 space-y-1",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "text-sm text-muted-foreground",
						children: ["@", profile.username]
					}),
					!profile.display_name_visible && profile.display_name ? /* @__PURE__ */ jsx("div", {
						className: "text-sm text-muted-foreground italic",
						children: "Display name hidden"
					}) : /* @__PURE__ */ jsx("div", {
						className: "text-xl font-semibold",
						children: profile.display_name ?? profile.username
					}),
					profile.pronouns && /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground",
						children: profile.pronouns
					}),
					profile.bio && /* @__PURE__ */ jsx("p", {
						className: "text-base text-foreground/80 pt-1",
						children: profile.bio
					}),
					locationText && /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted-foreground",
						children: locationText
					})
				]
			}),
			compatibility && compatibility.sharedSongs > 0 && /* @__PURE__ */ jsx("div", {
				className: "px-4 pt-3",
				children: /* @__PURE__ */ jsxs("div", {
					className: "rounded-xl border bg-raised p-3 space-y-2",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted-foreground",
							children: "Compatibility"
						}), /* @__PURE__ */ jsx("span", {
							className: `rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_COLORS[tier ?? "Low"]}`,
							children: tier
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-3 gap-2 text-center",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
								className: "text-lg font-semibold",
								children: compatibility.sharedHeard
							}), /* @__PURE__ */ jsx("div", {
								className: "text-[10px] text-muted-foreground",
								children: "Heard"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
								className: "text-lg font-semibold text-red-500",
								children: compatibility.sharedLiked
							}), /* @__PURE__ */ jsx("div", {
								className: "text-[10px] text-muted-foreground",
								children: "Liked"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
								className: "text-lg font-semibold",
								children: compatibility.sharedDisliked
							}), /* @__PURE__ */ jsx("div", {
								className: "text-[10px] text-muted-foreground",
								children: "Disliked"
							})] })
						]
					})]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "px-4 pt-3 flex gap-4",
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setFollowSheet("following"),
					className: "text-sm hover:underline cursor-pointer",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "font-semibold",
							children: followingCount
						}),
						" ",
						/* @__PURE__ */ jsx("span", {
							className: "text-muted-foreground",
							children: "following"
						})
					]
				}), /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setFollowSheet("followers"),
					className: "text-sm hover:underline cursor-pointer",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "font-semibold",
							children: followerCount
						}),
						" ",
						/* @__PURE__ */ jsx("span", {
							className: "text-muted-foreground",
							children: "followers"
						})
					]
				})]
			}),
			viewerId && !isOwnProfile && /* @__PURE__ */ jsx("div", {
				className: "px-4 pt-4",
				children: /* @__PURE__ */ jsx(Button, {
					onClick: handleFollowToggle,
					disabled: followLoading,
					variant: isFollowing ? "secondary" : "default",
					className: "w-full h-11 rounded-lg active:scale-[0.97]",
					children: followLoading ? "..." : isFollowing ? "Unfollow" : "Follow"
				})
			}),
			/* @__PURE__ */ jsx("div", { className: "flex-1" })
		]
	}), /* @__PURE__ */ jsx(FollowListSheet, {
		open: followSheet !== null,
		onClose: () => setFollowSheet(null),
		type: followSheet ?? "followers",
		userId: profile.id
	})] });
}
//#endregion
//#region src/routes/_authenticated/user.$username.tsx?tsr-split=component
function UserProfilePage() {
	const { username } = Route.useParams();
	const [viewerId, setViewerId] = useState(null);
	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => {
			setViewerId(data.user?.id ?? null);
		});
	}, []);
	return /* @__PURE__ */ jsx(PublicProfile, {
		username,
		viewerId
	});
}
//#endregion
export { UserProfilePage as component };
