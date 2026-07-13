import { t as supabase } from "./client-BSC3GyEp.js";
import { n as cn, t as Button } from "./button-KZXYNBVn.js";
import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { UserMinus, X } from "lucide-react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
//#region src/components/ui/sheet.tsx
var Sheet = SheetPrimitive.Root;
var SheetPortal = SheetPrimitive.Portal;
var SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Overlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [/* @__PURE__ */ jsx(SheetOverlay, {}), /* @__PURE__ */ jsxs(SheetPrimitive.Content, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ jsxs(SheetPrimitive.Close, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = SheetPrimitive.Content.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Title, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
var SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Description, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
//#endregion
//#region src/components/profile/FollowListSheet.tsx
function FollowListSheet({ open, onClose, type, userId }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	useEffect(() => {
		if (!open || !userId) return;
		setLoading(true);
		const column = type === "following" ? "follower_id" : "following_id";
		const idCol = type === "following" ? "following_id" : "follower_id";
		supabase.from("follows").select(idCol).eq(column, userId).then(async ({ data, error }) => {
			if (error || !data) {
				setLoading(false);
				return;
			}
			const ids = data.map((r) => r[idCol]);
			if (ids.length === 0) {
				setRows([]);
				setLoading(false);
				return;
			}
			const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, display_name").in("id", ids);
			setRows((profiles ?? []).map((p) => ({
				id: p.id,
				username: p.username,
				avatar_url: p.avatar_url,
				display_name: p.display_name
			})));
			setLoading(false);
		});
	}, [
		open,
		userId,
		type
	]);
	async function handleUnfollow(targetId) {
		if (!userId) return;
		const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
		if (!error) setRows((prev) => prev.filter((r) => r.id !== targetId));
	}
	return /* @__PURE__ */ jsx(Sheet, {
		open,
		onOpenChange: (o) => !o && onClose(),
		children: /* @__PURE__ */ jsxs(SheetContent, {
			side: "right",
			className: "w-full sm:max-w-sm p-0",
			children: [/* @__PURE__ */ jsx(SheetHeader, {
				className: "p-4 border-b",
				children: /* @__PURE__ */ jsx(SheetTitle, { children: type === "following" ? "Following" : "Followers" })
			}), /* @__PURE__ */ jsxs("div", {
				className: "overflow-y-auto max-h-[calc(100vh-80px)]",
				children: [
					loading && /* @__PURE__ */ jsx("div", {
						className: "p-4 text-sm text-muted-foreground",
						children: "Loading..."
					}),
					!loading && rows.length === 0 && /* @__PURE__ */ jsx("div", {
						className: "p-4 text-sm text-muted-foreground",
						children: type === "following" ? "Not following anyone yet." : "No followers yet."
					}),
					rows.map((row) => /* @__PURE__ */ jsxs(Link, {
						to: "/user/$username",
						params: { username: row.username },
						className: "flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-white/[0.03] transition-colors",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0",
								children: row.avatar_url ? /* @__PURE__ */ jsx("img", {
									src: row.avatar_url,
									alt: "",
									className: "h-full w-full object-cover"
								}) : /* @__PURE__ */ jsx("div", {
									className: "h-full w-full flex items-center justify-center text-sm font-bold text-muted-foreground",
									children: (row.username ?? "U").slice(0, 1).toUpperCase()
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ jsx("div", {
									className: "text-sm font-semibold truncate",
									children: row.display_name ?? row.username
								}), /* @__PURE__ */ jsxs("div", {
									className: "text-xs text-muted-foreground truncate",
									children: ["@", row.username]
								})]
							}),
							type === "following" && /* @__PURE__ */ jsx(Button, {
								variant: "ghost",
								size: "icon",
								className: "h-8 w-8 text-muted-foreground hover:text-destructive",
								onClick: (e) => {
									e.preventDefault();
									handleUnfollow(row.id);
								},
								children: /* @__PURE__ */ jsx(UserMinus, { size: 16 })
							})
						]
					}, row.id))
				]
			})]
		})
	});
}
//#endregion
export { Sheet as n, SheetContent as r, FollowListSheet as t };
