import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft } from "lucide-react";
//#region src/routes/song.$slug.tsx?tsr-shared=1
function Shell({ children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-background text-foreground",
		children: [/* @__PURE__ */ jsx("header", {
			className: "sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xl",
			children: /* @__PURE__ */ jsxs("div", {
				className: "mx-auto flex max-w-5xl items-center justify-between px-4 py-3",
				children: [/* @__PURE__ */ jsx(Link, {
					to: "/home",
					className: "text-2xl font-black tracking-tight text-foreground",
					children: "#d.To"
				}), /* @__PURE__ */ jsxs(Link, {
					to: "/home",
					className: "flex items-center gap-1 text-xs font-semibold text-muted-foreground",
					children: [/* @__PURE__ */ jsx(ArrowLeft, { size: 16 }), "Back"]
				})]
			})
		}), children]
	});
}
//#endregion
export { Shell as t };
