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

// Filtered tickets
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
      const matchId = ticket.id.toLowerCase().includes(q)
      const matchTitle = ticket.title.toLowerCase().includes(q)
      const matchSummary = ticket.summary.toLowerCase().includes(q)
      const matchPkg = ticket.packages.some(p => p.toLowerCase().includes(q))
      const matchDeliverables = ticket.deliverables?.some(d => d.toLowerCase().includes(q))
      if (!matchId && !matchTitle && !matchSummary && !matchPkg && !matchDeliverables) {
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
      <h1 class="roadmap-main-title">Roadmap</h1>
      <p class="roadmap-description">
        What we are currently building and scheduled to ship across the MemoFS open source ecosystem.
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
          placeholder="Search tickets, titles, packages (@memofs/core)..." 
          class="filter-search-input"
        />
        <button 
          v-if="searchQuery" 
          class="filter-search-clear" 
          @click="searchQuery = ''"
          title="Clear search"
        >
          <Icon icon="ph:x" />
        </button>
      </div>

      <!-- Stage Selector Tabs -->
      <div class="stage-filter-tabs">
        <button 
          class="stage-tab-btn" 
          :class="{ active: selectedStage === 'all' }"
          @click="selectedStage = 'all'"
        >
          All <span class="tab-count">{{ totalCount }}</span>
        </button>
        <button 
          class="stage-tab-btn tab-frontier" 
          :class="{ active: selectedStage === 'frontier' }"
          @click="selectedStage = 'frontier'"
        >
          Frontier <span class="tab-count">{{ frontierCount }}</span>
        </button>
        <button 
          class="stage-tab-btn tab-next-up" 
          :class="{ active: selectedStage === 'next-up' }"
          @click="selectedStage = 'next-up'"
        >
          Next Up <span class="tab-count">{{ nextUpCount }}</span>
        </button>
        <button 
          class="stage-tab-btn tab-planned" 
          :class="{ active: selectedStage === 'planned' }"
          @click="selectedStage = 'planned'"
        >
          Planned <span class="tab-count">{{ plannedCount }}</span>
        </button>
      </div>
    </div>

    <!-- STREAM PILLS -->
    <div class="stream-filter-pills">
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
      <p>No open tickets match your query.</p>
      <button class="roadmap-reset-btn" @click="resetFilters">Reset Filters</button>
    </div>

    <!-- ROADMAP STREAM SECTIONS (CHANGELOG-INSPIRED HIERARCHY) -->
    <div v-else class="roadmap-stream-list">
      <section 
        v-for="group in streamGroups" 
        :key="group.stream.id" 
        class="roadmap-stream-section"
      >
        <!-- Stream Section Title (Like Changelog version header) -->
        <div class="stream-section-head">
          <div class="stream-section-title-wrap">
            <span class="stream-section-accent" :style="{ background: group.stream.color }"></span>
            <h2 class="stream-section-title">{{ group.stream.name }}</h2>
          </div>
          <span class="stream-section-badge">{{ group.tickets.length }} {{ group.tickets.length === 1 ? 'ticket' : 'tickets' }}</span>
        </div>
        <p class="stream-section-desc">{{ group.stream.description }}</p>

        <!-- Ticket Items List -->
        <div class="ticket-items-stack">
          <article 
            v-for="ticket in group.tickets" 
            :key="ticket.id" 
            class="ticket-entry"
            :class="`ticket-stage-${ticket.stage}`"
          >
            <!-- Ticket Entry Header -->
            <div class="ticket-entry-top">
              <div class="ticket-meta-left">
                <span class="ticket-ref-id">{{ ticket.id }}</span>
                <span class="ticket-stage-pill" :class="getStageBadge(ticket.stage).class">
                  {{ getStageBadge(ticket.stage).label }}
                </span>
                <span class="ticket-milestone-pill">{{ ticket.milestone }}</span>
              </div>

              <div class="ticket-pkgs-wrap">
                <span v-for="pkg in ticket.packages" :key="pkg" class="ticket-pkg-pill">
                  {{ pkg.replace('@memofs/', '') }}
                </span>
              </div>
            </div>

            <!-- Title & Summary -->
            <h3 class="ticket-entry-title">{{ ticket.title }}</h3>
            <p class="ticket-entry-summary">{{ ticket.summary }}</p>

            <!-- Dependency Indicator if any -->
            <div v-if="ticket.blockedBy?.length" class="ticket-blocker-row">
              <Icon icon="ph:arrow-elbow-down-right-bold" class="blocker-icon" />
              <span>Queued behind: <strong>{{ ticket.blockedBy.join(', ') }}</strong></span>
            </div>

            <!-- Deliverables Toggle / Preview -->
            <div v-if="ticket.deliverables?.length" class="ticket-deliverables-box">
              <button 
                class="deliverables-toggle-btn" 
                @click="toggleDetails(ticket.id)"
                :aria-expanded="expandedTickets[ticket.id]"
              >
                <span>{{ expandedTickets[ticket.id] ? 'Hide deliverables' : `Deliverables (${ticket.deliverables.length})` }}</span>
                <Icon :icon="expandedTickets[ticket.id] ? 'ph:caret-up-bold' : 'ph:caret-down-bold'" />
              </button>

              <ul v-if="expandedTickets[ticket.id]" class="deliverables-content-list">
                <li v-for="(item, idx) in ticket.deliverables" :key="idx">
                  <span class="bullet-dash">—</span>
                  <span>{{ item }}</span>
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
  padding: 10px 0 64px;
}

