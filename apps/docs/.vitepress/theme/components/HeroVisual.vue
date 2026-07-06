<script setup lang="ts">
import { onMounted, ref } from "vue";

/**
 * HeroVisual component displays an astonishing, interactive, high-tech SVG diagram
 * representing the MemoFS memory infrastructure (Core, Archival, Recall, and Sync).
 * Features:
 * - Central node containing the MemoFS logo (brackets + layered memory stack).
 * - Concentric orbiting circular nodes representing the four memory layers.
 * - Flowing data pulse animations running along curved bezier connection paths.
 * - 3D parallax hover tilt effect reacting dynamically to the mouse cursor.
 * - Glowing radial-gradient spotlight backdrop tracking the mouse.
 * - Staggered entrance animations on page load.
 */

const isActive = ref(false);
const rx = ref(0);
const ry = ref(0);
const mx = ref(50);
const my = ref(50);
const activeNode = ref<string | null>(null);

onMounted(() => {
	setTimeout(() => {
		isActive.value = true;
	}, 200);
});

/**
 * Handles mousemove on the visual container to calculate 3D tilt angles and spotlight coordinates.
 */
const handleMouseMove = (e: MouseEvent) => {
	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	mx.value = Math.round((x / rect.width) * 100);
	my.value = Math.round((y / rect.height) * 100);

	const xPercent = x / rect.width - 0.5;
	const yPercent = y / rect.height - 0.5;
	rx.value = +(yPercent * -12).toFixed(2); // Rotate X axis based on Y
	ry.value = +(xPercent * 12).toFixed(2); // Rotate Y axis based on X
};

/**
 * Resets angles and spotlight coordinates when the mouse leaves.
 */
const handleMouseLeave = () => {
	rx.value = 0;
	ry.value = 0;
	mx.value = 50;
	my.value = 50;
	activeNode.value = null;
};
</script>

