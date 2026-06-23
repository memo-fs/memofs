import {
	ChevronDown,
	CreditCard,
	FolderOpen,
	Key,
	LayoutDashboard,
	LogOut,
	Plug,
	Plus,
	Settings,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { Logo } from "~/components/site/logo";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import {
	MOCK_PROJECTS,
	MOCK_USER,
	type Project,
	userInitials,
} from "~/utils/mock-data";

const NAV_ITEMS = [
	{ to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
	{
		to: "/dashboard/projects",
		label: "Projects",
		icon: FolderOpen,
		end: false,
	},
	{ to: "/dashboard/connectors", label: "Connectors", icon: Plug, end: false },
	{ to: "/dashboard/api-keys", label: "API Keys", icon: Key, end: false },
	{ to: "/dashboard/billing", label: "Billing", icon: CreditCard, end: false },
	{ to: "/dashboard/settings", label: "Settings", icon: Settings, end: false },
] as const;

/**
 * Dashboard sidebar — logo, global project switcher (SC3), nav, account menu.
 * Extracted from the layout so each piece stays readable and the layout shell
 * stays a thin wrapper.
 */
export function DashboardSidebar({
	selectedProject,
	onSelectProject,
}: {
	selectedProject: Project;
	onSelectProject: (project: Project) => void;
}) {
	const navigate = useNavigate();
	const user = MOCK_USER;
	const initials = userInitials(user.name);

	return (
		<aside className="flex h-full w-56 shrink-0 flex-col border-r bg-card">
			<div className="flex h-14 shrink-0 items-center border-b px-4">
				<Link to="/" className="flex items-center gap-2">
					<Logo />
				</Link>
			</div>

			<ProjectSwitcher selected={selectedProject} onSelect={onSelectProject} />

			<nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
				{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
					<NavLink
						key={to}
						to={to}
						end={end}
						className={({ isActive }) =>
							cn(
								"flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
								{
									"bg-primary/10 font-medium text-primary": isActive,
									"text-muted-foreground hover:bg-muted/50 hover:text-foreground":
										!isActive,
								},
							)
						}
					>
						<Icon className="h-4 w-4 shrink-0" />
						{label}
					</NavLink>
				))}
			</nav>

			<AccountMenu
				user={user}
				initials={initials}
				onLogout={() => navigate("/")}
			/>
		</aside>
	);
}

function ProjectSwitcher({
	selected,
	onSelect,
}: {
	selected: Project;
	onSelect: (project: Project) => void;
}) {
	return (
		<div className="border-b px-3 py-3">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-border/40 px-2 py-1.5 text-sm transition-colors hover:bg-muted"
					>
						<div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary/10">
							<FolderOpen className="h-3 w-3 text-primary" />
						</div>
						<span className="flex-1 truncate text-left font-medium">
							{selected.name}
						</span>
						<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-52">
					{MOCK_PROJECTS.map((p) => (
						<DropdownMenuItem
							key={p.id}
							onClick={() => onSelect(p)}
							className={selected.id === p.id ? "bg-muted" : ""}
						>
							<FolderOpen className="mr-2 h-3.5 w-3.5" />
							{p.name}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<Plus className="mr-2 h-3.5 w-3.5" />
						New project
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function AccountMenu({
	user,
	initials,
	onLogout,
}: {
	user: { name: string; email: string };
	initials: string;
	onLogout: () => void;
}) {
	return (
		<div className="mt-auto border-t px-3 py-3">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
					>
						<Avatar className="h-6 w-6">
							<AvatarFallback className="bg-primary/20 text-xs text-primary">
								{initials}
							</AvatarFallback>
						</Avatar>
						<span className="flex-1 truncate text-left">{user.name}</span>
						<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" side="top" className="w-52">
					<div className="px-2 py-1.5">
						<p className="text-sm font-medium">{user.name}</p>
						<p className="text-xs text-muted-foreground">{user.email}</p>
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuItem asChild>
						<Link to="/dashboard/settings" className="flex w-full items-center">
							<Settings className="mr-2 h-3.5 w-3.5" /> Settings
						</Link>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={onLogout}
						className="text-destructive focus:text-destructive"
					>
						<LogOut className="mr-2 h-3.5 w-3.5" /> Log out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
