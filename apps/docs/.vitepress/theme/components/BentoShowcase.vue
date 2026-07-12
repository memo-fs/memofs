<template>
  <section id="features" class="feature-showcase">
    <div class="container-wide">
      <header class="showcase-head tek-reveal">
        <p class="tek-kicker">Why MemoFS</p>
        <h2 class="tek-h2">Memory your agent can actually use.</h2>
      </header>

      <div class="bento-grid">
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

.bento-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--vp-c-divider);
  border: 1px solid var(--vp-c-divider);
}

.bento-card {
  background: var(--vp-c-bg);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  align-items: stretch;
  padding: 0;
  transition: background 0.2s;
}

.bento-card:hover {
  background: var(--vp-c-bg-soft);
}

.bento-content {
  padding: 48px;
}

.bento-visual {
  display: flex;
  flex-direction: column;
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

.visual-frame {
  flex: 1;
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

@media (max-width: 860px) {
  .bento-card {
    grid-template-columns: 1fr;
    gap: 36px;
  }

  .bento-content {
    padding: 36px 28px;
  }

  .showcase-head {
    margin-bottom: 40px;
  }
}
</style>
