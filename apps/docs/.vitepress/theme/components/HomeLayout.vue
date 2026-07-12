<script setup lang="ts">
import { useData, useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { computed, nextTick, onMounted, watch } from "vue";
import AnnouncementPill from "./AnnouncementPill.vue";
import AskAiBar from "./AskAiBar.vue";
import BlogPostFooter from "./BlogPostFooter.vue";
import BlogPostHeader from "./BlogPostHeader.vue";
import HeroTerminal from "./HeroTerminal.vue";
import SidebarBrand from "./SidebarBrand.vue";
import StatBadge from "./StatBadge.vue";
import StatsStrip from "./StatsStrip.vue";

const { Layout } = DefaultTheme;

const { frontmatter } = useData();
/** Blog posts opt in with `blog: post` frontmatter to get editorial chrome. */
const isBlogPost = computed(() => frontmatter.value.blog === "post");

const route = useRoute();

const splitTitle = () => {
	const nameEl = document.querySelector<HTMLElement>(".VPHero .name");
	if (nameEl && nameEl.textContent === "MemoFS") {
		nameEl.classList.remove("clip");
		nameEl.innerHTML =
			'<span class="name-memo">Memo</span><span class="name-fs">FS</span>';
	}
};

onMounted(() => {
	splitTitle();
});

watch(
	() => route.path,
	(to) => {
		if (to === "/") {
			nextTick(() => splitTitle());
		}
	},
);

/**
 * Integration logos rendered in the credibility bar.
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

    <!-- Announcement pill above the hero name -->
    <template #home-hero-before>
      <AnnouncementPill
        badge="Cloud"
        text="Introducing MemoFS Cloud"
        href="/changelog"
      />
    </template>

    <!-- Animated terminal replaces the old SVG orbit diagram -->
    <template #home-hero-image>
      <div class="hero-visual-container">
        <HeroTerminal />
      </div>
    </template>

    <template #home-hero-after>
      <div class="home-custom-sections">
        <!-- Credibility: works with the agents devs already use -->
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
      </div>
    </template>

    <template #home-features-after>
      <div class="home-custom-sections">

        <!-- Problem: name the pain before pitching -->
        <hr class="tek-hairline" />
        <section id="problem" class="problem-section tek-reveal">
          <div class="problem-bg tek-dot-grid" aria-hidden="true"></div>
          <div class="container">
            <p class="tek-kicker">The problem</p>
            <h2 class="problem-headline">
              Every new session <span class="problem-em">starts from zero.</span>
            </h2>
            <p class="problem-body">
              You walk your agent through the auth system. It gets it. Next session —
              a blank stare. You paste the architecture doc again, and it ships code that
              contradicts last week's decision. It has no memory of what you chose, because
              there was nowhere to put it.
            </p>
          </div>
        </section>

        <!-- How it works: reduce perceived complexity to three commands -->
        <hr class="tek-hairline" />
        <section id="how-it-works" class="how-it-works-section tek-reveal">
          <div class="container">
            <p class="tek-kicker">How it works</p>
            <h2 class="tek-h2">Three commands. Your agent remembers.</h2>
            <ol class="steps">
              <li class="step">
                <span class="step-number">1</span>
                <div class="step-content">
                  <h3>Install</h3>
                  <div class="terminal-mockup">
                    <div class="terminal-header">
                      <span class="terminal-dot red"></span>
                      <span class="terminal-dot yellow"></span>
                      <span class="terminal-dot green"></span>
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npm install -D @memofs/cli<br />
                      <span class="terminal-comment"># OR</span><br />
                      <span class="terminal-comment"># pnpm add -D @memofs/cli</span><br />
                      <span class="terminal-comment"># yarn add -D @memofs/cli</span><br />
                      <span class="terminal-comment"># bun add -d @memofs/cli</span><br />
                      <span class="terminal-comment"># deno add -D npm:@memofs/cli</span>
                    </div>
                  </div>
                  <p class="step-requirement">
                    Requires <strong>Node.js &gt;= 22</strong>
                  </p>
                </div>
              </li>
              <li class="step">
                <span class="step-number">2</span>
                <div class="step-content">
                  <h3>Initialize</h3>
                  <div class="terminal-mockup">
                    <div class="terminal-header">
                      <span class="terminal-dot red"></span>
                      <span class="terminal-dot yellow"></span>
                      <span class="terminal-dot green"></span>
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npx memofs init<br />
                      <span class="terminal-success">✓ Created .memofs/ with core memory, notes, recall indexes, and graph files.</span>
                    </div>
                  </div>
                </div>
              </li>
              <li class="step">
                <span class="step-number">3</span>
                <div class="step-content">
                  <h3>Record</h3>
                  <div class="terminal-mockup">
                    <div class="terminal-header">
                      <span class="terminal-dot red"></span>
                      <span class="terminal-dot yellow"></span>
                      <span class="terminal-dot green"></span>
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npx memofs remember "Auth uses JWT with refresh rotation" --kind decision<br />
                      <span class="terminal-success">✓ Stored decision memory in .memofs/memory/notes.md</span>
                    </div>
                  </div>
                </div>
              </li>
            </ol>
            <p class="result-text">
              Next session, your agent already knows. No repeating yourself. No contradictions.
              No "what were we working on again?"
            </p>
          </div>
        </section>

        <!-- Benchmark stats -->
        <StatsStrip />

        <!-- Feature showcase: bento grid layout -->
        <hr class="tek-hairline" />
        <section id="features" class="feature-showcase">
          <div class="container-wide">
            <header class="showcase-head tek-reveal">
              <p class="tek-kicker">Why MemoFS</p>
              <h2 class="tek-h2">Memory your agent can actually use.</h2>
            </header>

            <!-- Bento grid: wide first card, 2-col below -->
            <div class="bento-grid">

              <!-- Card 1: File-first — full width -->
              <div class="bento-card bento-wide tek-reveal" data-delay="1">
                <div class="bento-content">
                  <p class="tek-kicker">File-first</p>
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
                <div class="bento-visual">
                  <div class="visual-frame cyan">
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
              </div>

              <!-- Card 2: Recall — full width -->
              <div class="bento-card bento-wide tek-reveal" data-delay="2">
                <div class="bento-content">
                  <p class="tek-kicker gold">Recall</p>
                  <h3>The right memory, fetched for you</h3>
                  <p>
                    Stop scrolling through old prompts. MemoFS indexes your memory and returns the
                    fragment that fits the task — semantically, not by keyword.
                  </p>
                  <a href="/packages/core/concepts" class="showcase-link">
                    See how recall works →
                  </a>
                </div>
                <div class="bento-visual">
                  <div class="visual-frame gold">
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
              </div>

            </div><!-- /bento-grid -->
          </div>
        </section>

        <!-- Runtimes Section — 3 columns side-by-side -->
        <hr class="tek-hairline" />
        <section id="runtimes" class="runtimes-section">
          <div class="container-wide">
            <header class="runtimes-head tek-reveal">
              <p class="tek-kicker">Runtimes</p>
              <h2 class="tek-h2">One engine, three storage modes</h2>
              <p class="tek-lede">
                MemoFS is built on a unified store abstraction. Choose where your memory resides based on your workflow and access needs.
              </p>
            </header>

            <div class="runtimes-grid">
              
              <!-- Column 1: Local -->
              <div class="runtime-card tek-reveal" data-delay="1">
                <div class="runtime-header">
                  <span class="tek-kicker">Local mode</span>
                  <h3>Offline storage</h3>
                  <p>
                    All memory is written directly to your project's local file system as markdown and JSON. Fast, offline-first, and zero network latency.
                  </p>
                </div>
                <div class="runtime-visual">
                  <div class="runtime-code-panel">
                    <div class="runtime-code-bar">
                      <span class="runtime-code-dot"></span>
                      <span class="runtime-code-dot"></span>
                      <span class="runtime-code-dot"></span>
                      <span class="runtime-code-filename">memofs.ts</span>
                    </div>
                    <pre class="runtime-pre"><code><span class="token keyword">import</span> { <span class="token class">MemoFS</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span>
import { <span class="token function">createNodeFsStore</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core/node-fs"</span>

<span class="token comment">// All memory stays on disk — offline-first.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span>({
  store: <span class="token function">createNodeFsStore</span>(
    { rootDir: <span class="token string">"./.memofs"</span> }
  ),
  projectId: <span class="token string">"my-app"</span>,
  mode: <span class="token string">"local"</span>,
})</code></pre>
                  </div>
                </div>
              </div>

              <!-- Column 2: Hybrid + Sync -->
              <div class="runtime-card tek-reveal" data-delay="2">
                <div class="runtime-header">
                  <span class="tek-kicker gold">Hybrid mode</span>
                  <h3>Cloud synchronized</h3>
                  <p>
                    Stores files locally for speed, but automatically synchronizes replicas to MemoFS Cloud so your agent memory follows you across development machines.
                  </p>
                </div>
                <div class="runtime-visual">
                  <div class="runtime-code-panel runtime-code-panel--gold">
                    <div class="runtime-code-bar">
                      <span class="runtime-code-dot"></span>
                      <span class="runtime-code-dot"></span>
                      <span class="runtime-code-dot"></span>
                      <span class="runtime-code-filename">memofs.ts</span>
                    </div>
                    <pre class="runtime-pre"><code><span class="token keyword">import</span> { <span class="token class">MemoFS</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span>
import { <span class="token function">createNodeFsStore</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core/node-fs"</span>

<span class="token comment">// Local speed + cloud replica.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span>({
  store: <span class="token function">createNodeFsStore</span>(
    { rootDir: <span class="token string">"./.memofs"</span> }
  ),
  mode: <span class="token string">"hybrid"</span>,
  cloud: {
    baseUrl: <span class="token string">process.env.MEMOFS_CLOUD_URL</span>,
    apiKey: <span class="token string">process.env.MEMOFS_API_KEY</span>,
  },
})</code></pre>
                  </div>
                </div>
              </div>


              <!-- Row 2: Managed — full width horizontal -->
              <div class="runtime-card runtime-card--full tek-reveal" data-delay="3">
                <div class="runtime-managed-left">
                  <span class="tek-kicker">Managed · Coming soon</span>
                  <h3>Cloud hosted</h3>
                  <p>
                    MemoFS Cloud hosts the engine. Thin clients — CI pipelines, edge functions, dashboards —
                    can read and write memory over HTTPS with zero local files.
                    The same <code>@memofs/core</code> API, no checkout required.
                  </p>
                  <a
                    href="https://memofs.dev/waitlist"
                    class="runtime-waitlist-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join the waitlist →
                  </a>
                </div>
                <ul class="runtime-managed-features">
                  <li>
                    <span class="rmf-icon">☁</span>
                    <span class="rmf-body">
                      <strong>Cloud-hosted engine</strong>
                      No local checkout, no disk writes
                    </span>
                  </li>
                  <li>
                    <span class="rmf-icon">⚡</span>
                    <span class="rmf-body">
                      <strong>Read &amp; write over HTTPS</strong>
                      Works from CI, serverless, or browser
                    </span>
                  </li>
                  <li>
                    <span class="rmf-icon">⬡</span>
                    <span class="rmf-body">
                      <strong>Same API surface</strong>
                      Drop-in replacement — change one config key
                    </span>
                  </li>
                  <li>
                    <span class="rmf-icon">⚙</span>
                    <span class="rmf-body">
                      <strong>Team memory sync</strong>
                      Shared knowledge across every developer on the project
                    </span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        <!-- Audience: two doors for two intents -->
        <hr class="tek-hairline" />
        <section id="audience" class="audience-section tek-reveal">
          <div class="container">
            <p class="tek-kicker">Built for how you work</p>
            <h2 class="tek-h2">Two ways in</h2>
            <div class="audience-grid">
              <a href="/api/core" class="audience-card tek-glow-hover">
                <span class="audience-icon cyan" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <h3>Building AI apps</h3>
                <p>
                  Give your app durable memory. Import <code>@memofs/core</code> — the same API
                  whether memory lives in local files, the cloud, or both.
                </p>
                <span class="audience-link">See the API reference →</span>
              </a>
              <a href="/packages/mcp/" class="audience-card tek-glow-hover-gold">
                <span class="audience-icon gold" aria-hidden="true">
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
                  Your coding agent finally remembers your project. Install the MCP server and
                  your agent gets project context every session — automatically.
                </p>
                <span class="audience-link gold">Connect your agent →</span>
              </a>
            </div>
          </div>
        </section>

        <!-- Comparison -->
        <hr class="tek-hairline" />
        <section id="comparison" class="comparison-section tek-reveal">
          <div class="container">
            <p class="tek-kicker">Why file-first</p>
            <h2 class="tek-h2">MemoFS vs. hosted memory tools</h2>
            <p class="tek-lede">
              Most memory tools hide your data in a dashboard you can't inspect. MemoFS stores
              everything as plain text and JSON in your project's <code>.memofs/</code> directory —
              alongside the code it describes.
            </p>
            <div class="comparison-table-wrapper tek-glass">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th class="col-memofs">MemoFS</th>
                    <th class="col-hosted">Hosted Memory Tools</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Where memory lives</td>
                    <td class="col-memofs"><span class="comparison-table-check">✓</span> Plain files in your repo</td>
                    <td class="col-hosted"><span class="comparison-table-cross">Locked in a remote dashboard</span></td>
                  </tr>
                  <tr>
                    <td>Inspect &amp; edit</td>
                    <td class="col-memofs"><span class="comparison-table-check">✓</span> Any editor, any diff tool</td>
                    <td class="col-hosted"><span class="comparison-table-cross">Vendor UI only</span></td>
                  </tr>
                  <tr>
                    <td>Version control</td>
                    <td class="col-memofs"><span class="comparison-table-check">✓</span> Git-tracked with your code</td>
                    <td class="col-hosted"><span class="comparison-table-cross">Separate system (if at all)</span></td>
                  </tr>
                  <tr>
                    <td>Ownership</td>
                    <td class="col-memofs"><span class="comparison-table-check">✓</span> You own every byte</td>
                    <td class="col-hosted"><span class="comparison-table-cross">Vendor-dependent</span></td>
                  </tr>
                  <tr>
                    <td>Offline support</td>
                    <td class="col-memofs"><span class="comparison-table-check">✓</span> Full offline by default</td>
                    <td class="col-hosted"><span class="comparison-table-cross">Requires internet</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Support: star + sponsor + community -->
            <section class="support-section">
              <div class="support-card">
                <p class="support-kicker">Support MemoFS</p>
                <p class="support-body">
                  If MemoFS saves you time, a star helps others find it. If it helps your work, consider sponsoring.
                </p>
                <div class="support-actions">
                  <a
                    href="https://github.com/memo-fs/memofs"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="support-btn"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.744 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                    ★ Star on GitHub
                  </a>
                  <a
                    href="https://github.com/sponsors/christophersesugh"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="support-btn sponsor-btn"
                  >
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    Sponsor on GitHub
                  </a>
                </div>
                <a
                  href="https://github.com/memo-fs/memofs/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="support-link"
                >
                  Join Discussions
                </a>
              </div>
            </section>
          </div>
        </section>

        <!-- Bottom CTA -->
        <section id="get-started" class="bottom-cta-section tek-reveal">
          <div class="container">
            <div class="cta-panel">
              <p class="oss-badge">MIT Licensed · 100% open source</p>
              <h2 class="cta-headline">One command. Your agent never forgets.</h2>
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
                  href="https://github.com/memo-fs/memofs"
                  class="bottom-cta-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
            </div>
          </div>
        </section>

      </div>
    </template>
  </Layout>
</template>

<style scoped>
/* Container scale */
.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

.container-wide {
  max-width: var(--tek-container);
  margin: 0 auto;
  padding: 0 24px;
}

.home-custom-sections {
  max-width: var(--tek-container);
  margin: 0 auto;
}

.hero-visual-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===================================================================
   Credibility Section
   =================================================================== */
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

/* ===================================================================
   Problem Section
   =================================================================== */
.problem-section {
  position: relative;
  padding: var(--tek-section-pad) 0;
  overflow: hidden;
}

.problem-bg {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  -webkit-mask-image: radial-gradient(70% 60% at 50% 40%, #000, transparent 75%);
  mask-image: radial-gradient(70% 60% at 50% 40%, #000, transparent 75%);
  pointer-events: none;
}

.problem-headline {
  font-family: var(--vp-font-family-display);
  font-weight: 700;
  font-size: clamp(34px, 6vw, 64px);
  line-height: 1.04;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
  margin: 0 0 28px;
  max-width: 18ch;
}

.problem-em {
  background: linear-gradient(120deg, var(--tek-c-cyan), var(--tek-c-gold));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.problem-body {
  font-size: 18px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
  max-width: 60ch;
}

/* ===================================================================
   How It Works
   =================================================================== */
.how-it-works-section {
  padding: 0 0 var(--tek-section-pad);
}

.steps {
  list-style: none;
  counter-reset: step;
  margin: 48px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 40px;
  position: relative;
}

.steps::before {
  content: "";
  position: absolute;
  left: 17px;
  top: 18px;
  bottom: 18px;
  width: 2px;
  background: linear-gradient(to bottom, var(--tek-c-cyan), var(--tek-c-gold));
  opacity: 0.4;
}

.step {
  position: relative;
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 24px;
  align-items: start;
}

.step-number {
  counter-increment: step;
  z-index: 1;
  width: 36px;
  height: 36px;
  border-radius: var(--tek-radius);
  background: var(--vp-c-bg);
  border: 1px solid var(--tek-c-cyan);
  color: var(--tek-c-cyan);
  font-family: var(--vp-font-family-display);
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--tek-shadow-glow);
}

.step-content { min-width: 0; }

.step-content h3 {
  font-family: var(--vp-font-family-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 4px 0 14px;
}

.step-content p {
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin-top: 12px;
}

.step-content p code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: var(--tek-radius);
  font-size: 13px;
}

.result-text {
  margin-top: 44px;
  font-size: 18px;
  color: var(--vp-c-text-1);
  line-height: 1.7;
  font-weight: 500;
  max-width: 56ch;
}

/* ===================================================================
   Bento Grid Feature Showcase
   =================================================================== */
.feature-showcase {
  padding: var(--tek-section-pad) 0;
}

.showcase-head {
  text-align: center;
  margin-bottom: 56px;
}

.showcase-head .tek-kicker {
  justify-content: center;
}

.showcase-head .tek-kicker::before {
  display: none;
}

/* Bento grid container */
.bento-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--vp-c-divider);
  border: 1px solid var(--vp-c-divider);
}

.bento-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  background: var(--vp-c-divider);
}

