interface DiagramProps {
	className?: string;
}

export function EphemeralStreamDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Ephemeral Stream & Agent Pub/Sub</title>
			<rect
				x="25"
				y="72"
				width="110"
				height="16"
				rx="8"
				className="fill-muted"
			/>
			<rect x="25" y="72" width="110" height="16" rx="8" />
			<text
				x="80"
				y="76"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				stream • TTL
			</text>
			<line
				x1="35"
				y1="82"
				x2="125"
				y2="82"
				strokeDasharray="4 4"
				strokeOpacity="0.6"
			/>
			<rect
				x="25"
				y="24"
				width="32"
				height="22"
				rx="3"
				className="fill-muted"
			/>
			<rect x="25" y="24" width="32" height="22" rx="3" />
			<text
				x="41"
				y="32"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				Agent A
			</text>
			<text
				x="41"
				y="37"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				pub
			</text>
			<circle cx="41" cy="40" r="1" fill="currentColor" />
			<line x1="41" y1="46" x2="41" y2="72" strokeDasharray="2 2" />
			<polygon points="39,68 41,72 43,68" fill="currentColor" />
			<rect
				x="103"
				y="24"
				width="32"
				height="22"
				rx="3"
				className="fill-muted"
			/>
			<rect x="103" y="24" width="32" height="22" rx="3" />
			<text
				x="119"
				y="32"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				Agent B
			</text>
			<text
				x="119"
				y="37"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				sub
			</text>
			<line x1="119" y1="72" x2="119" y2="46" strokeDasharray="2 2" />
			<polygon points="117,50 119,46 121,50" fill="currentColor" />
			<rect
				x="64"
				y="114"
				width="32"
				height="22"
				rx="3"
				className="fill-muted"
			/>
			<rect x="64" y="114" width="32" height="22" rx="3" />
			<text
				x="80"
				y="122"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				Human
			</text>
			<text
				x="80"
				y="127"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				steer
			</text>
			<line x1="80" y1="114" x2="80" y2="88" strokeDasharray="2 2" />
			<polygon points="78,92 80,88 82,92" fill="currentColor" />
			<g transform="translate(80, 82)">
				<circle cx="0" cy="0" r="5" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="5" />
				<path d="M0 -3 L0 0 L2 1" />
			</g>
			<text
				x="92"
				y="84"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				60s
			</text>
		</svg>
	);
}

export function ProceduralPlaybookDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Procedural Memory & Playbooks</title>
			<path
				d="M40 22 L105 22 L120 37 L120 138 L40 138 Z"
				className="fill-muted"
			/>
			<path d="M40 22 L105 22 L120 37 L120 138 L40 138 Z" />
			<path d="M105 22 L105 37 L120 37" />
			<text
				x="80"
				y="32"
				textAnchor="middle"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				playbook.md
			</text>
			<text
				x="80"
				y="37"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				when: task=refactor
			</text>
			<circle cx="56" cy="62" r="3" fill="currentColor" />
			<text
				x="72"
				y="64"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				step 1: analyze
			</text>
			<line x1="56" y1="65" x2="56" y2="83" strokeDasharray="2 2" />
			<circle cx="56" cy="86" r="3" fill="currentColor" />
			<text
				x="72"
				y="88"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				step 2: patch
			</text>
			<line x1="56" y1="89" x2="56" y2="107" strokeDasharray="2 2" />
			<circle cx="56" cy="110" r="3" fill="currentColor" />
			<text
				x="72"
				y="112"
				fontSize="4"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				validate
			</text>
			<g transform="translate(104, 110)">
				<rect
					x="-6"
					y="-5"
					width="12"
					height="10"
					rx="1"
					className="fill-card dark:fill-muted"
				/>
				<rect x="-6" y="-5" width="12" height="10" rx="1" />
				<path d="M-2 0 L0 2 L3 -2" />
			</g>
		</svg>
	);
}

