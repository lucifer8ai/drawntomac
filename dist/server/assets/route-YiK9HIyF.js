import { t as supabase } from "./client-BSC3GyEp.js";
import { n as TabContext } from "./route-DKTgVvq3.js";
import { n as cn, t as Button } from "./button-KZXYNBVn.js";
import { n as Sheet, r as SheetContent, t as FollowListSheet } from "./FollowListSheet-oaH39Y5h.js";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { cva } from "class-variance-authority";
import { BookOpen, Check, ChevronDown, ChevronUp, Compass, LogOut, Newspaper, Pencil, Search, Upload } from "lucide-react";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import * as SelectPrimitive from "@radix-ui/react-select";
//#region src/components/AppHeader.tsx
function AppHeader({ activeTab, onTabChange, avatarUrl, displayName, onProfileClick, triggerSearch }) {
	const [q, setQ] = useState("");
	const [hits, setHits] = useState([]);
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [searchExpanded, setSearchExpanded] = useState(false);
	const boxRef = useRef(null);
	const inputRef = useRef(null);
	const navigate = useNavigate();
	function expandSearch() {
		setSearchExpanded(true);
		setTimeout(() => inputRef.current?.focus(), 50);
	}
	function collapseSearch() {
		if (!q.trim()) setSearchExpanded(false);
	}
	useEffect(() => {
		if (triggerSearch && triggerSearch > 0) expandSearch();
	}, [triggerSearch]);
	useEffect(() => {
		const query = q.trim();
		if (!query) {
			setHits([]);
			setOpen(false);
			return;
		}
		let cancelled = false;
		setLoading(true);
		let searchQ = query;
		let artistParam = "";
		const slashIdx = query.indexOf("/");
		if (slashIdx > 0 && slashIdx < query.length - 1) {
			searchQ = query.substring(0, slashIdx).trim();
			artistParam = query.substring(slashIdx + 1).trim();
		}
		const t = setTimeout(async () => {
			try {
				const url = `/api/search?q=${encodeURIComponent(searchQ)}`;
				const finalUrl = artistParam ? `${url}&artist=${encodeURIComponent(artistParam)}` : url;
				const json = await (await fetch(finalUrl)).json();
				if (!cancelled) {
					setHits(Array.isArray(json) ? json : []);
					setOpen(true);
				}
			} catch {
				if (!cancelled) setHits([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 300);
		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [q]);
	useEffect(() => {
		const onDoc = (e) => {
			if (!boxRef.current?.contains(e.target)) setOpen(false);
		};
		const onKey = (e) => {
			if (e.key === "Escape" && open) {
				setOpen(false);
				inputRef.current?.focus();
			}
		};
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	async function pickSong(hit) {
		setOpen(false);
		setQ("");
		try {
			const res = await fetch("/api/import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(hit)
			});
			if (!res.ok) {
				let message = "Import failed.";
				try {
					const { error } = await res.json();
					if (error) message = error;
				} catch {}
				toast.error(message);
				return;
			}
			const { slug } = await res.json();
			navigate({
				to: "/song/$slug",
				params: { slug }
			}).catch(() => {
				window.location.href = `/song/${slug}`;
			});
		} catch {
			toast.error("Something went wrong. Try again.");
		}
	}
	return /* @__PURE__ */ jsxs("header", {
		className: "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-xl",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mx-auto flex max-w-6xl items-center gap-2 md:gap-4 px-4 py-3",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					to: "/home",
					className: "shrink-0 text-2xl font-black tracking-tight text-foreground",
					children: [/* @__PURE__ */ jsx("span", {
						className: "md:hidden",
						children: "#d.To"
					}), /* @__PURE__ */ jsx("span", {
						className: "hidden md:inline",
						children: "#drawnto"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					ref: boxRef,
					className: "relative mx-2 flex-1 max-w-xl",
					children: [
						!searchExpanded ? /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: expandSearch,
							className: "flex md:hidden items-center justify-center h-11 w-11 rounded-lg border bg-input/40 text-muted-foreground",
							children: /* @__PURE__ */ jsx(Search, { size: 16 })
						}) : null,
						/* @__PURE__ */ jsxs("div", {
							className: `${searchExpanded ? "flex" : "hidden md:flex"} items-center gap-2 rounded-lg border bg-input/40 px-4 py-2`,
							children: [/* @__PURE__ */ jsx(Search, {
								size: 16,
								className: "text-muted-foreground"
							}), /* @__PURE__ */ jsx("input", {
								ref: inputRef,
								value: q,
								onChange: (e) => setQ(e.target.value),
								onFocus: () => hits.length > 0 && setOpen(true),
								onBlur: collapseSearch,
								placeholder: "Search song or song/artist",
								className: "w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60 md:text-sm"
							})]
						}),
						open && /* @__PURE__ */ jsxs("div", {
							className: "absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[320px] overflow-y-auto rounded-2xl border bg-popover/98 p-2 shadow-2xl animate-scale-in",
							children: [
								loading && /* @__PURE__ */ jsx("div", {
									className: "p-3 text-xs text-muted-foreground",
									children: "Searching…"
								}),
								!loading && hits.length === 0 && /* @__PURE__ */ jsx("div", {
									className: "p-3 text-xs text-muted-foreground",
									children: "No matches."
								}),
								hits.map((h) => /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => pickSong(h),
									className: "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5",
									children: [h.thumbnailUrl ? /* @__PURE__ */ jsx("img", {
										src: h.thumbnailUrl,
										alt: `${h.title} album art`,
										className: "h-10 w-10 rounded object-cover flex-shrink-0",
										loading: "lazy",
										decoding: "async"
									}) : /* @__PURE__ */ jsx("div", {
										className: "h-10 w-10 rounded bg-white/10 flex items-center justify-center text-muted-foreground text-xs flex-shrink-0",
										children: "♫"
									}), /* @__PURE__ */ jsxs("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ jsx("div", {
											className: "truncate text-sm font-semibold text-foreground",
											children: h.title
										}), /* @__PURE__ */ jsx("div", {
											className: "truncate text-xs text-muted-foreground",
											children: h.artistName
										})]
									})]
								}, h.mbid))
							]
						})
					]
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: onProfileClick,
					className: "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-want text-sm font-bold text-want-foreground active:scale-[0.97] transition-transform duration-150",
					title: displayName ?? "Profile",
					children: avatarUrl ? /* @__PURE__ */ jsx("img", {
						src: avatarUrl,
						alt: displayName ?? "Profile",
						className: "h-full w-full object-cover",
						loading: "lazy"
					}) : (displayName ?? "U").slice(0, 1).toUpperCase()
				})
			]
		}), /* @__PURE__ */ jsx("nav", {
			className: "mx-auto hidden md:flex max-w-6xl items-center gap-6 px-4",
			children: [
				{
					id: "feed",
					label: "Feed"
				},
				{
					id: "diary",
					label: "Diary"
				},
				{
					id: "discover",
					label: "Discover"
				}
			].map((t) => {
				const active = t.id === activeTab;
				return /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-current": active ? "page" : void 0,
					onClick: () => onTabChange(t.id),
					className: `relative py-3 text-sm font-semibold transition-colors ${active ? "text-primary" : "text-foreground/60"}`,
					children: [t.label, active && /* @__PURE__ */ jsx("span", { className: "absolute -bottom-px left-0 right-0 h-0.5 bg-primary" })]
				}, t.id);
			})
		})]
	});
}
//#endregion
//#region src/components/nav/BottomNav.tsx
var tabs = [
	{
		id: "feed",
		label: "Feed",
		Icon: Newspaper
	},
	{
		id: "diary",
		label: "Diary",
		Icon: BookOpen
	},
	{
		id: "discover",
		label: "Discover",
		Icon: Compass
	}
];
function BottomNav({ activeTab, onTabChange }) {
	return /* @__PURE__ */ jsx("nav", {
		className: "fixed bottom-0 left-0 right-0 z-40 block md:hidden pb-safe",
		children: /* @__PURE__ */ jsx("div", {
			className: "flex items-center justify-around border-t bg-background/95 py-3 backdrop-blur-xl",
			children: tabs.map(({ id, label, Icon }) => {
				const active = id === activeTab;
				return /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-current": active ? "page" : void 0,
					onClick: () => onTabChange(id),
					className: "flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 min-h-[44px] min-w-[44px] justify-center transition-colors",
					children: [/* @__PURE__ */ jsx(Icon, {
						size: 20,
						fill: active ? "var(--color-primary)" : "none",
						color: active ? "var(--color-primary)" : "var(--color-muted-foreground)"
					}), /* @__PURE__ */ jsx("span", {
						className: "text-[10px] font-semibold",
						style: { color: active ? "var(--color-primary)" : "var(--color-muted-foreground)" },
						children: label
					})]
				}, id);
			})
		})
	});
}
//#endregion
//#region src/components/ui/input.tsx
var Input = React.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ jsx("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
//#endregion
//#region src/components/ui/textarea.tsx
var Textarea = React.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ jsx("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
//#endregion
//#region src/components/ui/label.tsx
var labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");
var Label = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(LabelPrimitive.Root, {
	ref,
	className: cn(labelVariants(), className),
	...props
}));
Label.displayName = LabelPrimitive.Root.displayName;
//#endregion
//#region src/components/ui/switch.tsx
var Switch = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SwitchPrimitives.Root, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ jsx(SwitchPrimitives.Thumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = SwitchPrimitives.Root.displayName;
//#endregion
//#region src/components/ui/collapsible.tsx
var Collapsible = CollapsiblePrimitive.Root;
var CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
var CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;
//#endregion
//#region src/components/profile/BannerUpload.tsx
function BannerUpload({ bannerUrl, onUpload, disabled }) {
	const inputRef = useRef(null);
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		onClick: () => inputRef.current?.click(),
		disabled,
		className: "relative w-full aspect-[3/1] overflow-hidden bg-black cursor-pointer group active:scale-[0.97] transition-transform duration-150",
		style: { borderRadius: 0 },
		children: [
			bannerUrl ? /* @__PURE__ */ jsx("img", {
				src: bannerUrl,
				alt: "Banner",
				className: "w-full h-full object-cover"
			}) : /* @__PURE__ */ jsx("div", {
				className: "w-full h-full flex items-center justify-center bg-black",
				children: /* @__PURE__ */ jsx("span", {
					className: "text-4xl md:text-5xl font-['Instrument_Serif'] italic text-primary",
					children: "#d.You"
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
				children: /* @__PURE__ */ jsx(Upload, { className: "h-6 w-6 text-white" })
			}),
			/* @__PURE__ */ jsx("input", {
				ref: inputRef,
				type: "file",
				accept: "image/png,image/jpeg,image/webp,image/gif",
				className: "hidden",
				onChange: (e) => {
					const file = e.target.files?.[0];
					if (file) onUpload(file);
				}
			})
		]
	});
}
//#endregion
//#region src/components/profile/AvatarUpload.tsx
function AvatarUpload({ avatarUrl, onUpload, disabled, displayName }) {
	const inputRef = useRef(null);
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		onClick: () => inputRef.current?.click(),
		disabled,
		className: "relative h-24 w-24 rounded-full overflow-hidden border-[3px] border-background bg-muted cursor-pointer group active:scale-[0.97] transition-transform duration-150 shrink-0",
		children: [
			avatarUrl ? /* @__PURE__ */ jsx("img", {
				src: avatarUrl,
				alt: displayName ?? "Avatar",
				className: "h-full w-full object-cover"
			}) : /* @__PURE__ */ jsx("div", {
				className: "h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground",
				children: (displayName ?? "U").slice(0, 1).toUpperCase()
			}),
			/* @__PURE__ */ jsx("div", {
				className: "absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
				children: /* @__PURE__ */ jsx(Upload, { className: "h-5 w-5 text-white" })
			}),
			/* @__PURE__ */ jsx("input", {
				ref: inputRef,
				type: "file",
				accept: "image/png,image/jpeg,image/webp,image/gif",
				className: "hidden",
				onChange: (e) => {
					const file = e.target.files?.[0];
					if (file) onUpload(file);
				}
			})
		]
	});
}
//#endregion
//#region src/components/ui/select.tsx
var Select = SelectPrimitive.Root;
var SelectValue = SelectPrimitive.Value;
var SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Trigger, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ jsx(SelectPrimitive.Icon, {
		asChild: true,
		children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
var SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollUpButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
var SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollDownButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
var SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(SelectPrimitive.Content, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ jsx(SelectScrollUpButton, {}),
		/* @__PURE__ */ jsx(SelectPrimitive.Viewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ jsx(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
var SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Label, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
var SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Item, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ jsx("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })]
}));
SelectItem.displayName = SelectPrimitive.Item.displayName;
var SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Separator, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
//#endregion
//#region src/components/profile/LocationPicker.tsx
function LocationPicker({ value, onChange }) {
	const [countries, setCountries] = useState([]);
	const [cities, setCities] = useState([]);
	const [selectedCountry, setSelectedCountry] = useState("");
	const [loading, setLoading] = useState(false);
	const initialized = useRef(false);
	useEffect(() => {
		supabase.from("locations").select("country").is("city", null).order("country").then(({ data }) => {
			if (data) setCountries([...new Set(data.map((d) => d.country))]);
		});
	}, []);
	useEffect(() => {
		if (!value || initialized.current) return;
		initialized.current = true;
		supabase.from("locations").select("country").eq("id", value).maybeSingle().then(({ data }) => {
			if (data) setSelectedCountry(data.country);
		});
	}, [value]);
	useEffect(() => {
		if (!selectedCountry) {
			setCities([]);
			return;
		}
		setLoading(true);
		supabase.from("locations").select("*").eq("country", selectedCountry).order("city", { ascending: true }).then(({ data }) => {
			setCities(data ?? []);
			setLoading(false);
		});
	}, [selectedCountry]);
	function handleCountryChange(country) {
		setSelectedCountry(country);
		supabase.from("locations").select("id").eq("country", country).is("city", null).maybeSingle().then(({ data }) => {
			if (data) onChange(data.id);
		});
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ jsx(Label, {
				className: "text-sm font-medium",
				children: "Location"
			}),
			/* @__PURE__ */ jsxs(Select, {
				value: selectedCountry,
				onValueChange: handleCountryChange,
				children: [/* @__PURE__ */ jsx(SelectTrigger, {
					className: "h-11 rounded-lg",
					children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select country" })
				}), /* @__PURE__ */ jsx(SelectContent, { children: countries.map((c) => /* @__PURE__ */ jsx(SelectItem, {
					value: c,
					children: c
				}, c)) })]
			}),
			cities.filter((c) => c.city !== null).length > 0 && /* @__PURE__ */ jsxs(Select, {
				value: value ?? "",
				onValueChange: (v) => onChange(v || null),
				disabled: loading,
				children: [/* @__PURE__ */ jsx(SelectTrigger, {
					className: "h-11 rounded-lg",
					children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select city" })
				}), /* @__PURE__ */ jsx(SelectContent, { children: cities.filter((c) => c.city !== null).map((c) => /* @__PURE__ */ jsx(SelectItem, {
					value: c.id,
					children: c.city
				}, c.id)) })]
			})
		]
	});
}
//#endregion
//#region src/components/profile/ProfileEditForm.tsx
function ProfileEditForm({ initial, userId, onSave, onUploadAvatar, onUploadBanner, onCancel, saving }) {
	const [displayName, setDisplayName] = useState(initial.display_name ?? "");
	const [bio, setBio] = useState(initial.bio ?? "");
	const [bioCount, setBioCount] = useState((initial.bio ?? "").length);
	const [pronouns, setPronouns] = useState(initial.pronouns ?? "");
	const [displayNameVisible, setDisplayNameVisible] = useState(initial.display_name_visible ?? true);
	const [locationId, setLocationId] = useState(initial.location_id);
	const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
	const [bannerUrl, setBannerUrl] = useState(initial.banner_url);
	const [emailOpen, setEmailOpen] = useState(false);
	const [passOpen, setPassOpen] = useState(false);
	const [newEmail, setNewEmail] = useState("");
	const [currentEmail, setCurrentEmail] = useState("");
	const [newPass, setNewPass] = useState("");
	const [confirmPass, setConfirmPass] = useState("");
	const [emailSaving, setEmailSaving] = useState(false);
	const [passSaving, setPassSaving] = useState(false);
	async function fetchEmail() {
		const { data } = await supabase.auth.getUser();
		setCurrentEmail(data.user?.email ?? "");
	}
	async function handleSave() {
		await onSave({
			display_name: displayName.trim() || null,
			bio: bio.trim() || null,
			pronouns: pronouns.trim() || null,
			location_id: locationId,
			avatar_url: avatarUrl,
			banner_url: bannerUrl,
			display_name_visible: displayNameVisible
		});
	}
	async function handleBannerUpload(file) {
		try {
			const url = await onUploadBanner(file);
			setBannerUrl(url);
			toast.success("Banner updated");
		} catch (e) {
			toast.error(e?.message ?? "Failed to upload banner");
		}
	}
	async function handleAvatarUpload(file) {
		try {
			const url = await onUploadAvatar(file);
			setAvatarUrl(url);
			toast.success("Avatar updated");
		} catch (e) {
			toast.error(e?.message ?? "Failed to upload avatar");
		}
	}
	async function handleEmailChange() {
		if (!newEmail) return;
		setEmailSaving(true);
		try {
			const { error } = await supabase.auth.updateUser({ email: newEmail });
			if (error) throw error;
			toast.success("Check your new email to confirm the change.");
			setNewEmail("");
		} catch (e) {
			toast.error(e?.message ?? "Failed to change email.");
		} finally {
			setEmailSaving(false);
		}
	}
	async function handlePassChange() {
		if (!newPass || newPass !== confirmPass) {
			toast.error("Passwords do not match.");
			return;
		}
		setPassSaving(true);
		try {
			const { error } = await supabase.auth.updateUser({ password: newPass });
			if (error) throw error;
			toast.success("Password changed.");
			setNewPass("");
			setConfirmPass("");
		} catch (e) {
			toast.error(e?.message ?? "Failed to change password.");
		} finally {
			setPassSaving(false);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col gap-5 pt-4",
		children: [
			/* @__PURE__ */ jsx(BannerUpload, {
				bannerUrl,
				onUpload: handleBannerUpload,
				disabled: saving
			}),
			/* @__PURE__ */ jsx("div", {
				className: "px-4 -mt-12",
				children: /* @__PURE__ */ jsx(AvatarUpload, {
					avatarUrl,
					onUpload: handleAvatarUpload,
					disabled: saving,
					displayName: displayName || initial.username
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "px-4 space-y-4",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx(Label, {
							className: "text-sm font-medium",
							children: "Display Name"
						}),
						/* @__PURE__ */ jsx(Input, {
							value: displayName,
							onChange: (e) => setDisplayName(e.target.value),
							maxLength: 50,
							placeholder: initial.username,
							className: "h-11 rounded-lg mt-1.5"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "text-xs text-muted-foreground mt-1 text-right",
							children: [displayName.length, "/50"]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between mt-2",
							children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "show-display-name",
								className: "text-sm text-muted-foreground cursor-pointer",
								children: "Show display name on my public profile"
							}), /* @__PURE__ */ jsx(Switch, {
								id: "show-display-name",
								checked: displayNameVisible,
								onCheckedChange: setDisplayNameVisible
							})]
						})
					] }),
					/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx(Label, {
							className: "text-sm font-medium",
							children: "Bio"
						}),
						/* @__PURE__ */ jsx(Textarea, {
							value: bio,
							onChange: (e) => {
								setBio(e.target.value);
								setBioCount(e.target.value.length);
							},
							maxLength: 300,
							placeholder: "Tell people about yourself...",
							className: "rounded-lg mt-1.5 resize-none min-h-[80px]"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "text-xs text-muted-foreground mt-1 text-right",
							children: [bioCount, "/300"]
						})
					] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Label, {
						className: "text-sm font-medium",
						children: "Pronouns"
					}), /* @__PURE__ */ jsx(Input, {
						value: pronouns,
						onChange: (e) => setPronouns(e.target.value),
						placeholder: "e.g. they/them, she/her, he/him",
						className: "h-11 rounded-lg mt-1.5"
					})] }),
					/* @__PURE__ */ jsx(LocationPicker, {
						value: locationId,
						onChange: setLocationId
					}),
					/* @__PURE__ */ jsxs(Collapsible, {
						open: emailOpen,
						onOpenChange: setEmailOpen,
						children: [/* @__PURE__ */ jsxs(CollapsibleTrigger, {
							onClick: () => !emailOpen && fetchEmail(),
							className: "flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-foreground/80 transition-colors",
							children: [/* @__PURE__ */ jsx(ChevronDown, {
								size: 16,
								className: `transition-transform ${emailOpen ? "rotate-180" : ""}`
							}), "Change Email"]
						}), /* @__PURE__ */ jsxs(CollapsibleContent, {
							className: "space-y-3 pt-2",
							children: [
								currentEmail && /* @__PURE__ */ jsxs("p", {
									className: "text-xs text-muted-foreground",
									children: ["Current: ", currentEmail]
								}),
								/* @__PURE__ */ jsx(Input, {
									type: "email",
									value: newEmail,
									onChange: (e) => setNewEmail(e.target.value),
									placeholder: "New email address",
									className: "h-11 rounded-lg"
								}),
								/* @__PURE__ */ jsx(Button, {
									variant: "secondary",
									onClick: handleEmailChange,
									disabled: emailSaving || !newEmail,
									className: "rounded-lg w-full",
									children: emailSaving ? "Sending..." : "Change Email"
								})
							]
						})]
					}),
					/* @__PURE__ */ jsxs(Collapsible, {
						open: passOpen,
						onOpenChange: setPassOpen,
						children: [/* @__PURE__ */ jsxs(CollapsibleTrigger, {
							className: "flex items-center gap-2 text-sm font-medium w-full py-2 hover:text-foreground/80 transition-colors",
							children: [/* @__PURE__ */ jsx(ChevronDown, {
								size: 16,
								className: `transition-transform ${passOpen ? "rotate-180" : ""}`
							}), "Change Password"]
						}), /* @__PURE__ */ jsxs(CollapsibleContent, {
							className: "space-y-3 pt-2",
							children: [
								/* @__PURE__ */ jsx(Input, {
									type: "password",
									value: newPass,
									onChange: (e) => setNewPass(e.target.value),
									placeholder: "New password",
									className: "h-11 rounded-lg"
								}),
								/* @__PURE__ */ jsx(Input, {
									type: "password",
									value: confirmPass,
									onChange: (e) => setConfirmPass(e.target.value),
									placeholder: "Confirm new password",
									className: "h-11 rounded-lg"
								}),
								/* @__PURE__ */ jsx(Button, {
									variant: "secondary",
									onClick: handlePassChange,
									disabled: passSaving || !newPass || !confirmPass,
									className: "rounded-lg w-full",
									children: passSaving ? "Saving..." : "Change Password"
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-3 px-4 pb-6 pt-2",
				children: [/* @__PURE__ */ jsx(Button, {
					variant: "ghost",
					onClick: onCancel,
					className: "flex-1 h-11 rounded-lg",
					children: "Cancel"
				}), /* @__PURE__ */ jsx(Button, {
					onClick: handleSave,
					disabled: saving,
					className: "flex-1 h-11 rounded-lg active:scale-[0.97]",
					children: saving ? "Saving..." : "Save"
				})]
			})
		]
	});
}
//#endregion
//#region src/hooks/useProfile.ts
function useProfile(userId) {
	const [profile, setProfile] = useState(null);
	const [stats, setStats] = useState({
		followingCount: 0,
		followerCount: 0
	});
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const fetchProfile = useCallback(async () => {
		if (!userId) return;
		setLoading(true);
		setError(null);
		try {
			const { data, error: err } = await supabase.from("profiles").select("id, username, display_name, display_name_visible, bio, avatar_url, banner_url, pronouns, location_id, city, country, updated_at").eq("id", userId).maybeSingle();
			if (err) throw err;
			setProfile(data);
		} catch (e) {
			setError(e?.message ?? "Failed to load profile");
		} finally {
			setLoading(false);
		}
	}, [userId]);
	const fetchStats = useCallback(async () => {
		if (!userId) return;
		try {
			const [{ count: fc, error: fe }, { count: fr, error: ferr }] = await Promise.all([supabase.from("follows").select("*", {
				count: "exact",
				head: true
			}).eq("follower_id", userId), supabase.from("follows").select("*", {
				count: "exact",
				head: true
			}).eq("following_id", userId)]);
			if (!fe && !ferr) setStats({
				followingCount: fc ?? 0,
				followerCount: fr ?? 0
			});
		} catch {}
	}, [userId]);
	useEffect(() => {
		fetchProfile();
		fetchStats();
	}, [fetchProfile, fetchStats]);
	async function uploadImage(bucket, file) {
		const ext = file.name.split(".").pop() ?? "jpg";
		const path = `${userId}/${bucket === "avatars" ? "avatar" : "banner"}.${ext}`;
		const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
		if (uploadErr) throw new Error(`Storage error (${bucket}): ${uploadErr.message}`);
		const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
		return publicUrl.publicUrl;
	}
	async function updateProfile(fields) {
		if (!userId) return;
		setSaving(true);
		setError(null);
		try {
			const { error: err } = await supabase.from("profiles").update({
				...fields,
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("id", userId);
			if (err) throw err;
			await fetchProfile();
		} catch (e) {
			setError(e?.message ?? "Failed to save profile");
			throw e;
		} finally {
			setSaving(false);
		}
	}
	async function uploadBanner(file) {
		const url = await uploadImage("banners", file);
		await updateProfile({ banner_url: url });
		return url;
	}
	async function uploadAvatar(file) {
		const url = await uploadImage("avatars", file);
		await updateProfile({ avatar_url: url });
		return url;
	}
	return {
		profile,
		stats,
		loading,
		saving,
		error,
		refetch: fetchProfile,
		refetchStats: fetchStats,
		updateProfile,
		uploadAvatar,
		uploadBanner
	};
}
//#endregion
//#region src/components/profile/ProfileSheet.tsx
function ProfileSheet({ open, onClose }) {
	const [userId, setUserId] = useState(null);
	const [editing, setEditing] = useState(false);
	const [followSheet, setFollowSheet] = useState(null);
	useEffect(() => {
		if (open) supabase.auth.getUser().then(({ data }) => {
			setUserId(data.user?.id ?? null);
		});
	}, [open]);
	const { profile, stats, loading, saving, updateProfile, uploadAvatar, uploadBanner } = useProfile(userId);
	const displayName = profile?.display_name ?? profile?.username ?? "";
	const locationText = profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : profile?.country ?? null;
	function handleSignOut() {
		onClose();
		supabase.auth.signOut();
	}
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Sheet, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ jsx(SheetContent, {
			side: "right",
			className: "w-full sm:max-w-sm p-0 overflow-y-auto",
			children: loading && !profile ? /* @__PURE__ */ jsx("div", {
				className: "flex items-center justify-center py-20",
				children: /* @__PURE__ */ jsx("div", {
					className: "text-sm text-muted-foreground",
					children: "Loading..."
				})
			}) : editing && userId && profile ? /* @__PURE__ */ jsxs("div", {
				className: "relative",
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => setEditing(false),
					className: "absolute top-3 left-4 z-10 text-xs text-muted-foreground hover:text-foreground",
					children: "Cancel"
				}), /* @__PURE__ */ jsx(ProfileEditForm, {
					initial: {
						display_name: profile.display_name,
						bio: profile.bio,
						pronouns: profile.pronouns,
						location_id: profile.location_id,
						avatar_url: profile.avatar_url,
						banner_url: profile.banner_url,
						display_name_visible: profile.display_name_visible,
						username: profile.username
					},
					userId,
					onSave: async (fields) => {
						await updateProfile(fields);
						setEditing(false);
					},
					onUploadAvatar: uploadAvatar,
					onUploadBanner: uploadBanner,
					onCancel: () => setEditing(false),
					saving
				})]
			}) : /* @__PURE__ */ jsxs("div", {
				className: "flex flex-col min-h-full",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "relative w-full aspect-[3/1] bg-black overflow-hidden",
						children: profile?.banner_url ? /* @__PURE__ */ jsx("img", {
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
							children: profile?.avatar_url ? /* @__PURE__ */ jsx("img", {
								src: profile.avatar_url,
								alt: displayName,
								className: "h-full w-full object-cover"
							}) : /* @__PURE__ */ jsx("div", {
								className: "h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground",
								children: displayName.slice(0, 1).toUpperCase()
							})
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "px-4 pt-2 space-y-1",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "text-sm text-muted-foreground",
								children: ["@", profile?.username ?? "..."]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "text-xl font-semibold",
								children: displayName
							}),
							profile?.bio && /* @__PURE__ */ jsx("p", {
								className: "text-base text-foreground/80 pt-1",
								children: profile.bio
							}),
							profile?.pronouns && /* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted-foreground",
								children: profile.pronouns
							}),
							locationText && /* @__PURE__ */ jsx("p", {
								className: "text-sm text-muted-foreground",
								children: locationText
							})
						]
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
									children: stats.followingCount
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
									children: stats.followerCount
								}),
								" ",
								/* @__PURE__ */ jsx("span", {
									className: "text-muted-foreground",
									children: "followers"
								})
							]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "px-4 pt-4 space-y-2 mb-4",
						children: /* @__PURE__ */ jsxs(Button, {
							onClick: () => setEditing(true),
							className: "w-full h-11 rounded-lg active:scale-[0.97]",
							children: [/* @__PURE__ */ jsx(Pencil, {
								size: 16,
								className: "mr-2"
							}), "Edit Profile"]
						})
					}),
					/* @__PURE__ */ jsx("div", { className: "flex-1" }),
					/* @__PURE__ */ jsx("div", {
						className: "px-4 pb-6",
						children: /* @__PURE__ */ jsxs(Button, {
							variant: "ghost",
							onClick: handleSignOut,
							className: "w-full h-11 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10",
							children: [/* @__PURE__ */ jsx(LogOut, {
								size: 16,
								className: "mr-2"
							}), "Sign Out"]
						})
					})
				]
			})
		})
	}), /* @__PURE__ */ jsx(FollowListSheet, {
		open: followSheet !== null,
		onClose: () => setFollowSheet(null),
		type: followSheet ?? "followers",
		userId
	})] });
}
//#endregion
//#region src/routes/_authenticated/route.tsx?tsr-split=component
function AuthenticatedLayout() {
	const [tab, setTab] = useState("feed");
	const [discoverSection, setDiscoverSection] = useState("for-you");
	const [searchTrigger, setSearchTrigger] = useState(0);
	const [profile, setProfile] = useState(null);
	const [profileOpen, setProfileOpen] = useState(false);
	useEffect(() => {
		(async () => {
			const { data: u } = await supabase.auth.getUser();
			if (!u.user) return;
			const { data } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", u.user.id).maybeSingle();
			if (data) setProfile(data);
		})();
	}, []);
	return /* @__PURE__ */ jsx(TabContext.Provider, {
		value: {
			activeTab: tab,
			setTab,
			profile,
			discoverSection,
			setDiscoverSection,
			triggerSearch: () => setSearchTrigger((n) => n + 1)
		},
		children: /* @__PURE__ */ jsxs("div", {
			className: "min-h-screen bg-background text-foreground",
			children: [
				/* @__PURE__ */ jsx(AppHeader, {
					activeTab: tab,
					onTabChange: setTab,
					avatarUrl: profile?.avatar_url,
					displayName: profile?.display_name ?? profile?.username,
					onProfileClick: () => setProfileOpen(true),
					triggerSearch: searchTrigger
				}),
				/* @__PURE__ */ jsx(Outlet, {}),
				/* @__PURE__ */ jsx(BottomNav, {
					activeTab: tab,
					onTabChange: setTab
				}),
				/* @__PURE__ */ jsx(ProfileSheet, {
					open: profileOpen,
					onClose: () => setProfileOpen(false)
				})
			]
		})
	});
}
//#endregion
export { AuthenticatedLayout as component };
