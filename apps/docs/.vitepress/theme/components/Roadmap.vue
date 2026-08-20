<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import {
  STREAMS,
  STAGES,
  TICKETS,
  type Ticket,
  type TicketStream,
  type TicketStage,
  type StreamInfo
} from '../roadmap-data'

// State
const searchQuery = ref('')
const selectedStage = ref<string>('all')
const selectedStream = ref<string>('all')
const expandedTickets = ref<Record<string, boolean>>({})

// Toggle deliverables list
const toggleDetails = (ticketId: string) => {
  expandedTickets.value[ticketId] = !expandedTickets.value[ticketId]
}

// Reset filters
const resetFilters = () => {
  searchQuery.value = ''
  selectedStage.value = 'all'
  selectedStream.value = 'all'
}

// Filtered items
const filteredTickets = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return TICKETS.filter(ticket => {
    if (selectedStage.value !== 'all' && ticket.stage !== selectedStage.value) {
      return false
    }
    if (selectedStream.value !== 'all' && ticket.stream !== selectedStream.value) {
      return false
    }
    if (q) {
      const matchTitle = ticket.title.toLowerCase().includes(q)
      const matchSummary = ticket.summary.toLowerCase().includes(q)
      const matchPkg = ticket.packages.some(p => p.toLowerCase().includes(q))
      const matchDeliverables = ticket.deliverables?.some(d => d.toLowerCase().includes(q))
      if (!matchTitle && !matchSummary && !matchPkg && !matchDeliverables) {
        return false
      }
    }
    return true
  })
})

// Counts
const totalCount = computed(() => TICKETS.length)
const frontierCount = computed(() => TICKETS.filter(t => t.stage === 'frontier').length)
const nextUpCount = computed(() => TICKETS.filter(t => t.stage === 'next-up').length)
const plannedCount = computed(() => TICKETS.filter(t => t.stage === 'planned').length)

// Group by Stream
const streamGroups = computed(() => {
  return STREAMS.map(stream => {
    const items = filteredTickets.value.filter(t => t.stream === stream.id)
    return {
      stream,
      tickets: items,
    }
  }).filter(group => group.tickets.length > 0)
})

// Badge config
const getStageBadge = (stage: TicketStage) => {
  switch (stage) {
    case 'frontier':
      return { label: 'Frontier', class: 'badge-frontier' }
    case 'next-up':
      return { label: 'Next Up', class: 'badge-next-up' }
    case 'planned':
      return { label: 'Planned', class: 'badge-planned' }
  }
}
</script>

