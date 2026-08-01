import type { Router, Theme } from "vitepress";
import { inBrowser } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { nextTick, watch } from "vue";
import AnnouncementPill from "./components/AnnouncementPill.vue";
import BlogIndex from "./components/BlogIndex.vue";
import CopyButton from "./components/CopyButton.vue";
import HeroTerminal from "./components/HeroTerminal.vue";
import HomeLayout from "./components/HomeLayout.vue";
import NewsletterSignup from "./components/NewsletterSignup.vue";
import "./custom.css";
// styles/app.css design-system tokens are now inlined in custom.css (SSOT)
import { GTAG_ID } from "../config/head.mts";

const STORAGE_KEY = "vitepress-code-group-tab";

function getTabLabelText(el: HTMLElement): string {
	if (el.tagName === "INPUT") {
		const input = el as HTMLInputElement;
		if (input.id) {
			const label = document.querySelector<HTMLLabelElement>(
				`label[for="${CSS.escape(input.id)}"]`,
			);
			if (label?.textContent) return label.textContent.trim();
		}
		return input.value.trim();
	}
	return el.textContent?.trim() || "";
}

function syncCodeGroups(targetLabel?: string) {
	if (!inBrowser) return;

	const labelToSync = targetLabel || localStorage.getItem(STORAGE_KEY);
	if (!labelToSync) return;

	const groups = document.querySelectorAll<HTMLElement>(".vp-code-group");
	for (const group of groups) {
		const tabItems = group.querySelectorAll<HTMLElement>(
			".tabs label, .tabs button, .tabs input",
		);
		for (const item of tabItems) {
			const text = getTabLabelText(item);
			if (text.toLowerCase() === labelToSync.toLowerCase()) {
				if (item.tagName === "LABEL") {
					const radioId = item.getAttribute("for");
					if (radioId) {
						const radio = document.getElementById(
							radioId,
						) as HTMLInputElement | null;
						if (radio && !radio.checked) {
							radio.checked = true;
							radio.dispatchEvent(new Event("change", { bubbles: true }));
						}
					} else {
						item.click();
					}
				} else if (item.tagName === "INPUT") {
					const radio = item as HTMLInputElement;
					if (!radio.checked) {
						radio.checked = true;
						radio.dispatchEvent(new Event("change", { bubbles: true }));
					}
				} else if (item.tagName === "BUTTON") {
					if (!item.classList.contains("active")) {
						item.click();
					}
				}
			}
		}
	}
}

function scheduleSync(label?: string) {
	if (!inBrowser) return;
	syncCodeGroups(label);
	requestAnimationFrame(() => syncCodeGroups(label));
	setTimeout(() => syncCodeGroups(label), 50);
	setTimeout(() => syncCodeGroups(label), 200);
	setTimeout(() => syncCodeGroups(label), 500);
}

function initCodeGroupSync(router: Router) {
	if (!inBrowser) return;

	// Initial schedule sync for page load / reload hydration
	scheduleSync();

	if (typeof window !== "undefined") {
		window.addEventListener("DOMContentLoaded", () => scheduleSync());
		window.addEventListener("load", () => scheduleSync());
	}

	// Capture user clicks on code-group tabs (capture: true ensures we get the event before any stopPropagation)
	window.addEventListener(
		"click",
		(e) => {
			const target = e.target as HTMLElement | null;
			const tabEl = target?.closest<HTMLElement>(
				".vp-code-group .tabs label, .vp-code-group .tabs button, .vp-code-group .tabs input",
			);
			if (!tabEl) return;

			const tabText = getTabLabelText(tabEl);
			if (tabText) {
				localStorage.setItem(STORAGE_KEY, tabText);
				scheduleSync(tabText);
			}
		},
		true,
	);

	// Observe DOM mutations so hydration changes or client navigation don't wipe out tab state
	if (typeof MutationObserver !== "undefined") {
		let isSyncing = false;
		const observer = new MutationObserver(() => {
			if (isSyncing) return;
			isSyncing = true;
			syncCodeGroups();
			setTimeout(() => {
				isSyncing = false;
			}, 100);
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	watch(
		() => router.route.path,
		() => {
			nextTick(() => scheduleSync());
		},
	);
}

export default {
	extends: DefaultTheme,
	Layout: HomeLayout,
	enhanceApp({ app, router }) {
		// Used inside blog/index.md to render the data-driven post grid.
		app.component("BlogIndex", BlogIndex);
		// Newsletter signup (Resend via /api/subscribe Pages Function) — embedded in blog + changelog markdown.
		app.component("NewsletterSignup", NewsletterSignup);
		// Inline copy-to-clipboard for install commands + code snippets.
		app.component("CopyButton", CopyButton);
		// Announcement pill — rendered in the hero #home-hero-before slot.
		app.component("AnnouncementPill", AnnouncementPill);
		// Animated typewriter terminal — hero right-hand visual.
		app.component("HeroTerminal", HeroTerminal);

		if (!inBrowser) return;

		initCodeGroupSync(router);

		watch(
			() => router.route.path,
			(to) => {
				if ("gtag" in window && typeof window.gtag === "function") {
					window.gtag("config", `${GTAG_ID}`, {
						page_path: to,
					});
				}
			},
		);
	},
} satisfies Theme;
