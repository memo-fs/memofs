<script setup lang="ts">
import { onMounted, ref } from "vue";

type BadgeType = "github" | "npm";

const props = defineProps<{
	type: BadgeType;
	href: string;
	label: string;
}>();

const value = ref<string | null>(null);

function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

async function fetchGitHubStars(): Promise<number | null> {
	try {
		const res = await fetch("https://api.github.com/repos/christophersesugh/memofs");
		if (!res.ok) return null;
		const data = await res.json();
		return data.stargazers_count ?? null;
	} catch {
		return null;
	}
}

async function fetchNpmDownloads(): Promise<number | null> {
	try {
		const res = await fetch("https://api.npmjs.org/downloads/point/last-week/@memofs/cli");
		if (!res.ok) return null;
		const data = await res.json();
		return data.downloads ?? null;
	} catch {
		return null;
	}
}

onMounted(async () => {
	const count = props.type === "github" ? await fetchGitHubStars() : await fetchNpmDownloads();
	if (count !== null) value.value = formatNumber(count);
});
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="stat-badge"
    :class="[`stat-badge--${type}`]"
    :aria-label="label"
  >
    <span class="stat-badge-icon">
      <!-- GitHub icon -->
      <svg v-if="type === 'github'" viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      <!-- npm icon -->
      <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019v13.37h-6.93V24h-0v-5.288H5.13z" />
      </svg>
    </span>
    <span class="stat-badge-label">{{ label }}</span>
    <span v-if="value" class="stat-badge-value">{{ value }}</span>
    <span v-else class="stat-badge-skeleton" />
  </a>
</template>

<style scoped>
.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  transition: border-color 0.2s, box-shadow 0.2s, color 0.2s, background 0.2s, transform 0.2s;
  cursor: pointer;
}

.stat-badge:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
  transform: translateY(-1px);
}

.stat-badge--github:hover {
  box-shadow: 0 4px 16px color-mix(in srgb, var(--tek-c-cyan) 30%, transparent);
  background: color-mix(in srgb, var(--tek-c-cyan) 8%, var(--vp-c-bg-soft));
}

.stat-badge--npm:hover {
  box-shadow: 0 4px 16px color-mix(in srgb, var(--tek-c-gold) 30%, transparent);
  background: color-mix(in srgb, var(--tek-c-gold) 8%, var(--vp-c-bg-soft));
}

.stat-badge-icon {
  display: flex;
  align-items: center;
  opacity: 0.8;
  flex-shrink: 0;
}

.stat-badge--github .stat-badge-icon { color: var(--tek-c-cyan); }
.stat-badge--npm .stat-badge-icon { color: var(--tek-c-gold); }

.stat-badge-label {
  opacity: 0.6;
  text-transform: lowercase;
}

.stat-badge-value {
  font-weight: 700;
  font-size: 14px;
  color: var(--vp-c-text-1);
  padding-left: 8px;
  border-left: 1px solid var(--vp-c-border);
  margin-left: 2px;
}

.stat-badge--github .stat-badge-value { color: var(--tek-c-cyan); }
.stat-badge--npm .stat-badge-value { color: var(--tek-c-gold); }

.stat-badge-skeleton {
  width: 20px;
  height: 14px;
  border-radius: 4px;
  background: var(--vp-c-divider);
  animation: badge-pulse 1.2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
