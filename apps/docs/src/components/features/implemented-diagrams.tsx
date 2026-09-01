interface DiagramProps {
	className?: string;
}

export function CodeAnchoringDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Code Anchoring & Drift Detection</title>
			<path d="M80 50 L125 30 L80 10 L35 30 Z" className="fill-muted" />
			<path d="M35 30 L35 36 L80 56 L125 36 L125 30" />
			<line x1="55" y1="27" x2="85" y2="27" strokeOpacity="0.6" />
			<line x1="50" y1="33" x2="105" y2="33" strokeOpacity="0.6" />
			<line x1="60" y1="39" x2="90" y2="39" strokeOpacity="0.6" />
			<text
				x="80"
				y="20"
				textAnchor="middle"
				fontSize="5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				src/auth.ts:42
			</text>
			<text
				x="80"
				y="26"
				textAnchor="middle"
				fontSize="4"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				AST • FnDef
			</text>
			<circle cx="80" cy="42" r="3" fill="currentColor" />
			<circle cx="80" cy="42" r="6" strokeDasharray="2 2" strokeOpacity="0.7" />
			<line
				x1="80"
				y1="48"
				x2="80"
				y2="92"
				strokeDasharray="3 3"
				strokeOpacity="0.8"
			/>
			<g transform="translate(80, 70)">
				<rect
					x="-16"
					y="-8"
					width="32"
					height="16"
					rx="3"
					className="fill-card dark:fill-muted"
				/>
				<rect x="-16" y="-8" width="32" height="16" rx="3" />
				<text
					x="0"
					y="-1"
					textAnchor="middle"
					fontSize="4.5"
					className="fill-foreground"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					SHA256
				</text>
				<text
					x="0"
					y="4.5"
					textAnchor="middle"
					fontSize="3.2"
					className="fill-muted-foreground"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					abc…9f3
				</text>
			</g>
			<path d="M80 125 L125 105 L80 85 L35 105 Z" className="fill-muted" />
			<path d="M35 105 L35 125 L80 145 L125 125 L125 105" />
			<path d="M80 105 L80 145" />
			<text
				x="80"
				y="116"
				textAnchor="middle"
				fontSize="5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				memory/*.md
			</text>
			<text
				x="80"
				y="122"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				anchored • drift:check
			</text>
			<path
				d="M80 135 L120 117 L80 99 L40 117 Z"
				strokeDasharray="2 2"
				strokeOpacity="0.2"
			/>
		</svg>
	);
}

export function HybridRecallDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Hybrid Recall & Fusion</title>
			<path d="M45 42 L68 30 L45 18 L22 30 Z" className="fill-muted" />
			<path d="M22 30 L22 46 L45 58 L68 46 L68 30" />
			<line x1="33" y1="31" x2="55" y2="31" strokeOpacity="0.6" />
			<line x1="30" y1="36" x2="52" y2="36" strokeOpacity="0.6" />
			<text
				x="45"
				y="42"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				BM25
			</text>
			<text
				x="45"
				y="47"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				lexical
			</text>
			<path d="M115 42 L138 30 L115 18 L92 30 Z" className="fill-muted" />
			<path d="M92 30 L92 46 L115 58 L138 46 L138 30" />
			<path d="M115 42 L115 58" />
			<circle cx="108" cy="28" r="1.5" fill="currentColor" />
			<circle cx="115" cy="32" r="1.5" fill="currentColor" />
			<circle cx="122" cy="27" r="1.5" fill="currentColor" />
			<text
				x="115"
				y="42"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				Vector
			</text>
			<text
				x="115"
				y="47"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				768d
			</text>
			<path d="M45 58 L72 82" strokeDasharray="3 3" />
			<path d="M115 58 L88 82" strokeDasharray="3 3" />
			<circle cx="80" cy="88" r="10" className="fill-card dark:fill-muted" />
			<circle cx="80" cy="88" r="10" />
			<text
				x="80"
				y="86.5"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				+0.30
			</text>
			<text
				x="80"
				y="91"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				gated
			</text>
			<path d="M80 124 L120 106 L80 88 L40 106 Z" className="fill-muted" />
			<path d="M40 106 L40 120 L80 138 L120 120 L120 106" />
			<path d="M80 106 L80 138" />
			<text
				x="80"
				y="117"
				textAnchor="middle"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				ranked • deduped
			</text>
			<circle cx="65" cy="113" r="1.5" fill="currentColor" />
			<circle cx="80" cy="120" r="1.5" fill="currentColor" />
			<circle cx="95" cy="113" r="1.5" fill="currentColor" />
		</svg>
	);
}

