import { t as Shell } from "./song._slug-BJ3j-Xna.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/song.$slug.tsx?tsr-split=errorComponent
var SplitErrorComponent = ({ error }) => /* @__PURE__ */ jsx(Shell, { children: /* @__PURE__ */ jsxs("div", {
	className: "mx-auto max-w-2xl p-8 text-center text-white/70",
	children: ["Couldn't load this song. ", error.message]
}) });
//#endregion
export { SplitErrorComponent as errorComponent };
