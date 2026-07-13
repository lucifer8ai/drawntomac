import { t as supabase } from "./client-BSC3GyEp.js";
import { createFileRoute, lazyRouteComponent, notFound } from "@tanstack/react-router";
//#region src/routes/song.$slug.tsx
var $$splitNotFoundComponentImporter = () => import("./song._slug-D2KOHW39.js");
var $$splitErrorComponentImporter = () => import("./song._slug-DnekWk9o.js");
var $$splitComponentImporter = () => import("./song._slug-C3G6f3Uy.js");
var Route = createFileRoute("/song/$slug")({
	head: ({ loaderData }) => {
		const song = loaderData?.song;
		const title = song ? `${song.title} — ${song.artist?.name ?? "Unknown"} · #drawnto` : "#drawnto";
		return { meta: [
			{ title },
			{
				name: "description",
				content: song ? `Reviews and listens for ${song.title}.` : "#drawnto"
			},
			{
				property: "og:title",
				content: title
			},
			...song?.genius_thumbnail_url ? [{
				property: "og:image",
				content: song.genius_thumbnail_url
			}] : []
		] };
	},
	loader: async ({ params }) => {
		const { data: song, error } = await supabase.from("songs").select("*, artist:artists(*)").eq("slug", params.slug).maybeSingle();
		if (error) throw error;
		if (!song) throw notFound();
		return { song };
	},
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
	notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent")
});
//#endregion
export { Route as t };
