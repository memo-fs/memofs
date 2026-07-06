import type { Ref } from "vue";
import { onMounted, onUnmounted } from "vue";

interface ChatItem {
	label: string;
	provider: string;
	url: string;
	supportsUrlPrefill: boolean;
	urlParam: string;
}

const items: ChatItem[] = [
	{
		label: "ChatGPT",
		provider: "openai",
		url: "https://chatgpt.com",
		supportsUrlPrefill: true,
		urlParam: "q",
	},
	{
		label: "Claude",
		provider: "anthropic",
		url: "https://claude.ai/new",
		supportsUrlPrefill: true,
		urlParam: "q",
	},
];

function useClickOutside(elRef: Ref<HTMLElement | null>, callback: () => void) {
	const handler = (event: MouseEvent) => {
		if (elRef.value && !elRef.value.contains(event.target as Node)) {
			callback();
		}
	};
	onMounted(() => document.addEventListener("click", handler));
	onUnmounted(() => document.removeEventListener("click", handler));
}

function getRawMarkdownUrl(path: string): string | null {
	const repo = "https://github.com/christophersesugh/memofs";
	const branch = "main";
	const docsPath = "apps/docs";

	const cleanPath = path.startsWith("/") ? path.slice(1) : path;
	const mdPath = cleanPath.endsWith("/")
		? `${cleanPath}index.md`
		: `${cleanPath}.md`;

	return `${repo.replace("github.com", "raw.githubusercontent.com")}/${branch}/${docsPath}/${mdPath}`;
}

async function fetchMarkdown(path: string): Promise<string | null> {
	try {
		const url = getRawMarkdownUrl(path);
		if (!url) return null;
		const response = await fetch(url);
		if (!response.ok) return null;
		return await response.text();
	} catch {
		return null;
	}
}

function buildChatUrl(item: ChatItem, content: string): string {
	if (item.supportsUrlPrefill) {
		const prompt = content.length > 2000 ? content.slice(0, 2000) : content;
		return `${item.url}?${item.urlParam}=${encodeURIComponent(prompt)}`;
	}
	return item.url;
}

export {
	buildChatUrl,
	fetchMarkdown,
	getRawMarkdownUrl,
	items,
	useClickOutside,
};
