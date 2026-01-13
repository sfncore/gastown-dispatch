import { useState, useEffect } from "react";
import { BookOpen, X, Copy, Check, RefreshCw, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bead {
	id: string;
	title: string;
	status: string;
	priority: number;
	issue_type: string;
	assignee?: string;
}

interface CommandEntry {
	natural: string;
	command: string;
	example?: string;
	tooltip?: string;
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
				tooltip:
					"Use when you need to track new work. Creates a bead (issue) in the rig's backlog. Won't start work - just creates the tracking item.",
			},
			{
				natural: "Create a bug for [rig]: [description]",
				command:
					'bd create --title "[description]" --prefix [prefix] --type bug -p 1',
				example: "Create a bug for northstar_intelligence: API returns 500",
				tooltip:
					"Use for defects/bugs. Creates a high-priority (P1) bead. Good for tracking issues found during work or testing.",
			},
			{
				natural: "Assign [bead] to [rig]",
				command: "gt sling [bead] [rig]",
				example: "Assign vc-6wz to versova_clutch",
				tooltip:
					"THE command for getting work done NOW. Spawns a polecat (worker agent) and gives it the bead to work on. Auto-creates a convoy to track progress.",
			},
			{
				natural: "Sling [bead] to [rig]",
				command: "gt sling [bead] [rig]",
				example: "Sling ni-abc to northstar_intelligence",
				tooltip:
					"Same as assign - 'sling' is the Gas Town term. Attaches work to an agent's hook and starts them immediately. Work persists across restarts.",
			},
			{
				natural: "Have [rig] work on [bead]",
				command: "gt sling [bead] [rig]",
				example: "Have versova_clutch work on vc-xyz",
				tooltip:
					"Natural language version of sling. Use when you want a specific rig to do the work right now. Creates polecat if needed.",
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
				tooltip:
					"Use for TRACKING multiple related tasks. Convoys group work that should land together. Auto-closes when all tracked beads complete.",
			},
			{
				natural: "Create a convoy called [name] with [beads]",
				command: 'gt convoy create "[name]" [bead1] [bead2]',
				example: "Create a convoy called Auth Fix with vc-abc ni-def",
				tooltip:
					"Bundle related work across rigs. Great for features spanning frontend+backend. You'll see progress in 'convoy list'.",
			},
			{
				natural: "Track [beads] in a convoy",
				command: 'gt convoy create "[name]" [beads...]',
				example: "Track vc-1 vc-2 vc-3 in a convoy called Batch Update",
				tooltip:
					"Convoy = organization/tracking. Sling = action. Use convoy when you have multiple related beads to monitor together.",
			},
			{
				natural: "Show convoy status",
				command: "gt convoy list",
				example: "How are convoys doing?",
				tooltip:
					"Dashboard view of all convoys. Shows which are active, landed (complete), or stranded (ready work with no workers).",
			},
			{
				natural: "Check convoy [id]",
				command: "gt convoy status [id]",
				example: "Check convoy hq-cv-26dxo",
				tooltip:
					"Deep dive on one convoy. Shows tracked issues, which workers are assigned, and completion progress.",
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
				tooltip:
					"Full details on a bead - description, status, dependencies, who's working on it. Use to understand what a task involves.",
			},
			{
				natural: "What's ready to work on?",
				command: "bd ready",
				example: "What work is available?",
				tooltip:
					"Shows unblocked beads with no dependencies. These are tasks that can be slung to workers immediately.",
			},
			{
				natural: "What's in progress?",
				command: "bd list --status=in_progress",
				example: "Show work in progress",
				tooltip:
					"See what's actively being worked on. Good for understanding current workload across rigs.",
			},
			{
				natural: "Close [bead]",
				command: "bd close [bead]",
				example: "Close vc-6wz",
				tooltip:
					"Mark work as done. Polecats do this automatically via 'gt done', but you can close manually if needed.",
			},
			{
				natural: "Mark [bead] as in progress",
				command: "bd update [bead] --status=in_progress",
				example: "Mark vc-abc as in progress",
				tooltip:
					"Update bead status manually. Usually handled automatically by sling/done, but useful for manual tracking.",
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
				tooltip:
					"See all projects in your Gas Town. Shows polecat counts, crew members, and which agents are active.",
			},
			{
				natural: "Tell me about [rig]",
				command: "gt rig list + inspect",
				example: "Tell me about versova_clutch",
				tooltip:
					"Get details on a specific project - repo URL, active workers, recent activity. Good for understanding project state.",
			},
			{
				natural: "Show polecat status for [rig]",
				command: "gt polecat list [rig]",
				example: "Who's working in versova_clutch?",
				tooltip:
					"List worker agents in a rig. Shows which polecats are spawned, what they're working on, and their current state.",
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
				tooltip:
					"Gas Town agents communicate via mail. Check for messages from polecats, witnesses, or other agents.",
			},
			{
				natural: "Send mail to [agent] about [topic]",
				command: 'gt mail send [addr] -s "[topic]"',
				example: "Send mail to versova_clutch/witness about stuck polecat",
				tooltip:
					"Send a message to any agent. Format: rig/role (e.g., myrig/witness, myrig/furiosa). Good for coordination.",
			},
			{
				natural: "Nudge [agent] with [message]",
				command: 'gt nudge [agent] "[message]"',
				example: "Nudge versova_clutch/furiosa with 'how is the PR going?'",
				tooltip:
					"Poke an agent with a quick message. Less formal than mail - good for status checks or gentle reminders.",
			},
			{
				natural: "Escalate: [problem]",
				command: 'gt escalate "[problem]"',
				example: "Escalate: Need human decision on API design",
				tooltip:
					"Flag something for human attention. Use when agents are stuck and need your input to proceed.",
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
				tooltip:
					"Run health checks on your Gas Town. Finds stale polecats, broken hooks, config issues.",
			},
			{
				natural: "Fix any issues",
				command: "gt doctor --fix",
				example: "Auto-repair problems",
				tooltip:
					"Auto-fix common problems found by doctor. Safe to run - only fixes known issues.",
			},
			{
				natural: "What's my role?",
				command: "gt hook",
				example: "Who am I?",
				tooltip:
					"Show what's currently on your hook (assigned work). Every agent has a hook - persistent storage for their current task.",
			},
			{
				natural: "Peek at [agent]",
				command: "gt peek [agent]",
				example: "Peek at versova_clutch/furiosa",
				tooltip:
					"Look at what an agent is doing without disturbing them. Shows their current hook and recent activity.",
			},
			{
				natural: "Stop all workers",
				command: "gt stop --all",
				example: "Emergency stop everything",
				tooltip:
					"Emergency brake. Stops all polecats across all rigs. Use sparingly - work on hooks is preserved for restart.",
			},
		],
	},
];