export function EntityGraphDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Entity Graph & Consolidation</title>
			<path d="M40 45 L58 36 L40 27 L22 36 Z" className="fill-muted" />
			<path d="M22 36 L22 50 L40 59 L58 50 L58 36" />
			<path d="M40 45 L40 59" />
			<text
				x="40"
				y="40"
				textAnchor="middle"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				Person
			</text>
			<path d="M120 45 L138 36 L120 27 L102 36 Z" className="fill-muted" />
			<path d="M102 36 L102 50 L120 59 L138 50 L138 36" />
			<path d="M120 45 L120 59" />
			<text
				x="120"
				y="40"
				textAnchor="middle"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				Repo
			</text>
			<line x1="58" y1="43" x2="102" y2="43" strokeDasharray="3 3" />
			<polygon points="84,40 88,43 84,46" fill="currentColor" stroke="none" />
			<text
				x="80"
				y="39"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				owns
			</text>
			<path d="M80 115 L106 102 L80 89 L54 102 Z" className="fill-muted" />
			<path d="M54 102 L54 118 L80 131 L106 118 L106 102" />
			<path d="M80 102 L80 131" />
			<text
				x="80"
				y="110"
				textAnchor="middle"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				edges.jsonl
			</text>
			<text
				x="80"
				y="115"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				nodes.jsonl
			</text>
			<line x1="40" y1="59" x2="65" y2="95" strokeDasharray="2 2" />
			<line x1="120" y1="59" x2="95" y2="95" strokeDasharray="2 2" />
			<path
				d="M95 102 C 120 90, 135 110, 106 122"
				strokeDasharray="2 2"
				strokeOpacity="0.7"
			/>
			<text
				x="118"
				y="108"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				supersedes
			</text>
			<circle cx="80" cy="102" r="2.5" fill="currentColor" />
		</svg>
	);
}

export function AgentFsDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>AgentFS Workspace Scratchpads</title>
			<rect
				x="25"
				y="20"
				width="110"
				height="70"
				rx="4"
				strokeDasharray="3 3"
				strokeOpacity="0.4"
			/>
			<text
				x="80"
				y="17"
				textAnchor="middle"
				fontSize="4"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				isolated turn
			</text>
			<rect
				x="35"
				y="30"
				width="38"
				height="45"
				rx="2"
				className="fill-muted"
			/>
			<rect x="35" y="30" width="38" height="45" rx="2" />
			<text
				x="54"
				y="38"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				scratch
			</text>
			<line x1="42" y1="44" x2="66" y2="44" strokeOpacity="0.6" />
			<line x1="42" y1="50" x2="60" y2="50" strokeOpacity="0.6" />
			<line x1="42" y1="56" x2="64" y2="56" strokeOpacity="0.6" />
			<rect
				x="87"
				y="30"
				width="38"
				height="45"
				rx="2"
				className="fill-muted"
			/>
			<rect x="87" y="30" width="38" height="45" rx="2" />
			<text
				x="106"
				y="38"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				artifacts
			</text>
			<circle cx="106" cy="50" r="7" strokeDasharray="2 2" />
			<text
				x="106"
				y="52"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				tmp
			</text>
			<line x1="94" y1="66" x2="118" y2="66" strokeOpacity="0.6" />
			<path d="M80 75 L80 105" strokeDasharray="2 2" />
			<g transform="translate(80, 98)">
				<circle cx="0" cy="0" r="7" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="7" />
				<path d="M-3 0 L-1 2 L4 -3" />
			</g>
			<text
				x="92"
				y="100"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				success?
			</text>
			<path d="M80 134 L120 118 L80 102 L40 118 Z" className="fill-muted" />
			<path d="M40 118 L40 128 L80 144 L120 128 L120 118" />
			<text
				x="80"
				y="126"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				.memofs/
			</text>
			<text
				x="80"
				y="131"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				durable
			</text>
		</svg>
	);
}

