import { useEffect, useRef, useState } from "react";
import { SITE } from "../../lib/site";

interface PageActionsProps {
	markdownUrl: string;
	githubUrl: string;
	className?: string;
}

export function LLMCopyButton({
	markdownUrl,
	className = "",
}: {
	markdownUrl: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);
	const [loading, setLoading] = useState(false);

	async function handleCopy() {
		if (loading) return;
		setLoading(true);

		try {
			const res = await fetch(markdownUrl, {
				headers: { Accept: "text/markdown" },
			});
			if (!res.ok) throw new Error(`Failed: ${res.statusText}`);
			const text = await res.text();
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy markdown:", err);
		} finally {
			setLoading(false);
		}
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			disabled={loading}
			className={`inline-flex items-center gap-2 rounded-md border border-zinc-300/80 bg-zinc-100/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:bg-zinc-200/80 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer ${className}`}
		>
			{copied ? (
				<>
					<svg
						className="size-3.5 text-emerald-600 dark:text-emerald-400"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<polyline points="20 6 9 17 4 12" />
					</svg>
					<span className="text-emerald-700 dark:text-emerald-300 font-semibold">
						Copied Markdown
					</span>
				</>
			) : loading ? (
				<>
					<svg
						className="size-3.5 animate-spin text-zinc-500"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<circle
							cx="12"
							cy="12"
							r="10"
							strokeDasharray="32"
							strokeLinecap="round"
						/>
					</svg>
					<span>Fetching...</span>
				</>
			) : (
				<>
					<svg
						className="size-3.5 text-zinc-500 dark:text-zinc-400"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
					</svg>
					<span>Copy Markdown</span>
				</>
			)}
		</button>
	);
}

export function ViewOptions({
	markdownUrl,
	githubUrl,
	className = "",
}: {
	markdownUrl: string;
	githubUrl: string;
	className?: string;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Absolute URL for external AI services
	const fullMarkdownUrl =
		typeof window !== "undefined"
			? new URL(markdownUrl, window.location.origin).href
			: `${SITE.docsUrl}${markdownUrl}`;

	const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(
		`Read the documentation at ${fullMarkdownUrl} and help me understand it.`,
	)}`;

	const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(
		`Read the documentation at ${fullMarkdownUrl} and help me understand it.`,
	)}`;

	const cursorUrl = `cursor://anysphere.cursor-always-local/open-url?url=${encodeURIComponent(
		fullMarkdownUrl,
	)}`;

	const menuItems = [
		{
			label: "Open in GitHub",
			href: githubUrl,
			icon: (
				<svg
					className="size-4 shrink-0"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						clipRule="evenodd"
						d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
					/>
				</svg>
			),
		},
		{
			label: "View as Markdown",
			href: markdownUrl,
			icon: (
				<svg
					className="size-4 shrink-0"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<line x1="4" y1="7" x2="20" y2="7" />
					<line x1="4" y1="12" x2="16" y2="12" />
					<line x1="4" y1="17" x2="11" y2="17" />
				</svg>
			),
		},
		{
			label: "Open in ChatGPT",
			href: chatGptUrl,
			icon: (
				<svg
					className="size-4 shrink-0"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
				</svg>
			),
		},
		{
			label: "Open in Claude",
			href: claudeUrl,
			icon: (
				<svg
					className="size-4 shrink-0"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
				</svg>
			),
		},
		{
			label: "Open in Cursor",
			href: cursorUrl,
			icon: (
				<svg
					className="size-4 shrink-0"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
				</svg>
			),
		},
	];

	return (
		<div ref={dropdownRef} className={`relative inline-block ${className}`}>
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300/80 bg-zinc-100/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition-all hover:bg-zinc-200/80 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
				aria-expanded={isOpen}
				aria-haspopup="true"
				aria-label="Open page in..."
			>
				<span>Open</span>
				<svg
					className={`size-3.5 text-zinc-500 dark:text-zinc-400 transition-transform ${
						isOpen ? "rotate-180" : ""
					}`}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</button>

			{isOpen && (
				<div className="absolute left-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md z-50 dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-2xl">
					<div className="flex flex-col gap-0.5">
						{menuItems.map((item) => (
							<a
								key={item.label}
								href={item.href}
								target="_blank"
								rel="noopener noreferrer"
								onClick={() => setIsOpen(false)}
								className="group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
							>
								<div className="flex items-center gap-2.5">
									<span className="text-zinc-500 transition-colors group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-white">
										{item.icon}
									</span>
									<span>{item.label}</span>
								</div>
								<svg
									className="size-3.5 text-zinc-400 opacity-60 transition-opacity group-hover:opacity-100 dark:text-zinc-500"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
									<polyline points="15 3 21 3 21 9" />
									<line x1="10" y1="14" x2="21" y2="3" />
								</svg>
							</a>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export function PageActions({
	markdownUrl,
	githubUrl,
	className = "",
}: PageActionsProps) {
	return (
		<div className={`flex flex-row items-center gap-2 ${className}`}>
			<LLMCopyButton markdownUrl={markdownUrl} />
			<ViewOptions markdownUrl={markdownUrl} githubUrl={githubUrl} />
		</div>
	);
}