/* Each bento card */
.bento-card {
  background: var(--vp-c-bg);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  padding: 48px;
  transition: background 0.2s;
}

.bento-card:hover {
  background: var(--vp-c-bg-soft);
}

/* Wide card (full width) */
.bento-wide {
  /* inherits .bento-card grid */
}

/* Row cards (half width each) */
.bento-row .bento-card {
  grid-template-columns: 1fr;
}

.bento-row .bento-visual {
  /* Visual goes below the content in half-width cards */
}

.bento-content h3 {
  font-family: var(--vp-font-family-display);
  font-weight: 700;
  font-size: clamp(20px, 2.5vw, 28px);
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin: 0 0 14px;
}

.bento-content p {
  font-size: 16px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin-bottom: 20px;
}

.bento-content p code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: var(--tek-radius);
  font-size: 13px;
  color: var(--tek-c-cyan);
}

/* Gradient hairline frame around each visual */
.visual-frame {
  position: relative;
  padding: 1px;
  border-radius: var(--tek-radius);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tek-c-cyan) 55%, transparent),
    color-mix(in srgb, var(--tek-c-gold) 35%, transparent) 55%,
    transparent
  );
  box-shadow: var(--tek-shadow-lg);
}

.visual-frame.gold {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--tek-c-gold) 55%, transparent),
    color-mix(in srgb, var(--tek-c-cyan) 35%, transparent) 55%,
    transparent
  );
}

