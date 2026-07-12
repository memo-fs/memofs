<script setup lang="ts">
import StatBadge from "./StatBadge.vue";

const integrationLogos = [
	{
		name: "Claude Code",
		href: "/packages/mcp/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2c.4 0 .78.16 1.06.44l8.5 8.5a1.5 1.5 0 0 1 0 2.12l-8.5 8.5a1.5 1.5 0 0 1-2.12 0l-8.5-8.5a1.5 1.5 0 0 1 0-2.12l8.5-8.5A1.5 1.5 0 0 1 12 2Zm-1.06 6.06-4.94 4.94 4.94 4.94 1.06-1.06L7.06 12l4.94-4.94-1.06-1.06Z"/></svg>',
	},
	{
		name: "Cursor",
		href: "/packages/mcp/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M5 3l13 9-13 9V3z"/></svg>',
	},
	{
		name: "Codex",
		href: "/packages/mcp/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>',
	},
	{
		name: "OpenCode",
		href: "/packages/mcp/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9 8l-5 4 5 4M15 8l5 4-5 4M14 6l-4 12"/></svg>',
	},
	{
		name: "Any MCP client",
		href: "/packages/connectors/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>',
	},
];
</script>

<template>
  <section class="credibility-section tek-reveal">
    <div class="credibility-container">
      <p class="credibility-kicker">Works with the agents you already use</p>
      <div class="credibility-row">
        <a
          v-for="logo in integrationLogos"
          :key="logo.name"
          :href="logo.href"
          :title="logo.name"
          :aria-label="logo.name"
          class="credibility-logo-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="credibility-logo" v-html="logo.svg" />
          <span class="credibility-logo-name">{{ logo.name }}</span>
        </a>
      </div>
      <div class="credibility-badges">
        <StatBadge
          type="github"
          href="https://github.com/memo-fs/memofs"
          label="GitHub stars"
        />
        <StatBadge
          type="npm"
          href="https://www.npmjs.com/package/@memofs/cli"
          label="downloads/week"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.credibility-section {
  padding: 56px 24px 24px;
  margin-top: 56px;
  margin-bottom: 8px;
  border-top: 1px solid var(--vp-c-divider);
}

.credibility-container {
  max-width: 880px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.credibility-kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin: 0;
}

.credibility-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0;
}

.credibility-logo-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-left: 1px solid var(--vp-c-divider);
  transition: color 0.2s, background 0.2s;
}

.credibility-logo-link:first-child {
  border-left: none;
}

.credibility-logo-link:hover {
  color: var(--tek-c-cyan);
}

.credibility-logo {
  display: inline-flex;
  align-items: center;
  color: var(--vp-c-text-3);
  transition: color 0.2s;
}

.credibility-logo-link:hover .credibility-logo {
  color: var(--tek-c-cyan);
}

.credibility-logo-name { line-height: 1; }

.credibility-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

@media (max-width: 640px) {
  .credibility-logo-link {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>
