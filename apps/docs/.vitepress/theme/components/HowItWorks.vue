<template>
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
</template>

<style scoped>
.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

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
}
</style>