<template>
  <div class="roadmap-container">
    <!-- INTRO HEADER -->
    <div class="roadmap-lead">
      <div class="roadmap-title-row">
        <h1 class="roadmap-main-title">Roadmap</h1>
        <a href="/changelog" class="roadmap-changelog-bridge">
          <Icon icon="ph:clock-counter-clockwise-bold" class="changelog-bridge-icon" />
          <span class="changelog-bridge-text">Shipped Releases</span>
          <Icon icon="ph:arrow-up-right-bold" class="changelog-bridge-arrow" />
        </a>
      </div>
      <p class="roadmap-description">
        Upcoming architectural milestones and capabilities scheduled for the MemoFS open source ecosystem.
      </p>
    </div>

    <!-- CLEAN FILTER CONTROLS -->
    <div class="roadmap-filter-toolbar">
      <!-- Search Input -->
      <div class="filter-search-wrap">
        <Icon icon="ph:magnifying-glass" class="filter-search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search features, packages (@memofs/core)..." 
          class="filter-search-input"
          aria-label="Search roadmap items"
        />
        <button 
          v-if="searchQuery" 
          class="filter-search-clear" 
          @click="searchQuery = ''"
          title="Clear search"
          aria-label="Clear search query"
        >
          <Icon icon="ph:x" />
        </button>
      </div>

      <!-- Stage Selector Tabs -->
      <div class="stage-filter-tabs" role="tablist" aria-label="Filter by stage">
        <button 
          class="stage-tab-btn" 
          :class="{ active: selectedStage === 'all' }"
          @click="selectedStage = 'all'"
          role="tab"
          :aria-selected="selectedStage === 'all'"
        >
          All <span class="tab-count">{{ totalCount }}</span>
        </button>
        <button 
          class="stage-tab-btn tab-frontier" 
          :class="{ active: selectedStage === 'frontier' }"
          @click="selectedStage = 'frontier'"
          role="tab"
          :aria-selected="selectedStage === 'frontier'"
        >
          Frontier <span class="tab-count">{{ frontierCount }}</span>
        </button>
        <button 
          class="stage-tab-btn tab-next-up" 
          :class="{ active: selectedStage === 'next-up' }"
          @click="selectedStage = 'next-up'"
          role="tab"
          :aria-selected="selectedStage === 'next-up'"
        >
          Next Up <span class="tab-count">{{ nextUpCount }}</span>
        </button>
        <button 
          class="stage-tab-btn tab-planned" 
          :class="{ active: selectedStage === 'planned' }"
          @click="selectedStage = 'planned'"
          role="tab"
          :aria-selected="selectedStage === 'planned'"
        >
          Planned <span class="tab-count">{{ plannedCount }}</span>
        </button>
      </div>
    </div>

    <!-- STREAM PILLS -->
    <div class="stream-filter-pills" role="region" aria-label="Filter by architectural area">
      <button 
        class="stream-pill-item" 
        :class="{ active: selectedStream === 'all' }"
        @click="selectedStream = 'all'"
      >
        All Areas
      </button>
      <button 
        v-for="stream in STREAMS" 
        :key="stream.id" 
        class="stream-pill-item"
        :class="{ active: selectedStream === stream.id }"
        @click="selectedStream = stream.id"
      >
        {{ stream.shortName }}
      </button>
    </div>

    <!-- EMPTY STATE -->
    <div v-if="filteredTickets.length === 0" class="roadmap-empty">
      <Icon icon="ph:magnifying-glass" class="empty-icon" />
      <p>No roadmap items match your query.</p>
      <button class="roadmap-reset-btn" @click="resetFilters">Reset Filters</button>
    </div>

    <!-- ROADMAP STREAM SECTIONS -->
    <div v-else class="roadmap-stream-list">
      <section 
        v-for="group in streamGroups" 
        :key="group.stream.id" 
        class="roadmap-stream-section"
      >
        <!-- Stream Section Title -->
        <div class="stream-section-head">
          <div class="stream-section-title-wrap">
            <span class="stream-section-accent" :style="{ background: group.stream.color }"></span>
            <h2 class="stream-section-title">{{ group.stream.name }}</h2>
          </div>
          <span class="stream-section-badge">{{ group.tickets.length }} {{ group.tickets.length === 1 ? 'item' : 'items' }}</span>
        </div>
        <p class="stream-section-desc">{{ group.stream.description }}</p>

        <!-- Feature Items List -->
        <div class="ticket-items-stack">
          <article 
            v-for="ticket in group.tickets" 
            :key="ticket.id" 
            class="ticket-entry"
            :class="`ticket-stage-${ticket.stage}`"
          >
            <!-- Feature Entry Header -->
            <div class="ticket-entry-top">
              <span class="ticket-milestone-pill">{{ ticket.milestone }}</span>
              <span class="ticket-stage-pill" :class="getStageBadge(ticket.stage).class">
                {{ getStageBadge(ticket.stage).label }}
              </span>
              <span v-for="pkg in ticket.packages" :key="pkg" class="ticket-pkg-pill">
                {{ pkg.replace('@memofs/', '') }}
              </span>
            </div>

            <!-- Title & Summary -->
            <h3 class="ticket-entry-title">{{ ticket.title }}</h3>
            <p class="ticket-entry-summary">{{ ticket.summary }}</p>

            <!-- Deliverables Toggle / Preview -->
            <div v-if="ticket.deliverables?.length" class="ticket-deliverables-box">
              <button 
                class="deliverables-toggle-btn" 
                @click="toggleDetails(ticket.id)"
                :aria-expanded="expandedTickets[ticket.id]"
              >
                <span>{{ expandedTickets[ticket.id] ? 'Hide deliverables' : `Deliverables (${ticket.deliverables.length})` }}</span>
                <Icon 
                  :icon="expandedTickets[ticket.id] ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" 
                  class="deliverables-toggle-icon"
                />
              </button>

              <ul v-if="expandedTickets[ticket.id]" class="deliverables-content-list">
                <li v-for="(item, idx) in ticket.deliverables" :key="idx">
                  <span class="bullet-dash">—</span>
                  <span class="deliverable-text">{{ item }}</span>
                </li>
              </ul>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ===================================================================
   SIMPLE & INTUITIVE ROADMAP STYLES
   Changelog-inspired typographic simplicity, Sora headings, mono accents.
   =================================================================== */

