<script setup lang="ts">
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { computed, onMounted, onUnmounted, ref } from "vue";
import AskAiBar from "./AskAiBar.vue";
import BlogPostFooter from "./BlogPostFooter.vue";
import BlogPostHeader from "./BlogPostHeader.vue";
import HeroVisual from "./HeroVisual.vue";
import SidebarBrand from "./SidebarBrand.vue";
import StatsStrip from "./StatsStrip.vue";

const { Layout } = DefaultTheme;

const { frontmatter } = useData();
/** Blog posts opt in with `blog: post` frontmatter to get editorial chrome. */
const isBlogPost = computed(() => frontmatter.value.blog === "post");

/**
 * Deploys is the live mode-toggle shown in the feature showcase. It reflects
 * the shipped `MemoFS` constructor (D4): there is no `mode: "cloud"` flag.
 * Cloud is a *sync transport*, reached via the cloud client / hosted
 * endpoints — not a runtime mode. Managed-runtime-as-a-service is future.
 */
const activeMode = ref(0);

const handleScroll = () => {
	if (typeof window !== "undefined") {
		if (window.scrollY > 0) {
			document.documentElement.classList.add("has-scrolled");
		} else {
			document.documentElement.classList.remove("has-scrolled");
		}
	}
};

onMounted(() => {
	window.addEventListener("scroll", handleScroll, { passive: true });
	handleScroll();
});

onUnmounted(() => {
	window.removeEventListener("scroll", handleScroll);
	if (typeof document !== "undefined") {
		document.documentElement.classList.remove("has-scrolled");
	}
});

const modes = [
	{
		label: "Local",
		kicker: "Zero cloud. Works offline.",
	},
	{
		label: "Hybrid + sync",
		kicker: "Local by default, cloud as a replica.",
	},
	{
		label: "Managed (later)",
		kicker: "MemoFS Cloud runs the engine.",
	},
];

