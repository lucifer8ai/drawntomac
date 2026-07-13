import { t as supabase } from "./client-BSC3GyEp.js";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/auth/callback.tsx?tsr-split=component
function AuthCallback() {
	const navigate = useNavigate();
	useEffect(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === "SIGNED_IN" && session) navigate({ to: "/home" });
			if (event === "SIGNED_OUT") navigate({ to: "/" });
		});
		supabase.auth.getSession().then(({ data, error }) => {
			if (error) {
				toast.error("Authentication failed. Please try again.");
				navigate({ to: "/" });
			} else if (data.session) navigate({ to: "/home" });
		});
		return () => sub.subscription.unsubscribe();
	}, [navigate]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex h-screen items-center justify-center",
		children: /* @__PURE__ */ jsx("p", {
			className: "text-muted-foreground",
			children: "Signing you in..."
		})
	});
}
//#endregion
export { AuthCallback as component };
