import { createCookieSessionStorage } from "react-router";
import { createThemeSessionResolver } from "remix-themes";
import { env } from "./env.server";

const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: "__tm_themes",
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secrets: ["s3cr3t"],
		...(env.NODE_ENV === "production"
			? {
					domain: "memo.tekbreed.com",
					secure: true,
				}
			: {}),
	},
});

export const themeSessionResolver = createThemeSessionResolver(sessionStorage);
