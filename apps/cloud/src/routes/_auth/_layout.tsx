import { Link, Outlet } from "react-router";
import { Logo } from "~/components/site/logo";

export default function AuthLayout() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-muted/5 px-4 py-12">
			<Link to="/" className="flex items-center gap-2 mb-8">
				<Logo />
			</Link>
			<div className="w-full max-w-sm">
				<Outlet />
			</div>
			<div className="mt-8 flex gap-4">
				<Link
					to="/privacy"
					className="text-xs text-muted-foreground hover:text-foreground"
				>
					Privacy
				</Link>
				<Link
					to="/terms"
					className="text-xs text-muted-foreground hover:text-foreground"
				>
					Terms
				</Link>
			</div>
		</div>
	);
}
