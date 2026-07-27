<script setup>
import { ref, computed } from 'vue'
import { data as tracks } from '../tracks.data.ts'
import { withBase } from 'vitepress'

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = [
  { id: 'all', name: 'All' },
  { id: 'ai', name: 'AI & Agents' },
  { id: 'ai-memory', name: 'AI Memory' }
]

const filteredTracks = computed(() => {
  return tracks.filter(item => {
    const cat = (item.frontmatter?.category || 'ai').toLowerCase()
    const matchesCat = selectedCategory.value === 'all' || cat === selectedCategory.value
    if (!matchesCat) return false

    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (
      item.frontmatter?.title?.toLowerCase().includes(q) ||
      item.frontmatter?.description?.toLowerCase().includes(q)
    )
  })
})

const getTrackGradientClass = (category) => {
  if (category === 'ai-memory') {
    return 'gradient-ai-memory'
  }
  return 'gradient-ai'
}
</script>

<template>
  <div class="tracks-page">
    <div class="tracks-container">
      <!-- Header -->
      <div class="tracks-header">
        <span class="tracks-kicker">Learning Paths</span>
        <h1 class="tracks-title">MemoFS Tracks</h1>
        <p class="tracks-subtitle">
          Deep-dive tutorials and comprehensive guides to building production-ready AI applications, memory systems, and agents.
        </p>
      </div>

      <!-- Controls (Categories + Search) -->
      <div class="tracks-controls">
        <div class="tracks-category-pills">
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

        <div class="tracks-search-box">
          <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search tracks..." 
            class="search-field"
          />
        </div>
      </div>

      <!-- Grid of Track Cards (3 per row on desktop) -->
      <div v-if="filteredTracks.length > 0" class="tracks-grid">
        <a
          v-for="track in filteredTracks" 
          :key="track.url"
          :href="withBase(track.url)"
          class="track-card"
        >
          <div class="card-inner">
            <!-- Top hover line -->
            <div class="hover-glow-line"></div>

            <!-- Visual Banner Slot -->
            <div class="banner-slot">
              <div class="banner-gradient" :class="getTrackGradientClass(track.frontmatter?.category)"></div>
              <div class="banner-bottom-fade"></div>
              <div class="banner-vignette"></div>

              <div class="center-icon-box">
                <svg class="banner-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>

            <!-- Content Body -->
            <div class="card-body">
              <!-- Badges Row -->
              <div class="badges-row">
                <span class="badge-pill">
                  {{ track.frontmatter?.category || 'AI' }}
                </span>
                <span class="badge-pill">
                  {{ track.frontmatter?.lessonsCount || 1 }} {{ (track.frontmatter?.lessonsCount || 1) === 1 ? 'lesson' : 'lessons' }}
                </span>
                <span v-if="track.frontmatter?.difficulty" class="badge-pill difficulty">
                  {{ track.frontmatter.difficulty }}
                </span>
              </div>

              <h3 class="card-title">
                {{ track.frontmatter?.title }}
              </h3>

              <p class="card-desc">
                {{ track.frontmatter?.description }}
              </p>

              <div class="card-action">
                <span>View track</span>
                <svg class="arrow-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </a>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <h3 class="empty-title">No tracks found</h3>
        <p class="empty-desc">We couldn't find any tracks matching your search query.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tracks-page {
  width: 100%;
  padding: 48px 0 96px;
}

.tracks-container {
  max-width: var(--tek-container, 1200px);
  margin: 0 auto;
  padding: 0 24px;
}

.tracks-header {
  margin-bottom: 36px;
}

.tracks-kicker {
  display: inline-block;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--vp-c-brand-1);
}

.tracks-title {
  font-family: var(--vp-font-family-display);
  font-size: clamp(36px, 6vw, 48px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
  margin-top: 6px;
  line-height: 1.1;
}

.tracks-subtitle {
  font-size: 17px;
  color: var(--vp-c-text-2);
  margin-top: 14px;
  max-width: 672px;
  line-height: 1.6;
}

.tracks-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 40px;
}

.tracks-category-pills {
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

.tracks-search-box {
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

.tracks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 960px) {
  .tracks-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .tracks-grid {
    grid-template-columns: 1fr;
  }
}

.track-card {
  display: block;
  height: 100%;
  text-decoration: none !important;
  transition: all 0.3s ease;
}

.track-card:hover {
  transform: translateY(-3px);
}

.card-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.track-card:hover .card-inner {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 50%, transparent);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.3);
}

.hover-glow-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(to right, transparent, var(--vp-c-brand-1), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.track-card:hover .hover-glow-line {
  opacity: 1;
}

.banner-slot {
  position: relative;
  height: 140px;
  background: var(--vp-c-bg-mute);
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.banner-gradient {
  position: absolute;
  inset: 0;
  opacity: 0.75;
  transition: opacity 0.3s ease;
}

.gradient-ai {
  background: linear-gradient(135deg, rgba(8, 145, 178, 0.25) 0%, rgba(183, 121, 31, 0.15) 100%);
}

.gradient-ai-memory {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%);
}

.track-card:hover .banner-gradient {
  opacity: 1;
}

.banner-bottom-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 30%, var(--vp-c-bg-soft) 100%);
}

.banner-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%);
}

.center-icon-box {
  position: relative;
  z-index: 2;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
}

.track-card:hover .center-icon-box {
  transform: scale(1.08);
}

.banner-svg {
  width: 24px;
  height: 24px;
  color: var(--vp-c-brand-1);
}

.card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.badges-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.badge-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  background: var(--vp-c-brand-soft);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
  padding: 2px 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-brand-1);
}

.badge-pill.difficulty {
  background: var(--vp-c-bg-mute);
  border-color: var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.card-title {
  font-family: var(--vp-font-family-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  line-height: 1.35;
  margin-bottom: 8px;
  transition: color 0.2s ease;
}

.track-card:hover .card-title {
  color: var(--vp-c-brand-1);
}

.card-desc {
  font-size: 13.5px;
  color: var(--vp-c-text-2);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-action {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  transition: color 0.2s ease;
}

.track-card:hover .card-action {
  color: var(--vp-c-brand-1);
}

.arrow-svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.track-card:hover .arrow-svg {
  transform: translateX(4px);
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
