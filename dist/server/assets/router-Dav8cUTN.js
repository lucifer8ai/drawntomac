import { t as Route$6 } from "./route-DKTgVvq3.js";
import { t as Route$7 } from "./song._slug-zSAgPsk8.js";
import { t as Route$8 } from "./user._username-SGWRmP4i.js";
import { useEffect } from "react";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { z } from "zod";
//#region src/styles.css?url
var styles_default = "/assets/styles-C72K4h8W.css";
//#endregion
//#region src/routes/__root.tsx
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6",
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	useEffect(() => {
		console.error("[root error boundary]", error);
	}, [error]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or headback home."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$5 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title: "#drawnto — true music chooses you" },
			{
				name: "description",
				content: "Choose your music and your community. Sign in to #drawnto."
			},
			{
				name: "author",
				content: "#drawnto"
			},
			{
				property: "og:title",
				content: "#drawnto"
			},
			{
				property: "og:description",
				content: "Choose your music and your community."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "preconnect",
				href: "https://fonts.bunny.net"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.bunny.net/css?family=dm-sans:200,300,400,500,600,700,800,900&display=swap"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$5.useRouteContext();
	return /* @__PURE__ */ jsxs(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(Toaster, {
			theme: "dark",
			position: "top-center"
		})]
	});
}
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$2 = () => import("./routes-D1ihf1CY.js");
var Route$4 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "#drawnTo — i don't just listen, i feel it" },
		{
			name: "description",
			content: "#drawnTo — a space for people who feel music deeply. Log, review, and find your people."
		},
		{
			property: "og:title",
			content: "#drawnTo — i don't just listen, i feel it"
		},
		{
			property: "og:description",
			content: "A space for people who feel music deeply."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
//#endregion
//#region src/routes/auth/callback.tsx
var $$splitComponentImporter$1 = () => import("./callback-CUhQCER3.js");
var Route$3 = createFileRoute("/auth/callback")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
//#endregion
//#region src/lib/musicbrainz.ts
var MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2";
var USER_AGENT = "drawnto/1.0 (drawnTo.fm)";
var ALLOWED_COUNTRIES = [
	"IN",
	"US",
	"GB",
	"AU",
	"CA",
	"XW",
	"PK"
];
var ALLOWED_ARTISTS = ["Anuv Jain", "Divine"];
function parseArtist(recording) {
	const credits = recording["artist-credit"];
	if (!credits || credits.length === 0) return {
		name: "Unknown",
		primaryName: "Unknown",
		mbid: null
	};
	const name = credits.map((c) => c.artist.name + (c.joinphrase ?? "")).join("").trim();
	const primary = credits[0].artist;
	return {
		name: name || primary.name,
		primaryName: primary.name,
		mbid: primary.id ?? null
	};
}
function normalizeDate(raw) {
	if (!raw) return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
	const ym = trimmed.match(/^(\d{4})-(\d{2})$/);
	if (ym) return `${ym[1]}-${ym[2]}-01`;
	const y = trimmed.match(/^(\d{4})$/);
	if (y) return `${y[1]}-01-01`;
	return null;
}
function parseDisambiguation(str) {
	if (!str) return {
		explicit: false,
		clean: false,
		hiRes: false
	};
	const lower = str.toLowerCase().trim();
	return {
		explicit: /\[explicit\]/i.test(lower),
		clean: /\[clean\]/i.test(lower),
		hiRes: /24-bit\s*(?:\/\s*)?96\s*khz/i.test(lower)
	};
}
function scoreRelease(release) {
	let score = 0;
	const status = (release.status ?? "").toLowerCase();
	if (status === "official") score += 3;
	else if (status === "promotion") score += 2;
	else if (status === "bootleg") score += 1;
	const dis = parseDisambiguation(release.disambiguation);
	if (dis.explicit) score += 1;
	if (dis.clean) score -= 1;
	if (dis.hiRes) score -= 2;
	if (release.country && ALLOWED_COUNTRIES.includes(release.country.toUpperCase())) score += 1;
	return score;
}
function releaseDateEpoch(release) {
	const normalized = normalizeDate(release.date ?? null);
	if (!normalized) return 0;
	return new Date(normalized).getTime() / 1e3;
}
function pickBestRelease(releases) {
	if (releases.length === 0) return null;
	if (releases.length === 1) return releases[0];
	const scored = releases.map((r) => ({
		release: r,
		score: scoreRelease(r),
		epoch: releaseDateEpoch(r)
	}));
	scored.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return b.epoch - a.epoch;
	});
	return scored[0].release;
}
function parseRecording(recording) {
	const artist = parseArtist(recording);
	const best = pickBestRelease(recording.releases ?? []);
	const rg = best?.["release-group"];
	const tags = (recording.tags ?? []).map((t) => t.name);
	return {
		mbid: recording.id,
		title: recording.title,
		artistName: artist.name,
		primaryArtistName: artist.primaryName,
		artistMbid: artist.mbid,
		releaseGroupMbid: rg?.id ?? null,
		releaseGroupTitle: rg?.title ?? null,
		releaseDate: normalizeDate(best?.date ?? null),
		country: best?.country ?? null,
		tags
	};
}
async function musicbrainzFetch(path) {
	const { checkRateLimit } = await import("./rate-limiter-BCguKXip.js");
	if (!await checkRateLimit("musicbrainz", 1, 1)) throw new Error("MusicBrainz rate limit exceeded — slow down and retry.");
	const url = `${MUSICBRAINZ_BASE}${path}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 15e3);
	try {
		return await fetch(url, {
			headers: {
				"User-Agent": USER_AGENT,
				Accept: "application/json"
			},
			signal: controller.signal
		});
	} finally {
		clearTimeout(timer);
	}
}
async function getSupabaseAdmin() {
	const { supabaseAdmin } = await import("./client.server-DzUna2e6.js");
	return supabaseAdmin;
}
/**
* Check if an artist is from an allowed country.
* Checks DB artist_countries cache first; on miss, fetches from MusicBrainz
* /artist/{mbid} and checks artist.country AND artist.area.iso-3166-1-codes.
*/
async function isArtistInAllowedArea(artistMbid) {
	if (!artistMbid) return false;
	const admin = await getSupabaseAdmin();
	const { data: cached } = await admin.from("artists").select("artist_countries").eq("musicbrainz_id", artistMbid).maybeSingle();
	if (cached?.artist_countries && cached.artist_countries.length > 0) return cached.artist_countries.some((c) => ALLOWED_COUNTRIES.includes(c.toUpperCase()));
	try {
		const res = await musicbrainzFetch(`/artist/${encodeURIComponent(artistMbid)}?fmt=json&inc=area`);
		if (!res.ok) return false;
		const artist = await res.json();
		const countries = [];
		if (artist.country) countries.push(artist.country);
		if (artist.area?.["iso-3166-1-codes"]) countries.push(...artist.area["iso-3166-1-codes"]);
		if (countries.length > 0) {
			const slug = artist.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 80);
			await admin.from("artists").upsert({
				musicbrainz_id: artistMbid,
				name: artist.name,
				slug,
				artist_countries: countries
			}, { onConflict: "musicbrainz_id" });
		}
		return countries.some((c) => ALLOWED_COUNTRIES.includes(c.toUpperCase()));
	} catch {
		return true;
	}
}
function deduplicateRecordings(recordings) {
	const groups = /* @__PURE__ */ new Map();
	for (const rec of recordings) {
		const primaryArtist = rec["artist-credit"]?.[0]?.artist?.name ?? "Unknown";
		const key = `${rec.title.toLowerCase()}||${primaryArtist.toLowerCase()}`;
		const best = pickBestRelease(rec.releases ?? []);
		const existing = groups.get(key);
		if (!existing) {
			groups.set(key, {
				recording: rec,
				best
			});
			continue;
		}
		if (best && !existing.best) groups.set(key, {
			recording: rec,
			best
		});
		else if (best && existing.best) {
			const newScore = scoreRelease(best);
			const oldScore = scoreRelease(existing.best);
			if (newScore > oldScore) groups.set(key, {
				recording: rec,
				best
			});
			else if (newScore === oldScore && releaseDateEpoch(best) > releaseDateEpoch(existing.best)) groups.set(key, {
				recording: rec,
				best
			});
		}
	}
	return Array.from(groups.values()).map((g) => g.recording);
}
async function searchRecordings(query, limit = 8, inc = "artists+tags+releases+genres", artist) {
	let q;
	if (artist) q = `recording:"${query}" AND artist:"${artist}"`;
	else q = query;
	const res = await musicbrainzFetch(`/recording?query=${encodeURIComponent(q)}&fmt=json&limit=${limit}&inc=${encodeURIComponent(inc)}`);
	if (!res.ok) {
		console.error("[musicbrainz search] error", res.status, res.statusText);
		return [];
	}
	return deduplicateRecordings((await res.json()).recordings ?? []).map(parseRecording);
}
async function getRecordingByMbid(mbid, inc = "artists+tags+releases+genres") {
	const res = await musicbrainzFetch(`/recording/${encodeURIComponent(mbid)}?fmt=json&inc=${encodeURIComponent(inc)}`);
	if (!res.ok) {
		if (res.status === 404) return null;
		console.error("[musicbrainz getByMbid] error", res.status, res.statusText);
		return null;
	}
	return parseRecording(await res.json());
}
//#endregion
//#region src/lib/genius.ts
var GENIUS_BASE = "https://api.genius.com";
function extractArtwork(hits) {
	for (const r of hits) {
		const thumb = r.song_art_image_thumbnail_url ?? r.header_image_thumbnail_url ?? r.song_art_image_url ?? r.header_image_url ?? null;
		if (thumb) {
			const artist = r.primary_artist;
			return {
				thumbnailUrl: thumb,
				geniusSongId: String(r.id),
				geniusArtistId: artist?.id ? String(artist.id) : null,
				artistImageUrl: artist?.image_url ?? artist?.header_image_url ?? null
			};
		}
	}
	return {
		thumbnailUrl: null,
		geniusSongId: null,
		geniusArtistId: null,
		artistImageUrl: null
	};
}
function cleanArtistName(name) {
	return name.replace(/\s*[&＋]\s*.+$/, "").replace(/\s*(?:feat\.?|ft\.?|vs\.?|x)\s*.+$/i, "").trim();
}
async function fetchGeniusSearch(token, query) {
	const res = await fetch(`${GENIUS_BASE}/search?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${token}` } });
	if (!res.ok) return [];
	return ((await res.json()).response?.hits ?? []).map((h) => h.result);
}
/**
* Search Genius for a song and return artwork + artist metadata.
*/
async function searchGeniusArtwork(artistName, songTitle) {
	const token = process.env.GENIUS_ACCESS_TOKEN;
	if (!token) {
		console.warn("[genius] GENIUS_ACCESS_TOKEN not set — skipping Genius fallback");
		return {
			thumbnailUrl: null,
			geniusSongId: null,
			geniusArtistId: null,
			artistImageUrl: null
		};
	}
	const empty = {
		thumbnailUrl: null,
		geniusSongId: null,
		geniusArtistId: null,
		artistImageUrl: null
	};
	try {
		let results = await fetchGeniusSearch(token, `${songTitle} ${artistName}`);
		let artwork = extractArtwork(results);
		if (artwork.thumbnailUrl) return artwork;
		const cleaned = cleanArtistName(artistName);
		if (cleaned !== artistName && cleaned.length > 0) {
			results = await fetchGeniusSearch(token, `${songTitle} ${cleaned}`);
			artwork = extractArtwork(results);
			if (artwork.thumbnailUrl) return artwork;
		}
		results = await fetchGeniusSearch(token, songTitle);
		artwork = extractArtwork(results);
		if (artwork.thumbnailUrl) return artwork;
		return empty;
	} catch {
		return empty;
	}
}
//#endregion
//#region src/routes/api/search.ts
function toHit(r) {
	return {
		mbid: r.mbid,
		title: r.title,
		artistName: r.artistName,
		primaryArtistName: r.primaryArtistName,
		artistMbid: r.artistMbid,
		releaseGroupMbid: r.releaseGroupMbid,
		releaseDate: r.releaseDate,
		thumbnailUrl: null
	};
}
var Route$2 = createFileRoute("/api/search")({ server: { handlers: { GET: async ({ request }) => {
	const url = new URL(request.url);
	const q = (url.searchParams.get("q") ?? "").trim();
	if (!q) return Response.json([]);
	const artist = (url.searchParams.get("artist") ?? "").trim() || void 0;
	try {
		const hits = (await searchRecordings(q, 8, "artists+tags+releases+genres", artist)).map(toHit);
		if (process.env.GENIUS_ACCESS_TOKEN && hits.length > 0) await Promise.allSettled(hits.map(async (hit) => {
			try {
				const genius = await searchGeniusArtwork(hit.primaryArtistName || hit.artistName, hit.title);
				if (genius.thumbnailUrl) hit.thumbnailUrl = genius.thumbnailUrl;
			} catch {}
		}));
		return Response.json(hits);
	} catch (err) {
		console.error("[search]", err);
		return Response.json({ error: err instanceof Error ? err.message : "Search failed" }, { status: 429 });
	}
} } } });
//#endregion
//#region src/lib/slugify.ts
function slugifyBase(text) {
	return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]+/g, "").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
}
/**
* Generate an API-agnostic slug: slugified-title + UUID prefix.
* No external IDs (iTunes, MusicBrainz, etc.) embedded in the slug.
*/
function generateSlug(title) {
	const prefix = crypto.randomUUID().split("-")[0];
	return `${slugifyBase(title)}-${prefix}`;
}
//#endregion
//#region src/routes/api/import.ts
var bodySchema = z.object({
	mbid: z.string().min(1),
	title: z.string().min(1),
	artistName: z.string().min(1),
	primaryArtistName: z.string().optional(),
	artistMbid: z.string().nullable().optional(),
	releaseGroupMbid: z.string().nullable().optional(),
	releaseDate: z.string().nullable().optional()
});
var Route$1 = createFileRoute("/api/import")({ server: { handlers: { POST: async ({ request }) => {
	let raw;
	try {
		raw = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = bodySchema.safeParse(raw);
	if (!parsed.success) return Response.json({
		error: "Invalid body",
		issues: parsed.error.issues
	}, { status: 400 });
	const body = parsed.data;
	const { supabaseAdmin } = await import("./client.server-DzUna2e6.js");
	const { data: existing } = await supabaseAdmin.from("songs").select("slug").eq("musicbrainz_id", body.mbid).maybeSingle();
	if (existing) {
		const genius = await searchGeniusArtwork(body.primaryArtistName || body.artistName, body.title);
		if (genius.geniusSongId || genius.thumbnailUrl) await supabaseAdmin.from("songs").update({
			genius_thumbnail_url: genius.thumbnailUrl,
			genius_song_id: genius.geniusSongId
		}).eq("musicbrainz_id", body.mbid);
		return Response.json({ slug: existing.slug });
	}
	const geniusLookupName = body.primaryArtistName || body.artistName;
	const [recording, genius] = await Promise.all([getRecordingByMbid(body.mbid).catch((err) => {
		console.warn("[import] getRecordingByMbid failed, proceeding with search data:", err.message);
		return null;
	}), searchGeniusArtwork(geniusLookupName, body.title)]);
	const coverUrl = genius.thumbnailUrl;
	const geniusSongId = genius.geniusSongId;
	const geniusArtistId = genius.geniusArtistId;
	const releaseCountry = recording?.country ?? null;
	const artistNameCheck = body.primaryArtistName || body.artistName;
	if (!releaseCountry || !ALLOWED_COUNTRIES.includes(releaseCountry.toUpperCase())) {
		if (!ALLOWED_ARTISTS.some((a) => artistNameCheck.toLowerCase() === a.toLowerCase()) && body.artistMbid) {
			if (!await isArtistInAllowedArea(body.artistMbid)) return Response.json({ error: "This artist is not from an allowed area." }, { status: 403 });
		}
	}
	const artistSlug = slugifyBase(body.artistName).slice(0, 80) || body.mbid;
	const { data: artist, error: artistErr } = await supabaseAdmin.from("artists").upsert({
		name: body.artistName,
		slug: artistSlug,
		musicbrainz_id: body.artistMbid ?? null,
		genius_artist_id: geniusArtistId,
		image_url: genius.artistImageUrl
	}, { onConflict: "musicbrainz_id" }).select("id").single();
	if (artistErr && artistErr.code !== "23505") {
		console.error("[import] artist upsert", artistErr);
		return Response.json({ error: artistErr.message }, { status: 500 });
	}
	let artistId = artist?.id ?? null;
	if (!artistId && body.artistMbid) {
		const { data: refetched } = await supabaseAdmin.from("artists").select("id").eq("musicbrainz_id", body.artistMbid).single();
		artistId = refetched?.id ?? null;
	}
	const slug = generateSlug(body.title);
	const releaseGroupMbid = recording?.releaseGroupMbid ?? body.releaseGroupMbid ?? null;
	const releaseDate = recording?.releaseDate ?? body.releaseDate ?? null;
	const tags = recording?.tags ?? [];
	const songRow = {
		title: body.title,
		slug,
		musicbrainz_id: body.mbid,
		artist_id: artistId,
		genius_thumbnail_url: coverUrl,
		genius_song_id: geniusSongId,
		genre_tags: tags,
		credits: null,
		release_group_mbid: releaseGroupMbid,
		country: releaseCountry,
		release_date: releaseDate
	};
	const { error: songErr } = await supabaseAdmin.from("songs").upsert(songRow, { onConflict: "musicbrainz_id" });
	if (songErr) {
		console.error("[import] song upsert", songErr);
		return Response.json({ error: songErr.message }, { status: 500 });
	}
	return Response.json({ slug });
} } } });
//#endregion
//#region src/routes/_authenticated/home.tsx
var $$splitComponentImporter = () => import("./home-Kg1fVld7.js");
var Route = createFileRoute("/_authenticated/home")({
	head: () => ({ meta: [{ title: "#drawnto" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
//#region src/routeTree.gen.ts
var AuthenticatedRouteRoute = Route$6.update({
	id: "/_authenticated",
	getParentRoute: () => Route$5
});
var IndexRoute = Route$4.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$5
});
var SongSlugRoute = Route$7.update({
	id: "/song/$slug",
	path: "/song/$slug",
	getParentRoute: () => Route$5
});
var AuthCallbackRoute = Route$3.update({
	id: "/auth/callback",
	path: "/auth/callback",
	getParentRoute: () => Route$5
});
var ApiSearchRoute = Route$2.update({
	id: "/api/search",
	path: "/api/search",
	getParentRoute: () => Route$5
});
var ApiImportRoute = Route$1.update({
	id: "/api/import",
	path: "/api/import",
	getParentRoute: () => Route$5
});
var AuthenticatedRouteRouteChildren = {
	AuthenticatedHomeRoute: Route.update({
		id: "/home",
		path: "/home",
		getParentRoute: () => AuthenticatedRouteRoute
	}),
	AuthenticatedUserUsernameRoute: Route$8.update({
		id: "/user/$username",
		path: "/user/$username",
		getParentRoute: () => AuthenticatedRouteRoute
	})
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	ApiImportRoute,
	ApiSearchRoute,
	AuthCallbackRoute,
	SongSlugRoute
};
var routeTree = Route$5._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
