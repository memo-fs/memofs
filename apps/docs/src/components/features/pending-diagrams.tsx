interface DiagramProps {
	className?: string;
}

/**
 * 07. Ephemeral Stream & Agent Pub/Sub Diagram
 * Append-only real-time stream bus routing transient hints between agents with TTL cleanup.
 */
export function EphemeralStreamDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Ephemeral Stream & Agent Pub/Sub</title>
			{/* Central Stream Conduit Pipe */}
			<rect
				x="25"
				y="72"
				width="110"
				height="16"
				rx="8"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="25" y="72" width="110" height="16" rx="8" />
			<line
				x1="35"
				y1="80"
				x2="125"
				y2="80"
				strokeDasharray="4 4"
				strokeOpacity="0.6"
			/>

			{/* Agent A Node (Publisher, Top Left) */}
			<rect
				x="25"
				y="24"
				width="32"
				height="22"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="25" y="24" width="32" height="22" rx="3" />
			<circle cx="41" cy="35" r="3" fill="currentColor" />
			<line x1="41" y1="46" x2="41" y2="72" strokeDasharray="2 2" />
			<polygon points="39,68 41,72 43,68" fill="currentColor" />

			{/* Agent B Node (Subscriber, Top Right) */}
			<rect
				x="103"
				y="24"
				width="32"
				height="22"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="103" y="24" width="32" height="22" rx="3" />
			<circle cx="119" cy="35" r="3" fill="currentColor" />
			<line x1="119" y1="72" x2="119" y2="46" strokeDasharray="2 2" />
			<polygon points="117,50 119,46 121,50" fill="currentColor" />

			{/* Human / Supervisor Steering Node (Bottom Center) */}
			<rect
				x="64"
				y="114"
				width="32"
				height="22"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="64" y="114" width="32" height="22" rx="3" />
			<circle cx="80" cy="125" r="3" fill="currentColor" />
			<line x1="80" y1="114" x2="80" y2="88" strokeDasharray="2 2" />
			<polygon points="78,92 80,88 82,92" fill="currentColor" />

			{/* Stream TTL Clock Badge */}
			<g transform="translate(80, 80)">
				<circle cx="0" cy="0" r="5" className="fill-white dark:fill-zinc-900" />
				<circle cx="0" cy="0" r="5" />
				<path d="M0 -3 L0 0 L2 1" />
			</g>
		</svg>
	);
}

/**
 * 08. Procedural Memory & Playbooks Diagram
 * Structured playbook recipe card with validated sequential execution steps.
 */
export function ProceduralPlaybookDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Procedural Memory & Playbooks</title>
			{/* Playbook Document Card Container */}
			<path
				d="M40 22 L105 22 L120 37 L120 138 L40 138 Z"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<path d="M40 22 L105 22 L120 37 L120 138 L40 138 Z" />
			<path d="M105 22 L105 37 L120 37" />

			{/* YAML Frontmatter Header Strip */}
			<line x1="52" y1="36" x2="90" y2="36" strokeOpacity="0.8" />
			<line x1="52" y1="44" x2="108" y2="44" strokeOpacity="0.4" />

			{/* Step 1: Action Entry */}
			<circle cx="56" cy="62" r="3" fill="currentColor" />
			<line x1="66" y1="62" x2="108" y2="62" strokeOpacity="0.8" />
			<line x1="56" y1="65" x2="56" y2="83" strokeDasharray="2 2" />

			{/* Step 2: Arg Binding */}
			<circle cx="56" cy="86" r="3" fill="currentColor" />
			<line x1="66" y1="86" x2="100" y2="86" strokeOpacity="0.8" />
			<line x1="56" y1="89" x2="56" y2="107" strokeDasharray="2 2" />

			{/* Step 3: Validator Gate Slug */}
			<circle cx="56" cy="110" r="3" fill="currentColor" />
			<line x1="66" y1="110" x2="95" y2="110" strokeOpacity="0.8" />

			{/* Success Signal Flag */}
			<g transform="translate(104, 110)">
				<rect
					x="-6"
					y="-5"
					width="12"
					height="10"
					rx="1"
					className="fill-white dark:fill-zinc-900"
				/>
				<rect x="-6" y="-5" width="12" height="10" rx="1" />
				<path d="M-2 0 L0 2 L3 -2" />
			</g>
		</svg>
	);
}

/**
 * 09. Static Memory Linter Diagram
 * Static analysis engine scanning memory files for contradiction, broken references, and orphans.
 */