<template>
  <div 
    class="hero-visual-wrapper"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    :style="{
      transform: `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`,
      '--mx': `${mx}%`,
      '--my': `${my}%`
    }"
  >
    <svg 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      class="hero-svg"
      :class="{ active: isActive }"
    >
      <defs>
        <!-- Glow Filters -->
        <filter id="glow-core" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="16" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-node" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <!-- Connection Path Gradients (flowing pulse color) -->
        <linearGradient id="grad-core-mem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4fb2f3" />
          <stop offset="100%" stop-color="#258acb" />
        </linearGradient>
        <linearGradient id="grad-archival-mem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5bd473" />
          <stop offset="100%" stop-color="#4cae61" />
        </linearGradient>
        <linearGradient id="grad-recall-mem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>
        <linearGradient id="grad-sync-state" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fb923c" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>

        <!-- Vertical blue -> green gradient for the embedded MemoFS layered stack -->
        <linearGradient id="grad-mem-layers" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4fb2f3" />
          <stop offset="100%" stop-color="#5bd473" />
        </linearGradient>
        
        <!-- Mask to cut connection lines at node boundaries -->
        <mask id="connection-mask">
          <rect x="0" y="0" width="500" height="500" fill="white" />
          <circle cx="250" cy="250" r="54" fill="black" />
          <circle cx="110" cy="110" r="34" fill="black" />
          <circle cx="390" cy="110" r="34" fill="black" />
          <circle cx="110" cy="390" r="34" fill="black" />
          <circle cx="390" cy="390" r="34" fill="black" />
        </mask>
      </defs>

      <!-- Background connection paths (static mesh) -->
      <g stroke="currentColor" stroke-opacity="0.08" stroke-width="3" fill="none" mask="url(#connection-mask)">
        <!-- Core to Core Memory (Top-Left) -->
        <path d="M 210,210 C 170,210 130,170 110,110" />
        <!-- Core to Archival Memory (Top-Right) -->
        <path d="M 290,210 C 330,210 370,170 390,110" />
        <!-- Core to Recall Memory (Bottom-Left) -->
        <path d="M 210,290 C 170,290 130,330 110,390" />
        <!-- Core to Sync State (Bottom-Right) -->
        <path d="M 290,290 C 330,290 370,330 390,390" />
      </g>

      <!-- Active Connection Path Pulses -->
      <g fill="none" stroke-width="3.5" stroke-linecap="round" mask="url(#connection-mask)">
        <!-- Top-Left Flow (Core Memory -> Core) -->
        <path 
          d="M 110,110 C 130,170 170,210 210,210" 
          stroke="url(#grad-core-mem)" 
          class="flow-path pulse-in"
          :class="{ active: activeNode === 'core-mem' }"
        />
        <!-- Top-Right Flow (Core -> Archival Memory) -->
        <path 
          d="M 290,210 C 330,210 370,170 390,110" 
          stroke="url(#grad-archival-mem)" 
          class="flow-path pulse-out"
          :class="{ active: activeNode === 'archival-mem' }"
        />
        <!-- Bottom-Left Flow (Core -> Recall Memory) -->
        <path 
          d="M 210,290 C 170,290 130,330 110,390" 
          stroke="url(#grad-recall-mem)" 
          class="flow-path pulse-out"
          :class="{ active: activeNode === 'recall-mem' }"
        />
        <!-- Bottom-Right Flow (Sync State <-> Core) -->
        <path 
          d="M 390,390 C 370,330 330,290 290,290" 
          stroke="url(#grad-sync-state)" 
          class="flow-path pulse-bidirectional"
          :class="{ active: activeNode === 'sync-state' }"
        />
      </g>

      <!-- Central Core Node -->
      <g 
        class="core-node" 
        filter="url(#glow-core)"
        @mouseenter="activeNode = 'core'"
      >
        <!-- Outer Glowing Rings -->
        <circle cx="250" cy="250" r="75" fill="none" stroke="url(#grad-core-mem)" stroke-width="2" class="core-ring-outer" />
        <circle cx="250" cy="250" r="62" fill="none" stroke="url(#grad-archival-mem)" stroke-width="1.5" class="core-ring-inner" />
        
        <!-- Central Glass Disc -->
        <circle cx="250" cy="250" r="50" fill="none" stroke="url(#grad-core-mem)" stroke-width="2.5" class="core-center-disc" />

        <!-- Brand Logo Embedded inside the Core Node -->
        <!-- Translating the 100x100 logo so its center (50, 50) sits at (250, 250) -->
        <g transform="translate(212.5, 212.5) scale(0.75)">
          <!-- Brackets (TekBreed lineage) -->
          <polyline points="25,25 5,50 25,75" stroke="#4fb2f3" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" class="bracket-left" />
          <polyline points="75,25 95,50 75,75" stroke="#5bd473" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" class="bracket-right" />

          <!-- Isometric layered stack (the MemoFS mark) -->
          <g stroke="url(#grad-mem-layers)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <polygon points="50,28 66,37 50,46 34,37" class="mem-layer ml1" />
            <polyline points="34,45 50,54 66,45" class="mem-layer ml2" />
            <polyline points="34,53 50,62 66,53" class="mem-layer ml3" />
          </g>
        </g>
      </g>

      <!-- Outer Nodes (Layers) -->
      <!-- Top-Left: Core Memory -->
      <g 
        class="layer-node core-mem"
        :class="{ hover: activeNode === 'core-mem' }"
        @mouseenter="activeNode = 'core-mem'"
        transform="translate(110, 110)"
      >
        <circle cx="0" cy="0" r="32" fill="none" stroke="#4fb2f3" stroke-width="2" filter="url(#glow-node)" class="node-bg" />
        <!-- Document Icon -->
        <g stroke="#4fb2f3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-10, -10) scale(0.8)">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </g>
        <text x="0" y="52" text-anchor="middle" class="node-label">Core Memory</text>
      </g>

      <!-- Top-Right: Archival Memory -->
      <g 
        class="layer-node archival-mem"
        :class="{ hover: activeNode === 'archival-mem' }"
        @mouseenter="activeNode = 'archival-mem'"
        transform="translate(390, 110)"
      >
        <circle cx="0" cy="0" r="32" fill="none" stroke="#5bd473" stroke-width="2" filter="url(#glow-node)" class="node-bg" />
        <!-- Folder/Archive Icon -->
        <g stroke="#5bd473" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-10, -10) scale(0.8)">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </g>
        <text x="0" y="52" text-anchor="middle" class="node-label">Archival Memory</text>
      </g>

      <!-- Bottom-Left: Recall Memory -->
      <g 
        class="layer-node recall-mem"
        :class="{ hover: activeNode === 'recall-mem' }"
        @mouseenter="activeNode = 'recall-mem'"
        transform="translate(110, 390)"
      >
        <circle cx="0" cy="0" r="32" fill="none" stroke="#818cf8" stroke-width="2" filter="url(#glow-node)" class="node-bg" />
        <!-- Connections/Network Nodes Icon -->
        <g stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-10, -10) scale(0.8)">
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="6" x2="9" y2="6" />
          <line x1="6" y1="9" x2="6" y2="15" />
          <line x1="18" y1="9" x2="18" y2="15" />
        </g>
        <text x="0" y="52" text-anchor="middle" class="node-label">Recall Memory</text>
      </g>

      <!-- Bottom-Right: Sync State -->
      <g 
        class="layer-node sync-state"
        :class="{ hover: activeNode === 'sync-state' }"
        @mouseenter="activeNode = 'sync-state'"
        transform="translate(390, 390)"
      >
        <circle cx="0" cy="0" r="32" fill="none" stroke="#fb923c" stroke-width="2" filter="url(#glow-node)" class="node-bg" />
        <!-- Cloud Sync Icon -->
        <g stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(-10, -10) scale(0.8)">
          <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          <path d="M12 12v3m0 0l-2-2m2 2l2-2" />
        </g>
        <text x="0" y="52" text-anchor="middle" class="node-label">Sync State</text>
      </g>
    </svg>

    <!-- Floating Background Particles -->
    <div class="data-particles">
      <div v-for="n in 8" :key="n" :class="['particle', `p-${n}`]"></div>
    </div>
  </div>
