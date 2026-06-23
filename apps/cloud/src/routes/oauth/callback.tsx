import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "~/components/ui/card";

export function meta() {
	return [{ title: "Completing Sign-in — TekMemo Cloud" }];
}

export default function OAuthCallbackPage() {
	const navigate = useNavigate();

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate("/dashboard", { replace: true });
		}, 1200);
		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-muted/5 p-4">
			<Card className="max-w-xs w-full text-center">
				<CardContent className="pt-8 pb-8">
					<Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
					<p className="text-sm font-medium">Completing sign-in…</p>
					<p className="text-xs text-muted-foreground mt-1">
						Hang tight, this takes just a moment.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
