import { t as supabase } from "./client-BSC3GyEp.js";
import { createContext, useContext } from "react";
import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
//#region src/routes/_authenticated/route.tsx
var $$splitComponentImporter = () => import("./route-YiK9HIyF.js");
var TabContext = createContext({
	activeTab: "feed",
	setTab: () => {},
	profile: null,
	discoverSection: "for-you",
	setDiscoverSection: () => {},
	triggerSearch: () => {}
});
var useTabContext = () => useContext(TabContext);
var Route = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async () => {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) throw redirect({ to: "/" });
		return { user: data.user };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { TabContext as n, useTabContext as r, Route as t };
