<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
	defineProps<{
		text: string;
		label?: string;
	}>(),
	{ label: "Copy" },
);

const copied = ref(false);
const failed = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | null = null;

async function copy(): Promise<void> {
	if (!import.meta.client) return;
	const value = props.text;
	if (!value) return;

	// Prefer the async Clipboard API when available (requires a secure
	// context — https or localhost).
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(value);
			flashSuccess();
			return;
		} catch {
			// Fall through to the legacy path.
		}
	}

	// Legacy fallback: temporary textarea + execCommand. Works on http://
	// and in environments where the async API is blocked.
	try {
		const textarea = document.createElement("textarea");
		textarea.value = value;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "absolute";
		textarea.style.left = "-9999px";
		document.body.appendChild(textarea);
		textarea.select();
		const ok = document.execCommand("copy");
		document.body.removeChild(textarea);
		if (ok) {
			flashSuccess();
		} else {
			flashFailure();
		}
	} catch {
		flashFailure();
	}
}

function flashSuccess(): void {
	copied.value = true;
	failed.value = false;
	scheduleReset();
}

function flashFailure(): void {
	copied.value = false;
	failed.value = true;
	scheduleReset();
}

function scheduleReset(): void {
	if (resetTimer) clearTimeout(resetTimer);
	resetTimer = setTimeout(() => {
		copied.value = false;
		failed.value = false;
	}, 1500);
}
</script>

<template>
  <button
    type="button"
    class="copy-button"
    :class="{ 'is-copied': copied, 'is-failed': failed }"
    :aria-label="copied ? 'Copied' : failed ? 'Copy failed' : label"
    :title="failed ? 'Copy failed — select the text manually' : undefined"
    @click="copy"
  >
    <svg
      v-if="copied"
      class="copy-button-icon"
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
    <svg
      v-else-if="failed"
      class="copy-button-icon"
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
    <svg
      v-else
      class="copy-button-icon"
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  </button>
</template>

<style scoped>
.copy-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--vp-c-border);
  border-radius: 5px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
  line-height: 1;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.copy-button:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
}

.copy-button.is-copied {
  color: var(--vp-c-bg);
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.copy-button.is-failed {
  color: #b91c1c;
  border-color: #fca5a5;
  background: #fef2f2;
}

:root.dark .copy-button.is-failed {
  color: #fca5a5;
  border-color: #b91c1c;
  background: #450a0a;
}

.copy-button-icon {
  display: block;
  pointer-events: none;
}
</style>
