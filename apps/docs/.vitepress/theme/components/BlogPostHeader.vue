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
  <header class="blog-post-header">
    <a href="/blog/" class="blog-back-link">← All posts</a>
    <h1 class="blog-post-title">{{ frontmatter.title }}</h1>
    <div class="blog-post-meta">
      <span class="blog-post-author">{{ frontmatter.author }}</span>
      <template v-if="post">
        <span class="blog-post-dot">·</span>
        <span>{{ post.date }}</span>
        <span class="blog-post-dot">·</span>
        <span>{{ post.readingTime }}</span>
      </template>
    </div>
    <div v-if="frontmatter.tags?.length" class="blog-post-tags">
      <span v-for="tag in frontmatter.tags" :key="tag" class="blog-tag">{{ tag }}</span>
    </div>
    <div v-if="frontmatter.cover" class="blog-post-cover">
      <img :src="frontmatter.cover" :alt="frontmatter.title" />
    </div>
  </header>
</template>

<style scoped>
.blog-post-header {
  margin-bottom: 36px;
}

.blog-back-link {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-decoration: none;
  margin-bottom: 24px;
  transition: color 0.2s;
}

.blog-back-link:hover {
  color: var(--vp-c-brand-1);
}

.blog-post-title {
  font-family: var(--vp-font-family-display);
  font-size: 40px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin: 0 0 18px;
}

.blog-post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.blog-post-author {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.blog-post-dot {
  color: var(--vp-c-text-3);
}

.blog-post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.blog-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.blog-post-cover {
  margin-top: 28px;
  border-radius: var(--tek-radius-lg);
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  box-shadow: var(--tek-shadow-md);
}

.blog-post-cover img {
  width: 100%;
  max-height: 440px;
  object-fit: cover;
  display: block;
}

@media (max-width: 640px) {
  .blog-post-title {
    font-size: 30px;
  }
}
</style>
