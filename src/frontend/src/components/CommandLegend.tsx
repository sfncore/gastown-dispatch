import { useState } from "react";
import { BookOpen, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandEntry {
	natural: string;
	command: string;
	example?: string;
}

interface CommandSection {
	title: string;
	entries: CommandEntry[];
}

const COMMAND_SECTIONS: CommandSection[] = [
	{
		title: "Work Creation & Assignment",
		entries: [
			{
				natural: "Create a task for [rig] to [description]",
				command:
					'bd create --title "[description]" --prefix [prefix] --type task',
				example: "Create a task for versova_clutch to update the README",
			},
			{
				natural: "Create a bug for [rig]: [description]",
				command:
					'bd create --title "[description]" --prefix [prefix] --type bug -p 1',
				example: "Create a bug for northstar_intelligence: API returns 500",
			},
			{
				natural: "Assign [bead] to [rig]",
				command: "gt sling [bead] [rig]",
				example: "Assign vc-6wz to versova_clutch",
			},
			{
				natural: "Sling [bead] to [rig]",
				command: "gt sling [bead] [rig]",
				example: "Sling ni-abc to northstar_intelligence",
			},
			{
				natural: "Have [rig] work on [bead]",
				command: "gt sling [bead] [rig]",
				example: "Have versova_clutch work on vc-xyz",
			},
		],
	},
	{
		title: "Convoy Management",
		entries: [
			{
				natural: "Create a convoy for [description]",
				command: 'gt convoy create "[description]"',
				example: "Create a convoy for the authentication refactor",
			},
			{
				natural: "Create a convoy called [name] with [beads]",
				command: 'gt convoy create "[name]" [bead1] [bead2]',
				example: "Create a convoy called Auth Fix with vc-abc ni-def",
			},
			{
				natural: "Track [beads] in a convoy",
				command: 'gt convoy create "[name]" [beads...]',
				example: "Track vc-1 vc-2 vc-3 in a convoy called Batch Update",
			},
			{
				natural: "Show convoy status",
				command: "gt convoy list",
				example: "How are convoys doing?",
			},
			{
				natural: "Check convoy [id]",
				command: "gt convoy status [id]",
				example: "Check convoy hq-cv-26dxo",
			},
		],
	},
	{
		title: "Bead Queries",
		entries: [
			{
				natural: "Show me [bead]",
				command: "bd show [bead]",
				example: "Show me vc-6wz",
			},
			{
				natural: "What's ready to work on?",
				command: "bd ready",
				example: "What work is available?",
			},
			{
				natural: "What's in progress?",
				command: "bd list --status=in_progress",
				example: "Show work in progress",
			},
			{
				natural: "Close [bead]",
				command: "bd close [bead]",
				example: "Close vc-6wz",
			},
			{
				natural: "Mark [bead] as in progress",
				command: "bd update [bead] --status=in_progress",
				example: "Mark vc-abc as in progress",
			},
		],
	},
	{
		title: "Rig Operations",
		entries: [
			{
				natural: "List all rigs",
				command: "gt rig list",
				example: "What rigs do we have?",
			},
			{
				natural: "Tell me about [rig]",
				command: "gt rig list + inspect",
				example: "Tell me about versova_clutch",
			},
			{
				natural: "Show polecat status for [rig]",
				command: "gt polecat list [rig]",
				example: "Who's working in versova_clutch?",
			},
		],
	},
	{
		title: "Communication",
		entries: [
			{
				natural: "Check my mail",
				command: "gt mail inbox",
				example: "Any messages?",
			},
			{
				natural: "Send mail to [agent] about [topic]",
				command: 'gt mail send [addr] -s "[topic]"',
				example: "Send mail to versova_clutch/witness about stuck polecat",
			},
			{
				natural: "Nudge [agent] with [message]",
				command: 'gt nudge [agent] "[message]"',
				example: "Nudge versova_clutch/furiosa with 'how is the PR going?'",
			},
			{
				natural: "Escalate: [problem]",
				command: 'gt escalate "[problem]"',
				example: "Escalate: Need human decision on API design",
			},
		],
	},
	{
		title: "Session & Health",
		entries: [
			{
				natural: "Check town health",
				command: "gt doctor",
				example: "Run diagnostics",
			},
			{
				natural: "Fix any issues",
				command: "gt doctor --fix",
				example: "Auto-repair problems",
			},
			{
				natural: "What's my role?",
				command: "gt hook",
				example: "Who am I?",
			},
			{
				natural: "Peek at [agent]",
				command: "gt peek [agent]",
				example: "Peek at versova_clutch/furiosa",
			},
			{
				natural: "Stop all workers",
				command: "gt stop --all",
				example: "Emergency stop everything",
			},
		],
	},
];

const PREFIX_LEGEND = [
	{ rig: "versova_clutch", prefix: "vc-" },
	{ rig: "northstar_intelligence", prefix: "ni-" },
	{ rig: "gastown_dispatch", prefix: "gtdispat-" },
	{ rig: "northstar_funding", prefix: "nsfund-" },
	{ rig: "northstar_guidance", prefix: "nsguide-" },
	{ rig: "town-level/HQ", prefix: "hq-" },
];

interface CommandLegendProps {
	onInsertCommand: (text: string) => void;
	onClose?: () => void;
	isOpen?: boolean;
}

export function CommandLegend({
	onInsertCommand,
	onClose,
	isOpen: controlledOpen,
}: CommandLegendProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"commands" | "prefixes">(
		"commands",
	);

	// Support both controlled and uncontrolled modes
	const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
	const handleClose = onClose || (() => setInternalOpen(false));

	const handleCopy = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 1500);
	};

	const handleInsert = (text: string) => {
		onInsertCommand(text);
		handleClose();
	};

	const modalContent = (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
			<div className="bg-gt-bg border border-gt-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-gt-border">
					<div>
						<h2 className="text-lg font-semibold">Mayor Command Legend</h2>
						<p className="text-sm text-gt-muted">
							Click any phrase to send it to Mayor
						</p>
					</div>
					<button
						onClick={handleClose}
						className="p-2 rounded-lg hover:bg-gt-surface transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-gt-border">
					<button
						onClick={() => setActiveTab("commands")}
						className={cn(
							"px-4 py-2 text-sm font-medium transition-colors",
							activeTab === "commands"
								? "border-b-2 border-gt-accent text-gt-accent"
								: "text-gt-muted hover:text-gt-text",
						)}
					>
						Commands
					</button>
					<button
						onClick={() => setActiveTab("prefixes")}
						className={cn(
							"px-4 py-2 text-sm font-medium transition-colors",
							activeTab === "prefixes"
								? "border-b-2 border-gt-accent text-gt-accent"
								: "text-gt-muted hover:text-gt-text",
						)}
					>
						Rig Prefixes
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto p-4">
					{activeTab === "commands" ? (
						<div className="space-y-6">
							{COMMAND_SECTIONS.map((section) => (
								<div key={section.title}>
									<h3 className="text-sm font-semibold text-gt-accent mb-3">
										{section.title}
									</h3>
									<div className="space-y-2">
										{section.entries.map((entry, idx) => {
											const entryId = `${section.title}-${idx}`;
											return (
												<div
													key={entryId}
													className="grid grid-cols-[1fr,1fr,auto] gap-2 p-2 rounded-lg bg-gt-surface hover:bg-gt-border/50 transition-colors group"
												>
													<button
														onClick={() =>
															handleInsert(entry.example || entry.natural)
														}
														className="text-left text-sm hover:text-gt-accent transition-colors"
														title="Click to send"
													>
														{entry.natural}
													</button>
													<button
														onClick={() => handleInsert(entry.command)}
														className="text-left text-sm font-mono text-gt-muted hover:text-gt-accent transition-colors truncate"
														title="Click to send"
													>
														{entry.command}
													</button>
													<button
														onClick={() => handleCopy(entry.command, entryId)}
														className="p-1 rounded hover:bg-gt-border transition-colors opacity-0 group-hover:opacity-100"
														title="Copy command"
													>
														{copiedId === entryId ? (
															<Check size={14} className="text-green-400" />
														) : (
															<Copy size={14} className="text-gt-muted" />
														)}
													</button>
												</div>
											);
										})}
									</div>
								</div>
							))}
						</div>
					) : (
						<div>
							<p className="text-sm text-gt-muted mb-4">
								Use these prefixes when creating beads for specific rigs:
							</p>
							<div className="grid grid-cols-2 gap-2">
								{PREFIX_LEGEND.map((item) => (
									<div
										key={item.prefix}
										className="flex items-center justify-between p-3 rounded-lg bg-gt-surface hover:bg-gt-border/50 transition-colors"
									>
										<span className="text-sm">{item.rig}</span>
										<button
											onClick={() =>
												handleInsert(`--prefix ${item.prefix.replace("-", "")}`)
											}
											className="font-mono text-sm text-gt-accent hover:underline"
										>
											{item.prefix}
										</button>
									</div>
								))}
							</div>
							<div className="mt-6 p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
								<h4 className="text-sm font-semibold text-purple-300 mb-2">
									Quick Reference
								</h4>
								<p className="text-sm text-gt-muted">
									<strong>Town-level beads (hq-*):</strong> Convoys, mail,
									cross-rig coordination
								</p>
								<p className="text-sm text-gt-muted mt-1">
									<strong>Rig-level beads ([prefix]-):</strong> Implementation
									work, bugs, features, tasks
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-3 border-t border-gt-border bg-gt-surface/50">
					<p className="text-xs text-gt-muted text-center">
						Tip: You can use natural language - Mayor understands both
						conversational requests and raw commands
					</p>
				</div>
			</div>
		</div>
	);

	// Controlled mode - just render modal when open
	if (controlledOpen !== undefined) {
		return isOpen ? modalContent : null;
	}

	// Uncontrolled mode - render button + modal
	return (
		<>
			<button
				onClick={() => setInternalOpen(true)}
				className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border transition-colors"
				title="Command Legend"
			>
				<BookOpen size={18} className="text-gt-accent" />
			</button>
			{isOpen && modalContent}
		</>
	);
}
