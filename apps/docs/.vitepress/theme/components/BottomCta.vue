<script setup lang="ts">
import CopyButton from "./CopyButton.vue";
</script>

<template>
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
</template>

<style scoped>
.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

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

.bottom-cta-link {
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.bottom-cta-link:hover { color: var(--tek-c-cyan); }

@media (max-width: 860px) {
  .cta-panel {
    padding: 48px 24px;
  }
}

@media (max-width: 640px) {
  .cta-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .cta-button {
    text-align: center;
  }
}
</style>
