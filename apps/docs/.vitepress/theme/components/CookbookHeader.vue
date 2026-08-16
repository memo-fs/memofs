<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import { Icon } from '@iconify/vue'
import { getBrandIconType, getBrandInfo } from '../utils/brand'

const { frontmatter } = useData()
const route = useRoute()

const brandType = computed(() => getBrandIconType({ url: route.path, frontmatter: frontmatter.value }))
const brandInfo = computed(() => getBrandInfo({ url: route.path, frontmatter: frontmatter.value }))
</script>

<template>
  <div class="cookbook-header-container">
    <!-- Back Button -->
    <div class="cookbook-back-wrapper">
      <a href="/learn/cookbooks/" class="cookbook-back-btn">
        <svg class="back-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to MemoFS Cookbooks</span>
      </a>
    </div>

    <!-- Header Content -->
    <header class="cookbook-article-header">
      <div class="cookbook-meta-row">
        <!-- Official Brand Badge -->
        <div class="cookbook-brand-badge">
          <svg v-if="brandType === 'memofs'" class="brand-icon-svg" viewBox="0 0 100 100">
            <polygon fill="#4cae61" points="50,82 12,62 50,45 88,62" />
            <polygon fill="#2c9ab8" points="50,63 12,43 50,26 88,43" />
            <polygon fill="#258acb" points="50,45 12,25 50,8 88,25" />
            <circle fill="#ffffff" cx="50" cy="23" r="3.5" />
            <circle fill="#ffffff" cx="35" cy="30" r="1.5" opacity="0.6" />
            <circle fill="#ffffff" cx="65" cy="30" r="1.5" opacity="0.6" />
            <circle fill="#ffffff" cx="50" cy="37" r="1.5" opacity="0.6" />
          </svg>
          <Icon v-else :icon="brandInfo.icon" class="brand-icon-svg" />
          <span class="brand-name">{{ brandInfo.name }}</span>
        </div>
        <span class="meta-dot">•</span>
        <span class="meta-recipe">Recipe</span>
        <template v-if="frontmatter.estimatedMinutes">
          <span class="meta-dot">•</span>
          <span class="meta-time">{{ frontmatter.estimatedMinutes }} min read</span>
        </template>
      </div>

      <h1 class="cookbook-article-title">
        {{ frontmatter.title }}
      </h1>
    </header>
  </div>
</template>

<style scoped>
.cookbook-header-container {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.cookbook-back-wrapper {
  margin-bottom: 24px;
}

.cookbook-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-2);
  text-decoration: none !important;
  transition: color 0.2s ease;
}

.cookbook-back-btn:hover {
  color: var(--vp-c-brand-1);
}

.back-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.cookbook-back-btn:hover .back-arrow {
  transform: translateX(-3px);
}

.cookbook-article-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cookbook-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  font-family: var(--vp-font-family-mono);
}

.cookbook-brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.brand-icon-svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.meta-recipe {
  color: var(--vp-c-brand-1);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.meta-dot {
  color: var(--vp-c-text-3);
}

.meta-date, .meta-time {
  color: var(--vp-c-text-2);
}

.cookbook-article-title {
  font-family: var(--vp-font-family-display);
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin: 0;
}
</style>