/**
 * Integration logos rendered in the credibility bar.
 * Each link points at the closest matching docs page; SVG marks are
 * simplified monogram glyphs to avoid bundling third-party brand assets.
 */
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
  <Layout>
    <template #layout-top>
      <div class="alpha-announcement-bar">
        <span class="alpha-badge">Cloud</span>
        <span class="alpha-text">
          <span class="alpha-description">The core runtime is open source and free. MemoFS Cloud (hosted sync, managed MCP, team features) is in early access.</span>
          <a href="https://memofs.dev" class="alpha-link" target="_blank" rel="noopener noreferrer">Join the waitlist →</a>
        </span>
      </div>
    </template>

    <template #sidebar-nav-before>
      <SidebarBrand />
    </template>

    <template #doc-before>
      <BlogPostHeader v-if="isBlogPost" />
      <AskAiBar v-else />
    </template>

    <template #doc-after>
      <BlogPostFooter v-if="isBlogPost" />
    </template>

    <template #home-hero-image>
      <div class="hero-visual-container">
        <HeroVisual />
      </div>
    </template>

    <template #home-hero-after>
      <div class="home-custom-sections">
        <!-- Credibility: works with the agents devs already use -->
        <section class="credibility-section">
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
              <a
                href="https://github.com/christophersesugh/memofs"
                target="_blank"
                rel="noopener noreferrer"
                class="credibility-badge-link"
                aria-label="GitHub stars"
              >
                <img
                  src="https://img.shields.io/github/stars/christophersesugh/memofs?style=flat&logo=github&label=stars&color=4f46e5"
                  alt="GitHub stars"
                  class="credibility-badge"
                  loading="lazy"
                />
              </a>
              <a
                href="https://www.npmjs.com/package/memofs"
                target="_blank"
                rel="noopener noreferrer"
                class="credibility-badge-link"
                aria-label="npm weekly downloads"
              >
                <img
                  src="https://img.shields.io/npm/dw/memofs?style=flat&logo=npm&label=downloads%2Fweek&color=4f46e5"
                  alt="npm weekly downloads"
                  class="credibility-badge"
                  loading="lazy"
                />
              </a>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #home-features-after>
      <div class="home-custom-sections">
        <!-- Problem: name the pain before pitching -->
        <section id="problem" class="problem-section tek-reveal">
          <div class="container">
            <span class="section-kicker">The problem</span>
            <h2>Every new session starts from zero.</h2>
            <p>
              You walk your agent through the auth system. It gets it. Next session — a blank
              stare. You paste the architecture doc again, and it ships code that contradicts last
              week's decision. It has no memory of what you chose, because there was nowhere to put it.
            </p>
          </div>
        </section>

        <!-- How it works: reduce perceived complexity to three commands -->
        <section id="how-it-works" class="how-it-works-section tek-reveal">
          <div class="container">
            <span class="section-kicker">How it works</span>
            <h2>Three commands. Your agent remembers.</h2>
            <div class="steps">
              <div class="step">
                <span class="step-number">1</span>
                <div class="step-content">
                  <h3>Install</h3>
                  <div class="terminal-mockup">
                    <div class="terminal-header">
                      <span class="terminal-dot red"></span>
                      <span class="terminal-dot yellow"></span>
                      <span class="terminal-dot green"></span>
                      <CopyButton text="npm install -D memofs" class="terminal-copy" />
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npm install -D memofs<br />
                      <br />
                      <span class="terminal-comment"># or: pnpm add -D memofs</span><br />
                      <span class="terminal-comment"># or: yarn add -D memofs</span><br />
                      <span class="terminal-comment"># or: bun add -D memofs</span>
                    </div>
                  </div>
                  <p class="step-requirement">
                    Requires <strong>Node.js &gt;= 22</strong>
                  </p>
                </div>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <div class="step-content">
                  <h3>Initialize</h3>
                  <div class="terminal-mockup">
                    <div class="terminal-header">
                      <span class="terminal-dot red"></span>
                      <span class="terminal-dot yellow"></span>
                      <span class="terminal-dot green"></span>
                      <CopyButton text="npx memofs init" class="terminal-copy" />
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npx memofs init<br />
                      <span class="terminal-success">✓ Created .memofs/ with core memory, notes, recall indexes, and graph files.</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <div class="step-content">
                  <h3>Record</h3>
                  <div class="terminal-mockup">
                    <div class="terminal-header">
                      <span class="terminal-dot red"></span>
                      <span class="terminal-dot yellow"></span>
                      <span class="terminal-dot green"></span>
                      <CopyButton text='npx memofs remember "Auth uses JWT with refresh rotation" --kind decision' class="terminal-copy" />
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npx memofs remember "Auth uses JWT with refresh rotation" --kind decision<br />
                      <span class="terminal-success">✓ Stored decision memory in .memofs/memory/notes.md</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p class="result-text">
              Next session, your agent already knows. No repeating yourself. No contradictions. No
              "what were we working on again?"
            </p>
          </div>
        </section>

        <!-- Benchmark stats: real numbers from benchmark-results/release/ -->
        <StatsStrip />

        <!-- Feature showcase: three pillars, each with a live visual -->
        <section id="features" class="feature-showcase tek-reveal">
          <div class="container-wide">
            <div class="feature-showcase-item">
              <div class="feature-showcase-content">
                <span class="section-kicker">File-first</span>
                <h3>Open it. Diff it. Commit it.</h3>
                <p>
                  Every decision, convention, and note sits in plain text under
                  <code>.memofs/</code>. Open it in your editor. Diff it in review. Commit it with
                  your code. Memory stops being a black box.
                </p>
                <a href="/packages/core/agentfs" class="showcase-link">
                  Learn about file-first memory →
                </a>
              </div>
              <div class="feature-showcase-visual">
                <div class="file-tree-mockup">
                  <div class="file-tree-header">.memofs/</div>
                  <div class="file-tree-body">
                    <div class="file-tree-item indent-1">manifest.json</div>
                    <div class="file-tree-item indent-1 folder">memory/</div>
                    <div class="file-tree-item indent-2">core.md</div>
                    <div class="file-tree-item indent-2">notes.md</div>
                    <div class="file-tree-item indent-1 folder">events/</div>
                    <div class="file-tree-item indent-2">memory-events.jsonl</div>
                    <div class="file-tree-item indent-2">conversations.jsonl</div>
                    <div class="file-tree-item indent-1 folder">indexes/</div>
                    <div class="file-tree-item indent-2">chunks.jsonl</div>
                    <div class="file-tree-item indent-2">embeddings.jsonl</div>
                    <div class="file-tree-item indent-1 folder">graph/</div>
                    <div class="file-tree-item indent-2">nodes.jsonl</div>
                    <div class="file-tree-item indent-2">edges.jsonl</div>
                    <div class="file-tree-item indent-1">connectors.json</div>
                    <div class="file-tree-item indent-1 folder">snapshots/</div>
                    <div class="file-tree-item indent-2">snapshots.jsonl</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="feature-showcase-item reverse">
              <div class="feature-showcase-content">
                <span class="section-kicker">Recall</span>
                <h3>The right memory, fetched for you</h3>
                <p>
                  Stop scrolling through old prompts. MemoFS indexes your memory and returns the
                  fragment that fits the task — semantically, not by keyword. Hybrid recall merges
                  lexical and vector search, then reranks.
                </p>
                <a href="/packages/core/concepts" class="showcase-link">
                  See how recall works →
                </a>
              </div>
              <div class="feature-showcase-visual">
                <div class="recall-mockup">
                  <div class="recall-header">Recall</div>
                  <div class="recall-query">
                    <span class="recall-query-label">Query</span>
                    <span class="recall-query-text">"How does auth work?"</span>
                  </div>
                  <div class="recall-results">
                    <div class="recall-result">
                      <span class="recall-score">0.94</span>
                      <div class="recall-result-body">
                        <span class="recall-result-title">core.md · Auth decisions</span>
                        <span class="recall-result-snippet"
                          >JWT with refresh rotation. Access tokens expire in 15min…</span
                        >
                      </div>
                    </div>
                    <div class="recall-result">
                      <span class="recall-score">0.87</span>
                      <div class="recall-result-body">
                        <span class="recall-result-title">notes.md · Auth flow notes</span>
                        <span class="recall-result-snippet"
                          >Token validation middleware checks expiry and signature…</span
                        >
                      </div>
                    </div>
                    <div class="recall-result">
                      <span class="recall-score">0.71</span>
                      <div class="recall-result-body">
                        <span class="recall-result-title">conversations.jsonl · Session 42</span>
                        <span class="recall-result-snippet"
                          >User decided to switch from session-based to JWT auth…</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="feature-showcase-item">
              <div class="feature-showcase-content">
                <span class="section-kicker">Runtimes</span>
                <h3>One engine, two ways to run it</h3>
                <p>
                  Local mode works offline. Hybrid adds a cloud replica so your memory follows you
                  across machines. A managed runtime (cloud-hosted engine) is on the roadmap. The
                  engine and the API stay the same — you only change how memory is stored and synced.
                </p>
                <a href="/configure/storage" class="showcase-link">
                  Explore the storage options →
                </a>
              </div>
              <div class="feature-showcase-visual">
                <div class="mode-toggle-mockup">
                  <div class="mode-toggle-buttons">
                    <button
                      v-for="(m, i) in modes"
                      :key="m.label"
                      :class="['mode-toggle-btn', { active: activeMode === i }]"
                      type="button"
                      @click="activeMode = i"
                    >
                      {{ m.label }}
                    </button>
                  </div>
                  <div class="mode-toggle-kicker">{{ modes[activeMode].kicker }}</div>
                  <div class="mode-toggle-code">
                    <pre v-show="activeMode === 0"><code><span class="token keyword">import</span> { <span class="token class">MemoFS</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span>;
<span class="token keyword">import</span> { <span class="token function">createNodeFsMemoryStore</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core/node-fs"</span>;

<span class="token comment">// Default. Memory lives in .memofs/ as markdown + JSON.</span>
<span class="token comment">// No API keys, no network. Read it, diff it, commit it.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span>({
  store: <span class="token function">createNodeFsMemoryStore</span>({ rootDir: <span class="token string">"./.memofs"</span> }),
  projectId: <span class="token string">"my-app"</span>,
  mode: <span class="token string">"local"</span>,
});</code></pre>

                    <pre v-show="activeMode === 1"><code><span class="token keyword">import</span> { <span class="token class">MemoFS</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span>;
<span class="token keyword">import</span> { <span class="token function">createNodeFsMemoryStore</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core/node-fs"</span>;

<span class="token comment">// Same engine, same files — plus a cloud replica for other machines.</span>
<span class="token comment">// sync.push / sync.pull mirror .memofs/. Reads/writes always hit local.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span>({
  store: <span class="token function">createNodeFsMemoryStore</span>({ rootDir: <span class="token string">"./.memofs"</span> }),
  projectId: <span class="token string">"my-app"</span>,
  mode: <span class="token string">"hybrid"</span>,
  cloud: {
    baseUrl: process.env.MEMOFS_CLOUD_URL!,
    apiKey: process.env.MEMOFS_API_KEY!,
  },
});</code></pre>

                    <div v-show="activeMode === 2" class="mode-coming-soon">
                      <div class="mode-coming-soon-header">
                        <span class="mode-coming-soon-badge">Coming soon</span>
                      </div>
                      <p class="mode-coming-soon-text">
                        MemoFS Cloud will host the runtime so thin clients (CI, dashboards) can
                        read memory over HTTPS without a local checkout.
                      </p>
                      <div class="mode-coming-soon-features">
                        <div class="mode-coming-soon-feature">
                          <span class="mode-coming-soon-dot" aria-hidden="true">●</span>
                          <span>Cloud-hosted engine, no local checkout required</span>
                        </div>
                        <div class="mode-coming-soon-feature">
                          <span class="mode-coming-soon-dot" aria-hidden="true">●</span>
                          <span>Read memory over HTTPS from any environment</span>
                        </div>
                        <div class="mode-coming-soon-feature">
                          <span class="mode-coming-soon-dot" aria-hidden="true">●</span>
                          <span>Same <code>@memofs/core</code> API you use today</span>
                        </div>
                      </div>
                      <a
                        href="https://memofs.dev"
                        class="mode-coming-soon-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Join the early-access waitlist →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Audience: two doors for two intents -->
        <section id="audience" class="audience-section tek-reveal">
          <div class="container">
            <span class="section-kicker">Built for how you work</span>
            <h2>Two ways in</h2>
            <div class="audience-grid">
              <div class="audience-card">
                <span class="audience-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <h3>Building AI apps</h3>
                <p>
                  Give your app durable memory. Import <code>@memofs/core</code> — the same API
                  whether memory lives in local files, the cloud, or both. The AI SDK runtime ships
                  recall, context-building, and a tool definition ready to wire into any agent.
                </p>
                <a href="/api/core" class="audience-link">See the API reference →</a>
              </div>
              <div class="audience-card">
                <span class="audience-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="6" width="18" height="13" rx="2" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <circle cx="9" cy="13" r="1" fill="currentColor" />
                    <circle cx="15" cy="13" r="1" fill="currentColor" />
                    <path d="M9 17h6" />
                  </svg>
                </span>
                <h3>Using a coding agent</h3>
                <p>
                  Your coding agent finally remembers your project. Install the MCP server, drop one
                  config block into Claude Code, Cursor, or Codex, and your agent gets project
                  context every session — automatically.
                </p>
                <a href="/packages/mcp/" class="audience-link">Connect your agent →</a>
              </div>
            </div>
          </div>
        </section>

        <!-- Comparison: the honest "why file-first" -->
        <section id="comparison" class="comparison-section tek-reveal">
          <div class="container">
            <span class="section-kicker">Why file-first</span>
            <h2>MemoFS vs. hosted memory tools</h2>
            <p>
              Most memory tools hide your data in a dashboard you can't inspect. MemoFS stores
              everything as plain text and JSON in your project's <code>.memofs/</code> directory —
              alongside the code it describes.
            </p>
            <div class="comparison-table-wrapper">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>MemoFS</th>
                    <th>Hosted Memory Tools</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Where memory lives</td>
                    <td><span class="comparison-table-check">✓</span> Plain files in your repo</td>
                    <td><span class="comparison-table-cross">Locked in a remote dashboard</span></td>
                  </tr>
                  <tr>
                    <td>Inspect &amp; edit</td>
                    <td><span class="comparison-table-check">✓</span> Any editor, any diff tool</td>
                    <td><span class="comparison-table-cross">Vendor UI only</span></td>
                  </tr>
                  <tr>
                    <td>Version control</td>
                    <td><span class="comparison-table-check">✓</span> Git-tracked with your code</td>
                    <td><span class="comparison-table-cross">Separate system (if at all)</span></td>
                  </tr>
                  <tr>
                    <td>Ownership</td>
                    <td><span class="comparison-table-check">✓</span> You own every byte</td>
                    <td><span class="comparison-table-cross">Vendor-dependent</span></td>
                  </tr>
                  <tr>
                    <td>Offline support</td>
                    <td><span class="comparison-table-check">✓</span> Full offline by default</td>
                    <td><span class="comparison-table-cross">Requires internet</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="star-history-embed">
              <a
                href="https://star-history.com/#christophersesugh/memofs&Date"
                target="_blank"
                rel="noopener noreferrer"
                class="star-history-link"
              >
                <img
                  src="https://api.star-history.com/svg?repos=christophersesugh/memofs&type=Date&theme=light"
                  alt="MemoFS star history"
                  class="star-history-img"
                  loading="lazy"
                />
                <img
                  src="https://api.star-history.com/svg?repos=christophersesugh/memofs&type=Date&theme=dark"
                  alt="MemoFS star history"
                  class="star-history-img star-history-img-dark"
                  loading="lazy"
                />
              </a>
            </div>
          </div>
        </section>

        <!-- Bottom CTA -->
        <section id="get-started" class="bottom-cta-section tek-reveal">
          <div class="container">
            <p class="oss-badge">MIT Licensed · 100% open source</p>
            <h2>One command. Your agent never forgets.</h2>
            <div class="code-snippet large code-snippet-with-copy">
              <code>npx memofs init</code>
              <CopyButton text="npx memofs init" class="code-snippet-copy" />
            </div>
            <div class="cta-buttons">
              <a href="/packages/core/" class="cta-button primary">Read the Quick Start →</a>
              <a href="https://memofs.dev" class="cta-button secondary" target="_blank" rel="noopener noreferrer">
                Explore MemoFS Cloud →
              </a>
            </div>
            <a
              href="https://github.com/christophersesugh/memofs"
              class="bottom-cta-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
            <a href="/changelog" class="changelog-teaser">
              <span class="changelog-teaser-badge">New</span>
              <span class="changelog-teaser-text">
                <span class="changelog-teaser-version">v1.0.0-beta.1</span>
                <span class="changelog-teaser-divider">—</span>
                <span class="changelog-teaser-description">First public beta</span>
              </span>
              <span class="changelog-teaser-cta">Read the changelog →</span>
            </a>
          </div>
        </section>
      </div>
    </template>
  </Layout>
