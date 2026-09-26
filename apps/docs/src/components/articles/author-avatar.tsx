import { cn } from "../../lib/utils";

interface AuthorAvatarProps {
	name: string;
	avatarUrl?: string;
	initials?: string;
	className?: string;
}

/**
 * Author avatar with a text fallback chain: photo → initials →
 * name-derived initials. Shared by article cards and the article byline so
 * the fallback order stays identical everywhere.
 */
export function AuthorAvatar({
	name,
	avatarUrl,
	initials,
	className,
}: AuthorAvatarProps) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center overflow-hidden border bg-secondary font-mono font-semibold",
				className,
			)}
		>
			{avatarUrl ? (
				<img
					src={avatarUrl}
					alt={name}
					loading="lazy"
					className="size-full object-cover"
				/>
			) : (
				(initials ?? name.slice(0, 2).toUpperCase())
			)}
		</div>
	);
}
