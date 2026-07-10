<script setup lang="ts">
/**
 * Benchmark stats strip — surfaces real numbers from benchmark-results/release/
 * to give the landing page immediate proof that the runtime is fast.
 *
 * Numbers are sourced from `benchmark-results/release/summary.md` and are
 * p50 latencies. Update when benchmarks are re-run.
 */
interface Stat {
	readonly value: string;
	readonly label: string;
	readonly detail: string;
}

const stats: ReadonlyArray<Stat> = [
	{
		value: "0.6ms",
		label: "Recall p50",
		detail: "Top-10 in-memory recall over a full project memory set.",
	},
	{
		value: "7.4ms",
		label: "Round-trip p50",
		detail: "Full read + write lifecycle for the core memory store.",
	},
	{
		value: "0.2ms",
		label: "Rerank p50",
		detail: "Deterministic top-5 rerank after recall.",
	},
];
</script>

<template>
  <section id="performance" class="stats-strip-section tek-reveal">
    <div class="container-wide">
      <div class="stats-header">
        <p class="stats-kicker">Performance</p>
        <p class="stats-subtitle">Measured locally, on synthetic data — your numbers will vary by embedding provider and dataset size.</p>
      </div>
      <ul class="stats-grid">
        <li v-for="stat in stats" :key="stat.label" class="stat-card">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-detail">{{ stat.detail }}</span>
        </li>
      </ul>
      <p class="stats-source">
        Full methodology in
        <a href="/packages/benchmark-kit" class="stats-source-link">benchmark-kit</a>.
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