.roadmap-container {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 8px 0 56px;
  box-sizing: border-box;
}

/* Header */
.roadmap-lead {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 14px;
}

.roadmap-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.roadmap-main-title {
  font-family: var(--vp-font-family-display, "Sora", sans-serif);
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
  margin: 0;
  line-height: 1.2;
}

.roadmap-description {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.45;
}

/* Changelog Bridge Link */
.roadmap-changelog-bridge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.roadmap-changelog-bridge:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}

.changelog-bridge-icon {
  font-size: 12px;
  color: var(--vp-c-brand-1);
}

.changelog-bridge-arrow {
  font-size: 10px;
  color: var(--vp-c-text-3);
  transition: transform 0.15s ease;
}

.roadmap-changelog-bridge:hover .changelog-bridge-arrow {
  transform: translate(1px, -1px);
  color: var(--vp-c-brand-1);
}

/* Filter Toolbar */
.roadmap-filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.filter-search-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
}

.filter-search-icon {
  position: absolute;
  left: 9px;
  font-size: 14px;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.filter-search-input {
  width: 100%;
  height: 36px;
  padding: 6px 28px 6px 29px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-base);
  font-size: 0.86rem;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.filter-search-input:focus {
  border-color: var(--vp-c-brand-1);
}

.filter-search-clear {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-search-clear:hover {
  color: var(--vp-c-text-1);
}

/* Stage Selector Tabs */
.stage-filter-tabs {
  display: flex;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  background: var(--vp-c-bg-soft);
  overflow: hidden;
  max-width: 100%;
  height: 36px;
  box-sizing: border-box;
}

.stage-tab-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  background: transparent;
  border: none;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  height: 100%;
}

.stage-tab-btn:hover {
  color: var(--vp-c-text-1);
}

.stage-tab-btn.active {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tab-count {
  font-size: 9.5px;
  padding: 1px 4px;
  background: var(--vp-c-bg-mute);
  border-radius: 3px;
  color: var(--vp-c-text-3);
}

.stage-tab-btn.active .tab-count {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

/* Stream Pills */
.stream-filter-pills {
  display: flex;
  gap: 5px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.stream-filter-pills::-webkit-scrollbar {
  display: none;
}

.stream-pill-item {
  padding: 4px 9px;
  background: transparent;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.stream-pill-item:hover {
  border-color: var(--vp-c-text-3);
  color: var(--vp-c-text-1);
}

.stream-pill-item.active {
  background: var(--vp-c-text-1);
  border-color: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  font-weight: 600;
}

/* Stream Section */
.roadmap-stream-list {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.roadmap-stream-section {
  display: flex;
  flex-direction: column;
}

.stream-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.stream-section-title-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
}

.stream-section-accent {
  display: inline-block;
  width: 3.5px;
  height: 16px;
  border-radius: 2px;
}

.stream-section-title {
  font-family: var(--vp-font-family-display, "Sora", sans-serif);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  letter-spacing: -0.01em;
}

.stream-section-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-3);
}

.stream-section-desc {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  margin: 4px 0 14px 0;
  line-height: 1.45;
}

/* Feature Items Stack */
.ticket-items-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-entry {
  padding: 16px 18px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.ticket-entry:hover {
  border-color: var(--vp-c-brand-1);
}

.ticket-entry.ticket-stage-frontier {
  border-left: 3px solid var(--tek-c-gold, #b7791f);
}

.ticket-entry.ticket-stage-next-up {
  border-left: 3px solid #8b5cf6;
}

.ticket-entry.ticket-stage-planned {
  border-left: 3px solid #64748b;
}

/* Feature Meta Header */
.ticket-entry-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.ticket-milestone-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
  padding: 2px 7px;
  border-radius: 3px;
  border: 1px solid var(--vp-c-border);
}

.ticket-stage-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 7px;
  border-radius: 3px;
}

.badge-frontier {
  color: var(--tek-c-gold, #b7791f);
  background: rgba(183, 121, 31, 0.12);
}

.badge-next-up {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.12);
}

.badge-planned {
  color: #64748b;
  background: rgba(100, 116, 139, 0.12);
}

.ticket-pkg-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-border);
  padding: 2px 6px;
  border-radius: 3px;
}

/* Title & Summary */
.ticket-entry-title {
  font-family: var(--vp-font-family-display, "Sora", sans-serif);
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 4px;
  line-height: 1.35;
}

.ticket-entry-summary {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0 0 6px;
}

/* Deliverables Section */
.ticket-deliverables-box {
  border-top: 1px dashed var(--vp-c-divider);
  padding-top: 6px;
  margin-top: 6px;
}

.deliverables-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  padding: 4px 0;
  cursor: pointer;
  transition: color 0.15s ease;
  min-height: 26px;
}

