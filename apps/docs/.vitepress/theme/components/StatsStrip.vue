<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useHomeI18n } from "../composables/useHomeI18n";

const { t } = useHomeI18n();

/**
 * StatsStrip — benchmark performance stats from benchmark-results/release/.
 * Numbers animate from 0 to their real value on first viewport entry
 * (Vitest-style "wow" moment). Respects prefers-reduced-motion.
 */
interface Stat {
	readonly rawValue: number;
	readonly unit: string;
}

const stats: ReadonlyArray<Stat> = [
	{
		rawValue: 0.6,
		unit: "ms",
	},
	{
		rawValue: 7.4,
		unit: "ms",
	},
	{
		rawValue: 0.2,
		unit: "ms",
	},
];

/** Animated display values — start at 0 */
const displayed = ref(stats.map(() => 0));
const sectionRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function animateTo(
	targetIdx: number,
	target: number,
	decimals: number,
	duration = 900,
) {
	const start = performance.now();
	const step = (now: number) => {
		const elapsed = now - start;
		const progress = Math.min(elapsed / duration, 1);
		// ease-out cubic
		const eased = 1 - (1 - progress) ** 3;
		displayed.value[targetIdx] = parseFloat((eased * target).toFixed(decimals));
		if (progress < 1) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}

onMounted(() => {
	if (!sectionRef.value) return;

	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (reducedMotion) {
		stats.forEach((s, i) => {
			displayed.value[i] = s.rawValue;
		});
		return;
	}

	observer = new IntersectionObserver(
		(entries) => {
			if (entries[0]?.isIntersecting) {
				stats.forEach((s, i) => {
					const decimals = s.rawValue < 1 ? 1 : 0;
					setTimeout(() => animateTo(i, s.rawValue, decimals, 900), i * 120);
				});
				observer?.disconnect();
			}
		},
		{ threshold: 0.3 },
	);
	observer.observe(sectionRef.value);
});

onUnmounted(() => {
	observer?.disconnect();
});
</script>

<template>
  <section
    id="performance"
    ref="sectionRef"
    class="stats-strip-section tek-reveal"
  >
    <div class="container-wide">
      <div class="stats-header">
        <p class="stats-kicker">{{ t.stats.kicker }}</p>
        <p class="stats-subtitle">
          {{ t.stats.subtitle }}
        </p>
      </div>
      <ul class="stats-grid">
        <li
          v-for="(stat, i) in stats"
          :key="i"
          class="stat-card"
          :data-delay="String(i + 1)"
        >
          <span class="stat-value"
            >{{ displayed[i] }}{{ stat.unit }}</span
          >
          <span class="stat-label">{{ t.stats.items[i]?.label }}</span>
          <span class="stat-detail">{{ t.stats.items[i]?.detail }}</span>
        </li>
      </ul>
      <p class="stats-source">
        {{ t.stats.sourceText }}
        <a href="/tooling/benchmark-kit" class="stats-source-link"
          >{{ t.stats.sourceLinkText }}</a
        >.
      </p>
    </div>
  </section>
</template>

<style scoped>
.container-wide {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.stats-strip-section {
  padding: 0 0 64px 0;
}

.stats-header {
  text-align: center;
  margin-bottom: 28px;
}

.stats-kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin: 0 0 8px 0;
}

.stats-subtitle {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.5;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 24px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  box-shadow: var(--tek-shadow-sm);
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--tek-shadow-glow);
}

.stat-value {
  font-family: var(--vp-font-family-display);
  font-size: 36px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  line-height: 1.1;
  letter-spacing: -0.02em;
  /* Reserve space to prevent layout shift during count-up */
  min-width: 4ch;
  display: inline-block;
}

.stat-label {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-1);
}

.stat-detail {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin-top: 4px;
}

.stats-source {
  margin: 24px 0 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.stats-source-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
}

.stats-source-link:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