export function MemoryLinterDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Static Memory Linter</title>
			{/* Memory Files Under Inspection */}
			<path
				d="M32 50 L68 34 L104 50 L68 66 Z"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<path d="M32 50 L32 56 L68 72 L104 56 L104 50" />

			<path
				d="M56 70 L92 54 L128 70 L92 86 Z"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<path d="M56 70 L56 76 L92 92 L128 76 L128 70" />

			{/* Diagonal Static Analysis Scan Beam */}
			<line
				x1="20"
				y1="38"
				x2="140"
				y2="98"
				strokeDasharray="3 3"
				strokeOpacity="0.8"
			/>
			<circle cx="80" cy="68" r="16" strokeDasharray="2 2" />

			{/* Problem Indicator 1: Contradiction Warning (Left) */}
			<g transform="translate(42, 118)">
				<polygon
					points="0,-10 10,8 -10,8"
					className="fill-white dark:fill-zinc-900"
				/>
				<polygon points="0,-10 10,8 -10,8" />
				<line x1="0" y1="-4" x2="0" y2="1" />
				<circle cx="0" cy="5" r="1" fill="currentColor" />
			</g>

			{/* Problem Indicator 2: Broken Reference (Right) */}
			<g transform="translate(118, 118)">
				<circle cx="0" cy="0" r="9" className="fill-white dark:fill-zinc-900" />
				<circle cx="0" cy="0" r="9" />
				<line x1="-4" y1="-4" x2="4" y2="4" />
				<line x1="4" y1="-4" x2="-4" y2="4" />
			</g>

			{/* Clean Verification Pass (Center) */}
			<g transform="translate(80, 126)">
				<circle cx="0" cy="0" r="8" className="fill-white dark:fill-zinc-900" />
				<circle cx="0" cy="0" r="8" />
				<path d="M-3 0 L-1 2 L4 -3" />
			</g>
		</svg>
	);
}

/**
 * 10. Visual Memory Studio Diagram
 * Webview debugger featuring Recall Simulator, Knowledge Graph canvas, and Snapshot Diff panels.
 */
export function MemoryStudioDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Visual Memory Studio</title>
			{/* Browser Frame Window */}
			<rect
				x="20"
				y="24"
				width="120"
				height="112"
				rx="4"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="20" y="24" width="120" height="112" rx="4" />

			{/* Window Title Bar */}
			<line x1="20" y1="40" x2="140" y2="40" />
			<circle cx="28" cy="32" r="2" fill="currentColor" />
			<circle cx="35" cy="32" r="2" fill="currentColor" />
			<circle cx="42" cy="32" r="2" fill="currentColor" />

			{/* Panel 1: Recall Simulator Sliders (Left) */}
			<rect
				x="26"
				y="46"
				width="30"
				height="82"
				rx="2"
				className="fill-white dark:fill-zinc-900"
			/>
			<rect x="26" y="46" width="30" height="82" rx="2" />
			<line x1="31" y1="60" x2="51" y2="60" />
			<circle cx="42" cy="60" r="2" fill="currentColor" />
			<line x1="31" y1="80" x2="51" y2="80" />
			<circle cx="37" cy="80" r="2" fill="currentColor" />
			<line x1="31" y1="100" x2="51" y2="100" />
			<circle cx="47" cy="100" r="2" fill="currentColor" />

			{/* Panel 2: Interactive Graph Canvas (Center) */}
			<rect
				x="60"
				y="46"
				width="42"
				height="82"
				rx="2"
				className="fill-white dark:fill-zinc-900"
			/>
			<rect x="60" y="46" width="42" height="82" rx="2" />
			<circle cx="72" cy="66" r="3" fill="currentColor" />
			<circle cx="90" cy="74" r="3" fill="currentColor" />
			<circle cx="78" cy="104" r="3" fill="currentColor" />
			<line x1="72" y1="66" x2="90" y2="74" strokeDasharray="2 2" />
			<line x1="72" y1="66" x2="78" y2="104" strokeDasharray="2 2" />
			<line x1="90" y1="74" x2="78" y2="104" strokeDasharray="2 2" />

			{/* Panel 3: Snapshot Diff / Rollback (Right) */}
			<rect
				x="106"
				y="46"
				width="28"
				height="82"
				rx="2"
				className="fill-white dark:fill-zinc-900"
			/>
			<rect x="106" y="46" width="28" height="82" rx="2" />
			<line x1="110" y1="58" x2="130" y2="58" strokeOpacity="0.5" />
			<line x1="110" y1="68" x2="128" y2="68" strokeOpacity="0.5" />
			<line x1="110" y1="78" x2="125" y2="78" strokeOpacity="0.5" />
			<path d="M114 96 L118 100 L126 92" />
		</svg>
	);
}

/**
 * 11. Multi-Language SDKs & Conformance Diagram
 * Core spec schema broadcasting typed bindings to Python, Rust, and Go SDKs.
 */
