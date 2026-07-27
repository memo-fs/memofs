<script setup lang="ts">
import { useData, useRoute } from "vitepress";
import { computed } from "vue";
import { data as posts } from "../../../blog/posts.data";

const route = useRoute();
const { frontmatter } = useData();

/** Match the current route to its loader entry for date / reading time. */
const post = computed(() =>
	posts.find((p) => p.url === route.path.replace(/\.html$/, "")),
);
</script>

<template>
  <div class="blog-back-wrapper">
    <a href="/blog/" class="blog-back-link">&larr; Back to all insights</a>
  </div>

  <header class="blog-post-header">
    <!-- Tags Badges -->
    <div v-if="frontmatter.tags && frontmatter.tags.length > 0" class="blog-post-tags">
      <span v-for="tag in frontmatter.tags" :key="tag" class="blog-tag">
        #{{ tag }}
      </span>
    </div>

    <!-- Date & Read Time -->
    <div class="blog-post-meta-mono">
      <template v-if="post">
        {{ post.date }} &bull; {{ post.readingTime || '5 min read' }}
      </template>
      <template v-else>
        {{ frontmatter.date || new Date().toISOString().split('T')[0] }}
      </template>
    </div>

    <!-- Large Hero Title -->
    <h1 class="blog-post-title">
      {{ frontmatter.title }}
    </h1>

    <!-- Hero Graphic -->
    <div class="blog-hero-wrapper">
      <img
        :src="frontmatter.cover || frontmatter.coverImage || 'https://images.unsplash.com/photo-1784792993431-d81e88fdacfb?q=80&w=1744&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'"
        :alt="frontmatter.title"
        class="blog-hero-img"
      />
      <!-- Author Details -->
      <div class="blog-author-card">
        <img :src="frontmatter.authorAvatar || 'https://github.com/shadcn.png'" class="author-avatar" />
        <div class="author-info">
          <p class="author-name">{{ frontmatter.author || 'MemoFS Team' }}</p>
          <p class="author-role">
            {{ frontmatter.authorRole || 'Core Team' }} @ <a href="https://memofs.dev" target="_blank" rel="noopener noreferrer" class="author-link">MemoFS</a>
          </p>
        </div>
      </div>
    </div>

    <!-- Summary -->
    <div v-if="frontmatter.summary" class="blog-post-summary">
      <p>"{{ frontmatter.summary }}"</p>
    </div>
  </header>
</template>

<style scoped>
.blog-back-wrapper {
  margin-bottom: 16px;
}
.blog-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}
.blog-back-link:hover {
  color: var(--vp-c-brand-1);
}

.blog-post-header {
  margin-bottom: 36px;
  text-align: center;
  position: relative;
  padding-top: 24px;
}

.blog-post-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.blog-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  padding: 2px 10px;
  text-transform: uppercase;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.blog-post-meta-mono {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
  margin-bottom: 16px;
}

.blog-post-title {
  font-family: var(--vp-font-family-display);
  font-size: 48px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  max-width: 800px;
  margin: 0 auto 32px;
}

.blog-hero-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 21 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 32px;
}

.blog-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--tek-radius);
  -webkit-mask-image: radial-gradient(ellipse at center, black 35%, transparent 95%);
  mask-image: radial-gradient(ellipse at center, black 35%, transparent 95%);
}

.blog-author-card {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--vp-c-bg);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  box-shadow: var(--tek-shadow-md);
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
}

.author-info {
  text-align: left;
}

.author-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.2;
}

.author-role {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.author-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.author-link:hover {
  text-decoration: underline;
}

.blog-post-summary {
  max-width: 672px;
  margin: 32px auto 16px;
}

.blog-post-summary p {
  font-size: 18px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-style: italic;
}

@media (max-width: 640px) {
  .blog-post-title {
    font-size: 32px;
  }
}
</style>
