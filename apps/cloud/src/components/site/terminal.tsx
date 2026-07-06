import { Check, Copy } from "lucide-react";
import * as React from "react";
import { useCopyToClipboard } from "~/hooks/use-copy-to-clipboard";
import { useInView } from "~/hooks/use-in-view";
import { usePrefersReducedMotion } from "~/hooks/use-prefers-reduced-motion";
import { useTerminalTyping } from "~/hooks/use-terminal-typing";
import { cn } from "~/lib/utils";

type Command = { cmd: string; note?: string };

/**
 * Terminal window — the styled premium shell for code/CLI demos (Signal aesthetic).
 *
 * A faux macOS window chrome (three dots + title bar) over a deep-black pane with
 * a hairline gradient border and a subtle inner grid. Used by the hero + the
 * "how sync works" section to present the three-command protocol. Each command row
 * is independently copyable via `useCopyToClipboard`.
 */

function Dot({ className }: { className?: string }) {
	return (
		<span aria-hidden className={cn("size-2.5 rounded-full", className)} />
	);
}

export function TerminalWindow({
	title = "memofs — zsh",
	commands,
	className,
	animated = false,
}: {
	title?: string;
	commands: Command[];
	className?: string;
	/** Play a typing/streaming sequence on scroll-into-view (reduced-motion safe). */
	animated?: boolean;
}) {
	return (
		<div
			className={cn(
				"relative overflow-hidden border border-border bg-[oklch(0.13_0.008_264)]",
				className,
			)}
		>
			{/* Gradient hairline top border. */}
			<div
				aria-hidden
				className="absolute inset-x-0 top-0 h-px"
				style={{
					background:
						"linear-gradient(to right, transparent, oklch(0.62 0.17 248 / 0.7), oklch(0.58 0.19 295 / 0.5), transparent)",
				}}
			/>
			{/* Title bar */}
			<div className="flex items-center gap-2 border-b border-border bg-white/2 px-4 py-3">
				<div className="flex items-center gap-1.5">
					<Dot className="bg-[oklch(0.7_0.18_25/0.7)]" />
					<Dot className="bg-[oklch(0.78_0.14_85/0.6)]" />
					<Dot className="bg-[oklch(0.7_0.15_145/0.6)]" />
				</div>
				<span className="ml-2 font-mono text-xs text-muted-foreground">
					{title}
				</span>
			</div>
			{/* Command rows */}
			{animated ? (
				<AnimatedCommandRows commands={commands} />
			) : (
				<div className="divide-y divide-border/50">
					{commands.map((item, i) => (
						<CommandRow key={item.cmd} index={i} {...item} />
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Blinking block caret — sits after the typed text on the active command row.
 */
function Caret() {
	return (
		<span
			aria-hidden
			className="ml-0.5 inline-block h-[1.05em] w-[0.5ch] translate-y-[0.15em] bg-primary/80 animate-caret-blink"
		/>
	);
}

/**
 * AnimatedCommandRows — drives the terminal "live": each command types in,
 * pauses as if running, then streams its output note, before the next row
 * appears. Only starts once scrolled into view; honors `prefers-reduced-motion`
 * by rendering the final, fully-typed state immediately.
 */
function AnimatedCommandRows({ commands }: { commands: Command[] }) {
	const reduced = usePrefersReducedMotion();
	const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 });
	const lengths = React.useMemo(
		() => commands.map((c) => c.cmd.length),
		[commands],
	);
	const state = useTerminalTyping(lengths, inView && !reduced);

	const visibleCount = reduced ? commands.length : state.row + 1;

	return (
		<div ref={ref} className="divide-y divide-border/50">
			{commands.map((item, i) => {
				if (i >= visibleCount) return null;
				const typed = i < state.row ? item.cmd : item.cmd.slice(0, state.char);
				const noteVisible =
					reduced ||
					i < state.row ||
					state.phase === "note" ||
					state.phase === "done";
				return (
					<CommandRow
						key={item.cmd}
						index={i}
						cmd={item.cmd}
						note={item.note}
						display={reduced ? undefined : typed}
						caret={!reduced && i === state.row}
						noteVisible={noteVisible}
						className={
							!reduced && i === state.row
								? "animate-in fade-in slide-in-from-left-1 duration-300"
								: undefined
						}
					/>
				);
			})}
		</div>
	);
}

function CommandRow({
	index,
	cmd,
	note,
	display,
	caret = false,
	noteVisible = true,
	className,
}: {
	index: number;
	cmd: string;
	note?: string;
	/** Overrides the rendered command text (the partially-typed string). */
	display?: string;
	caret?: boolean;
	noteVisible?: boolean;
	className?: string;
}) {
	const { copy, copied } = useCopyToClipboard();
	const text = display ?? cmd;
	return (
		<div
			className={cn(
				"group/cmd flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/2",
				className,
			)}
		>
			<span className="font-mono text-xs text-primary/70 select-none">
				{String(index + 1).padStart(2, "0")}
			</span>
			<span aria-hidden className="font-mono text-sm text-muted-foreground">
				$
			</span>
			<code className="flex-1 font-mono text-sm text-foreground">
				{text}
				{caret ? <Caret /> : null}
			</code>
			{note && noteVisible ? (
				<span className="hidden text-xs text-muted-foreground sm:inline animate-in fade-in duration-300">
					{note}
				</span>
			) : null}
			<button
				type="button"
				onClick={() => copy(cmd)}
				aria-label={`Copy ${cmd}`}
				className={cn(
					"flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
					copied && "border-primary/40 text-primary",
				)}
			>
				{copied ? (
					<Check className="size-3.5" />
				) : (
					<Copy className="size-3.5 opacity-0 transition-opacity group-hover/cmd:opacity-100" />
				)}
			</button>
		</div>
	);
}

/**
 * SectionHeading — the consistent block at the top of every section: mono eyebrow,
 * display heading, supporting lede. Eliminates per-section repetition.
 */
export function SectionHeading({
	eyebrow,
	title,
	lede,
	align = "left",
	className,
}: {
	eyebrow: string;
	title: React.ReactNode;
	lede?: React.ReactNode;
	align?: "left" | "center";
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-4",
				align === "center" && "items-center text-center",
				className,
			)}
		>
			<div className="flex items-center gap-2.5">
				<span
					aria-hidden
					className="size-1.5 rounded-full bg-primary animate-pulse"
				/>
				<span className="font-heading text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
					{eyebrow}
				</span>
			</div>
			<h2
				className={cn(
					"font-heading font-bold tracking-[-0.03em] leading-[1.02] max-w-2xl text-3xl text-foreground sm:text-4xl",
					align === "center" && "mx-auto",
				)}
			>
				{title}
			</h2>
			{lede ? (
				<p
					className={cn(
						"max-w-2xl text-base leading-relaxed text-muted-foreground",
						align === "center" && "mx-auto",
					)}
				>
					{lede}
				</p>
			) : null}
		</div>
	);
}
