<template>
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
</template>

<style scoped>
.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

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

@media (max-width: 640px) {
  .problem-headline {
    max-width: 100%;
  }
}
</style>
