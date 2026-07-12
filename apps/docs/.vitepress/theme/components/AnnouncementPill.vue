<script setup lang="ts">
/**
 * AnnouncementPill — a gradient-bordered pill that sits above the hero.
 * The text is a static prop so callers control the message without
 * touching this component. The pill links to /changelog by default.
 *
 * Usage (in HomeLayout.vue #home-hero-before slot):
 *   <AnnouncementPill />
 */
withDefaults(
	defineProps<{
		href?: string;
		badge?: string;
		text?: string;
	}>(),
	{
		href: "/changelog",
		badge: "Cloud",
		text: "Introducing MemoFS Cloud",
	},
);
</script>

<template>
  <div class="tek-pill-wrap">
    <a :href="href" class="tek-announcement-pill" aria-label="Announcement">
      <span class="tek-pill-badge">{{ badge }}</span>
      <span class="tek-pill-text">{{ text }}</span>
      <span class="tek-pill-arrow" aria-hidden="true">→</span>
    </a>
  </div>
</template>