</template>

<style scoped>
/* Container scale — three widths for predictable visual rhythm.
   Use .container for text-heavy sections, .container-wide for sections
   that pair content with visuals side-by-side, .credibility-container
   for the narrow island between hero and feature showcase. */
.container {
  max-width: 768px;
  margin: 0 auto;
  padding: 0 24px;
}

.container-wide {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

.hero-visual-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Section kicker — a small uppercase label that sets up the headline */
.section-kicker {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-brand-1);
  margin-bottom: 14px;
}

/* Staggered page-load reveal — one orchestrated cascade */
.tek-reveal {
  animation: tekReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.tek-reveal:nth-of-type(1) { animation-delay: 0.05s; }
.tek-reveal:nth-of-type(2) { animation-delay: 0.12s; }
.tek-reveal:nth-of-type(3) { animation-delay: 0.19s; }
.tek-reveal:nth-of-type(4) { animation-delay: 0.26s; }
.tek-reveal:nth-of-type(5) { animation-delay: 0.33s; }
.tek-reveal:nth-of-type(6) { animation-delay: 0.40s; }

@media (prefers-reduced-motion: reduce) {
  .tek-reveal { animation: none; }
}

/* ===================================================================
   Credibility Section
   =================================================================== */
.credibility-section {
  padding: 32px 24px 24px;
  margin-top: 48px;
  margin-bottom: 40px;
  border-top: 1px solid var(--vp-c-border);
}

.credibility-container {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.credibility-kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  margin: 0;
}

.credibility-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px 20px;
}

