import closeWithGrace from "close-with-grace";
import { type HttpHandler, http, passthrough } from "msw";
import { setupServer } from "msw/node";
import { env } from "~/utils/env.server";

// import { handlers as bunnyHandlers } from "./bunny";
// import { handlers as chatbotHandlers } from "./chat";
// import { handlers as discordHandlers } from "./discord";
// import { handlers as githubHandlers } from "./github";
// import { handlers as polarHandlers } from "./polar";
// import { handlers as resendHandlers } from "./resend";
// import { handlers as sanityHandlers } from "./sanity";
// import { handlers as vectorHandlers } from "./vector";
// import { handlers as voyageHandlers } from "./vogage";

// React Router Dev Tools
const miscHandlers: HttpHandler[] =
	env.NODE_ENV === "development"
		? [http.post(/http:\/\/localhost:5173\/.*/, passthrough)]
		: [];

export const server = setupServer(
	...miscHandlers,
	// ...resendHandlers,
	// ...bunnyHandlers,
	// ...sanityHandlers,
	// ...githubHandlers,
	// ...polarHandlers,
	// ...voyageHandlers,
	// ...vectorHandlers,
	// ...chatbotHandlers,
	// ...discordHandlers,
);
server.listen({ onUnhandledRequest: "warn" });
console.info("🔶 Mock server installed");

closeWithGrace(() => {
	server.close();
});
