<script setup lang="ts">
import { useData } from "vitepress";
import { computed, ref } from "vue";
import {
	buildChatUrl,
	fetchMarkdown,
	getRawMarkdownUrl,
	items,
	useClickOutside,
} from "../composables/useAskAi";

const open = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const copied = ref(false);
const toast = ref<{ message: string; type: "success" | "error" } | null>(null);
const { page } = useData();

useClickOutside(dropdownRef, () => {
	open.value = false;
});

const currentPath = computed(() => page.value.filePath.replace(/\.md$/, ""));
const dropdownText = computed(() => (copied.value ? "Copied!" : "Copy page"));

function showToast(message: string, type: "success" | "error" = "success") {
	toast.value = { message, type };
	setTimeout(() => (toast.value = null), 3000);
}

async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		try {
			const textarea = document.createElement("textarea");
			textarea.value = text;
			textarea.style.position = "fixed";
			textarea.style.opacity = "0";
			document.body.appendChild(textarea);
			textarea.select();
			const success = document.execCommand("copy");
			document.body.removeChild(textarea);
			return success;
		} catch {
			return false;
		}
	}
}

async function handleAction(provider: string | null = null) {
	const markdown = await fetchMarkdown(currentPath.value);

	if (!markdown) {
		showToast("Failed to fetch page content.", "error");
		return;
	}

	if (provider === "view-markdown") {
		const rawUrl = getRawMarkdownUrl(currentPath.value);
		if (rawUrl) {
			window.open(rawUrl, "_blank");
			showToast("Opening raw markdown...");
		} else {
			showToast("Failed to get markdown URL.", "error");
		}
		open.value = false;
		return;
	}

	if (provider) {
		const item = items.find((i) => i.provider === provider);
		if (item) {
			const chatUrl = buildChatUrl(item, markdown);

			if (item.supportsUrlPrefill) {
				showToast(`Opening ${item.label} with page content...`);
			} else {
				const copied = await copyToClipboard(markdown);
				if (copied) {
					showToast(`Copied. Paste into ${item.label} (Cmd+V)`);
				} else {
					showToast("Failed to copy. Please copy manually.", "error");
				}
			}

			window.open(chatUrl, "_blank");
		}
	} else {
		const success = await copyToClipboard(markdown);
		if (success) {
			copied.value = true;
			setTimeout(() => (copied.value = false), 2000);
			showToast("Page copied to clipboard.");
		} else {
			showToast("Failed to copy to clipboard.", "error");
		}
	}

	open.value = false;
}
</script>

<template>
	<div ref="dropdownRef" class="ask-ai-bar">
		<button class="ask-ai-btn" @click.stop="open = !open">
			<span class="ask-ai-btn-text">{{ dropdownText }}</span>
			<svg class="ask-ai-btn-icon" :class="{ open }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="6 9 12 15 18 9"></polyline>
			</svg>
		</button>
		<Transition name="ask-ai-dropdown">
			<div v-show="open" class="ask-ai-dropdown">
				<div class="ask-ai-dropdown-inner">
					<button class="ask-ai-dropdown-item" @click="handleAction()">
						<span class="ask-ai-dropdown-label">Copy page</span>
					</button>
					<button class="ask-ai-dropdown-item" @click="handleAction('view-markdown')">
						<span class="ask-ai-dropdown-label">View as Markdown</span>
					</button>
					<div class="ask-ai-dropdown-divider"></div>
					<button
						v-for="item in items"
						:key="item.provider"
						class="ask-ai-dropdown-item"
						@click="handleAction(item.provider)"
					>
						<span class="ask-ai-dropdown-label">{{ item.label }}</span>
					</button>
				</div>
			</div>
		</Transition>
		<Transition name="ask-ai-toast">
			<div v-if="toast" class="ask-ai-toast" :class="toast.type">
				{{ toast.message }}
			</div>
		</Transition>
	</div>
</template>

<style scoped>
.ask-ai-bar {
	position: relative;
	display: inline-flex;
	align-items: center;
}

.ask-ai-btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 12px;
	font-size: 13px;
	font-weight: 500;
	color: var(--vp-c-text-2);
	background: var(--vp-c-bg-soft);
	border: 1px solid var(--vp-c-divider);
	border-radius: 0;
	cursor: pointer;
	transition: color 0.2s, background-color 0.2s, border-color 0.2s;
}

.ask-ai-btn:hover {
	color: var(--vp-c-text-1);
	background: var(--vp-c-bg-mute);
	border-color: var(--vp-c-brand-1);
}

.ask-ai-btn-icon {
	width: 14px;
	height: 14px;
	transition: transform 0.2s;
}

.ask-ai-btn-icon.open {
	transform: rotate(180deg);
}

.ask-ai-dropdown {
	position: absolute;
	top: calc(100% + 6px);
	right: 0;
	z-index: 1000;
	min-width: 180px;
	padding: 6px;
	background: var(--vp-c-bg-elv);
	border: 1px solid var(--vp-c-divider);
	border-radius: 0;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.ask-ai-dropdown-inner {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.ask-ai-dropdown-item {
	display: flex;
	align-items: center;
	width: 100%;
	padding: 8px 10px;
	font-size: 13px;
	font-weight: 500;
	color: var(--vp-c-text-1);
	background: transparent;
	border: none;
	border-radius: 0;
	cursor: pointer;
	text-align: left;
	transition: background-color 0.15s;
}

.ask-ai-dropdown-item:hover {
	background: var(--vp-c-bg-soft);
}

.ask-ai-dropdown-label {
	white-space: nowrap;
}

.ask-ai-dropdown-divider {
	height: 1px;
	margin: 4px 0;
	background: var(--vp-c-divider);
}

.ask-ai-toast {
	position: absolute;
	top: calc(100% + 6px);
	right: 0;
	z-index: 1001;
	padding: 8px 12px;
	font-size: 12px;
	font-weight: 500;
	border-radius: 0;
	white-space: nowrap;
	pointer-events: none;
}

.ask-ai-toast.success {
	color: var(--vp-c-green-1);
	background: var(--vp-c-green-soft);
}

.ask-ai-toast.error {
	color: var(--vp-c-danger-1);
	background: var(--vp-c-danger-soft);
}

.ask-ai-toast-enter-active,
.ask-ai-toast-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.ask-ai-toast-enter-from,
.ask-ai-toast-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.ask-ai-dropdown-enter-active,
.ask-ai-dropdown-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.ask-ai-dropdown-enter-from,
.ask-ai-dropdown-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}
</style>
