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
			<line
				x1="52"
				y1="76"
				x2="72"
				y2="76"
				strokeOpacity="0.4"
			/>
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
			<line x1="31" y1="32" x2="51" y2="32" strokeOpacity="0.8" />
			<line x1="35" y1="37" x2="47" y2="37" strokeOpacity="0.4" />
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
			<line x1="109" y1="32" x2="129" y2="32" strokeOpacity="0.8" />
			<line x1="113" y1="37" x2="125" y2="37" strokeOpacity="0.4" />
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
			<line x1="70" y1="122" x2="90" y2="122" strokeOpacity="0.8" />
			<line x1="74" y1="127" x2="86" y2="127" strokeOpacity="0.4" />
			<line x1="80" y1="114" x2="80" y2="88" strokeDasharray="2 2" />
			<polygon points="78,92 80,88 82,92" fill="currentColor" />
			<g transform="translate(80, 82)">
				<circle cx="0" cy="0" r="5" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="5" />
				<path d="M0 -3 L0 0 L2 1" />
			</g>
			<line
				x1="90"
				y1="82"
				x2="98"
				y2="82"
				strokeOpacity="0.5"
			/>
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
			<line x1="56" y1="31" x2="92" y2="31" strokeOpacity="0.8" />
			<line x1="62" y1="37" x2="86" y2="37" strokeOpacity="0.4" />
			<circle cx="56" cy="62" r="3" fill="currentColor" />
			<line x1="72" y1="62" x2="108" y2="62" strokeOpacity="0.7" />
			<line x1="56" y1="65" x2="56" y2="83" strokeDasharray="2 2" />
			<circle cx="56" cy="86" r="3" fill="currentColor" />
			<line x1="72" y1="86" x2="104" y2="86" strokeOpacity="0.7" />
			<line x1="56" y1="89" x2="56" y2="107" strokeDasharray="2 2" />
			<circle cx="56" cy="110" r="3" fill="currentColor" />
			<line x1="72" y1="110" x2="94" y2="110" strokeOpacity="0.7" />
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
			<line x1="58" y1="50" x2="78" y2="50" strokeOpacity="0.7" />
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
			<line
				x1="62"
				y1="34"
				x2="98"
				y2="34"
				strokeDasharray="3 3"
				strokeOpacity="0.6"
			/>
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
			<line x1="32" y1="133" x2="52" y2="133" strokeOpacity="0.5" />
			<g transform="translate(118, 118)">
				<circle cx="0" cy="0" r="9" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="9" />
				<line x1="-4" y1="-4" x2="4" y2="4" />
				<line x1="4" y1="-4" x2="-4" y2="4" />
			</g>
			<line x1="108" y1="133" x2="128" y2="133" strokeOpacity="0.5" />
			<g transform="translate(80, 126)">
				<circle cx="0" cy="0" r="8" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="8" />
				<path d="M-3 0 L-1 2 L4 -3" />
			</g>
			<line x1="72" y1="141" x2="88" y2="141" strokeOpacity="0.6" />
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
			<rect
				x="65"
				y="30"
				width="50"
				height="5"
				rx="2.5"
				strokeOpacity="0.4"
			/>
			<rect
				x="26"
				y="46"
				width="30"
				height="82"
				rx="2"
				className="fill-card dark:fill-muted"
			/>
			<rect x="26" y="46" width="30" height="82" rx="2" />
			<line x1="32" y1="54" x2="50" y2="54" strokeOpacity="0.7" />
			<line x1="32" y1="59" x2="44" y2="59" strokeOpacity="0.5" />
			<line x1="31" y1="62" x2="51" y2="62" />
			<circle cx="42" cy="62" r="1.5" fill="currentColor" />
			<line x1="32" y1="75" x2="42" y2="75" strokeOpacity="0.5" />
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
			<line x1="71" y1="54" x2="91" y2="54" strokeOpacity="0.7" />
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
			<line x1="114" y1="54" x2="126" y2="54" strokeOpacity="0.7" />
			<line x1="110" y1="60" x2="130" y2="60" strokeOpacity="0.5" />
			<line x1="110" y1="68" x2="128" y2="68" strokeOpacity="0.5" />
			<line x1="112" y1="76" x2="122" y2="76" strokeOpacity="0.5" />
			<line x1="124" y1="76" x2="128" y2="76" strokeOpacity="0.5" />
			<path d="M114 96 L118 100 L126 92" />
		</svg>
	);
}

