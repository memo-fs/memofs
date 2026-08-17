<script setup lang="ts">
import { useData, useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { computed, nextTick, onMounted, watch } from "vue";
import AnnouncementPill from "./AnnouncementPill.vue";
import AskAiBar from "./AskAiBar.vue";
import CookbookHeader from "./CookbookHeader.vue";
import VersionWarning from "./VersionWarning.vue";

import BottomCta from "./BottomCta.vue";
import ComparisonSection from "./ComparisonSection.vue";
import CredibilityBar from "./CredibilityBar.vue";
import DualEntryHero from "./DualEntryHero.vue";
import HeroTerminal from "./HeroTerminal.vue";
import HowItWorks from "./HowItWorks.vue";
import ProblemSection from "./ProblemSection.vue";
import RuntimesSection from "./RuntimesSection.vue";
import SidebarBrand from "./SidebarBrand.vue";
import StatsStrip from "./StatsStrip.vue";
import EngramAI from "./EngramAI.vue";
import { useHomeI18n } from "../composables/useHomeI18n";

const { Layout } = DefaultTheme;
const { t } = useHomeI18n();

const { frontmatter } = useData();
const isCookbook = computed(() => {
  const path = route.path;
  const layout = frontmatter.value.layout;
  return layout !== 'page' && (path.includes('/cookbooks/') || path.includes('/learn/cookbooks/')) && !path.endsWith('/cookbooks/') && !path.endsWith('/cookbooks/index.html');
});
const showEngramAI = computed(() => {
  const layout = frontmatter.value.layout;
  return !layout || layout === 'doc';
});

const route = useRoute();

const splitTitle = () => {
	const nameEl = document.querySelector<HTMLElement>(".VPHero .name");
	if (nameEl && nameEl.textContent === "MemoFS") {
		nameEl.classList.remove("clip");
		nameEl.innerHTML =
			'<span class="name-memo">Memo</span><span class="name-fs">FS</span>';
	}
};

onMounted(() => {
	splitTitle();
});

watch(
	() => route.path,
	(to) => {
		if (to === "/") {
			nextTick(() => splitTitle());
		}
	},
);
</script>

<template>
  <Layout>
    <template #sidebar-nav-before>
      <SidebarBrand />
    </template>

    <template #doc-before>
      <VersionWarning />
      <CookbookHeader v-if="isCookbook" />
    </template>

    <template #aside-top>
      <AskAiBar class="ask-ai-bar-aside" />
    </template>

    <template #home-hero-before>
      <AnnouncementPill
        :badge="t.pill.badge"
        :text="t.pill.text"
        href="https://memofs.dev"
      />
    </template>

    <template #home-hero-image>
      <div class="hero-visual-container">
        <HeroTerminal />
      </div>
    </template>

    <template #home-hero-after>
      <div class="home-custom-sections">
        <DualEntryHero />
        <CredibilityBar />
      </div>
    </template>

    <template #home-features-after>
      <div class="home-custom-sections">
        <hr class="tek-hairline" />
        <ProblemSection />
        <hr class="tek-hairline" />
        <HowItWorks />
        <StatsStrip />
        <hr class="tek-hairline" />
        <RuntimesSection />
        <hr class="tek-hairline" />
        <ComparisonSection />
        <BottomCta />
      </div>
    </template>
    
    <template #layout-bottom>
      <EngramAI v-if="showEngramAI" />
    </template>
  </Layout>
</template>

<style scoped>
.ask-ai-bar-aside {
  margin-bottom: 16px;
}

.container {
  max-width: var(--tek-container-narrow);
  margin: 0 auto;
  padding: 0 24px;
}

.container-wide {
  max-width: var(--tek-container);
  margin: 0 auto;
  padding: 0 24px;
}

.home-custom-sections {
  max-width: var(--tek-container);
  margin: 0 auto;
}

.hero-visual-container {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

<style>
@media (max-width: 959px) {
  .VPHero .image {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .VPHero {
    padding-top: calc(var(--vp-nav-height) + var(--vp-layout-top-height, 0px) + 16px) !important;
  }
}
</style>
