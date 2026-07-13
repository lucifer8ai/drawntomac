//#region \0tanstack-start-manifest:v
var tsrStartManifest = () => ({ routes: {
	__root__: {
		filePath: "/Users/lucifer/Desktop/drawntomac/src/routes/__root.tsx",
		children: [
			"/",
			"/_authenticated",
			"/api/import",
			"/api/search",
			"/auth/callback",
			"/song/$slug"
		],
		preloads: [
			"/assets/index-Bp0Ne0Kj.js",
			"/assets/useRouter-FiGDFqj1.js",
			"/assets/link-BwT8cK9U.js"
		],
		scripts: [{ attrs: {
			type: "module",
			async: !0,
			src: "/assets/index-Bp0Ne0Kj.js"
		} }]
	},
	"/": {
		filePath: "/Users/lucifer/Desktop/drawntomac/src/routes/index.tsx",
		children: void 0,
		preloads: ["/assets/routes-CA06wWUs.js"]
	},
	"/_authenticated": {
		filePath: "/Users/lucifer/Desktop/drawntomac/src/routes/_authenticated/route.tsx",
		children: ["/_authenticated/home", "/_authenticated/user/$username"],
		preloads: [
			"/assets/route-B6vhSxjp.js",
			"/assets/button-DDr4gPX9.js",
			"/assets/createLucideIcon-q8a6UKNN.js",
			"/assets/pencil-B8E3yGKx.js",
			"/assets/FollowListSheet-C5i0GToH.js"
		]
	},
	"/_authenticated/home": {
		filePath: "/Users/lucifer/Desktop/drawntomac/src/routes/_authenticated/home.tsx",
		children: void 0,
		preloads: [
			"/assets/home-BYKasUj4.js",
			"/assets/thumbs-down-Bz_3h8ki.js",
			"/assets/x-CM0O7c_z.js"
		]
	},
	"/auth/callback": {
		filePath: "/Users/lucifer/Desktop/drawntomac/src/routes/auth/callback.tsx",
		children: void 0,
		preloads: ["/assets/callback-D5MKZkGU.js"]
	},
	"/song/$slug": {
		filePath: "/Users/lucifer/Desktop/drawntomac/src/routes/song.$slug.tsx",
		children: void 0,
		preloads: [
			"/assets/song._slug-D3KqFmfp.js",
			"/assets/button-DDr4gPX9.js",
			"/assets/createLucideIcon-q8a6UKNN.js",
			"/assets/song._slug-CK7L7dCV.js",
			"/assets/thumbs-down-Bz_3h8ki.js",
			"/assets/pencil-B8E3yGKx.js",
			"/assets/song._slug-Dwy-JvzW.js",
			"/assets/song._slug-f8l7uZLd.js"
		]
	},
	"/_authenticated/user/$username": {
		filePath: "/Users/lucifer/Desktop/drawntomac/src/routes/_authenticated/user.$username.tsx",
		children: void 0,
		preloads: ["/assets/user._username-BYqFscMe.js"]
	}
} });
//#endregion
export { tsrStartManifest };