export function VendorMemoryImportDiagram({ className }: DiagramProps) {
	return (
		<svg
			viewBox="0 0 160 160"
			className={className}
			fill="none"
			strokeWidth="1.2"
		>
			<title>Vendor Memory Import</title>
			<rect x="12" y="22" width="36" height="22" rx="3" className="fill-muted" />
			<rect x="12" y="22" width="36" height="22" rx="3" />
			<line x1="20" y1="31" x2="40" y2="31" strokeOpacity="0.7" />
			<line x1="23" y1="36" x2="37" y2="36" strokeOpacity="0.4" />
			<rect x="62" y="22" width="36" height="22" rx="3" className="fill-muted" />
			<rect x="62" y="22" width="36" height="22" rx="3" />
			<line x1="70" y1="31" x2="90" y2="31" strokeOpacity="0.7" />
			<line x1="73" y1="36" x2="87" y2="36" strokeOpacity="0.4" />
			<rect x="112" y="22" width="36" height="22" rx="3" className="fill-muted" />
			<rect x="112" y="22" width="36" height="22" rx="3" />
			<line x1="120" y1="31" x2="140" y2="31" strokeOpacity="0.7" />
			<line x1="123" y1="36" x2="137" y2="36" strokeOpacity="0.4" />
			<line x1="30" y1="44" x2="80" y2="64" strokeDasharray="2 2" />
			<line x1="80" y1="44" x2="80" y2="64" strokeDasharray="2 2" />
			<line x1="130" y1="44" x2="80" y2="64" strokeDasharray="2 2" />
			<rect x="48" y="64" width="64" height="26" rx="3" className="fill-muted" />
			<rect x="48" y="64" width="64" height="26" rx="3" />
			<line x1="60" y1="73" x2="100" y2="73" strokeOpacity="0.8" />
			<line x1="66" y1="79" x2="94" y2="79" strokeOpacity="0.5" strokeDasharray="3 2" />
			<line x1="70" y1="84" x2="90" y2="84" strokeOpacity="0.4" />
			<line x1="80" y1="90" x2="80" y2="104" strokeDasharray="2 2" />
			<polygon points="78,100 80,104 82,100" fill="currentColor" />
			<rect x="32" y="104" width="96" height="36" rx="4" className="fill-muted" />
			<rect x="32" y="104" width="96" height="36" rx="4" />
			<line x1="64" y1="113" x2="96" y2="113" strokeOpacity="0.8" />
			<line x1="56" y1="119" x2="104" y2="119" strokeOpacity="0.4" />
			<line x1="60" y1="125" x2="100" y2="125" strokeOpacity="0.4" strokeDasharray="3 2" />
			<circle cx="48" cy="122" r="2" fill="currentColor" />
			<circle cx="80" cy="132" r="2" fill="currentColor" />
			<circle cx="112" cy="122" r="2" fill="currentColor" />
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
			<line x1="72" y1="32" x2="88" y2="32" strokeOpacity="0.8" />
			<line x1="74" y1="37" x2="86" y2="37" strokeOpacity="0.4" />
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
			<line x1="30" y1="94" x2="46" y2="94" strokeOpacity="0.8" />
			<line x1="33" y1="99" x2="43" y2="99" strokeOpacity="0.4" />
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
			<line x1="72" y1="94" x2="88" y2="94" strokeOpacity="0.8" />
			<line x1="75" y1="99" x2="85" y2="99" strokeOpacity="0.4" />
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
			<line x1="114" y1="94" x2="130" y2="94" strokeOpacity="0.8" />
			<line x1="117" y1="99" x2="127" y2="99" strokeOpacity="0.4" />
			<circle cx="122" cy="108" r="2" fill="currentColor" />
			<line
				x1="18"
				y1="134"
				x2="142"
				y2="134"
				strokeDasharray="2 2"
				strokeOpacity="0.5"
			/>
			<line x1="62" y1="130" x2="98" y2="130" strokeOpacity="0.6" strokeDasharray="4 2" />
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
			<line x1="64" y1="31" x2="108" y2="31" strokeOpacity="0.8" />
			<line x1="64" y1="37" x2="98" y2="37" strokeOpacity="0.4" strokeDasharray="3 2" />
			<circle cx="48" cy="34" r="3" fill="currentColor" />
			<line x1="80" y1="48" x2="80" y2="60" strokeDasharray="2 2" />
			<circle cx="80" cy="54" r="3" />
			<line x1="88" y1="54" x2="100" y2="54" strokeOpacity="0.5" strokeDasharray="2 2" />
			<rect
				x="38"
				y="60"
				width="84"
				height="28"
				rx="3"
				className="fill-muted"
			/>
			<rect x="38" y="60" width="84" height="28" rx="3" />
			<line x1="64" y1="71" x2="110" y2="71" strokeOpacity="0.8" />
			<line x1="64" y1="77" x2="94" y2="77" strokeOpacity="0.4" />
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
			<line x1="64" y1="111" x2="102" y2="111" strokeOpacity="0.8" />
			<line x1="64" y1="117" x2="92" y2="117" strokeOpacity="0.4" />
			<circle cx="48" cy="114" r="3" fill="currentColor" />
			<g transform="translate(112, 114)">
				<circle cx="0" cy="0" r="5" className="fill-card dark:fill-muted" />
				<circle cx="0" cy="0" r="5" />
				<path d="M-2 0 L0 2 L3 -2" />
			</g>
		</svg>
	);
}
