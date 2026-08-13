<script setup lang="ts">
import CopyButton from "./CopyButton.vue";
</script>

<template>
  <section class="dual-entry-section">
    <div class="dual-entry-container">
      <div class="dual-grid">
        <!-- Card 1: Coding Agent Users -->
        <div class="dual-card card-user">
          <div class="card-header">
            <div class="card-badge badge-user">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8zm.5-13h-1v6l5.2 3.1.5-.8-4.7-2.8z"/>
              </svg>
              Coding Agents &amp; IDEs
            </div>
            <h3 class="card-title">I use coding agents day-to-day</h3>
            <p class="card-desc">
              Claude Code, Cursor, Windsurf, and opencode automatically read &amp; write persistent, git-trackable memory via MCP or lifecycle hooks.
            </p>
          </div>

          <div class="card-action">
            <div class="command-box">
              <div class="cmd-content">
                <span class="cmd-prompt">$</span>
                <span class="cmd-text">npx @memofs/cli init</span>
              </div>
              <CopyButton text="npx @memofs/cli init" />
            </div>
            <div class="card-links">
              <a href="/packages/mcp/" class="card-link primary">MCP Setup Guide →</a>
              <a href="/learn/cookbooks/" class="card-link secondary">View IDE Cookbooks ↗</a>
            </div>
          </div>
        </div>

        <!-- Card 2: Agent Builders -->
        <div class="dual-card card-builder">
          <div class="card-header">
            <div class="card-badge badge-builder">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Core SDK &amp; Server
            </div>
            <h3 class="card-title">I'm building AI agents &amp; apps</h3>
            <p class="card-desc">
              Import <code>@memofs/core</code> or <code>@memofs/server</code> for a lightweight, file-first, zero-database memory runtime with semantic recall.
            </p>
          </div>

          <div class="card-action">
            <div class="command-box">
              <div class="cmd-content">
                <span class="cmd-prompt">$</span>
                <span class="cmd-text">npm install @memofs/core</span>
              </div>
              <CopyButton text="npm install @memofs/core" />
            </div>
            <div class="card-links">
              <a href="/packages/core/" class="card-link primary">Read Core SDK Docs →</a>
              <a href="/api/" class="card-link secondary">API Reference ↗</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dual-entry-section {
  padding: 32px 24px 0;
  max-width: var(--tek-container);
  margin: 0 auto;
}

.dual-entry-container {
  width: 100%;
}

.dual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.dual-card {
  position: relative;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 0 !important;
  padding: 28px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  transition: border-color 0.2s, background 0.2s;
}

.dual-card:hover {
  border-color: var(--tek-c-cyan);
  background: var(--vp-c-bg-mute);
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 0 !important;
}

.badge-user {
  color: var(--tek-c-cyan);
  background: color-mix(in srgb, var(--tek-c-cyan) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tek-c-cyan) 30%, transparent);
}

.badge-builder {
  color: var(--tek-c-gold, #f59e0b);
  background: color-mix(in srgb, var(--tek-c-gold, #f59e0b) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tek-c-gold, #f59e0b) 30%, transparent);
}

.card-title {
  font-family: var(--vp-font-family-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  line-height: 1.25;
}

.card-desc {
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0;
}

.card-desc code {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  color: var(--tek-c-cyan);
  background: color-mix(in srgb, var(--tek-c-cyan) 10%, transparent) !important;
  padding: 2px 6px !important;
  border-radius: 0 !important;
}

.card-action {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.command-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #0d1117;
  border: 1px solid var(--vp-c-divider);
  border-radius: 0 !important;
  padding: 10px 16px;
}

.cmd-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.cmd-prompt {
  color: var(--tek-c-cyan);
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  user-select: none;
  flex-shrink: 0;
}

.cmd-text {
  color: #c9d1d9;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 0 !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-links {
  display: flex;
  align-items: center;
  gap: 18px;
}

.card-link {
  font-family: var(--vp-font-family-display);
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.card-link.primary {
  color: var(--tek-c-cyan);
}

.card-link.primary:hover {
  text-decoration: underline;
}

.card-link.secondary {
  color: var(--vp-c-text-2);
}

.card-link.secondary:hover {
  color: var(--vp-c-text-1);
}

@media (max-width: 860px) {
  .dual-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .dual-card {
    padding: 22px 20px;
  }
}
</style>
