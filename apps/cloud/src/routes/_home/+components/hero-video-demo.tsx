import { Play } from "lucide-react";
import { useState } from "react";
import { Section } from "~/components/site/visuals";
import { cn } from "~/lib/utils";
import { VIDEO_DEMO_TABS } from "../+utils/landing-content";

/**
 * HeroVideoDemo — displays the tab switcher for CLI Sync, Recall API, and Connectors
 * along with a performance-optimized lazy YouTube player mockup.
 */
export function HeroVideoDemo() {
	const [demoState, setDemoState] = useState({
		activeTab: "cli",
		isPlaying: false,
	});

	const currentTab =
		VIDEO_DEMO_TABS.find((t) => t.id === demoState.activeTab) ??
		VIDEO_DEMO_TABS[0];

	const handleTabChange = (tabId: string) => {
		setDemoState({ activeTab: tabId, isPlaying: false });
	};

	const handlePlay = () => {
		setDemoState((prev) => ({ ...prev, isPlaying: true }));
	};

	return (
		<Section className="pb-20 max-w-4xl">
			{/* Tab Switcher */}
			<div className="flex justify-center border-b border-border mb-8">
				<div className="flex gap-1 sm:gap-2">
					{VIDEO_DEMO_TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => handleTabChange(tab.id)}
							className={cn(
								"px-4 py-3 text-xs sm:text-sm font-mono tracking-tight transition-all border-b-2 -mb-px cursor-pointer",
								demoState.activeTab === tab.id
									? "border-primary text-foreground font-semibold"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Info & Video Player Box */}
			<div className="space-y-6">
				<div className="text-center max-w-2xl mx-auto">
					<h3 className="text-lg font-semibold text-foreground">
						{currentTab.title}
					</h3>
					<p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
						{currentTab.desc}
					</p>
				</div>

				<div className="relative aspect-video w-full overflow-hidden border border-border bg-[#101114] shadow-2xl">
					{demoState.isPlaying ? (
						<iframe
							src={`https://www.youtube.com/embed/${currentTab.youtubeId}?autoplay=1`}
							title={currentTab.title}
							className="absolute inset-0 h-full w-full border-0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowFullScreen
						/>
					) : (
						<button
							type="button"
							onClick={handlePlay}
							className="group relative flex h-full w-full items-center justify-center focus:outline-hidden cursor-pointer"
							aria-label="Play video demo"
						>
							{/* Fallback image */}
							<img
								src={currentTab.fallbackThumbnail}
								alt={currentTab.title}
								className="absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-700 group-hover:scale-105"
							/>
							{/* Play icon overlay */}
							<div className="relative z-10 flex size-16 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-xs transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/90 group-hover:border-primary">
								<Play className="size-6 fill-current translate-x-0.5" />
							</div>
						</button>
					)}
				</div>
			</div>
		</Section>
	);
}