export function MultiLanguageSdkDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Multi-Language SDKs</title>
			{/* Central Spec Schema Core Hub */}
			<path
				d="M80 38 L104 26 L80 14 L56 26 Z"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<path d="M56 26 L56 42 L80 54 L104 42 L104 26" />
			<path d="M80 38 L80 54" />
			<circle cx="80" cy="26" r="2" fill="currentColor" />

			{/* Tri-Branch Distribution Channels */}
			<line x1="64" y1="46" x2="38" y2="82" strokeDasharray="3 3" />
			<line x1="80" y1="54" x2="80" y2="82" strokeDasharray="3 3" />
			<line x1="96" y1="46" x2="122" y2="82" strokeDasharray="3 3" />

			{/* Python SDK Node (Left) */}
			<rect
				x="22"
				y="82"
				width="32"
				height="36"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="22" y="82" width="32" height="36" rx="3" />
			<line x1="28" y1="92" x2="48" y2="92" strokeOpacity="0.6" />
			<line x1="28" y1="98" x2="44" y2="98" strokeOpacity="0.6" />
			<circle cx="38" cy="108" r="2" fill="currentColor" />

			{/* Rust SDK Node (Middle) */}
			<rect
				x="64"
				y="82"
				width="32"
				height="36"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="64" y="82" width="32" height="36" rx="3" />
			<line x1="70" y1="92" x2="90" y2="92" strokeOpacity="0.6" />
			<line x1="70" y1="98" x2="86" y2="98" strokeOpacity="0.6" />
			<circle cx="80" cy="108" r="2" fill="currentColor" />

			{/* Go SDK Node (Right) */}
			<rect
				x="106"
				y="82"
				width="32"
				height="36"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="106" y="82" width="32" height="36" rx="3" />
			<line x1="112" y1="92" x2="132" y2="92" strokeOpacity="0.6" />
			<line x1="112" y1="98" x2="128" y2="98" strokeOpacity="0.6" />
			<circle cx="122" cy="108" r="2" fill="currentColor" />

			{/* Conformance Verification Test Baseline */}
			<line
				x1="18"
				y1="134"
				x2="142"
				y2="134"
				strokeDasharray="2 2"
				strokeOpacity="0.5"
			/>
			<circle cx="38" cy="134" r="2" fill="currentColor" />
			<circle cx="80" cy="134" r="2" fill="currentColor" />
			<circle cx="122" cy="134" r="2" fill="currentColor" />
		</svg>
	);
}

/**
 * 12. Immutable Action Receipts Diagram
 * Cryptographic event receipt chain recording tool executions, reversibility, and snapshot hashes.
 */
export function ActionReceiptsDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Immutable Action Receipts</title>
			{/* Receipt Block 1 (Top) */}
			<rect
				x="38"
				y="20"
				width="84"
				height="28"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="38" y="20" width="84" height="28" rx="3" />
			<circle cx="48" cy="34" r="3" fill="currentColor" />
			<line x1="58" y1="30" x2="108" y2="30" strokeOpacity="0.7" />
			<line x1="58" y1="38" x2="94" y2="38" strokeOpacity="0.4" />

			{/* Immutable Chain Link 1 */}
			<line x1="80" y1="48" x2="80" y2="60" strokeDasharray="2 2" />
			<circle cx="80" cy="54" r="3" />

			{/* Receipt Block 2 (Middle) */}
			<rect
				x="38"
				y="60"
				width="84"
				height="28"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="38" y="60" width="84" height="28" rx="3" />
			<circle cx="48" cy="74" r="3" fill="currentColor" />
			<line x1="58" y1="70" x2="112" y2="70" strokeOpacity="0.7" />
			<line x1="58" y1="78" x2="88" y2="78" strokeOpacity="0.4" />

			{/* Immutable Chain Link 2 */}
			<line x1="80" y1="88" x2="80" y2="100" strokeDasharray="2 2" />
			<circle cx="80" cy="94" r="3" />

			{/* Receipt Block 3 (Bottom) */}
			<rect
				x="38"
				y="100"
				width="84"
				height="28"
				rx="3"
				className="fill-zinc-100 dark:fill-[#09090b]"
			/>
			<rect x="38" y="100" width="84" height="28" rx="3" />
			<circle cx="48" cy="114" r="3" fill="currentColor" />
			<line x1="58" y1="110" x2="104" y2="110" strokeOpacity="0.7" />
			<line x1="58" y1="118" x2="98" y2="118" strokeOpacity="0.4" />

			{/* Forensic Verification Check */}
			<g transform="translate(112, 114)">
				<circle cx="0" cy="0" r="5" className="fill-white dark:fill-zinc-900" />
				<circle cx="0" cy="0" r="5" />
				<path d="M-2 0 L0 2 L3 -2" />
			</g>
		</svg>
	);
}