.deliverables-toggle-btn:hover {
  color: var(--vp-c-text-1);
}

.deliverables-toggle-icon {
  font-size: 10.5px;
}

.deliverables-content-list {
  list-style: none;
  padding: 5px 0 2px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.deliverables-content-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.84rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
}

.bullet-dash {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  flex-shrink: 0;
}

.deliverable-text {
  flex: 1;
}

/* Empty State */
.roadmap-empty {
  text-align: center;
  padding: 40px 16px;
  border: 1px dashed var(--vp-c-divider);
  color: var(--vp-c-text-2);
  border-radius: var(--tek-radius, 4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-icon {
  font-size: 22px;
  color: var(--vp-c-text-3);
}

.roadmap-reset-btn {
  margin-top: 4px;
  padding: 6px 14px;
  background: var(--vp-c-brand-1);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.roadmap-reset-btn:hover {
  opacity: 0.9;
}

/* ===================================================================
   RESPONSIVE DESIGN (MOBILE & TABLET BREAKPOINTS)
   =================================================================== */

@media (max-width: 680px) {
  .roadmap-container {
    padding: 8px 0 48px;
  }

  .roadmap-lead {
    margin-bottom: 18px;
    padding-bottom: 12px;
  }

  .roadmap-title-row {
    margin-bottom: 6px;
  }

  .roadmap-main-title {
    font-size: 1.65rem;
  }

  .roadmap-description {
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .roadmap-changelog-bridge {
    padding: 4px 9px;
    font-size: 10.5px;
  }

  .roadmap-filter-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin-bottom: 10px;
  }

  .filter-search-wrap {
    min-width: 100%;
  }

  .filter-search-input {
    height: 38px;
    font-size: 0.86rem;
    padding: 6px 28px 6px 30px;
  }

  .stage-filter-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    height: 34px;
  }

  .stage-tab-btn {
    padding: 0 4px;
    font-size: 10.5px;
    justify-content: center;
    gap: 4px;
  }

  .tab-count {
    padding: 1px 4px;
    font-size: 9px;
  }

  .stream-filter-pills {
    margin-bottom: 20px;
    gap: 6px;
  }

  .stream-pill-item {
    padding: 5px 10px;
    font-size: 11px;
  }

  .roadmap-stream-list {
    gap: 26px;
  }

  .stream-section-title {
    font-size: 1.15rem;
  }

  .stream-section-desc {
    margin-left: 0;
    font-size: 0.85rem;
    margin-bottom: 12px;
    line-height: 1.45;
  }

  .ticket-items-stack {
    gap: 10px;
  }

  .ticket-entry {
    padding: 14px 16px;
  }

  .ticket-entry-title {
    font-size: 0.96rem;
    line-height: 1.35;
    margin-bottom: 4px;
  }

  .ticket-entry-summary {
    font-size: 0.86rem;
    line-height: 1.45;
    margin-bottom: 6px;
  }

  .deliverables-toggle-btn {
    min-height: 28px;
    padding: 4px 0;
    font-size: 11px;
  }

  .deliverables-content-list {
    gap: 5px;
    padding-top: 4px;
  }

  .deliverables-content-list li {
    font-size: 0.82rem;
    line-height: 1.4;
  }
}

@media (max-width: 360px) {
  .stage-tab-btn {
    font-size: 9.5px;
    padding: 0 2px;
    gap: 2px;
  }

  .tab-count {
    display: none;
  }
}
</style>

