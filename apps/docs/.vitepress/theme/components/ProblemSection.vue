<script setup lang="ts">
import { useHomeI18n } from "../composables/useHomeI18n";

const { t } = useHomeI18n();
</script>

<template>
  <section id="problem" class="problem-section tek-reveal">
    <div class="problem-bg tek-dot-grid" aria-hidden="true"></div>
    <div class="container">
      <p class="tek-kicker">{{ t.problem.kicker }}</p>
      <h2 class="problem-headline">
        {{ t.problem.headline }}<span class="problem-em">{{ t.problem.headlineEm }}</span>
      </h2>
      <p class="problem-body">
        {{ t.problem.body1 }}
      </p>
      <p class="problem-body problem-body-follow">
        {{ t.problem.body2 }}
      </p>
      <ul class="problem-symptoms">
        <li v-for="symptom in t.problem.symptoms" :key="symptom.title">
          <strong>{{ symptom.title }}</strong> {{ symptom.desc }}
        </li>
      </ul>
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

.problem-body-follow {
  margin-top: 20px;
}

.problem-body-follow em {
  font-style: italic;
  color: var(--vp-c-text-1);
}

.problem-symptoms {
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 60ch;
}

.problem-symptoms li {
  position: relative;
  padding-left: 22px;
  font-size: 16px;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.problem-symptoms li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 8px;
  height: 2px;
  background: linear-gradient(120deg, var(--tek-c-cyan), var(--tek-c-gold));
}

.problem-symptoms strong {
  color: var(--vp-c-text-1);
}

@media (max-width: 640px) {
  .problem-headline {
    max-width: 100%;
  }
}
</style>
