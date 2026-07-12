<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

/**
 * HeroTerminal — an animated typewriter terminal that plays through
 * three MemoFS commands (init → remember → recall → context), giving
 * the hero a "code-first" feel consistent with the Vite/Vitest aesthetic.
 *
 * Features:
 * - Character-by-character typewriter animation (respects prefers-reduced-motion)
 * - 3D parallax tilt on mousemove (same technique as the old HeroVisual)
 * - macOS-style traffic-light dots + window chrome
 * - Infinite loop with a pause at the end
 */

const rx = ref(0);
const ry = ref(0);

/** Lines of terminal content (type + text pairs). */
interface TLine {
	type: "cmd" | "out" | "blank" | "comment";
	text: string;
}

const script: TLine[] = [
	{ type: "cmd", text: "npx memofs init" },
	{ type: "out", text: "✓ Created .memofs/ with core memory, notes &" },
	{ type: "out", text: "  recall indexes." },
	{ type: "blank", text: "" },
	{
		type: "cmd",
		text: 'memofs remember "Auth uses JWT + refresh rotation" --kind decision',
	},
	{ type: "out", text: "✓ Stored in .memofs/memory/notes.md" },
	{ type: "blank", text: "" },
	{ type: "cmd", text: 'memofs recall "How does auth work?"' },
	{ type: "out", text: "→ [0.94] core.md · Auth decisions" },
	{
		type: "out",
		text: '   "JWT with refresh rotation. Access tokens expire…"',
	},
	{ type: "out", text: "→ [0.87] notes.md · Auth flow notes" },
	{ type: "out", text: '   "Token validation middleware checks expiry…"' },
	{ type: "blank", text: "" },
	{ type: "comment", text: "# Your agent already knows. Every session." },
];

/** Currently rendered lines (growing as animation progresses). */
const lines = ref<TLine[]>([]);
/** Partial text of the currently typing line. */
const currentTyping = ref("");
/** Which line index we're animating. */
const lineIdx = ref(0);
/** Which character within the current line we're at. */
const charIdx = ref(0);

let timer: ReturnType<typeof setTimeout> | null = null;
let reducedMotion = false;

const TYPE_SPEED = 28; // ms per character
const LINE_PAUSE = 420; // ms between lines
const END_PAUSE = 3200; // ms before looping

function reset() {
	lines.value = [];
	currentTyping.value = "";
	lineIdx.value = 0;
	charIdx.value = 0;
}

function tick() {
	if (reducedMotion) {
		// Show all lines instantly
		lines.value = [...script];
		return;
	}

	const idx = lineIdx.value;
	if (idx >= script.length) {
		// Finished — pause then loop
		timer = setTimeout(() => {
			reset();
			timer = setTimeout(tick, 600);
		}, END_PAUSE);
		return;
	}

	const line = script[idx];

	if (line.type === "blank") {
		// Blank lines are instant
		lines.value = [...lines.value, line];
		lineIdx.value++;
		timer = setTimeout(tick, LINE_PAUSE / 3);
		return;
	}

	if (charIdx.value < line.text.length) {
		// Still typing this line
		charIdx.value++;
		currentTyping.value = line.text.slice(0, charIdx.value);
		timer = setTimeout(tick, TYPE_SPEED);
	} else {
		// Line complete — commit it and move on
		lines.value = [...lines.value, { ...line, text: currentTyping.value }];
		currentTyping.value = "";
		charIdx.value = 0;
		lineIdx.value++;
		timer = setTimeout(tick, LINE_PAUSE);
	}
}

onMounted(() => {
	reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	timer = setTimeout(tick, 800);
});

onUnmounted(() => {
	if (timer) clearTimeout(timer);
});

const handleMouseMove = (e: MouseEvent) => {
	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
	const xPct = (e.clientX - rect.left) / rect.width - 0.5;
	const yPct = (e.clientY - rect.top) / rect.height - 0.5;
	rx.value = +(yPct * -10).toFixed(2);
	ry.value = +(xPct * 10).toFixed(2);
};

const handleMouseLeave = () => {
	rx.value = 0;
	ry.value = 0;
};
</script>

