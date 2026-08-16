export interface BrandInfo {
	name: string;
	icon: string;
}

export const brandMap: Record<string, BrandInfo> = {
	aider: { name: "Aider", icon: "simple-icons:python" },
	"amazon-q": { name: "Amazon Q", icon: "simple-icons:amazonaws" },
	antigravity: { name: "Google Antigravity", icon: "logos:google-icon" },
	claude: { name: "Claude Code", icon: "simple-icons:anthropic" },
	cline: { name: "Cline", icon: "ph:robot-bold" },
	codex: { name: "Codex", icon: "simple-icons:openai" },
	"command-code": { name: "Command Code", icon: "ph:terminal-window-bold" },
	copilot: { name: "GitHub Copilot", icon: "simple-icons:githubcopilot" },
	cursor: { name: "Cursor", icon: "simple-icons:cursor" },
	gemini: { name: "Gemini CLI", icon: "simple-icons:googlegemini" },
	github: { name: "GitHub", icon: "simple-icons:github" },
	jetbrains: { name: "JetBrains AI", icon: "simple-icons:jetbrains" },
	"kilo-code": { name: "Kilo Code", icon: "ph:lightning-bold" },
	linear: { name: "Linear", icon: "simple-icons:linear" },
	notion: { name: "Notion", icon: "simple-icons:notion" },
	opencode: { name: "OpenCode", icon: "ph:code-bold" },
	vercel: { name: "Vercel AI SDK", icon: "simple-icons:vercel" },
	windsurf: { name: "Windsurf", icon: "simple-icons:codeium" },
	zed: { name: "Zed AI", icon: "simple-icons:zeddotdev" },
	langchain: { name: "LangChain", icon: "simple-icons:langchain" },
	cloudflare: { name: "Cloudflare", icon: "simple-icons:cloudflare" },
	node: { name: "Node.js", icon: "simple-icons:nodedotjs" },
	openai: { name: "OpenAI", icon: "simple-icons:openai" },
	memofs: { name: "MemoFS", icon: "ph:brain-bold" },
};

export function getBrandIconType(
	target: string | { url?: string; frontmatter?: { title?: string } },
): string {
	let combined = "";
	if (typeof target === "string") {
		combined = target.toLowerCase();
	} else if (target) {
		const url = (target.url || "").toLowerCase();
		const title = (target.frontmatter?.title || "").toLowerCase();
		combined = `${url} ${title}`;
	}

	if (combined.includes("aider")) return "aider";
	if (combined.includes("amazon")) return "amazon-q";
	if (combined.includes("antigravity")) return "antigravity";
	if (combined.includes("claude")) return "claude";
	if (combined.includes("cline")) return "cline";
	if (combined.includes("codex")) return "codex";
	if (combined.includes("command")) return "command-code";
	if (combined.includes("copilot")) return "copilot";
	if (combined.includes("cursor")) return "cursor";
	if (combined.includes("gemini")) return "gemini";
	if (combined.includes("github")) return "github";
	if (combined.includes("jetbrains")) return "jetbrains";
	if (combined.includes("kilo")) return "kilo-code";
	if (combined.includes("linear")) return "linear";
	if (combined.includes("notion")) return "notion";
	if (combined.includes("opencode")) return "opencode";
	if (combined.includes("vercel")) return "vercel";
	if (combined.includes("windsurf")) return "windsurf";
	if (combined.includes("zed")) return "zed";
	if (combined.includes("langchain")) return "langchain";
	if (combined.includes("cloudflare")) return "cloudflare";
	if (combined.includes("node")) return "node";
	if (combined.includes("openai")) return "openai";
	return "memofs";
}

const defaultBrand: BrandInfo = { name: "MemoFS", icon: "ph:brain-bold" };

export function getBrandInfo(
	target: string | { url?: string; frontmatter?: { title?: string } },
): BrandInfo {
	const type = getBrandIconType(target);
	return brandMap[type] ?? brandMap.memofs ?? defaultBrand;
}
