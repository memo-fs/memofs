import { Badge } from "~/components/ui/badge";

/** The role badge — color-coded so owner/admin/member read at a glance. */
export function RoleBadge({ role }: { role: "owner" | "admin" | "member" }) {
	if (role === "owner") {
		return (
			<Badge className="h-5 px-1.5 py-0 text-[10px] leading-none bg-primary text-primary-foreground hover:bg-primary">
				Owner
			</Badge>
		);
	}
	if (role === "admin") {
		return (
			<Badge className="h-5 px-1.5 py-0 text-[10px] leading-none border-primary/30 bg-primary/5 text-primary">
				Admin
			</Badge>
		);
	}
	return (
		<Badge
			variant="outline"
			className="h-5 px-1.5 py-0 text-[10px] leading-none"
		>
			Member
		</Badge>
	);
}