.visual-frame > * {
  border-radius: var(--tek-radius);
  overflow: hidden;
}

.showcase-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--tek-c-cyan);
  text-decoration: none;
  transition: gap 0.2s;
}

.showcase-link:hover {
  text-decoration: none;
  gap: 8px;
}

/* File Tree Mockup */
.file-tree-mockup {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.file-tree-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--tek-c-cyan);
  letter-spacing: 0.01em;
}

.file-tree-body { padding: 14px 0; }

.file-tree-item {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-2);
  padding: 3px 16px;
  line-height: 1.7;
}

.file-tree-item.indent-1 { padding-left: 32px; }
.file-tree-item.indent-2 { padding-left: 52px; }
.file-tree-item.folder { color: var(--vp-c-text-1); font-weight: 500; }

/* Recall Mockup */
.recall-mockup {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.recall-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--tek-c-gold);
  letter-spacing: 0.01em;
}

.recall-query {
  padding: 14px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
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

.recall-results { padding: 10px 0; }

.recall-result {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  transition: background-color 0.2s;
}

.recall-result:last-child { border-bottom: none; }
.recall-result:hover { background: var(--vp-c-bg-mute); }

.recall-score {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--tek-c-gold);
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

/* Runtimes grid */
.runtimes-section {
  padding: var(--tek-section-pad) 0;
}

.runtimes-head {
  text-align: center;
  margin-bottom: 48px;
}

.runtimes-head .tek-kicker {
  justify-content: center;
}

.runtimes-head .tek-kicker::before {
  display: none;
}

.runtimes-head .tek-lede {
  margin: 0 auto;
}

.runtimes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  align-items: stretch;
  border: 1px solid var(--vp-c-divider);
}

