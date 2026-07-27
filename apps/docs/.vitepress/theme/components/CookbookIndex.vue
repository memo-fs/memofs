<script setup>
import { ref, computed } from 'vue'
import { data as cookbooks } from '../cookbooks.data.ts'
import { withBase } from 'vitepress'

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = [
  { id: 'all', name: 'All' },
  { id: 'cli', name: 'SDK & CLI' },
  { id: 'connectors', name: 'Connectors' },
  { id: 'mcp', name: 'MCP & Cloud' }
]

const getRecipeCategory = (recipe) => {
  const url = (recipe.url || '').toLowerCase()
  const title = (recipe.frontmatter?.title || '').toLowerCase()
  if (url.includes('connector') || title.includes('connector') || title.includes('github') || title.includes('notion')) {
    return 'connectors'
  }
  if (url.includes('mcp') || url.includes('sync') || url.includes('hosted') || title.includes('mcp') || title.includes('sync')) {
    return 'mcp'
  }
  return 'cli'
}

const filteredCookbooks = computed(() => {
  return cookbooks.filter(item => {
    const matchesCat = selectedCategory.value === 'all' || getRecipeCategory(item) === selectedCategory.value
    if (!matchesCat) return false

    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (
      item.frontmatter?.title?.toLowerCase().includes(q) ||
      item.url?.toLowerCase().includes(q)
    )
  })
})

const getBrandIconType = (recipe) => {
  const url = (recipe.url || '').toLowerCase()
  const title = (recipe.frontmatter?.title || '').toLowerCase()
  const combined = url + ' ' + title

  if (combined.includes('codex')) return 'codex'
  if (combined.includes('claude')) return 'claude'
  if (combined.includes('opencode')) return 'opencode'
  if (combined.includes('cursor')) return 'cursor'
  if (combined.includes('github')) return 'github'
  if (combined.includes('notion')) return 'notion'
  return 'memofs'
}
</script>

<template>
  <div class="cookbook-page">
    <div class="cookbook-container">
      <!-- Header -->
      <div class="cookbook-header">
        <span class="cookbook-kicker">Recipes</span>
        <h1 class="cookbook-title">Cookbooks</h1>
        <p class="cookbook-subtitle">
          Step-by-step how-to tutorials for installing, configuring, and mastering MemoFS for AI memory with screenshot step-throughs and video walkthroughs.
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
            placeholder="Search cookbooks..." 
            class="search-field"
          />
        </div>
      </div>

      <!-- Grid of Cards (3 per row on desktop, without description) -->
      <div v-if="filteredCookbooks.length > 0" class="cookbook-grid">
        <a
          v-for="recipe in filteredCookbooks" 
          :key="recipe.url"
          :href="withBase(recipe.url)"
          class="cookbook-card"
        >
          <div class="card-main-content">
            <div class="card-meta">
              <span class="meta-label">How-To Guide</span>
              <template v-if="recipe.frontmatter?.estimatedMinutes">
                <span class="meta-dot">•</span>
                <span class="meta-time">{{ recipe.frontmatter.estimatedMinutes }} min read</span>
              </template>
            </div>

            <h2 class="card-title">
              {{ recipe.frontmatter?.title }}
            </h2>
          </div>

          <div class="card-footer">
            <!-- Brand Icon -->
            <div v-if="getBrandIconType(recipe) === 'codex'" class="brand-badge">
              <svg class="icon-svg text-emerald" viewBox="0 0 24 24">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
              </svg>
              <span>OpenAI Codex</span>
            </div>

            <div v-else-if="getBrandIconType(recipe) === 'claude'" class="brand-badge">
              <svg class="icon-svg text-claude" viewBox="0 0 24 24">
                <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
              </svg>
              <span>Claude Code</span>
            </div>

            <div v-else-if="getBrandIconType(recipe) === 'opencode'" class="brand-badge">
              <svg class="icon-svg text-opencode" viewBox="0 0 512 512">
                <path d="M320 224V352H192V224H320Z" fill="#5A5858" />
                <path fill-rule="evenodd" clip-rule="evenodd" d="M384 416H128V96H384V416ZM320 160H192V352H320V160Z" fill="currentColor" />
              </svg>
              <span>OpenCode</span>
            </div>

            <div v-else-if="getBrandIconType(recipe) === 'cursor'" class="brand-badge">
              <svg class="icon-svg text-cursor" viewBox="0 0 24 24">
                <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
              </svg>
              <span>Cursor</span>
            </div>

            <div v-else-if="getBrandIconType(recipe) === 'github'" class="brand-badge">
              <svg class="icon-svg text-github" viewBox="0 0 24 24">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </div>

            <div v-else-if="getBrandIconType(recipe) === 'notion'" class="brand-badge">
              <svg class="icon-svg text-notion" viewBox="0 0 24 24">
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" opacity="1" />
              </svg>
              <span>Notion</span>
            </div>

            <div v-else class="brand-badge">
              <svg class="icon-svg text-memofs" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="var(--vp-c-brand-1)" stroke-width="2" stroke-dasharray="68 18" />
                <polygon points="16,25 7,20.5 16,16 25,20.5" fill="var(--vp-c-brand-1)" opacity="0.35" />
                <polygon points="16,20 7,15.5 16,11 25,15.5" fill="var(--vp-c-brand-1)" opacity="0.7" />
                <polygon points="16,15 7,10.5 16,6 25,10.5" stroke="var(--vp-c-brand-1)" stroke-width="1.5" fill="var(--vp-c-bg)" />
              </svg>
              <span>MemoFS</span>
            </div>

            <span class="read-link">
              Read Guide &rarr;
            </span>
          </div>
        </a>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <h3 class="empty-title">No cookbooks found</h3>
        <p class="empty-desc">We couldn't find any cookbooks matching your search query.</p>
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
  fill: currentColor;
}

.text-emerald { color: #34d399; }
.text-claude { color: #d97757; }
.text-opencode { color: #22d3ee; }
.text-cursor { color: #60a5fa; }
.text-github { color: var(--vp-c-text-1); }
.text-notion { color: var(--vp-c-text-1); }
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