.credibility-logo-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
}

.credibility-logo-link:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.credibility-logo {
  display: inline-flex;
  align-items: center;
  color: var(--vp-c-text-2);
  transition: color 0.2s;
}

.credibility-logo-link:hover .credibility-logo {
  color: var(--vp-c-brand-1);
}

.credibility-logo-name {
  line-height: 1;
}

.credibility-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.credibility-badge-link {
  display: inline-block;
  line-height: 0;
  text-decoration: none;
  opacity: 0.9;
  transition: opacity 0.2s;
}

.credibility-badge-link:hover {
  opacity: 1;
}

.credibility-badge {
  display: block;
  height: 22px;
  width: auto;
}

@media (max-width: 640px) {
  .credibility-row {
    gap: 6px 14px;
  }

  .credibility-logo-link {
    font-size: 12px;
    padding: 4px 8px;
  }
}

/* ===================================================================
   Problem Section
   =================================================================== */
.problem-section {
  padding: 96px 0;
}

.problem-section h2 {
  font-size: 30px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.25;
  margin-bottom: 20px;
}

.problem-section p {
  font-size: 17px;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

/* ===================================================================
   How It Works
   =================================================================== */
.how-it-works-section {
  padding: 0 0 64px 0;
}

.how-it-works-section h2 {
  font-size: 30px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.25;
  margin-bottom: 48px;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.step {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.step-number {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: var(--vp-c-bg);
  font-family: var(--vp-font-family-display);
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--tek-shadow-md);
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-content h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 10px;
}

.step-content p {
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin-top: 10px;
}

.step-content p code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.terminal-mockup {
  position: relative;
}

.terminal-header {
  position: relative;
  display: flex;
  align-items: center;
  padding-right: 40px;
}

.terminal-copy {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
}

.code-snippet {
  background: var(--vp-code-block-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius);
  padding: 12px 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  overflow-x: auto;
  line-height: 1.6;
}

.code-snippet.large {
  padding: 16px 20px;
  font-size: 15px;
}

.bottom-cta-section .code-snippet.code-snippet-with-copy {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding-right: 44px;
}

.code-snippet-with-copy code {
  line-height: 1.4;
}

.code-snippet-copy {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
}

.result-text {
  margin-top: 40px;
  font-size: 17px;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

/* ===================================================================
   Feature Showcase
   =================================================================== */
.feature-showcase {
  padding: 64px 0;
}

.feature-showcase-item {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  margin-bottom: 96px;
}

.feature-showcase-item:last-child {
  margin-bottom: 0;
}

.feature-showcase-item.reverse .feature-showcase-visual {
  order: -1;
}

.feature-showcase-content h3 {
  font-size: 30px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 16px;
  line-height: 1.2;
}

.feature-showcase-content p {
  font-size: 17px;
  color: var(--vp-c-text-2);
  line-height: 1.65;
  margin-bottom: 24px;
}

.feature-showcase-content p code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
}

.showcase-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: gap 0.2s;
}

.showcase-link:hover {
  text-decoration: none;
  gap: 8px;
}

/* File Tree Mockup */
.file-tree-mockup {
  background: var(--vp-code-block-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius);
  overflow: hidden;
  box-shadow: var(--tek-shadow-lg);
}

.file-tree-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  letter-spacing: 0.01em;
}