export function BehaviorEnforcementDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Agent Behavior Enforcement</title>
			<line x1="20" y1="80" x2="140" y2="80" strokeOpacity="0.4" />
			<text
				x="80"
				y="92"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				agent loop
			</text>
			<path d="M32 30 L48 30 L40 50 Z" className="fill-muted" />
			<path d="M32 30 L48 30 L40 50 Z" />
			<text
				x="40"
				y="26"
				textAnchor="middle"
				fontSize="3.2"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				SessionStart
			</text>
			<line x1="40" y1="50" x2="40" y2="76" strokeDasharray="2 2" />
			<circle cx="40" cy="80" r="4" fill="currentColor" />
			<g transform="translate(80, 80)">
				<circle
					cx="0"
					cy="0"
					r="14"
					strokeDasharray="2 2"
					strokeOpacity="0.5"
				/>
				<circle cx="0" cy="0" r="5" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="5" />
				<line x1="0" y1="-28" x2="0" y2="-14" strokeDasharray="2 2" />
				<rect
					x="-18"
					y="-42"
					width="36"
					height="14"
					rx="2"
					className="fill-muted"
				/>
				<rect x="-18" y="-42" width="36" height="14" rx="2" />
				<text
					x="0"
					y="-33"
					textAnchor="middle"
					fontSize="3.5"
					className="fill-foreground"
					style={{ fontFamily: "var(--font-mono)" }}
				>
					PreCompact
				</text>
			</g>
			<rect
				x="108"
				y="38"
				width="30"
				height="20"
				rx="2"
				className="fill-muted"
			/>
			<rect x="108" y="38" width="30" height="20" rx="2" />
			<text
				x="123"
				y="46"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				Stop
			</text>
			<path d="M114 52 L117 55 L124 49" />
			<line x1="123" y1="58" x2="123" y2="76" strokeDasharray="2 2" />
			<circle cx="123" cy="80" r="4" fill="currentColor" />
			<path
				d="M20 115 L80 135 L140 115"
				strokeDasharray="3 3"
				strokeOpacity="0.3"
			/>
			<text
				x="80"
				y="128"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				9 hooks • 0 omission
			</text>
		</svg>
	);
}

export function CognitiveDecayDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Cognitive Decay & Cold Archive</title>
			<path d="M80 40 L120 25 L80 10 L40 25 Z" className="fill-muted" />
			<path d="M40 25 L40 31 L80 46 L120 31 L120 25" />
			<text
				x="80"
				y="28"
				textAnchor="middle"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				active
			</text>
			<text
				x="80"
				y="33"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				7–30d
			</text>
			<path d="M80 46 L80 62" strokeDasharray="2 2" />
			<text
				x="88"
				y="55"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				decay →
			</text>
			<path
				d="M80 75 L115 62 L80 49 L45 62 Z"
				className="fill-card"
				strokeDasharray="3 3"
			/>
			<path d="M45 62 L45 68 L80 81 L115 68 L115 62" strokeDasharray="3 3" />
			<text
				x="80"
				y="68"
				textAnchor="middle"
				fontSize="4"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				unverified
			</text>
			<path d="M80 81 L80 97" strokeDasharray="2 2" />
			<path d="M80 120 L120 104 L80 88 L40 104 Z" className="fill-muted" />
			<path d="M40 104 L40 126 L80 142 L120 126 L120 104" />
			<path d="M80 120 L80 142" />
			<text
				x="80"
				y="115"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				cold
			</text>
			<text
				x="80"
				y="120"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				archive
			</text>
			<circle cx="80" cy="104" r="3" fill="currentColor" />
			<path d="M78 104 L78 100 A 2 2 0 0 1 82 100 L82 104" />
		</svg>
	);
}
