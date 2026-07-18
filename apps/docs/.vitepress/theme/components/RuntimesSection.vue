<template>
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
        <div class="runtime-card tek-reveal" data-delay="1">
          <div class="runtime-header">
            <span class="tek-kicker">Local mode</span>
            <h3>Offline storage</h3>
            <p>
              All memory is written directly to your project's local file system as markdown and JSON. 
              Fast, offline-first, and zero network latency.
            </p>
          </div>
          <div class="runtime-visual">
            <div class="runtime-code-panel">
              <pre class="runtime-pre"><code><span class="token keyword">import</span> { <span class="token class">MemoFS</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span>
import { <span class="token function">createNodeFsStore</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core/node-fs"</span>

<span class="token comment">// All memory stays on disk — offline-first.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span>({
  store: <span class="token function">createNodeFsStore</span>(
    { rootDir: <span class="token string">"."</span> }
  ),
  projectId: <span class="token string">"my-app"</span>,
  mode: <span class="token string">"local"</span>,
})</code></pre>
            </div>
          </div>
        </div>

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
              <pre class="runtime-pre"><code><span class="token keyword">import</span> { <span class="token class">MemoFS</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core"</span>
import { <span class="token function">createNodeFsStore</span> } <span class="token keyword">from</span> <span class="token string">"@memofs/core/node-fs"</span>

<span class="token comment">// Local speed + cloud replica.</span>
<span class="token keyword">const</span> memo = <span class="token keyword">new</span> <span class="token class">MemoFS</span>({
  store: <span class="token function">createNodeFsStore</span>(
    { rootDir: <span class="token string">"."</span> }
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

        <div class="runtime-card runtime-card--full tek-reveal" data-delay="3">
          <div class="runtime-managed-left">
            <span class="tek-kicker">Managed · Coming soon</span>
            <h3>Memory as an API</h3>
            <p>
              MemoFS Cloud hosts the engine. Thin clients — CI pipelines, edge functions,
              chatbots, hosted agents — query and write memory over HTTPS or a hosted MCP
              endpoint, with zero local files. The same <code>@memofs/core</code> surface,
              no checkout required. Your files stay the source of truth: leaving is a
              config change, not a migration.
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
                <strong>One memory, everywhere</strong>
                Every machine, agent, and teammate reads the same brain
              </span>
            </li>
            <li>
              <span class="rmf-icon">⚡</span>
              <span class="rmf-body">
                <strong>Read &amp; write over HTTPS or MCP</strong>
                Works from CI, serverless, or any MCP client — one URL + key
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
                <strong>See your memory think</strong>
                A dashboard to inspect, govern, and consolidate what agents remember
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.container-wide {
  max-width: var(--tek-container);
  margin: 0 auto;
  padding: 0 24px;
}

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
  padding: 32px 0 0;
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
  padding: 0 32px;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: auto;
}

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

.runtime-code-panel {
  background: #0d1117;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.runtime-code-panel--gold {
  border-color: color-mix(in srgb, var(--tek-c-gold) 25%, transparent);
}

.runtime-pre {
  margin: 0;
  padding: 18px 20px;
  overflow: hidden;
  background: transparent;
  flex: 1;
  min-height: 0;
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

.token.keyword { color: var(--tek-c-cyan); font-weight: 600; }
.token.string { color: var(--tek-c-gold); }
.token.comment { color: var(--vp-c-text-3); font-style: italic; }
.token.class { color: #60a5fa; }
.token.function { color: #f472b6; }

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
}
</style>