.runtime-card {
  background: var(--vp-c-bg-soft);
  border: none;
  border-right: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  border-radius: 0 !important;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: none;
  transition: background 0.25s;
}

.runtime-card:last-child {
  border-right: none;
}

.runtime-card:hover {
  background: color-mix(in srgb, var(--vp-c-brand-soft) 60%, var(--vp-c-bg-soft));
}

.runtime-card--full {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  padding: 40px 48px;
  border-right: none;
  background: color-mix(in srgb, var(--tek-c-cyan) 4%, var(--vp-c-bg-soft));
}

.runtime-card--full:hover {
  background: color-mix(in srgb, var(--tek-c-cyan) 7%, var(--vp-c-bg-soft));
}

.runtime-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.runtime-header h3 {
  font-family: var(--vp-font-family-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 4px 0 8px;
}

.runtime-header p {
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
}

.runtime-visual {
  margin-top: auto;
}

/* Managed card left column */
.runtime-managed-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
}

.runtime-managed-left h3 {
  font-family: var(--vp-font-family-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 4px 0 0;
}

.runtime-managed-left p {
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin: 0;
}

.runtime-managed-left code {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--tek-c-cyan);
  background: color-mix(in srgb, var(--tek-c-cyan) 10%, transparent);
  padding: 1px 5px;
}

