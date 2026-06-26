<script setup lang="ts">
import { useRoute } from "vitepress";
import { computed } from "vue";
import { data as posts } from "../../../blog/posts.data";
import NewsletterSignup from "./NewsletterSignup.vue";

const route = useRoute();

const currentIndex = computed(() =>
	posts.findIndex((p) => p.url === route.path.replace(/\.html$/, "")),
);
/** Posts are sorted newest-first, so "newer" is the previous index. */
const newer = computed(() =>
	currentIndex.value > 0 ? posts[currentIndex.value - 1] : null,
);
const older = computed(() =>
	currentIndex.value >= 0 && currentIndex.value < posts.length - 1
		? posts[currentIndex.value + 1]
		: null,
);
</script>

<template>
  <footer class="blog-post-footer">
    <NewsletterSignup event="blog" />
    <nav v-if="newer || older" class="blog-post-nav">
      <a v-if="newer" :href="newer.url" class="blog-nav-card prev">
        <span class="blog-nav-label">← Newer</span>
        <span class="blog-nav-title">{{ newer.title }}</span>
      </a>
      <span v-else />
      <a v-if="older" :href="older.url" class="blog-nav-card next">
        <span class="blog-nav-label">Older →</span>
        <span class="blog-nav-title">{{ older.title }}</span>
      </a>
    </nav>
    <a href="/blog/" class="blog-all-link">← Back to all posts</a>
  </footer>
</template>

<style scoped>
.blog-post-footer {
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid var(--vp-c-divider);
}

.blog-post-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.blog-nav-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--tek-radius);
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.blog-nav-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--tek-shadow-glow);
  transform: translateY(-2px);
}

.blog-nav-card.next {
  text-align: right;
}

.blog-nav-label {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.blog-nav-title {
  font-family: var(--vp-font-family-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.35;
}

.blog-all-link {
  display: inline-block;
  margin-top: 28px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.blog-all-link:hover {
  color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .blog-post-nav {
    grid-template-columns: 1fr;
  }

  .blog-nav-card.next {
    text-align: left;
  }
}
</style>