interface RigInfo {
	name: string;
	active?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
	ready: "text-green-400",
	open: "text-blue-400",
	in_progress: "text-yellow-400",
	hooked: "text-purple-400",
	closed: "text-gray-500",
};

const TYPE_COLORS: Record<string, string> = {
	task: "bg-blue-500/20 text-blue-300",
	bug: "bg-red-500/20 text-red-300",
	feature: "bg-green-500/20 text-green-300",
	epic: "bg-purple-500/20 text-purple-300",
	molecule: "bg-cyan-500/20 text-cyan-300",
	agent: "bg-orange-500/20 text-orange-300",
	role: "bg-pink-500/20 text-pink-300",
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
	0: { label: "P0", color: "text-red-500" },
	1: { label: "P1", color: "text-orange-400" },
	2: { label: "P2", color: "text-yellow-400" },
	3: { label: "P3", color: "text-green-400" },
	4: { label: "P4", color: "text-gray-400" },
};

function BeadsTabContent({
	townBeads,
	rigBeads,
	beadsLoading,
	beadsFilter,
	setBeadsFilter,
	fetchBeads,
	handleInsert,
	handleCopy,
	copiedId,
	rigs,
}: {
	townBeads: Bead[];
	rigBeads: Record<string, Bead[]>;
	beadsLoading: boolean;
	beadsFilter: "all" | "ready" | "in_progress" | "open";
	setBeadsFilter: (f: "all" | "ready" | "in_progress" | "open") => void;
	fetchBeads: () => void;
	handleInsert: (text: string) => void;
	handleCopy: (text: string, id: string) => void;
	copiedId: string | null;
	rigs: RigInfo[];
}) {
	const [expandedRigs, setExpandedRigs] = useState<Set<string>>(new Set());

	const toggleRig = (rigName: string) => {
		setExpandedRigs((prev) => {
			const next = new Set(prev);
			if (next.has(rigName)) {
				next.delete(rigName);
			} else {
				next.add(rigName);
			}
			return next;
		});
	};

	// Filter out system beads from town beads
	const townWorkBeads = townBeads.filter(
		(b) => !["role", "agent", "molecule"].includes(b.issue_type),
	);
	const townSystemBeads = townBeads.filter((b) =>
		["role", "agent", "molecule"].includes(b.issue_type),
	);

	// Count total beads
	const totalRigBeads = Object.values(rigBeads).reduce(
		(sum, arr) => sum + arr.length,
		0,
	);
	const totalBeads = townBeads.length + totalRigBeads;

	// Get rigs with beads
	const rigsWithBeads = rigs.filter(
		(r) => rigBeads[r.name] && rigBeads[r.name].length > 0,
	);

	return (
		<div>
			{/* Filter bar */}
			<div className="flex items-center gap-2 mb-4">
				<div className="flex gap-1 bg-gt-surface rounded-lg p-1">
					{(["ready", "in_progress", "open", "all"] as const).map((filter) => (
						<button
							key={filter}
							onClick={() => setBeadsFilter(filter)}
							className={cn(
								"px-3 py-1 text-xs font-medium rounded transition-colors",
								beadsFilter === filter
									? "bg-gt-accent text-black"
									: "text-gt-muted hover:text-gt-text",
							)}
						>
							{filter === "in_progress"
								? "In Progress"
								: filter.charAt(0).toUpperCase() + filter.slice(1)}
						</button>
					))}
				</div>
				<button
					onClick={fetchBeads}
					className="p-1.5 rounded hover:bg-gt-surface transition-colors"
					title="Refresh"
				>
					<RefreshCw
						size={14}
						className={cn("text-gt-muted", beadsLoading && "animate-spin")}
					/>
				</button>
				<span className="text-xs text-gt-muted ml-auto">
					{totalBeads} beads
				</span>
			</div>

			{beadsLoading ? (
				<div className="flex items-center justify-center py-8">
					<RefreshCw size={20} className="animate-spin text-gt-muted" />
				</div>
			) : totalBeads === 0 ? (
				<p className="text-sm text-gt-muted italic text-center py-8">
					No beads found for this filter.
				</p>
			) : (
				<div className="space-y-3 max-h-[50vh] overflow-y-auto">
					{/* Rig sections */}
					{rigsWithBeads.map((rig) => {
						const rigBeadList = rigBeads[rig.name] || [];
						const isExpanded = expandedRigs.has(rig.name);
						return (
							<div
								key={rig.name}
								className="border border-gt-border rounded-lg overflow-hidden"
							>
								<button
									onClick={() => toggleRig(rig.name)}
									className="w-full flex items-center justify-between p-2 bg-gt-surface hover:bg-gt-border/50 transition-colors"
								>
									<div className="flex items-center gap-2">
										<span
											className={cn(
												"text-xs transition-transform",
												isExpanded && "rotate-90",
											)}
										>
											▶
										</span>
										<span className="font-mono text-sm text-gt-accent">
											{rig.name}
										</span>
										{rig.active && (
											<span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
										)}
									</div>
									<span className="text-xs text-gt-muted">
										{rigBeadList.length} beads
									</span>
								</button>
								{isExpanded && (
									<div className="p-2 space-y-1 bg-gt-bg">
										{rigBeadList.map((bead) => (
											<BeadRow
												key={bead.id}
												bead={bead}
												handleInsert={handleInsert}
												handleCopy={handleCopy}
												copiedId={copiedId}
											/>
										))}
									</div>
								)}
							</div>
						);
					})}

					{/* Town-level work items */}
					{townWorkBeads.length > 0 && (
						<div className="border border-gt-border rounded-lg overflow-hidden">
							<button
								onClick={() => toggleRig("hq")}
								className="w-full flex items-center justify-between p-2 bg-gt-surface hover:bg-gt-border/50 transition-colors"
							>
								<div className="flex items-center gap-2">
									<span
										className={cn(
											"text-xs transition-transform",
											expandedRigs.has("hq") && "rotate-90",
										)}
									>
										▶
									</span>
									<span className="font-mono text-sm text-purple-400">
										hq (town-level)
									</span>
								</div>
								<span className="text-xs text-gt-muted">
									{townWorkBeads.length} beads
								</span>
							</button>
							{expandedRigs.has("hq") && (
								<div className="p-2 space-y-1 bg-gt-bg">
									{townWorkBeads.map((bead) => (
										<BeadRow
											key={bead.id}
											bead={bead}
											handleInsert={handleInsert}
											handleCopy={handleCopy}
											copiedId={copiedId}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{/* System beads (collapsed by default) */}
					{townSystemBeads.length > 0 && (
						<details className="group">
							<summary className="text-xs font-semibold text-gt-muted mb-2 uppercase tracking-wider cursor-pointer hover:text-gt-text">
								System ({townSystemBeads.length}) ▸
							</summary>
							<div className="space-y-1 mt-2">
								{townSystemBeads.map((bead) => (
									<BeadRow
										key={bead.id}
										bead={bead}
										handleInsert={handleInsert}
										handleCopy={handleCopy}
										copiedId={copiedId}
									/>
								))}
							</div>
						</details>
					)}
				</div>
			)}

			{/* Quick actions tip */}
			<div className="mt-4 p-3 rounded-lg bg-green-900/20 border border-green-500/30">
				<p className="text-xs text-gt-muted">
					<strong className="text-green-300">Click bead ID</strong> to insert{" "}
					<code className="text-green-400">gt sling [id]</code> •{" "}
					<strong className="text-green-300">Click title</strong> to insert{" "}
					<code className="text-green-400">bd show [id]</code>
				</p>
			</div>
		</div>
	);
}

function BeadRow({
	bead,
	handleInsert,
	handleCopy,
	copiedId,
}: {
	bead: Bead;
	handleInsert: (text: string) => void;
	handleCopy: (text: string, id: string) => void;
	copiedId: string | null;
}) {
	const priority = PRIORITY_LABELS[bead.priority] || PRIORITY_LABELS[2];

	return (
		<div className="flex items-center gap-2 p-2 rounded-lg bg-gt-surface hover:bg-gt-border/50 transition-colors group">
			{/* Status dot */}
			<Circle
				size={8}
				className={cn(
					"flex-shrink-0",
					STATUS_COLORS[bead.status] || "text-gray-400",
				)}
				fill="currentColor"
			/>

			{/* Bead ID - click to sling */}
			<button
				onClick={() => handleInsert(`gt sling ${bead.id}`)}
				className="font-mono text-xs text-gt-accent hover:underline flex-shrink-0"
				title={`Insert: gt sling ${bead.id}`}
			>
				{bead.id}
			</button>

			{/* Type badge */}
			<span
				className={cn(
					"px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0",
					TYPE_COLORS[bead.issue_type] || "bg-gray-500/20 text-gray-300",
				)}
			>
				{bead.issue_type}
			</span>

			{/* Priority */}
			<span
				className={cn("text-[10px] font-bold flex-shrink-0", priority.color)}
			>
				{priority.label}
			</span>

			{/* Title - click to show */}
			<button
				onClick={() => handleInsert(`bd show ${bead.id}`)}
				className="text-sm text-gt-text truncate flex-1 text-left hover:text-gt-accent transition-colors"
				title={bead.title}
			>
				{bead.title}
			</button>

			{/* Assignee */}
			{bead.assignee && (
				<span className="text-[10px] text-purple-400 flex-shrink-0">
					@{bead.assignee}
				</span>
			)}

			{/* Copy button */}
			<button
				onClick={() => handleCopy(bead.id, bead.id)}
				className="p-1 rounded hover:bg-gt-border transition-colors opacity-0 group-hover:opacity-100"
				title="Copy bead ID"
			>
				{copiedId === bead.id ? (
					<Check size={12} className="text-green-400" />
				) : (
					<Copy size={12} className="text-gt-muted" />
				)}
			</button>
		</div>
	);
}

interface CommandLegendProps {
	onInsertCommand: (text: string) => void;
	onClose?: () => void;
	isOpen?: boolean;
	rigs?: RigInfo[];
}

export function CommandLegend({
	onInsertCommand,
	onClose,
	isOpen: controlledOpen,
	rigs = [],
}: CommandLegendProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"commands" | "prefixes" | "beads">(
		"commands",
	);
	const [townBeads, setTownBeads] = useState<Bead[]>([]);
	const [rigBeads, setRigBeads] = useState<Record<string, Bead[]>>({});
	const [beadsLoading, setBeadsLoading] = useState(false);
	const [beadsFilter, setBeadsFilter] = useState<
		"all" | "ready" | "in_progress" | "open"
	>("ready");

	// Fetch beads when tab is active or filter changes
	useEffect(() => {
		if (activeTab === "beads") {
			fetchBeads();
		}
	}, [activeTab, beadsFilter, rigs]);

	const fetchBeads = async () => {
		setBeadsLoading(true);
		try {
			// Fetch town-level beads
			const townEndpoint =
				beadsFilter === "ready"
					? "/api/beads/ready"
					: `/api/beads${beadsFilter !== "all" ? `?status=${beadsFilter}` : ""}`;
			const townRes = await fetch(townEndpoint);
			const townData = await townRes.json();
			setTownBeads(Array.isArray(townData) ? townData : []);

			// Fetch beads for each rig in parallel
			if (rigs.length > 0) {
				const rigNames = rigs.map((r) => r.name).join(",");
				const statusParam =
					beadsFilter !== "all" && beadsFilter !== "ready"
						? `&status=${beadsFilter}`
						: "";
				const rigRes = await fetch(
					`/api/beads/by-rig?rigs=${rigNames}${statusParam}`,
				);
				const rigData = await rigRes.json();
				setRigBeads(rigData || {});
			}
		} catch {
			setTownBeads([]);
			setRigBeads({});
		} finally {
			setBeadsLoading(false);
		}
	};

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
					<button
						onClick={() => setActiveTab("beads")}
						className={cn(
							"px-4 py-2 text-sm font-medium transition-colors",
							activeTab === "beads"
								? "border-b-2 border-gt-accent text-gt-accent"
								: "text-gt-muted hover:text-gt-text",
						)}
					>
						Beads
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-auto p-4">
					{activeTab === "beads" ? (
						<BeadsTabContent
							townBeads={townBeads}
							rigBeads={rigBeads}
							beadsLoading={beadsLoading}
							beadsFilter={beadsFilter}
							setBeadsFilter={setBeadsFilter}
							fetchBeads={fetchBeads}
							handleInsert={handleInsert}
							handleCopy={handleCopy}
							copiedId={copiedId}
							rigs={rigs}
						/>
					) : activeTab === "commands" ? (
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
													className="p-2 rounded-lg bg-gt-surface hover:bg-gt-border/50 transition-colors group"
												>
													<div className="grid grid-cols-[1fr,1fr,auto] gap-2">
														<button
															onClick={() =>
																handleInsert(entry.example || entry.natural)
															}
															className="text-left text-sm hover:text-gt-accent transition-colors"
															title={entry.tooltip || "Click to send"}
														>
															{entry.natural}
														</button>
														<button
															onClick={() => handleInsert(entry.command)}
															className="text-left text-sm font-mono text-gt-muted hover:text-gt-accent transition-colors truncate"
															title={entry.tooltip || "Click to send"}
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
													{entry.tooltip && (
														<p className="mt-1 text-xs text-gt-muted/70 opacity-0 group-hover:opacity-100 transition-opacity">
															{entry.tooltip}
														</p>
													)}
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
								Bead prefix = gt rig name. Click any prefix to insert it:
							</p>
							{rigs.length > 0 ? (
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto">
									{rigs
										.sort((a, b) => a.name.localeCompare(b.name))
										.map((rig) => (
											<button
												key={rig.name}
												onClick={() => handleInsert(`--prefix ${rig.name}`)}
												className={cn(
													"flex items-center justify-between p-2 rounded-lg bg-gt-surface hover:bg-gt-border/50 transition-colors text-left",
													rig.active && "ring-1 ring-yellow-500/30",
												)}
											>
												<span className="font-mono text-sm text-gt-accent truncate">
													{rig.name}-
												</span>
												{rig.active && (
													<span className="w-1.5 h-1.5 rounded-full bg-yellow-500 ml-2 flex-shrink-0" />
												)}
											</button>
										))}
								</div>
							) : (
								<p className="text-sm text-gt-muted italic">
									No rigs loaded. Rigs will appear here once connected.
								</p>
							)}
							<div className="mt-6 p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
								<h4 className="text-sm font-semibold text-purple-300 mb-2">
									Quick Reference
								</h4>
								<p className="text-sm text-gt-muted">
									<strong>Town-level beads (hq-*):</strong> Convoys, mail,
									cross-rig coordination
								</p>
								<p className="text-sm text-gt-muted mt-1">
									<strong>Rig beads ([gtname]-):</strong> e.g., dotaisyn-abc,
									nsintel-xyz, vsclutch-123
								</p>
								<p className="text-sm text-gt-muted mt-1">
									<span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1" />
									= rig has active polecats
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