.runtime-waitlist-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border: 1px solid var(--tek-c-cyan);
  font-family: var(--vp-font-family-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--tek-c-cyan);
  text-decoration: none;
  background: color-mix(in srgb, var(--tek-c-cyan) 8%, transparent);
  transition: background 0.2s, gap 0.2s;
  align-self: center;
  margin-top: 8px;
}

.runtime-waitlist-btn:hover {
  background: color-mix(in srgb, var(--tek-c-cyan) 16%, transparent);
  gap: 10px;
  text-decoration: none;
}

/* Managed features grid */
.runtime-managed-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.runtime-managed-features li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.rmf-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
  opacity: 0.7;
}

.rmf-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

.rmf-body strong {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  display: block;
}

/* Runtime code panels — terminal style */
.runtime-code-panel {
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.runtime-code-panel--gold {
  border-color: color-mix(in srgb, var(--tek-c-gold) 25%, transparent);
}

.runtime-code-panel--dim {
  background: #0d1117;
  border-color: rgba(255, 255, 255, 0.06);
}

.runtime-code-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.03);
}

.runtime-code-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: block;
  flex-shrink: 0;
}

.runtime-code-filename {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin-left: 4px;
  letter-spacing: 0.02em;
}

.runtime-pre {
  margin: 0;
  padding: 18px 20px;
  overflow: hidden;
  background: transparent;
}

