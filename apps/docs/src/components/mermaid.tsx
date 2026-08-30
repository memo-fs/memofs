import { useTheme } from "fumadocs-ui/provider/base";
import { use, useEffect, useId, useState } from "react";

export function Mermaid({ chart }: { chart: string }) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;
	return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(
	key: string,
	setPromise: () => Promise<T>,
): Promise<T> {
	const cached = cache.get(key);
	if (cached) return cached as Promise<T>;

	const promise = setPromise();
	cache.set(key, promise);
	return promise;
}

interface MermaidAPI {
	initialize: (config: Record<string, unknown>) => void;
	render: (
		id: string,
		text: string,
	) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
}

async function loadMermaid(): Promise<MermaidAPI> {
	if (
		typeof window !== "undefined" &&
		(window as unknown as { mermaid?: MermaidAPI }).mermaid
	) {
		return (window as unknown as { mermaid: MermaidAPI }).mermaid;
	}
	const dynamicImport = new Function("url", "return import(url)");
	const module = (await dynamicImport(
		"https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs",
	)) as { default?: MermaidAPI } & MermaidAPI;
	return module.default || module;
}

function MermaidContent({ chart }: { chart: string }) {
	const id = `mermaid_${useId().replace(/:/g, "_")}`;
	const { resolvedTheme } = useTheme();
	const mermaid = use(cachePromise("mermaid_engine", loadMermaid));

	mermaid.initialize({
		startOnLoad: false,
		securityLevel: "loose",
		fontFamily: "var(--font-sans, inherit)",
		themeCSS: "margin: 1.5rem auto 0; text-align: center;",
		theme: resolvedTheme === "dark" ? "dark" : "default",
	});

	const { svg, bindFunctions } = use(
		cachePromise<{ svg: string; bindFunctions?: (element: Element) => void }>(
			`${chart}-${resolvedTheme}`,
			() => {
				return mermaid.render(id, chart.replaceAll("\\n", "\n"));
			},
		),
	);

	return (
		<div
			className="my-6 overflow-x-auto flex justify-center [&_svg]:max-w-full"
			ref={(container) => {
				if (container) bindFunctions?.(container);
			}}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: mermaid renders SVG markup
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