</template>

<style scoped>
.hero-visual-wrapper {
	position: relative;
	width: 440px;
	height: 440px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: visible;
	transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1);
	transform-style: preserve-3d;
}



.hero-svg {
	width: 100%;
	height: 100%;
	z-index: 2;
	overflow: visible;
}

/* Layer Node Styling */
.layer-node {
	cursor: pointer;
	transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.layer-node .node-bg {
	transition: stroke-width 0.3s, filter 0.3s;
}

.layer-node.hover {
	transform: scale(1.1);
}

.layer-node.hover .node-bg {
	stroke-width: 3px;
	filter: drop-shadow(0 0 12px var(--node-color));
}

.layer-node.core-mem { --node-color: #4fb2f3; }
.layer-node.archival-mem { --node-color: #5bd473; }
.layer-node.recall-mem { --node-color: #818cf8; }
.layer-node.sync-state { --node-color: #fb923c; }

/* SVG Text Labels */
.node-label {
	font-family: var(--vp-font-family-base);
	font-size: 11px;
	font-weight: 700;
	fill: var(--vp-c-text-2);
	letter-spacing: 0.05em;
	text-transform: uppercase;
	transition: fill 0.3s, font-size 0.3s;
	pointer-events: none;
}

.layer-node.hover .node-label {
	fill: var(--node-color);
	font-size: 11.5px;
}

/* Connection Paths and Flows */
.flow-path {
	stroke-dasharray: 12, 80;
	stroke-dashoffset: 0;
	opacity: 0.4;
	transition: stroke-width 0.3s, opacity 0.3s;
}

/* Different direction flows */
.pulse-in {
	animation: flowIn 3s linear infinite;
}

.pulse-out {
	animation: flowOut 3s linear infinite;
}

.pulse-bidirectional {
	animation: flowBidirectional 4s linear infinite;
}

@keyframes flowIn {
	from { stroke-dashoffset: 120; }
	to { stroke-dashoffset: 0; }
}

@keyframes flowOut {
	from { stroke-dashoffset: 0; }
	to { stroke-dashoffset: 120; }
}

@keyframes flowBidirectional {
	0% { stroke-dashoffset: 0; }
	50% { stroke-dashoffset: 120; }
	100% { stroke-dashoffset: 0; }
}

/* Hover path highlights */
.flow-path.active {
	stroke-width: 5px;
	opacity: 1;
	animation-duration: 1.5s; /* speed up flow when hovered! */
}

/* Central Core styling */
.core-node {
	transition: transform 0.5s ease;
	transform-origin: 250px 250px;
}

.core-node:hover {
	transform: scale(1.05);
}

.core-ring-outer {
	transform-origin: 250px 250px;
	animation: spinOuter 20s linear infinite;
	opacity: 0.6;
}

.core-ring-inner {
	transform-origin: 250px 250px;
	animation: spinInner 15s linear infinite reverse;
	opacity: 0.4;
}

@keyframes spinOuter {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

@keyframes spinInner {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

/* Embedded logo details */
.bracket-left {
	transition: transform 0.3s ease;
	transform-origin: 15px 50px;
}
.bracket-right {
	transition: transform 0.3s ease;
	transform-origin: 85px 50px;
}

.core-node:hover .bracket-left {
	transform: translateX(-3px);
}
.core-node:hover .bracket-right {
	transform: translateX(3px);
}

.mem-layer {
	opacity: 0.9;
	transition: stroke-width 0.3s, opacity 0.3s;
}

.core-node:hover .mem-layer {
	stroke-width: 8.5px;
	opacity: 1;
}

/* Layered-stack pulse — each layer breathes in sequence */
.ml1 { animation: pulseLayer 2.4s ease-in-out infinite alternate; }
.ml2 { animation: pulseLayer 2.4s ease-in-out infinite alternate 0.4s; }
.ml3 { animation: pulseLayer 2.4s ease-in-out infinite alternate 0.8s; }

@keyframes pulseLayer {
	0% { opacity: 0.55; }
	100% { opacity: 1; }
}

/* Floating particles */
.data-particles {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 1;
	overflow: visible;
}

.particle {
	position: absolute;
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background: var(--vp-c-brand-1);
	opacity: 0;
	transition: opacity 0.5s;
}

.hero-visual-wrapper:hover .particle {
	opacity: 0.6;
}

/* Generate floating curves for particles */
.p-1 { top: 15%; left: 30%; background: #4fb2f3; animation: floatParticle1 6s ease-in-out infinite; }
.p-2 { top: 20%; right: 25%; background: #5bd473; animation: floatParticle2 8s ease-in-out infinite; }
.p-3 { bottom: 25%; left: 20%; background: #818cf8; animation: floatParticle3 7s ease-in-out infinite; }
.p-4 { bottom: 15%; right: 30%; background: #fb923c; animation: floatParticle4 9s ease-in-out infinite; }
.p-5 { top: 45%; left: 12%; background: #4fb2f3; animation: floatParticle2 5s ease-in-out infinite 1s; }
.p-6 { top: 50%; right: 10%; background: #5bd473; animation: floatParticle1 7s ease-in-out infinite 2s; }
.p-7 { top: 28%; left: 45%; background: #818cf8; animation: floatParticle4 8s ease-in-out infinite 1.5s; }
.p-8 { bottom: 35%; right: 45%; background: #fb923c; animation: floatParticle3 6s ease-in-out infinite 2.5s; }

@keyframes floatParticle1 {
	0%, 100% { transform: translate(0, 0); }
	33% { transform: translate(25px, -15px); }
	66% { transform: translate(-15px, 20px); }
}
@keyframes floatParticle2 {
	0%, 100% { transform: translate(0, 0); }
	50% { transform: translate(-30px, -20px); }
}
@keyframes floatParticle3 {
	0%, 100% { transform: translate(0, 0); }
	40% { transform: translate(20px, 30px); }
	70% { transform: translate(-20px, -10px); }
}
@keyframes floatParticle4 {
	0%, 100% { transform: translate(0, 0); }
	50% { transform: translate(15px, -25px); }
}

/* Page load transition */
.hero-svg {
	opacity: 0;
	transform: scale(0.9) rotate(-5deg);
	transition: opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1), transform 1.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.hero-svg.active {
	opacity: 1;
	transform: scale(1) rotate(0deg);
}

/* Staggered entrance for nodes */
.layer-node {
	opacity: 0;
	transition: opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1), transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
}

.active .layer-node {
	opacity: 1;
}

.active .layer-node.core-mem { transition-delay: 0.3s; }
.active .layer-node.archival-mem { transition-delay: 0.45s; }
.active .layer-node.recall-mem { transition-delay: 0.6s; }
.active .layer-node.sync-state { transition-delay: 0.75s; }

/* Responsive adjustments */
@media (max-width: 960px) {
	.hero-visual-wrapper {
		width: 360px;
		height: 360px;
	}
	.node-label {
		font-size: 9px;
	}
	.layer-node circle {
		r: 28px;
	}
}

@media (max-width: 480px) {
	.hero-visual-wrapper {
		width: 320px;
		height: 320px;
		transform: scale(0.9) !important;
	}
}
</style>