.runtime-pre code {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.75;
  color: #c9d1d9;
  white-space: pre-wrap;
  word-break: break-word;
  display: block;
}

.runtime-managed-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.runtime-features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.runtime-features-list li {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  padding-left: 16px;
  position: relative;
  line-height: 1.5;
}

.runtime-features-list li::before {
  content: "●";
  position: absolute;
  left: 0;
  font-size: 8px;
  top: 4px;
  color: var(--tek-c-gold);
}

.runtime-features-list li code {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--tek-c-cyan);
  background: transparent;
}

.mode-coming-soon {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 6px 0;
}

.mode-coming-soon-badge {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--tek-c-gold);
  background: color-mix(in srgb, var(--tek-c-gold) 14%, transparent);
  padding: 4px 8px;
}

.mode-coming-soon-text {
  font-family: var(--vp-font-family-display);
  font-size: 13.5px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
}

.mode-coming-soon-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
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
  border: 1px solid var(--vp-c-divider);
  padding: 1px 5px;
  border-radius: var(--tek-radius);
  font-size: 12px;
  color: var(--vp-c-text-1);
}

.mode-coming-soon-dot {
  color: var(--tek-c-gold);
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
  color: var(--tek-c-gold);
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
.audience-section { padding: 0 0 var(--tek-section-pad); }

.audience-section .tek-kicker { justify-content: center; }
.audience-section .tek-kicker::before { display: none; }
.audience-section .tek-h2 { text-align: center; margin-bottom: 48px; }

.audience-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.audience-card {
  display: block;
  text-decoration: none;
  background: var(--tek-glass-bg);
  -webkit-backdrop-filter: blur(var(--tek-glass-blur));
  backdrop-filter: blur(var(--tek-glass-blur));
  border: 1px solid var(--tek-glass-border);
  border-radius: var(--tek-radius);
  padding: 36px;
  box-shadow: var(--tek-shadow-md);
}

.audience-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--tek-radius);
  margin-bottom: 20px;
  border: 1px solid transparent;
}

