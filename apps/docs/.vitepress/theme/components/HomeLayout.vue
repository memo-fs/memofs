<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import AskAiBar from "./AskAiBar.vue";
import HeroVisual from "./HeroVisual.vue";
import SidebarBrand from "./SidebarBrand.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #sidebar-nav-before>
      <SidebarBrand />
    </template>

    <template #doc-before>
      <AskAiBar />
    </template>

    <template #home-hero-image>
      <div class="hero-visual-container">
        <HeroVisual />
      </div>
    </template>

    <template #home-hero-after>
      <div class="home-custom-sections">
        <section class="problem-section">
          <div class="container">
            <h2>How many times have you explained the same thing to your AI?</h2>
            <p>
              You walk your agent through the auth system. It gets it. Next day,
              you ask about it&mdash;blank stare. You copy-paste the
              architecture doc. Again. The agent writes code that contradicts
              last week's decision because it has no memory of what you decided.
            </p>
          </div>
        </section>

        <section class="how-it-works-section">
          <div class="container">
            <h2>Three commands. Your agent remembers.</h2>
            <div class="steps">
              <div class="step">
                <span class="step-number">1</span>
                <div class="step-content">
                  <h3>Install</h3>
                  <div class="code-snippet">
                    <code>npm install -D @tekbreed/tekmemo-cli</code>
                  </div>
                </div>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <div class="step-content">
                  <h3>Initialize</h3>
                  <div class="code-snippet">
                    <code>npx tekmemo init</code>
                  </div>
                  <p>Creates <code>.tekmemo/</code> with core memory, notes, recall indexes, and graph files.</p>
                </div>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <div class="step-content">
                  <h3>Record</h3>
                  <div class="code-snippet">
                    <code>npx tekmemo remember "User auth uses JWT with refresh rotation" --kind decision --tag auth</code>
                  </div>
                </div>
              </div>
            </div>
            <p class="result-text">
              When your coding agent starts a session, TekMemo injects relevant
              context directly into its prompt. No more repeating yourself. No
              more contradictions. No more "what were we working on?"
            </p>
          </div>
        </section>

        <section class="audience-section">
          <div class="container">
            <h2>Two ways to use TekMemo</h2>
            <div class="audience-grid">
              <div class="audience-card">
                <h3>For AI Developers</h3>
                <p>
                  Give your AI apps durable memory. Import
                  <code>@tekbreed/tekmemo</code> into your app. Same API whether your
                  memory lives in local files, cloud storage, or both. AI SDK tools
                  ship in the box.
                </p>
                <a href="/api/tekmemo/" class="audience-link">Explore the API</a>
              </div>
              <div class="audience-card">
                <h3>For Coding Agent Users</h3>
                <p>
                  Your coding agent finally remembers your project. Install the MCP
                  server. Add one config block to Claude Code, Cursor, or any MCP
                  client. Your agent gets project context on every session,
                  automatically.
                </p>
                <a href="/packages/mcp/client-setup" class="audience-link">Set up your agent</a>
              </div>
            </div>
          </div>
        </section>

        <section class="comparison-section">
          <div class="container">
            <h2>Why TekMemo over other memory tools?</h2>
            <p>
              Most memory tools hide your data in a hosted dashboard you cannot inspect.
              TekMemo stores everything as plain text and JSON files in your project's
              <code>.tekmemo/</code> directory.
            </p>
            <ul class="comparison-list">
              <li>Read it in VS Code or any text editor</li>
              <li>Review it in code review, just like your source code</li>
              <li>Version control it alongside your project</li>
              <li>Own it entirely — no opaque model prompts or locked dashboards</li>
            </ul>
          </div>
        </section>

        <section class="bottom-cta-section">
          <div class="container">
            <p class="oss-badge">MIT License · Free for commercial use</p>
            <h2>One command to stop repeating yourself.</h2>
            <div class="code-snippet large">
              <code>npx tekmemo init</code>
            </div>
            <div class="cta-buttons">
              <a href="/packages/tekmemo/getting-started" class="cta-button primary">Install TekMemo</a>
              <a href="/packages/tekmemo/" class="cta-button secondary">Read the Docs</a>
            </div>
            <a href="https://github.com/tekbreed/tekbreed-oss" class="bottom-cta-link">View on GitHub</a>
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

/* Problem Section */
.problem-section {
  padding: 72px 0 0 0;
}

.problem-section h2 {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}

.problem-section p {
  font-size: 17px;
  color: var(--vp-c-text-2);
  line-height: 1.7;
}

/* How It Works */
.how-it-works-section {
  padding: 96px 0;
}

.how-it-works-section h2 {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
  letter-spacing: -0.02em;
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
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  border-radius: 8px;
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
  line-height: 1.7;
}

/* Audience Section */
.audience-section {
  padding: 0 0 96px 0;
}

.audience-section h2 {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
  letter-spacing: -0.02em;
  margin-bottom: 36px;
}

.audience-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.audience-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  padding: 32px;
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
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.audience-link:hover {
  text-decoration: underline;
}

/* Comparison Section */
.comparison-section {
  padding: 0 0 96px 0;
}

.comparison-section h2 {
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
  letter-spacing: -0.02em;
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

.comparison-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.comparison-list li {
  position: relative;
  padding-left: 28px;
  margin-bottom: 12px;
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.comparison-list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--vp-c-brand-1);
  font-weight: 700;
  font-size: 16px;
}

/* Bottom CTA */
.bottom-cta-section {
  padding: 0 0 96px 0;
  text-align: center;
  border-top: 1px solid var(--vp-c-border);
  padding-top: 80px;
}

.bottom-cta-section .oss-badge {
  font-size: 14px;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
}

.bottom-cta-section h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.3;
  letter-spacing: -0.02em;
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
}

.cta-button {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.cta-button.primary {
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}

.cta-button.primary:hover {
  background: var(--vp-c-brand-2);
}

.cta-button.secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}

.cta-button.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.bottom-cta-link {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.bottom-cta-link:hover {
  color: var(--vp-c-brand-1);
}

/* Responsive */
@media (max-width: 640px) {
  .audience-grid {
    grid-template-columns: 1fr;
  }

  .step {
    flex-direction: column;
    gap: 12px;
  }
}
</style>