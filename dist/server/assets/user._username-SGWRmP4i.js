import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
//#region src/routes/_authenticated/user.$username.tsx
var $$splitComponentImporter = () => import("./user._username-BnTUxPbY.js");
var Route = createFileRoute("/_authenticated/user/$username")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
