import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

interface ArticleShareProps {
	title: string;
	url: string;
	className?: string;
}

export function ArticleShare({ title, url, className }: ArticleShareProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// fallback
		}
	};

	const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
		title,
	)}&url=${encodeURIComponent(url)}&via=memofsdev`;

	const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
		url,
	)}`;

	return (
		<div className={className}>
			<div className="flex flex-wrap items-center gap-2">
				<span className="mr-1 flex items-center gap-1.5 font-mono text-muted-foreground text-xs uppercase tracking-wider">
					<Share2 className="size-3.5" />
					Share
				</span>

				<Button
					variant="outline"
					size="sm"
					onClick={handleCopy}
					className="h-8 border-border bg-card/60 px-3 font-mono text-xs hover:border-primary/40"
					title="Copy article link"
				>
					{copied ? (
						<>
							<Check className="mr-1.5 size-3.5 text-emerald-400" />
							Copied
						</>
					) : (
						<>
							<Copy className="mr-1.5 size-3.5" />
							Copy Link
						</>
					)}
				</Button>

				<a
					href={twitterShareUrl}
					target="_blank"
					rel="noreferrer"
					className="inline-flex h-8 items-center justify-center border border-border bg-card/60 px-3 font-mono text-muted-foreground text-xs transition-colors hover:border-primary/40 hover:text-foreground"
					title="Share on X (Twitter)"
				>
					<svg
						className="mr-1.5 size-3.5"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
					</svg>
					Post
				</a>

				<a
					href={linkedinShareUrl}
					target="_blank"
					rel="noreferrer"
					className="inline-flex h-8 items-center justify-center border border-border bg-card/60 px-3 font-mono text-muted-foreground text-xs transition-colors hover:border-primary/40 hover:text-foreground"
					title="Share on LinkedIn"
				>
					<svg
						className="mr-1.5 size-3.5"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.95 0-1.72.78-1.72 1.73s.77 1.73 1.72 1.73 1.73-.78 1.73-1.73-.78-1.73-1.73-1.73" />
					</svg>
					LinkedIn
				</a>
			</div>
		</div>
	);
}