export function MemoryLinterDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Static Memory Linter</title>
			<path d="M32 50 L68 34 L104 50 L68 66 Z" className="fill-muted" />
			<path d="M32 50 L32 56 L68 72 L104 56 L104 50" />
			<text
				x="68"
				y="52"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				memories
			</text>
			<path d="M56 70 L92 54 L128 70 L92 86 Z" className="fill-muted" />
			<path d="M56 70 L56 76 L92 92 L128 76 L128 70" />
			<line
				x1="20"
				y1="38"
				x2="140"
				y2="98"
				strokeDasharray="3 3"
				strokeOpacity="0.8"
			/>
			<text
				x="80"
				y="34"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				npx memofs lint
			</text>
			<circle cx="80" cy="68" r="16" strokeDasharray="2 2" />
			<g transform="translate(42, 118)">
				<polygon
					points="0,-10 10,8 -10,8"
					className="fill-card dark:fill-muted"
				/>
				<polygon points="0,-10 10,8 -10,8" />
				<line x1="0" y1="-4" x2="0" y2="1" />
				<circle cx="0" cy="5" r="1" fill="currentColor" />
			</g>
			<text
				x="42"
				y="133"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				contradict
			</text>
			<g transform="translate(118, 118)">
				<circle cx="0" cy="0" r="9" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="9" />
				<line x1="-4" y1="-4" x2="4" y2="4" />
				<line x1="4" y1="-4" x2="-4" y2="4" />
			</g>
			<text
				x="118"
				y="133"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				orphan
			</text>
			<g transform="translate(80, 126)">
				<circle cx="0" cy="0" r="8" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="8" />
				<path d="M-3 0 L-1 2 L4 -3" />
			</g>
			<text
				x="80"
				y="141"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				pass ✓
			</text>
		</svg>
	);
}

export function MemoryStudioDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Visual Memory Studio</title>
			<rect
				x="20"
				y="24"
				width="120"
				height="112"
				rx="4"
				className="fill-muted"
			/>
			<rect x="20" y="24" width="120" height="112" rx="4" />
			<line x1="20" y1="40" x2="140" y2="40" />
			<circle cx="28" cy="32" r="2" fill="currentColor" />
			<circle cx="35" cy="32" r="2" fill="currentColor" />
			<circle cx="42" cy="32" r="2" fill="currentColor" />
			<text
				x="90"
				y="34"
				textAnchor="middle"
				fontSize="4"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				localhost:8787
			</text>
			<rect
				x="26"
				y="46"
				width="30"
				height="82"
				rx="2"
				className="fill-card dark:fill-muted"
			/>
			<rect x="26" y="46" width="30" height="82" rx="2" />
			<text
				x="41"
				y="54"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				recall
			</text>
			<text
				x="41"
				y="60"
				fontSize="2.8"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				BM25 0.6
			</text>
			<line x1="31" y1="62" x2="51" y2="62" />
			<circle cx="42" cy="62" r="1.5" fill="currentColor" />
			<text
				x="41"
				y="76"
				fontSize="2.8"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				vec 0.4
			</text>
			<line x1="31" y1="80" x2="51" y2="80" />
			<circle cx="45" cy="80" r="1.5" fill="currentColor" />
			<rect
				x="60"
				y="46"
				width="42"
				height="82"
				rx="2"
				className="fill-card dark:fill-muted"
			/>
			<rect x="60" y="46" width="42" height="82" rx="2" />
			<text
				x="81"
				y="54"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				graph
			</text>
			<circle cx="72" cy="66" r="3" fill="currentColor" />
			<circle cx="90" cy="74" r="3" fill="currentColor" />
			<circle cx="78" cy="104" r="3" fill="currentColor" />
			<line x1="72" y1="66" x2="90" y2="74" strokeDasharray="2 2" />
			<line x1="72" y1="66" x2="78" y2="104" strokeDasharray="2 2" />
			<line x1="90" y1="74" x2="78" y2="104" strokeDasharray="2 2" />
			<rect
				x="106"
				y="46"
				width="28"
				height="82"
				rx="2"
				className="fill-card dark:fill-muted"
			/>
			<rect x="106" y="46" width="28" height="82" rx="2" />
			<text
				x="120"
				y="54"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				diff
			</text>
			<line x1="110" y1="60" x2="130" y2="60" strokeOpacity="0.5" />
			<line x1="110" y1="68" x2="128" y2="68" strokeOpacity="0.5" />
			<text
				x="120"
				y="76"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				-3 +5
			</text>
			<path d="M114 96 L118 100 L126 92" />
		</svg>
	);
}