.audience-icon.cyan {
  color: var(--tek-c-cyan);
  background: color-mix(in srgb, var(--tek-c-cyan) 12%, transparent);
  border-color: color-mix(in srgb, var(--tek-c-cyan) 30%, transparent);
}

.audience-icon.gold {
  color: var(--tek-c-gold);
  background: color-mix(in srgb, var(--tek-c-gold) 12%, transparent);
  border-color: color-mix(in srgb, var(--tek-c-gold) 30%, transparent);
}

.audience-icon svg { display: block; }

.audience-card h3 {
  font-family: var(--vp-font-family-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0 0 14px;
}

.audience-card p {
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  margin-bottom: 22px;
}

.audience-card p code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: var(--tek-radius);
  font-size: 13px;
  color: var(--tek-c-cyan);
}

.audience-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--tek-c-cyan);
}

.audience-link.gold { color: var(--tek-c-gold); }

/* ===================================================================
   Comparison Section
   =================================================================== */
.comparison-section { padding: 0 0 var(--tek-section-pad); }
.comparison-section .tek-kicker { justify-content: center; }
.comparison-section .tek-kicker::before { display: none; }
.comparison-section .tek-h2 { text-align: center; margin-bottom: 16px; }
.comparison-section .tek-lede { margin: 0 auto 36px; text-align: center; }

.comparison-section .tek-lede code {
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: var(--tek-radius);
  font-size: 14px;
  color: var(--tek-c-cyan);
}

.comparison-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--tek-glass-border);
  border-radius: var(--tek-radius);
  box-shadow: var(--tek-shadow-md);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
  line-height: 1.5;
  text-align: left;
}

.comparison-table th {
  padding: 16px 20px;
  font-family: var(--vp-font-family-display);
  font-weight: 600;
  border-bottom: 2px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.comparison-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.comparison-table tr:last-child td { border-bottom: none; }
.comparison-table tr:hover td { background-color: var(--vp-c-bg-mute); }

.comparison-table td:first-child,
.comparison-table th:first-child { font-weight: 600; color: var(--vp-c-text-1); }

.comparison-table .col-memofs {
  background: color-mix(in srgb, var(--tek-c-cyan) 7%, transparent);
  box-shadow:
    inset 1px 0 0 color-mix(in srgb, var(--tek-c-cyan) 35%, transparent),
    inset -1px 0 0 color-mix(in srgb, var(--tek-c-cyan) 35%, transparent);
}

.comparison-table th.col-memofs { color: var(--tek-c-cyan); }

.comparison-table-check { color: var(--tek-c-cyan); font-weight: 700; font-size: 16px; }
.comparison-table-cross { color: var(--vp-c-text-3); font-size: 14px; }

/* ===================================================================
   Support Section (star + sponsor + community)
   =================================================================== */
.support-section {
  margin-top: 40px;
}

.support-card {
  padding: 32px;
  text-align: center;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  box-shadow: var(--tek-shadow-sm);
}

.support-kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tek-c-cyan);
  margin: 0 0 8px;
}

.support-body {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0 0 20px;
}

.support-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.support-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  background: var(--vp-c-bg);
  border-radius: var(--tek-radius);
  transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s;
  white-space: nowrap;
}

.support-btn:hover {
  border-color: var(--tek-c-gold);
  color: var(--tek-c-gold);
  background: color-mix(in srgb, var(--tek-c-gold) 6%, var(--vp-c-bg));
  transform: translateY(-1px);
}

.support-btn.sponsor-btn {
  background: var(--tek-c-cyan);
  color: #fff;
  border-color: var(--tek-c-cyan);
}

.support-btn.sponsor-btn:hover {
  background: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-2);
  color: #fff;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--tek-c-cyan) 30%, transparent);
}

