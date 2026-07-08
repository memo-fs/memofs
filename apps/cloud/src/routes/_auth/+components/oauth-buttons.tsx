import type { OAuthProviderId } from "~/.server/oauth-providers";
import { GithubMark, GoogleMark } from "~/components/site/brand-icons";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

/**
 * Shared OAuth provider buttons + "or" divider (SC4.1, A2). Both login and
 * signup render the same provider options; extraction keeps them in lock-step.
 *
 * `providers` is the server-derived enabled set (creds both present). A provider
 * appears iff `createAuth` will accept it, so there's never a dead button. When
 * none are configured the whole block (buttons + divider) is omitted — magic
 * link alone is a valid v1 surface. Each button is a plain `<a>` to
 * `/oauth/start/<provider>?callbackURL=…`; that loader issues the real 302 to
 * the provider authorize URL (no client JS / fetcher needed).
 *
 * @param providers  enabled provider ids, in render order.
 * @param callbackURL where to land after OAuth completes (dashboard by default).
 */
export function OAuthButtons({
	providers,
	callbackURL,
}: {
	providers: OAuthProviderId[];
	callbackURL: string;
}) {
	if (providers.length === 0) return null;

	const href = (provider: OAuthProviderId) =>
		`/oauth/start/${provider}?callbackURL=${encodeURIComponent(callbackURL)}`;

	return (
		<>
			<div className="space-y-2 mb-4">
				{providers.includes("github") ? (
					<Button asChild variant="outline" className="w-full">
						<a href={href("github")}>
							<GithubMark size={16} className="mr-2" /> Continue with GitHub
						</a>
					</Button>
				) : null}
				{providers.includes("google") ? (
					<Button asChild variant="outline" className="w-full">
						<a href={href("google")}>
							<GoogleMark size={16} className="mr-2" /> Continue with Google
						</a>
					</Button>
				) : null}
			</div>
			<div className="flex items-center gap-3 my-4">
				<Separator className="flex-1" />
				<span className="text-xs text-muted-foreground">OR</span>
				<Separator className="flex-1" />
			</div>
		</>
	);
}
