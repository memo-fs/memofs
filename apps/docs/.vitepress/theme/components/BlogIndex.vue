<script setup lang="ts">
import { data as posts } from "../../../blog/posts.data";
</script>

<template>
  <div class="blog-index">
    <a v-for="post in posts" :key="post.url" :href="post.url" class="blog-card">
      <div v-if="post.cover" class="blog-card-cover">
        <img :src="post.cover" :alt="post.title" loading="lazy" />
      </div>
      <div class="blog-card-body">
        <div class="blog-card-meta">
          <span>{{ post.date }}</span>
          <span class="blog-card-dot">·</span>
          <span>{{ post.readingTime }}</span>
        </div>
        <h3 class="blog-card-title">{{ post.title }}</h3>
        <div class="blog-card-footer">
          <span class="blog-card-author">{{ post.author }}</span>
          <span v-if="post.tags.length" class="blog-card-tags">
            <span v-for="tag in post.tags.slice(0, 3)" :key="tag" class="blog-tag">
              {{ tag }}
            </span>
          </span>
        </div>
      </div>
    </a>
  </div>
</template>

<style scoped>
.blog-index {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 32px 0;
}

@media (max-width: 960px) {
  .blog-index {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .blog-index {
    grid-template-columns: 1fr;
  }
}

.blog-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  box-shadow: var(--tek-shadow-sm);
  text-decoration: none;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.25s ease, border-color 0.25s ease;
}

.blog-card:hover {
  transform: translateY(-3px);
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--tek-shadow-glow);
}

.blog-card-cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-bottom: 1px solid var(--vp-c-divider);
}

.blog-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.blog-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 24px 24px;
  flex: 1;
}

.blog-card-body > *:last-child {
  margin-top: auto;
}

.blog-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.blog-card-dot {
  opacity: 0.6;
}

.blog-card-title {
  font-family: var(--vp-font-family-display);
  font-size: 19px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  margin: 0;
}

.blog-card:hover .blog-card-title {
  color: var(--vp-c-brand-1);
}

.blog-card-footer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-top: 6px;
}

.blog-card-author {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blog-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
}

.blog-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--tek-radius);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
</style>