<template>
  <div
    class="hero-terminal-wrapper"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    :style="{
      transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`,
    }"
  >
    <!-- Window chrome -->
    <div class="ht-chrome">
      <span class="ht-dot red" aria-hidden="true" />
      <span class="ht-dot yellow" aria-hidden="true" />
      <span class="ht-dot green" aria-hidden="true" />
      <span class="ht-title">memofs — terminal</span>
    </div>

    <!-- Terminal body -->
    <div class="ht-body" aria-live="polite" aria-label="Terminal demo">
      <!-- Committed lines -->
      <div
        v-for="(line, i) in lines"
        :key="i"
        :class="['ht-line', `ht-${line.type}`]"
      >
        <template v-if="line.type === 'cmd'">
          <span class="ht-prompt">❯&nbsp;</span>{{ line.text }}
        </template>
        <template v-else-if="line.type === 'blank'">&nbsp;</template>
        <template v-else>{{ line.text }}</template>
      </div>

      <!-- Currently typing line (if cmd) -->
      <div
        v-if="currentTyping && script[lineIdx]?.type === 'cmd'"
        class="ht-line ht-cmd"
      >
        <span class="ht-prompt">❯&nbsp;</span>{{ currentTyping
        }}<span class="ht-cursor" aria-hidden="true">|</span>
      </div>

      <!-- Idle cursor when between lines -->
      <div
        v-else-if="!currentTyping && lines.length < script.length"
        class="ht-line ht-cmd"
      >
        <span class="ht-prompt">❯&nbsp;</span
        ><span class="ht-cursor" aria-hidden="true">|</span>
      </div>
    </div>

    <!-- Ambient glow ring behind the window -->
    <div class="ht-glow-ring" aria-hidden="true" />
  </div>
</template>

<style scoped>
.hero-terminal-wrapper {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  transition: transform 0.1s ease-out;
  will-change: transform;
}

/* Ambient glow ring pulsing behind the terminal */
.ht-glow-ring {
  position: absolute;
  inset: -18px;
  border-radius: 4px;
  background: radial-gradient(
    ellipse at 50% 50%,
    color-mix(in srgb, var(--tek-c-cyan) 22%, transparent) 0%,
    transparent 70%
  );
  filter: blur(28px);
  animation: htGlow 4s ease-in-out infinite;
  z-index: -1;
}

@keyframes htGlow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Window chrome */
.ht-chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: #1a1a1a;
  border-bottom: 1px solid #2a2a2a;
  border-radius: 0;
}

.ht-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ht-dot.red { background: #ff5f56; }
.ht-dot.yellow { background: #ffbd2e; }
.ht-dot.green { background: #27c93f; }

.ht-title {
  flex: 1;
  text-align: center;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: #5a5a5a;
  letter-spacing: 0.04em;
  pointer-events: none;
}

/* Terminal body */
.ht-body {
  background: #0d0d0d;
  padding: 20px 22px 28px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  height: 380px;
  line-height: 1.75;
  overflow: hidden;
}

.ht-line {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
}

.ht-cmd {
  color: #f0f0f0;
}

.ht-out {
  color: #4ade80;
  padding-left: 0;
}

.ht-comment {
  color: #4a5568;
  font-style: italic;
}

.ht-blank {
  /* intentional empty line */
}

.ht-prompt {
  color: var(--tek-c-cyan, #38bdf8);
  user-select: none;
}

.ht-cursor {
  display: inline-block;
  color: var(--tek-c-cyan, #38bdf8);
  opacity: 0.6;
  animation: htCaret 0.9s step-end infinite;
  font-size: 13px;
  vertical-align: baseline;
}

@keyframes htCaret {
  0%, 49% { opacity: 0.6; }
  50%, 100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .ht-cursor { animation: none; opacity: 1; }
  .ht-glow-ring { animation: none; }
  .hero-terminal-wrapper { transition: none; }
}

@media (max-width: 640px) {
  .ht-body {
    font-size: 11.5px;
    height: 320px;
    padding: 16px;
  }
}
</style>
