import { Check, Copy, Quote } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

interface ManifestoBibtexProps {
	bibtex: string;
	className?: string;
}

export function ManifestoBibtex({ bibtex, className }: ManifestoBibtexProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(bibtex);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback
		}
	};

	return (
		<div
			id="citation"
			className={`border border-border/80 bg-card/60 p-6 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)] sm:p-8 ${className || ""}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-3 border-border/40 border-b pb-4">
				<div className="flex items-center gap-2">
					<Quote className="size-4 text-primary" />
					<h3 className="font-bold font-mono text-foreground text-sm uppercase tracking-wider">
						Cite this Architecture Reference
					</h3>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={handleCopy}
					className="h-8 gap-1.5 font-mono text-xs"
				>
					{copied ? (
						<>
							<Check className="size-3.5 text-emerald-400" />
							<span>Copied BibTeX</span>
						</>
					) : (
						<>
							<Copy className="size-3.5" />
							<span>Copy BibTeX</span>
						</>
					)}
				</Button>
			</div>

			{/* Monospace Code Block */}
			<div className="mt-4 overflow-x-auto border border-border/60 bg-black/40 p-4 font-mono text-muted-foreground text-xs leading-relaxed">
				<pre className="whitespace-pre-wrap text-foreground/90">{bibtex}</pre>
			</div>
		</div>
	);
}
