import type { Config } from "@react-router/dev/config";

export default {
	// SSR on Workers via @react-router/cloudflare + Static Assets.
	ssr: true,
	appDirectory: "src",
} satisfies Config;
