<script setup lang="ts">
import { Icon } from "@iconify/vue";
import StatBadge from "./StatBadge.vue";
import { useHomeI18n } from "../composables/useHomeI18n";

const { t } = useHomeI18n();

const integrationLogos = [
	{
		name: "Claude Code",
		href: "/mcp/",
		icon: "simple-icons:anthropic",
	},
	{
		name: "Cursor",
		href: "/mcp/",
		icon: "simple-icons:cursor",
	},
	{
		name: "OpenAI",
		href: "/adapters/openai",
		icon: "simple-icons:openai",
	},
	{
		name: "Google Antigravity",
		href: "/learn/cookbooks/antigravity",
		icon: "logos:google-icon",
	},
	{
		name: "GitHub Copilot",
		href: "/learn/cookbooks/copilot",
		icon: "simple-icons:githubcopilot",
	},
	{
		name: "Vercel AI SDK",
		href: "/adapters/ai-sdk",
		icon: "simple-icons:vercel",
	},
	{
		name: "LangChain",
		href: "/learn/cookbooks/",
		icon: "simple-icons:langchain",
	},
	{
		name: "Cloudflare",
		href: "/server/cloudflare",
		icon: "simple-icons:cloudflare",
	},
	{
		name: "Node.js",
		href: "/server/node",
		icon: "simple-icons:nodedotjs",
	},
];
</script>

<template>
  <section class="credibility-section tek-reveal">
    <div class="credibility-container">
      <p class="credibility-kicker">{{ t.credibility.kicker }}</p>
      <div class="credibility-row">
        <a
          v-for="logo in integrationLogos"
          :key="logo.name"
          :href="logo.href"
          :title="logo.name"
          :aria-label="logo.name"
          class="credibility-logo-link"
        >
          <span class="credibility-logo">
            <Icon :icon="logo.icon" class="credibility-icon-svg" />
          </span>
          <span class="credibility-logo-name">{{ logo.name }}</span>
        </a>
      </div>
      <div class="credibility-badges">
        <StatBadge
          type="github"
          href="https://github.com/memo-fs/memofs"
          :label="t.credibility.starsLabel"
        />
        <StatBadge
          type="npm"
          href="https://www.npmjs.com/package/@memofs/cli"
          :label="t.credibility.downloadsLabel"
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
  max-width: 960px;
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

.credibility-icon-svg {
  width: 17px;
  height: 17px;
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