.file-tree-body {
  padding: 14px 0;
}

.file-tree-item {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-2);
  padding: 3px 16px;
  line-height: 1.7;
}

.file-tree-item.indent-1 {
  padding-left: 32px;
}

.file-tree-item.indent-2 {
  padding-left: 52px;
}

.file-tree-item.folder {
  color: var(--vp-c-text-1);
  font-weight: 500;
}

/* Recall Mockup */
.recall-mockup {
  background: var(--vp-code-block-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius);
  overflow: hidden;
  box-shadow: var(--tek-shadow-lg);
}

.recall-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  letter-spacing: 0.01em;
}

.recall-query {
  padding: 14px 20px;
  border-bottom: 1px solid var(--vp-c-border);
  display: flex;
  align-items: center;
  gap: 10px;
}

.recall-query-label {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.recall-query-text {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.recall-results {
  padding: 10px 0;
}

.recall-result {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--vp-c-border);
  transition: background-color 0.2s;
}

.recall-result:last-child {
  border-bottom: none;
}

.recall-result:hover {
  background: var(--vp-c-bg-mute);
}

.recall-score {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
  min-width: 36px;
}

.recall-result-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recall-result-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.recall-result-snippet {
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* Mode Toggle Mockup */
.mode-toggle-mockup {
  background: var(--vp-code-block-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius);
  overflow: hidden;
  box-shadow: var(--tek-shadow-lg);
}

.mode-toggle-buttons {
  display: flex;
  gap: 4px;
  padding: 10px;
  border-bottom: 1px solid var(--vp-c-border);
}

.mode-toggle-btn {
  padding: 7px 18px;
  border: none;
  border-radius: 6px;
  font-family: var(--vp-font-family-display);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--vp-c-text-2);
  transition: background 0.2s, color 0.2s;
}

.mode-toggle-btn:hover {
  color: var(--vp-c-text-1);
}

.mode-toggle-btn.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.mode-toggle-kicker {
  padding: 12px 20px 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.mode-toggle-code {
  padding: 14px 20px 20px;
  overflow-x: auto;
}

.mode-toggle-code pre {
  margin: 0;
}

.mode-toggle-code code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-1);
}

