import {
	AlertTriangle,
	Check,
	Eye,
	EyeOff,
	Loader2,
	ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { MOCK_USER, userInitials } from "~/utils/mock-data";

const SESSIONS = [
	{
		id: "s1",
		device: "Chrome on macOS",
		ip: "192.168.1.42",
		lastSeen: "Just now",
		current: true,
	},
	{
		id: "s2",
		device: "Firefox on Linux",
		ip: "10.0.0.5",
		lastSeen: "2 days ago",
		current: false,
	},
];

export function meta() {
	return [{ title: "Settings — TekMemo Cloud" }];
}

export default function SettingsPage() {
	const user = MOCK_USER;
	const navigate = useNavigate();

	const [name, setName] = useState(user.name);
	const [email, setEmail] = useState(user.email);
	const [nameSaved, setNameSaved] = useState(false);

	const [currentPass, setCurrentPass] = useState("");
	const [newPass, setNewPass] = useState("");
	const [showPass, setShowPass] = useState(false);
	const [passSaved, setPassSaved] = useState(false);
	const [passLoading, setPassLoading] = useState(false);

	const [twoFAEnabled, setTwoFAEnabled] = useState(false);

	const [showDelete, setShowDelete] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState("");
	const [deleteLoading, setDeleteLoading] = useState(false);

	const initials = userInitials(user.name);

	const saveProfile = async () => {
		await new Promise((r) => setTimeout(r, 400));
		setNameSaved(true);
		setTimeout(() => setNameSaved(false), 2000);
	};

	const savePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!currentPass || !newPass) return;
		setPassLoading(true);
		await new Promise((r) => setTimeout(r, 800));
		setPassLoading(false);
		setPassSaved(true);
		setCurrentPass("");
		setNewPass("");
		setTimeout(() => setPassSaved(false), 3000);
	};

	const deleteAccount = async () => {
		if (deleteConfirm !== user.email) return;
		setDeleteLoading(true);
		await new Promise((r) => setTimeout(r, 1200));
		navigate("/");
	};

	return (
		<div className="p-6">
			<h2 className="text-xl font-bold tracking-tight mb-6">Settings</h2>

			{/* Profile */}
			<section className="mb-8 space-y-4">
				<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
					Profile
				</h3>
				<Card>
					<CardContent className="p-5 space-y-4">
						<div className="flex items-center gap-4">
							<Avatar className="w-12 h-12">
								<AvatarFallback className="text-sm bg-primary/20 text-primary">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div>
								<p className="font-semibold text-xs text-foreground">
									{user.name}
								</p>
								<p className="text-[11px] text-muted-foreground">
									{user.email}
								</p>
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="name" className="text-xs">
									Name
								</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="text-xs h-9"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="email" className="text-xs">
									Email
								</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="text-xs h-9"
								/>
							</div>
						</div>
						<Button
							onClick={saveProfile}
							variant="outline"
							size="sm"
							className="text-xs h-9"
						>
							{nameSaved ? (
								<>
									<Check className="w-3.5 h-3.5 mr-1.5" /> Saved
								</>
							) : (
								"Save changes"
							)}
						</Button>
					</CardContent>
				</Card>
			</section>

			<Separator className="my-8" />

			{/* Security */}
			<section className="mb-8 space-y-6">
				<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
					Security
				</h3>

				{/* Change password */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-xs font-semibold">
							Change password
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={savePassword} className="space-y-3 max-w-sm">
							{passSaved && (
								<div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary flex items-center gap-1.5">
									<Check className="w-3.5 h-3.5" /> Password updated
									successfully.
								</div>
							)}
							<div className="space-y-1.5">
								<Label htmlFor="current-pass" className="text-xs">
									Current password
								</Label>
								<div className="relative">
									<Input
										id="current-pass"
										type={showPass ? "text" : "password"}
										placeholder="••••••••"
										value={currentPass}
										onChange={(e) => setCurrentPass(e.target.value)}
										className="pr-10 text-xs h-9"
									/>
									<button
										type="button"
										className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
										onClick={() => setShowPass((v) => !v)}
									>
										{showPass ? (
											<EyeOff className="w-4 h-4" />
										) : (
											<Eye className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="new-pass" className="text-xs">
									New password
								</Label>
								<Input
									id="new-pass"
									type="password"
									placeholder="Min. 8 characters"
									value={newPass}
									onChange={(e) => setNewPass(e.target.value)}
									className="text-xs h-9"
								/>
							</div>
							<Button
								type="submit"
								size="sm"
								className="text-xs h-9"
								disabled={passLoading || !currentPass || !newPass}
							>
								{passLoading && (
									<Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
								)}
								{passLoading ? "Saving…" : "Update password"}
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Active sessions */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-xs font-semibold">
							Active sessions
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0 border-t border-border/40 divide-y divide-border/40">
						{SESSIONS.map((s) => (
							<div
								key={s.id}
								className="flex items-center justify-between px-5 py-3 text-xs"
							>
								<div>
									<div className="flex items-center gap-2">
										<p className="font-semibold text-foreground">{s.device}</p>
										{s.current && (
											<Badge className="text-[9px] py-0 px-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
												Current
											</Badge>
										)}
									</div>
									<p className="text-[10px] text-muted-foreground mt-0.5">
										{s.ip} · {s.lastSeen}
									</p>
								</div>
								{!s.current && (
									<Button
										size="sm"
										variant="ghost"
										className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/5"
									>
										Revoke
									</Button>
								)}
							</div>
						))}
					</CardContent>
				</Card>

				{/* 2FA */}
				<Card>
					<CardContent className="p-5 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-foreground">
								Two-factor authentication
							</p>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								{twoFAEnabled
									? "2FA is enabled."
									: "Not yet enabled. Recommended for accounts with API keys."}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<Badge variant="secondary" className="text-[9px] py-0 px-1">
								Pending capability check
							</Badge>
							<Switch
								checked={twoFAEnabled}
								onCheckedChange={setTwoFAEnabled}
								disabled
								title="2FA requires Better Auth capability check to complete"
							/>
						</div>
					</CardContent>
				</Card>
			</section>

			<Separator className="my-8" />

			{/* Danger zone */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<ShieldAlert className="w-4 h-4 text-destructive" />
					<h3 className="text-sm font-semibold text-destructive uppercase tracking-wider">
						Danger zone
					</h3>
				</div>
				<Card className="border-destructive/30 bg-destructive/5">
					<CardContent className="p-5">
						<p className="text-xs font-semibold text-destructive mb-1">
							Delete account
						</p>
						<p className="text-[11px] text-muted-foreground mb-4 leading-normal">
							Permanently deletes your account, all synced blobs (R2), and all
							database records. This cannot be undone.
						</p>
						<Button
							variant="destructive"
							size="sm"
							className="text-xs h-9"
							onClick={() => setShowDelete(true)}
						>
							Delete my account
						</Button>
					</CardContent>
				</Card>
			</section>

			{/* Delete confirmation dialog */}
			<Dialog open={showDelete} onOpenChange={setShowDelete}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">
							Delete your account?
						</DialogTitle>
						<DialogDescription className="text-xs">
							This purges all your R2 blobs and database records within 24
							hours. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="rounded-lg border border-destructive/20 bg-destructive/5 flex items-start gap-2 px-3 py-2">
							<AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
							<p className="text-[10px] text-destructive leading-normal">
								All projects, files, connector configs, and API keys will be
								permanently deleted.
							</p>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="delete-confirm" className="text-xs">
								Type your email <strong>{user.email}</strong> to confirm:
							</Label>
							<Input
								id="delete-confirm"
								placeholder={user.email}
								value={deleteConfirm}
								onChange={(e) => setDeleteConfirm(e.target.value)}
								className="text-xs h-9"
							/>
						</div>
					</div>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="outline"
							size="sm"
							className="text-xs h-9"
							onClick={() => {
								setShowDelete(false);
								setDeleteConfirm("");
							}}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							size="sm"
							className="text-xs h-9"
							disabled={deleteConfirm !== user.email || deleteLoading}
							onClick={deleteAccount}
						>
							{deleteLoading && (
								<Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
							)}
							{deleteLoading ? "Deleting…" : "Delete my account"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