/* Header */
.roadmap-lead {
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 16px;
}

.roadmap-main-title {
  font-family: var(--vp-font-family-display, "Sora", sans-serif);
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
  line-height: 1.2;
}

.roadmap-description {
  font-size: 1.05rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.5;
}

/* Filter Toolbar */
.roadmap-filter-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.filter-search-wrap {
  position: relative;
  flex: 1;
  min-width: 260px;
  display: flex;
  align-items: center;
}

.filter-search-icon {
  position: absolute;
  left: 10px;
  font-size: 15px;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.filter-search-input {
  width: 100%;
  padding: 8px 30px 8px 32px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-base);
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.filter-search-input:focus {
  border-color: var(--vp-c-brand-1);
}

.filter-search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 2px;
  display: flex;
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
}

.stage-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  background: transparent;
  border: none;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
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
  font-size: 10px;
  padding: 1px 5px;
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
  gap: 6px;
  margin-bottom: 32px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.stream-pill-item {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
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
  gap: 36px;
}

.roadmap-stream-section {
  display: flex;
  flex-direction: column;
}

.stream-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.stream-section-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stream-section-accent {
  display: inline-block;
  width: 4px;
  height: 18px;
  border-radius: 2px;
}

.stream-section-title {
  font-family: var(--vp-font-family-display, "Sora", sans-serif);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
  letter-spacing: -0.01em;
}

.stream-section-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.stream-section-desc {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  margin: 0 0 16px 12px;
  line-height: 1.45;
}

/* Ticket Items Stack */
.ticket-items-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-entry {
  padding: 14px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--tek-radius, 4px);
  transition: border-color 0.15s ease;
}

.ticket-entry:hover {
  border-color: var(--vp-c-brand-1);
}

.ticket-entry.ticket-stage-frontier {
  border-left: 3px solid var(--tek-c-gold, #b7791f);
}

/* Ticket Meta Header */
.ticket-entry-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.ticket-meta-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ticket-ref-id {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
  padding: 2px 6px;
  border-radius: 3px;
}

.ticket-stage-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
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

.ticket-milestone-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-3);
}

.ticket-pkgs-wrap {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.ticket-pkg-pill {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-mute);
  padding: 2px 5px;
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
  font-size: 0.87rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
  margin: 0 0 8px;
}

/* Blocker Row */
.ticket-blocker-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #ea580c;
  font-family: var(--vp-font-family-mono);
  margin-bottom: 8px;
}

.blocker-icon {
  font-size: 12px;
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
  gap: 4px;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  padding: 2px 0;
  cursor: pointer;
  transition: color 0.15s ease;
}

.deliverables-toggle-btn:hover {
  color: var(--vp-c-text-1);
}

.deliverables-content-list {
  list-style: none;
  padding: 6px 0 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.deliverables-content-list li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.bullet-dash {
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

/* Empty State */
.roadmap-empty {
  text-align: center;
  padding: 48px 16px;
  border: 1px dashed var(--vp-c-divider);
  color: var(--vp-c-text-2);
  border-radius: var(--tek-radius, 4px);
}

.roadmap-reset-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--vp-c-brand-1);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 640px) {
  .roadmap-main-title {
    font-size: 1.8rem;
  }
  .roadmap-filter-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .stage-filter-tabs {
    width: 100%;
  }
  .stage-tab-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