.support-link {
  display: block;
  margin-top: 16px;
  font-family: var(--vp-font-family-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.support-link:hover {
  color: var(--tek-c-cyan);
}

/* ===================================================================
   Bottom CTA
   =================================================================== */
.bottom-cta-section {
  padding: var(--tek-section-pad) 0;
  border-top: 1px solid var(--vp-c-divider);
}

.cta-panel {
  position: relative;
  max-width: 820px;
  margin: 0 auto;
  padding: 64px 40px;
  text-align: center;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  box-shadow: var(--tek-shadow-md);
}

.oss-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0 0 16px;
}

.cta-headline {
  font-family: var(--vp-font-family-display);
  font-weight: 700;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.12;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin: 0 0 28px;
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
  color: var(--vp-code-color);
}

.code-snippet.large {
  display: inline-flex;
  align-items: center;
  padding: 16px 20px;
  font-size: 16px;
  margin-bottom: 28px;
  padding-right: 48px;
  position: relative;
}

.code-snippet-copy {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
}

.cta-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.cta-button {
  display: inline-block;
  padding: 12px 26px;
  border-radius: var(--tek-radius);
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.cta-button.primary {
  background: var(--tek-c-cyan);
  color: #fff;
  box-shadow: var(--tek-shadow-sm);
}

.cta-button.primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-2px);
  box-shadow: var(--tek-shadow-glow);
}

.cta-button.secondary {
  background: transparent;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}

.cta-button.secondary:hover {
  border-color: var(--tek-c-cyan);
  color: var(--tek-c-cyan);
  transform: translateY(-2px);
}

.cta-secondary-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.bottom-cta-link {
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.bottom-cta-link:hover { color: var(--tek-c-cyan); }

.changelog-teaser {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--tek-glass-border);
  border-radius: var(--tek-radius-pill);
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s;
}

.changelog-teaser:hover {
  border-color: var(--tek-c-cyan);
  transform: translateY(-1px);
}

.changelog-teaser-badge {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--tek-c-gold);
  background: color-mix(in srgb, var(--tek-c-gold) 14%, transparent);
  padding: 2px 6px;
  border-radius: var(--tek-radius);
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
}

.changelog-teaser-divider { color: var(--vp-c-text-3); }
.changelog-teaser-description { color: var(--vp-c-text-2); }

.changelog-teaser-cta {
  font-family: var(--vp-font-family-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--tek-c-cyan);
  margin-left: 4px;
}

/* ===================================================================
   Syntax Highlighting Tokens
   =================================================================== */
.token.keyword { color: var(--tek-c-cyan); font-weight: 600; }
.token.string { color: var(--tek-c-gold); }
.token.comment { color: var(--vp-c-text-3); font-style: italic; }
.token.class { color: #60a5fa; }
.token.function { color: #f472b6; }

/* ===================================================================
   Responsive
   =================================================================== */
@media (max-width: 1100px) {
  .runtime-card--full {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 36px 32px;
  }

  .runtime-managed-features {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 860px) {
  .bento-card {
    grid-template-columns: 1fr;
    gap: 36px;
    padding: 36px 28px;
  }

  .bento-row {
    grid-template-columns: 1fr;
  }

  .runtimes-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .runtime-card {
    border-right: none;
    border-bottom: 1px solid var(--vp-c-divider);
  }

  .runtime-card:last-child {
    border-bottom: none;
  }

  .runtime-card--full {
    padding: 32px 24px;
  }

  .runtime-managed-features {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .audience-grid {
    grid-template-columns: 1fr;
  }

  .cta-panel {
    padding: 48px 24px;
  }
}

@media (max-width: 640px) {
  .step {
    grid-template-columns: 30px 1fr;
    gap: 16px;
  }

  .step-number {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }

  .steps::before {
    left: 14px;
  }

  .audience-card {
    padding: 24px;
  }

  .comparison-table-wrapper {
    margin-left: -24px;
    margin-right: -24px;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  .comparison-table th,
  .comparison-table td {
    padding: 10px 12px;
    font-size: 13px;
    white-space: nowrap;
  }

  .comparison-table td:first-child {
    white-space: normal;
    min-width: 90px;
  }

  .support-actions {
    flex-direction: column;
    gap: 10px;
  }

  .cta-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .cta-button {
    text-align: center;
  }

  .problem-headline {
    max-width: 100%;
  }

  .showcase-head {
    margin-bottom: 40px;
  }

  .credibility-logo-link {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>

<style>
@media (max-width: 959px) {
  .VPHero .image {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .VPHero {
    padding-top: calc(var(--vp-nav-height) + var(--vp-layout-top-height, 0px) + 16px) !important;
  }
}
</style>