export function MultiLanguageSdkDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Multi-Language SDKs</title>
			<path d="M80 38 L104 26 L80 14 L56 26 Z" className="fill-muted" />
			<path d="M56 26 L56 42 L80 54 L104 42 L104 26" />
			<path d="M80 38 L80 54" />
			<text
				x="80"
				y="32"
				textAnchor="middle"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				spec
			</text>
			<text
				x="80"
				y="37"
				textAnchor="middle"
				fontSize="2.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				openapi
			</text>
			<line x1="64" y1="46" x2="38" y2="82" strokeDasharray="3 3" />
			<line x1="80" y1="54" x2="80" y2="82" strokeDasharray="3 3" />
			<line x1="96" y1="46" x2="122" y2="82" strokeDasharray="3 3" />
			<rect
				x="22"
				y="82"
				width="32"
				height="36"
				rx="3"
				className="fill-muted"
			/>
			<rect x="22" y="82" width="32" height="36" rx="3" />
			<text
				x="38"
				y="95"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				py
			</text>
			<text
				x="38"
				y="100"
				textAnchor="middle"
				fontSize="2.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				pip
			</text>
			<circle cx="38" cy="108" r="2" fill="currentColor" />
			<rect
				x="64"
				y="82"
				width="32"
				height="36"
				rx="3"
				className="fill-muted"
			/>
			<rect x="64" y="82" width="32" height="36" rx="3" />
			<text
				x="80"
				y="95"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				rs
			</text>
			<text
				x="80"
				y="100"
				textAnchor="middle"
				fontSize="2.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				cargo
			</text>
			<circle cx="80" cy="108" r="2" fill="currentColor" />
			<rect
				x="106"
				y="82"
				width="32"
				height="36"
				rx="3"
				className="fill-muted"
			/>
			<rect x="106" y="82" width="32" height="36" rx="3" />
			<text
				x="122"
				y="95"
				textAnchor="middle"
				fontSize="4.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				go
			</text>
			<text
				x="122"
				y="100"
				textAnchor="middle"
				fontSize="2.5"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				mod
			</text>
			<circle cx="122" cy="108" r="2" fill="currentColor" />
			<line
				x1="18"
				y1="134"
				x2="142"
				y2="134"
				strokeDasharray="2 2"
				strokeOpacity="0.5"
			/>
			<text
				x="80"
				y="130"
				textAnchor="middle"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				conformance suite
			</text>
			<circle cx="38" cy="134" r="2" fill="currentColor" />
			<circle cx="80" cy="134" r="2" fill="currentColor" />
			<circle cx="122" cy="134" r="2" fill="currentColor" />
		</svg>
	);
}

export function ActionReceiptsDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Immutable Action Receipts</title>
			<rect
				x="38"
				y="20"
				width="84"
				height="28"
				rx="3"
				className="fill-muted"
			/>
			<rect x="38" y="20" width="84" height="28" rx="3" />
			<text
				x="70"
				y="32"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				tool: write
			</text>
			<text
				x="70"
				y="38"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				digest: 4fa…
			</text>
			<circle cx="48" cy="34" r="3" fill="currentColor" />
			<line x1="80" y1="48" x2="80" y2="60" strokeDasharray="2 2" />
			<circle cx="80" cy="54" r="3" />
			<text
				x="88"
				y="55"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				hash→
			</text>
			<rect
				x="38"
				y="60"
				width="84"
				height="28"
				rx="3"
				className="fill-muted"
			/>
			<rect x="38" y="60" width="84" height="28" rx="3" />
			<text
				x="70"
				y="72"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				snapshot: a1→b2
			</text>
			<text
				x="70"
				y="78"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				reversible
			</text>
			<circle cx="48" cy="74" r="3" fill="currentColor" />
			<line x1="80" y1="88" x2="80" y2="100" strokeDasharray="2 2" />
			<circle cx="80" cy="94" r="3" />
			<rect
				x="38"
				y="100"
				width="84"
				height="28"
				rx="3"
				className="fill-muted"
			/>
			<rect x="38" y="100" width="84" height="28" rx="3" />
			<text
				x="70"
				y="112"
				fontSize="3.5"
				className="fill-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				tool: edit
			</text>
			<text
				x="70"
				y="118"
				fontSize="3"
				className="fill-muted-foreground"
				style={{ fontFamily: "var(--font-mono)" }}
			>
				before/after
			</text>
			<circle cx="48" cy="114" r="3" fill="currentColor" />
			<g transform="translate(112, 114)">
				<circle cx="0" cy="0" r="5" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="5" />
				<path d="M-2 0 L0 2 L3 -2" />
			</g>
		</svg>
	);
}