.mode-coming-soon {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 6px 0;
}

.mode-coming-soon-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mode-coming-soon-badge {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vp-c-bg);
  background: var(--vp-c-brand-1);
  padding: 4px 8px;
  border-radius: 4px;
}

.mode-coming-soon-text {
  font-family: var(--vp-font-family-display);
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
}

.mode-coming-soon-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: 2px;
}

.mode-coming-soon-feature {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.mode-coming-soon-feature code {
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--vp-c-text-1);
}

.mode-coming-soon-dot {
  color: var(--vp-c-brand-1);
  font-size: 8px;
  line-height: 1.5;
  flex-shrink: 0;
  margin-top: 4px;
}

.mode-coming-soon-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--vp-font-family-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: gap 0.2s;
  margin-top: 4px;
}

.mode-coming-soon-link:hover {
  text-decoration: none;
  gap: 8px;
}

/* ===================================================================
   Audience Section
   =================================================================== */
.audience-section {
  padding: 0 0 96px 0;
}

.audience-section h2 {
  font-size: 30px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.25;
  margin-bottom: 36px;
}

.audience-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.audience-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  padding: 32px;
  box-shadow: var(--tek-shadow-sm);
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
}

.audience-card:hover {
  transform: translateY(-3px);
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--tek-shadow-glow);
}

