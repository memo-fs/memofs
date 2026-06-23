import { GithubMark, GoogleMark } from "~/components/site/brand-icons";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

/**
 * Shared OAuth provider buttons + "or" divider (SC4.1). Both login and signup
 * render the same GitHub/Google options; extraction keeps them in lock-step.
 */
export function OAuthButtons({ onSelect }: { onSelect: () => void }) {
	return (
		<>
			<div className="space-y-2 mb-4">
				<Button variant="outline" className="w-full" onClick={onSelect}>
					<GithubMark size={16} className="mr-2" /> Continue with GitHub
				</Button>
				<Button variant="outline" className="w-full" onClick={onSelect}>
					<GoogleMark size={16} className="mr-2" /> Continue with Google
				</Button>
			</div>
			<div className="flex items-center gap-3 my-4">
				<Separator className="flex-1" />
				<span className="text-xs text-muted-foreground">or</span>
				<Separator className="flex-1" />
			</div>
		</>
	);
}
