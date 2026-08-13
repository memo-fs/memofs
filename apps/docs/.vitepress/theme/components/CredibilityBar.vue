<script setup lang="ts">
import StatBadge from "./StatBadge.vue";

const integrationLogos = [
	{
		name: "Claude Code",
		href: "/packages/mcp/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13.84 2.5h-3.68L4 21.5h3.68l1.63-4.73h5.38l1.63 4.73h3.68L13.84 2.5zm-3.52 11.4l1.68-4.88 1.68 4.88h-3.36z"/></svg>',
	},
	{
		name: "Cursor",
		href: "/packages/mcp/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 1L1.75 6.918v10.164L12 23l10.25-5.918V6.918L12 1zm8.5 15.197L12 21.111l-8.5-4.914V7.803L12 2.889l8.5 4.914v8.394zM12 5.5L5.5 9.25v5.5L12 18.5l6.5-3.75v-5.5L12 5.5z"/></svg>',
	},
	{
		name: "OpenAI",
		href: "/packages/adapters/openai",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.04 6.04 0 0 0-6.51-2.9 6.07 6.07 0 0 0-4.99-2.38 6.04 6.04 0 0 0-5.77 4.22 6.03 6.03 0 0 0-4.04 2.92 6.04 6.04 0 0 0 .74 7.14 5.98 5.98 0 0 0 .52 4.91 6.04 6.04 0 0 0 6.51 2.9 6.04 6.04 0 0 0 4.99 2.38 6.04 6.04 0 0 0 5.77-4.22 6.03 6.03 0 0 0 4.04-2.92 6.04 6.04 0 0 0-.74-7.14zm-9.02 11.44a4.42 4.42 0 0 1-2.73-1.02l.14-.08 4.54-2.62a.81.81 0 0 0 .41-.7v-6.42l1.93 1.11a.08.08 0 0 1 .04.06v5.27a4.44 4.44 0 0 1-4.33 4.4zm-7.66-3.47a4.41 4.41 0 0 1-.58-2.86l.14.08 4.54 2.62a.81.81 0 0 0 .81 0l5.56-3.21v2.23a.08.08 0 0 1-.04.07l-4.57 2.64a4.44 4.44 0 0 1-5.86-1.57zm-1.12-8.38a4.4 4.4 0 0 1 2.15-1.85v5.39a.81.81 0 0 0 .41.7l5.56 3.21-1.93 1.11a.08.08 0 0 1-.08 0l-4.57-2.64a4.44 4.44 0 0 1-1.54-5.92zm14.18 4.49-5.56-3.21 1.93-1.11a.08.08 0 0 1 .08 0l4.57 2.64a4.44 4.44 0 0 1 1.54 5.92 4.4 4.4 0 0 1-2.15 1.85v-5.39a.81.81 0 0 0-.41-.7zm1.7-2.7a4.41 4.41 0 0 1 .58 2.86l-.14-.08-4.54-2.62a.81.81 0 0 0-.81 0l-5.56 3.21v-2.23a.08.08 0 0 1 .04-.07l4.57-2.64a4.44 4.44 0 0 1 5.86 1.57zM8.33 10.4l1.93-1.11a.08.08 0 0 1 .08 0l4.57 2.64a4.44 4.44 0 0 1 1.54 5.92 4.4 4.4 0 0 1-2.15 1.85v-5.39a.81.81 0 0 0-.41-.7l-5.56-3.21zM12 14.12l-2.6-1.5 2.6-1.5 2.6 1.5-2.6 1.5z"/></svg>',
	},
	{
		name: "Vercel AI SDK",
		href: "/packages/adapters/ai-sdk",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 1L24 22H0L12 1Z"/></svg>',
	},
	{
		name: "LangChain",
		href: "/learn/cookbooks/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm.052 3.652c.866 0 1.568.702 1.568 1.568v2.18c.998.175 1.76.994 1.838 2.012l.006.136v4.61c0 1.144-.927 2.072-2.072 2.072h-2.684a2.072 2.072 0 0 1-2.072-2.072v-4.61c0-1.096.843-1.996 1.916-2.066l.128-.004V7.22c0-.866.702-1.568 1.568-1.568zm0 1.344a.224.224 0 0 0-.224.224v2.24h.448V7.22a.224.224 0 0 0-.224-.224z"/></svg>',
	},
	{
		name: "Cloudflare",
		href: "/packages/server/cloudflare",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
	},
	{
		name: "Node.js",
		href: "/packages/server/node",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 1.84L2.4 7.38v11.08L12 23.99l9.6-5.53V7.38L12 1.84zM12 4.15l7.6 4.38v8.77L12 21.68l-7.6-4.38V8.53L12 4.15z"/></svg>',
	},
	{
		name: "MCP Protocol",
		href: "/packages/mcp/",
		svg: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.24l7.5 4.33v8.66L12 21.56l-7.5-4.33V8.57L12 4.24zM7 10h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>',
	},
];
</script>

<template>
  <section class="credibility-section tek-reveal">
    <div class="credibility-container">
      <p class="credibility-kicker">Works out of the box with your stack</p>
      <div class="credibility-row">
        <a
          v-for="logo in integrationLogos"
          :key="logo.name"
          :href="logo.href"
          :title="logo.name"
          :aria-label="logo.name"
          class="credibility-logo-link"
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