.audience-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  margin-bottom: 18px;
}

.audience-icon svg {
  display: block;
}

.audience-card h3 {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 14px;
}

.audience-card p {
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin-bottom: 20px;
}

.audience-card p code {
  background: var(--vp-c-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.audience-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: gap 0.2s;
}

.audience-link:hover {
  text-decoration: none;
  gap: 8px;
}

/* ===================================================================
   Comparison Section
   =================================================================== */
.comparison-section {
  padding: 0 0 96px 0;
}

.comparison-section h2 {
  font-size: 30px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.25;
  margin-bottom: 20px;
}

.comparison-section > .container > p {
  font-size: 17px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin-bottom: 20px;
}

.comparison-section > .container > p code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.star-history-embed {
  margin-top: 32px;
  text-align: center;
}

.star-history-link {
  display: inline-block;
  line-height: 0;
  text-decoration: none;
  opacity: 0.95;
  transition: opacity 0.2s;
}

.star-history-link:hover {
  opacity: 1;
}

.star-history-img {
  display: inline-block;
  max-width: 100%;
  height: auto;
  border-radius: var(--tek-radius);
}

.star-history-img-dark {
  display: none;
}

:root.dark .star-history-img {
  display: none;
}

:root.dark .star-history-img-dark {
  display: inline-block;
}

/* ===================================================================
   Bottom CTA
   =================================================================== */
.bottom-cta-section {
  padding: 96px 0;
  text-align: center;
  border-top: 1px solid var(--vp-c-border);
}

.bottom-cta-section .oss-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
}

