<script setup lang="ts">
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { computed, onMounted, onUnmounted, ref } from "vue";
import AskAiBar from "./AskAiBar.vue";
import BlogPostFooter from "./BlogPostFooter.vue";
import BlogPostHeader from "./BlogPostHeader.vue";
import HeroVisual from "./HeroVisual.vue";
import SidebarBrand from "./SidebarBrand.vue";

const { Layout } = DefaultTheme;

const { frontmatter } = useData();
/** Blog posts opt in with `blog: post` frontmatter to get editorial chrome. */
const isBlogPost = computed(() => frontmatter.value.blog === "post");

/**
 * Deploys is the live mode-toggle shown in the feature showcase. It reflects
 * the shipped `Tekmemo` constructor (D4): there is no `mode: "cloud"` flag.
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
		kicker: "Local first, cloud as a replica.",
	},
	{
		label: "Managed (later)",
		kicker: "TekMemo Cloud runs the engine.",
	},
];
</script>

<template>
  <Layout>
    <template #layout-top>
      <div class="alpha-announcement-bar">
        <span class="alpha-badge">Cloud</span>
        <span class="alpha-text">
          The core runtime is open source and free. TekMemo Cloud (hosted sync, managed MCP, team features) is in early access.
          <a href="https://memo.tekbreed.com" class="alpha-link" target="_blank" rel="noopener noreferrer">Join the waitlist →</a>
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
            <div class="credibility-row">
              <p class="compat-line">
                Works with <span class="compat-tool">Claude Code</span>
                <span class="compat-sep">·</span>
                <span class="compat-tool">Cursor</span>
                <span class="compat-sep">·</span>
                <span class="compat-tool">Codex</span>
                <span class="compat-sep">·</span>
                <span class="compat-tool">OpenCode</span>
                <span class="compat-sep">·</span>
                <span class="compat-tool">any MCP client</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #home-features-after>
      <div class="home-custom-sections">
        <!-- Problem: name the pain before pitching -->
        <section class="problem-section tek-reveal">
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
        <section class="how-it-works-section tek-reveal">
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
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npm install -D tekmemo
                    </div>
                  </div>
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
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npx tekmemo init<br />
                      <span class="terminal-success">✓ Created .tekmemo/ with core memory, notes, recall indexes, and graph files.</span>
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
                    </div>
                    <div class="terminal-content">
                      <span class="terminal-prompt">$</span> npx tekmemo remember "Auth uses JWT with refresh rotation" --kind decision<br />
                      <span class="terminal-success">✓ Saved to core memory.</span>
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

        <!-- Feature showcase: three pillars, each with a live visual -->
        <section class="feature-showcase tek-reveal">
          <div class="showcase-container">
            <div class="feature-showcase-item">
              <div class="feature-showcase-content">
                <span class="section-kicker">File-first</span>
                <h3>Open it. Diff it. Commit it.</h3>
                <p>
                  Every decision, convention, and note sits in plain text under
                  <code>.tekmemo/</code>. Open it in your editor. Diff it in review. Commit it with
                  your code. Memory stops being a black box.
                </p>
                <a href="/packages/core/agentfs" class="showcase-link">
                  Learn about file-first memory →
                </a>
              </div>
              <div class="feature-showcase-visual">
                <div class="file-tree-mockup">
                  <div class="file-tree-header">.tekmemo/</div>
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
                    <div class="file-tree-item indent-1 folder">graph/</div>
                    <div class="file-tree-item indent-2">nodes.jsonl</div>
                    <div class="file-tree-item indent-2">edges.jsonl</div>
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
                  Stop scrolling through old prompts. TekMemo indexes your memory and returns the
                  fragment that fits the task — semantically, not by keyword. Hybrid recall merges
                  lexical and vector search, then reranks.
                </p>
                <a href="/packages/core/concepts" class="showcase-link">
                  See how recall works →
                </a>
              </div>
              <div class="feature-showcase-visual">
                <div class="recall-mockup">
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
                <h3>One engine, three ways to run it</h3>
                <p>
                  Local mode works offline. Hybrid adds a cloud replica so your memory follows you
                  across machines. Managed runtime is on the roadmap. The engine and the API stay
                  the same — you only change how memory is stored and synced.
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
                    <pre v-show="activeMode === 0"><code><span class="token keyword">import</span> { <span class="token class">Tekmemo</span> } <span class="token keyword">from</span> <span class="token string">"@tekmemo/core"</span>;
<span class="token keyword">import</span> { <span class="token function">createNodeFsMemoryStore</span> } <span class="token keyword">from</span> <span class="token string">"@tekmemo/core/node-fs"</span>;

<span class="token comment">// Default. Memory lives in .tekmemo/ as markdown + JSON.</span>
<span class="token comment">// No API keys, no network. Read it, diff it, commit it.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">Tekmemo</span>({
  store: <span class="token function">createNodeFsMemoryStore</span>({ rootDir: <span class="token string">"./.tekmemo"</span> }),
  projectId: <span class="token string">"my-app"</span>,
  mode: <span class="token string">"local"</span>,
});</code></pre>

                    <pre v-show="activeMode === 1"><code><span class="token keyword">import</span> { <span class="token class">Tekmemo</span> } <span class="token keyword">from</span> <span class="token string">"@tekmemo/core"</span>;
<span class="token keyword">import</span> { <span class="token function">createNodeFsMemoryStore</span> } <span class="token keyword">from</span> <span class="token string">"@tekmemo/core/node-fs"</span>;

<span class="token comment">// Same engine, same files — plus a cloud replica for other machines.</span>
<span class="token comment">// Reads/writes hit local first; sync.push / sync.pull mirror .tekmemo/.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">Tekmemo</span>({
  store: <span class="token function">createNodeFsMemoryStore</span>({ rootDir: <span class="token string">"./.tekmemo"</span> }),
  projectId: <span class="token string">"my-app"</span>,
  mode: <span class="token string">"hybrid"</span>,
  cloud: {
    baseUrl: process.env.TEKMEMO_CLOUD_URL!,
    apiKey: process.env.TEKMEMO_API_KEY!,
  },
  readPolicy: <span class="token string">"local-first"</span>,
  writePolicy: <span class="token string">"local-first"</span>,
});</code></pre>

                    <pre v-show="activeMode === 2"><code><span class="token comment">// TekMemo Cloud can host the runtime so thin clients (CI, dashboards)</span>
<span class="token comment">// read memory over HTTPS without a local checkout.</span>
<span class="token comment">//</span>
<span class="token comment">//   • Cloud client: a file-sync transport today</span>
<span class="token comment">//     (push / complete / pull / status).</span>
<span class="token comment">//   • Managed runtime: coming after early access.</span>
<span class="token comment">//</span>
<span class="token comment">// Same data model either way — .tekmemo/ is always the source of truth.</span></code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Audience: two doors for two intents -->
        <section class="audience-section tek-reveal">
          <div class="container">
            <span class="section-kicker">Built for how you work</span>
            <h2>Two ways in</h2>
            <div class="audience-grid">
              <div class="audience-card">
                <span class="audience-emoji">🧩</span>
                <h3>Building AI apps</h3>
                <p>
                  Give your app durable memory. Import <code>@tekmemo/core</code> — the same API
                  whether memory lives in local files, the cloud, or both. The AI SDK runtime ships
                  recall, context-building, and a tool definition ready to wire into any agent.
                </p>
                <a href="/api/core" class="audience-link">See the API reference →</a>
              </div>
              <div class="audience-card">
                <span class="audience-emoji">🤖</span>
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
        <section class="comparison-section tek-reveal">
          <div class="container">
            <span class="section-kicker">Why file-first</span>
            <h2>TekMemo vs. hosted memory tools</h2>
            <p>
              Most memory tools hide your data in a dashboard you can't inspect. TekMemo stores
              everything as plain text and JSON in your project's <code>.tekmemo/</code> directory —
              alongside the code it describes.
            </p>
            <div class="comparison-table-wrapper">
              <table class="comparison-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>TekMemo</th>
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
          </div>
        </section>

        <!-- Bottom CTA -->
        <section class="bottom-cta-section tek-reveal">
          <div class="container">
            <p class="oss-badge">MIT Licensed · 100% open source</p>
            <h2>One command. Your agent never forgets.</h2>
            <div class="code-snippet large">
              <code>npx tekmemo init</code>
            </div>
            <div class="cta-buttons">
              <a href="/packages/core/" class="cta-button primary">Read the Quick Start →</a>
              <a href="https://memo.tekbreed.com" class="cta-button secondary" target="_blank" rel="noopener noreferrer">
                Explore TekMemo Cloud →
              </a>
            </div>
            <a href="https://github.com/tekbreed/tekmemo" class="bottom-cta-link">
              View on GitHub
            </a>
          </div>
        </section>
      </div>
    </template>
  </Layout>
</template>

<style scoped>
.container {
  max-width: 768px;
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
}

.credibility-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.compat-line {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  margin: 0;
  white-space: nowrap;
}

.compat-tool {
  color: var(--vp-c-text-1);
  font-weight: 600;
  transition: color 0.2s;
}

.compat-tool:hover {
  color: var(--vp-c-brand-1);
}

.compat-sep {
  color: var(--vp-c-text-3);
  margin: 0 4px;
}

@media (max-width: 640px) {
  .credibility-row {
    gap: 12px;
  }

  .compat-line {
    white-space: normal;
    text-align: center;
  }
}

/* ===================================================================
   Problem Section
   =================================================================== */
.problem-section {
  padding: 72px 0 96px 0;
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
  padding: 96px 0;
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

.result-text {
  margin-top: 40px;
  font-size: 17px;
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

/* ===================================================================
   Feature Showcase
   =================================================================== */
.showcase-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 64px 24px;
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
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-border);
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}

.file-tree-body {
  padding: 12px 0;
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
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius);
  overflow: hidden;
  box-shadow: var(--tek-shadow-lg);
}

.recall-query {
  padding: 14px 16px;
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
  padding: 8px 0;
}

.recall-result {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
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
  padding: 8px;
  border-bottom: 1px solid var(--vp-c-border);
}

.mode-toggle-btn {
  padding: 6px 16px;
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
  padding: 10px 16px 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
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

.audience-emoji {
  font-size: 28px;
  line-height: 1;
  display: block;
  margin-bottom: 16px;
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

/* ===================================================================
   Bottom CTA
   =================================================================== */
.bottom-cta-section {
  padding: 80px 0 96px 0;
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
