import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			url: "/",
			transparentMode: "top",
			title: (
				<span className="flex items-center gap-2.5 font-semibold tracking-tight">
					<img
						src="/logo.svg"
						alt="MemoFS"
						className="size-6 shrink-0"
						width={24}
						height={24}
					/>
					<span className="font-bold text-[0.95rem]">MemoFS</span>
				</span>
			),
		},
		links: [
			{
				text: "Docs",
				url: "/docs",
				active: "url",
				on: "all",
			},
			{
				text: "Cookbooks",
				url: "/cookbooks",
				active: "nested-url",
				on: "all",
			},
			{
				text: "Changelog",
				url: "/changelog",
				active: "nested-url",
				on: "all",
			},
			{
				text: "Articles",
				url: "https://memofs.dev/articles",
				external: true,
				on: "all",
			},
			{
				text: "Cloud",
				url: "https://memofs.dev",
				external: true,
				on: "all",
			},
			{
				type: "icon",
				url: "https://x.com/memofsdev",
				label: "X (formerly Twitter)",
				text: "X",
				external: true,
				icon: (
					<svg
						className="size-4"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
					</svg>
				),
			},
		],
		githubUrl: "https://github.com/memo-fs/memofs",
	};
}