.bottom-cta-section h2 {
  font-size: 30px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.25;
  margin-bottom: 24px;
}

.bottom-cta-section .code-snippet {
  display: inline-block;
  margin-bottom: 24px;
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.cta-button {
  display: inline-block;
  padding: 11px 24px;
  border-radius: 8px;
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.cta-button.primary {
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: var(--vp-c-bg);
  box-shadow: var(--tek-shadow-md);
}

.cta-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--tek-shadow-glow);
}

.cta-button.secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}

.cta-button.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.bottom-cta-link {
  display: block;
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.bottom-cta-link:hover {
  color: var(--vp-c-brand-1);
}

.changelog-teaser {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 28px;
  padding: 10px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s;
}

.changelog-teaser:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.changelog-teaser-badge {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--vp-c-bg);
  background: var(--vp-c-brand-1);
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1.4;
}

.changelog-teaser-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}

.changelog-teaser-version {
  font-family: var(--vp-font-family-mono);
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.changelog-teaser-divider {
  color: var(--vp-c-text-3);
}

.changelog-teaser-description {
  color: var(--vp-c-text-2);
}

.changelog-teaser-cta {
  font-family: var(--vp-font-family-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin-left: 4px;
}

/* ===================================================================
   Responsive
   =================================================================== */
@media (max-width: 768px) {
  .feature-showcase-item {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .feature-showcase-item.reverse .feature-showcase-visual {
    order: 0;
  }
}

@media (max-width: 640px) {
  .audience-grid {
    grid-template-columns: 1fr;
  }

  .step {
    flex-direction: column;
    gap: 12px;
  }

  .cta-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .cta-button {
    text-align: center;
  }
}

/* Syntax Highlighting Tokens */
.token.keyword {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.token.string {
  color: #10b981;
}
:root.dark .token.string {
  color: #34d399;
}
.token.comment {
  color: var(--vp-c-text-3);
  font-style: italic;
}
.token.class {
  color: #2563eb;
}
:root.dark .token.class {
  color: #60a5fa;
}
.token.function {
  color: #db2777;
}
:root.dark .token.function {
  color: #f472b6;
}
</style>
