<script setup>
import { ref, computed } from 'vue'
import { data as posts } from '../../../blog/posts.data'
import { withBase } from 'vitepress'

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = [
  { id: 'all', name: 'All' },
  { id: 'engineering', name: 'Engineering' },
  { id: 'architecture', name: 'Architecture' },
  { id: 'product', name: 'Product' }
]

const getPostCategory = (post) => {
  const tags = (post.tags || []).map(t => String(t).toLowerCase())
  const title = (post.title || '').toLowerCase()
  if (tags.includes('engineering') || title.includes('engineering')) return 'engineering'
  if (tags.includes('architecture') || tags.includes('memory') || title.includes('architecture')) return 'architecture'
  return 'product'
}

const filteredPosts = computed(() => {
  return posts.filter(post => {
    const matchesCat = selectedCategory.value === 'all' || getPostCategory(post) === selectedCategory.value
    if (!matchesCat) return false

    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (
      post.title?.toLowerCase().includes(q) ||
      post.description?.toLowerCase().includes(q) ||
      post.tags?.some(t => String(t).toLowerCase().includes(q))
    )
  })
})
</script>

<template>
  <div class="cookbook-page">
    <div class="cookbook-container">
      <!-- Header -->
      <div class="cookbook-header">
        <span class="cookbook-kicker">Articles</span>
        <h1 class="cookbook-title">Blog</h1>
        <p class="cookbook-subtitle">
          Updates, insights, and deep dives from the team building MemoFS.
        </p>
      </div>

      <!-- Controls (Categories + Search) -->
      <div class="cookbook-controls">
        <div class="cookbook-category-pills">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            class="pill-btn"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>

        <div class="cookbook-search-box">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search posts..." 
            class="search-field"
          />
        </div>
      </div>

      <!-- Grid of Cards (3 per row on desktop, exact copy of Cookbooks design) -->
      <div v-if="filteredPosts.length > 0" class="cookbook-grid">
        <a
          v-for="post in filteredPosts" 
          :key="post.url"
          :href="withBase(post.url)"
          class="cookbook-card"
        >
          <div class="card-main-content">
            <div class="card-meta">
              <span class="meta-label">Article</span>
              <span class="meta-dot">•</span>
              <span class="meta-time">{{ post.date }}</span>
              <template v-if="post.readingTime">
                <span class="meta-dot">•</span>
                <span class="meta-time">{{ post.readingTime }}</span>
              </template>
            </div>

            <h2 class="card-title">
              {{ post.title }}
            </h2>
          </div>

          <div class="card-footer">
            <!-- Author Name (Replacing Platform Logos) -->
            <div class="brand-badge">
              <span>{{ post.author || 'MemoFS' }}</span>
            </div>

            <span class="read-link">
              Read Article &rarr;
            </span>
          </div>
        </a>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <h3 class="empty-title">No articles found</h3>
        <p class="empty-desc">We couldn't find any articles matching your search query.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cookbook-page {
  width: 100%;
  padding: 48px 0 96px;
}

.cookbook-container {
  max-width: var(--tek-container, 1200px);
  margin: 0 auto;
  padding: 0 24px;
}

.cookbook-header {
  margin-bottom: 36px;
}

.cookbook-kicker {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--vp-c-brand-1);
}

.cookbook-title {
  font-family: var(--vp-font-family-display);
  font-size: clamp(32px, 5vw, 44px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin-top: 6px;
  line-height: 1.1;
}

.cookbook-subtitle {
  font-size: 16px;
  color: var(--vp-c-text-2);
  margin-top: 12px;
  max-width: 640px;
  line-height: 1.6;
}

.cookbook-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 40px;
}

.cookbook-category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pill-btn {
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.pill-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.cookbook-search-box {
  position: relative;
  width: 100%;
  max-width: 320px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.search-field {
  display: block;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 8px 16px 8px 36px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s ease;
}

.search-field:focus {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.cookbook-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 960px) {
  .cookbook-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .cookbook-grid {
    grid-template-columns: 1fr;
  }
}

.cookbook-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  padding: 24px;
  text-decoration: none !important;
  transition: all 0.3s ease;
  height: 100%;
}

.cookbook-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-alt);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.25);
  transform: translateY(-2px);
}

.card-main-content {
  display: flex;
  flex-direction: column;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  margin-bottom: 12px;
}

.meta-label {
  font-weight: 700;
}

.meta-dot {
  color: var(--vp-c-text-3);
}

.meta-time {
  color: var(--vp-c-text-2);
}

.card-title {
  font-family: var(--vp-font-family-display);
  font-size: 19px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.35;
  margin-bottom: 0;
  transition: color 0.2s ease;
}

.cookbook-card:hover .card-title {
  color: var(--vp-c-brand-1);
}

.card-footer {
  margin-top: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 16px;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.icon-svg {
  width: 16px;
  height: 16px;
}

.text-memofs { color: var(--vp-c-brand-1); }

.read-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}

.cookbook-card:hover .read-link {
  text-decoration: underline;
}

.empty-state {
  padding: 64px 24px;
  text-align: center;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 6px;
  grid-column: 1 / -1;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto;
  color: var(--vp-c-text-3);
}

.empty-title {
  margin-top: 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.empty-desc {
  margin-top: 4px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
</style>
