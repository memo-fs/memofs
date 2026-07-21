<script setup lang="ts">
import { useRoute } from "vitepress";
import { data as posts } from "../../../blog/posts.data";

const route = useRoute();

const isActive = (url: string) =>
	route.path.replace(/\.html$/, "") === url;
</script>

<template>
  <nav class="blog-sidebar">
    <h4 class="blog-sidebar-heading">Blog Posts</h4>
    <ul class="blog-sidebar-list">
      <li v-for="post in posts" :key="post.url">
        <a
          :href="post.url"
          class="blog-sidebar-link"
          :class="{ active: isActive(post.url) }"
        >
          <span class="blog-sidebar-title">{{ post.title }}</span>
          <span class="blog-sidebar-meta">{{ post.date }}</span>
        </a>
      </li>
    </ul>
    <a href="/blog/" class="blog-sidebar-all">View all posts →</a>
  </nav>
</template>

<style scoped>
.blog-sidebar {
  padding: 16px 0;
  margin-bottom: 24px;
}

.blog-sidebar-heading {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-3);
  margin: 0 0 12px;
  padding: 0 24px;
}

.blog-sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.blog-sidebar-list li + li {
  margin-top: 2px;
}

.blog-sidebar-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 24px;
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.blog-sidebar-link:hover {
  background: var(--vp-c-bg-soft);
}

.blog-sidebar-link.active {
  border-left-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-bg);
}

.blog-sidebar-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.blog-sidebar-link.active .blog-sidebar-title {
  color: var(--vp-c-brand-1);
}

.blog-sidebar-meta {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.blog-sidebar-all {
  display: block;
  padding: 12px 24px 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.2s;
}

.blog-sidebar-all:hover {
  color: var(--vp-c-brand-2);
}
</style>
