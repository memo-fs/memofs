<template>
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
          <h3>Building AI agents/apps</h3>
          <p>
            Give your agent/app durable memory. Import <code>@memofs/core</code> — the same API
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
</template>

<style scoped>
.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

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

@media (max-width: 860px) {
  .audience-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .audience-card {
    padding: 24px;
  }
}
</style>
