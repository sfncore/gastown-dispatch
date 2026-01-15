import { useQuery } from "@tanstack/react-query";
import { getStatus, getConvoys } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
	Mail,
	Crown,
	Anchor,
	Cat,
	GitMerge,
	Sparkles,
	Truck,
	RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FlowStage {
	id: string;
	label: string;
	icon: LucideIcon;
	color: string;
	path?: string;
}

const flowStages: FlowStage[] = [
	{ id: "mail", label: "Mail", icon: Mail, color: "blue", path: "/dispatch" },
	{ id: "mayor", label: "Mayor/Convoy", icon: Crown, color: "purple", path: "/convoys" },
	{ id: "sling", label: "Sling/Hook", icon: Anchor, color: "yellow", path: "/rigs" },
	{ id: "polecats", label: "Polecats", icon: Cat, color: "orange", path: "/agents" },
	{ id: "merge", label: "Merge Queue", icon: GitMerge, color: "cyan", path: "/pipeline/merge-queue" },
	{ id: "synthesis", label: "Synthesis", icon: Sparkles, color: "pink", path: "/convoys" },
	{ id: "landed", label: "Landed", icon: Truck, color: "green", path: "/convoys" },
];

type StageStatus = "active" | "idle" | "blocked" | "empty";

interface StageData {
	count: number;
	status: StageStatus;
	detail?: string;
}

const statusColors: Record<StageStatus, { bg: string; border: string; text: string; glow: string }> = {
	active: {
		bg: "bg-green-500/20",
		border: "border-green-500",
		text: "text-green-400",
		glow: "shadow-[0_0_20px_rgba(34,197,94,0.4)]",
	},
	idle: {
		bg: "bg-yellow-500/20",
		border: "border-yellow-500",
		text: "text-yellow-400",
		glow: "shadow-[0_0_15px_rgba(234,179,8,0.3)]",
	},
	blocked: {
		bg: "bg-red-500/20",
		border: "border-red-500",
		text: "text-red-400",
		glow: "shadow-[0_0_20px_rgba(239,68,68,0.4)]",
	},
	empty: {
		bg: "bg-gray-500/20",
		border: "border-gray-600",
		text: "text-gray-400",
		glow: "",
	},
};

const stageColors: Record<string, string> = {
	blue: "from-blue-500/30 to-blue-600/10",
	purple: "from-purple-500/30 to-purple-600/10",
	yellow: "from-yellow-500/30 to-yellow-600/10",
	orange: "from-orange-500/30 to-orange-600/10",
	cyan: "from-cyan-500/30 to-cyan-600/10",
	pink: "from-pink-500/30 to-pink-600/10",
	green: "from-green-500/30 to-green-600/10",
};

const stageIconColors: Record<string, string> = {
	blue: "text-blue-400",
	purple: "text-purple-400",
	yellow: "text-yellow-400",
	orange: "text-orange-400",
	cyan: "text-cyan-400",
	pink: "text-pink-400",
	green: "text-green-400",
};

export function FlowSchematic() {
	const navigate = useNavigate();

	const { data: statusResponse, isLoading: statusLoading } = useQuery({
		queryKey: ["status"],
		queryFn: getStatus,
		refetchInterval: 5_000,
	});

	const { data: openConvoys } = useQuery({
		queryKey: ["convoys", "open"],
		queryFn: () => getConvoys("open"),
		refetchInterval: 10_000,
	});

	const { data: closedConvoys } = useQuery({
		queryKey: ["convoys", "closed"],
		queryFn: () => getConvoys("closed"),
		refetchInterval: 30_000,
	});

	if (statusLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-gt-bg">
				<RefreshCw className="animate-spin text-gt-muted" size={32} />
			</div>
		);
	}

	const status = statusResponse?.status;
	const agents = status?.agents || [];
	const rigs = status?.rigs || [];

	// Calculate stage data
	const stageData: Record<string, StageData> = {
		mail: getMailData(agents),
		mayor: getMayorData(agents, openConvoys || []),
		sling: getSlingData(rigs),
		polecats: getPolecatData(rigs, agents),
		merge: getMergeData(rigs),
		synthesis: getSynthesisData(openConvoys || []),
		landed: getLandedData(closedConvoys || []),
	};

	return (
		<div className="w-full bg-gt-bg rounded-lg border border-gt-border p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-lg font-semibold text-gt-text">Pipeline Flow</h2>
					<p className="text-xs text-gt-muted">Work progression through Gas Town</p>
				</div>
				<div className="flex items-center gap-4 text-xs">
					<StatusLegend />
				</div>
			</div>

			{/* Flow visualization */}
			<div className="relative">
				{/* Connection line */}
				<div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-gt-border via-gt-accent/30 to-gt-border -translate-y-1/2 z-0" />

				{/* Animated flow particles */}
				<div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 overflow-hidden z-0">
					<div className="absolute inset-0 bg-gradient-to-r from-transparent via-gt-accent/50 to-transparent animate-flow-right" />
				</div>

				{/* Stage nodes */}
				<div className="relative z-10 flex items-center justify-between gap-2">
					{flowStages.map((stage, index) => {
						const data = stageData[stage.id];
						const statusStyle = statusColors[data.status];

						return (
							<div key={stage.id} className="flex items-center">
								{/* Node */}
								<button
									onClick={() => stage.path && navigate(stage.path)}
									className={cn(
										"relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200",
										"hover:scale-105 hover:z-20 cursor-pointer",
										"bg-gradient-to-b",
										stageColors[stage.color],
										statusStyle.border,
										data.status === "active" && statusStyle.glow,
										data.status === "blocked" && "animate-pulse"
									)}
								>
									{/* Icon */}
									<div className={cn(
										"w-10 h-10 rounded-lg flex items-center justify-center mb-2",
										"bg-gt-bg/50 backdrop-blur-sm"
									)}>
										<stage.icon size={22} className={stageIconColors[stage.color]} />
									</div>

									{/* Label */}
									<span className="text-xs font-medium text-gt-text whitespace-nowrap">
										{stage.label}
									</span>

									{/* Count badge */}
									{data.count > 0 && (
										<div className={cn(
											"absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 rounded-full",
											"flex items-center justify-center text-xs font-bold",
											"bg-gt-bg border-2",
											statusStyle.border,
											statusStyle.text
										)}>
											{data.count}
										</div>
									)}

									{/* Status indicator */}
									<div className={cn(
										"absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full",
										data.status === "active" && "bg-green-500 animate-pulse",
										data.status === "idle" && "bg-yellow-500",
										data.status === "blocked" && "bg-red-500 animate-pulse",
										data.status === "empty" && "bg-gray-500"
									)} />

									{/* Detail tooltip */}
									{data.detail && (
										<div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
											<span className="text-[10px] text-gt-muted">{data.detail}</span>
										</div>
									)}
								</button>

								{/* Arrow connector */}
								{index < flowStages.length - 1 && (
									<div className="flex items-center mx-1">
										<svg width="24" height="12" viewBox="0 0 24 12" className="text-gt-accent/50">
											<path
												d="M0 6 L18 6 M14 2 L20 6 L14 10"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Summary stats */}
			<div className="mt-8 pt-4 border-t border-gt-border">
				<div className="flex items-center justify-around text-center">
					<StatBox label="Total In-Flight" value={getTotalInFlight(stageData)} />
					<StatBox label="Blocked" value={stageData.merge.status === "blocked" ? stageData.merge.count : 0} variant="error" />
					<StatBox label="Completed Today" value={closedConvoys?.length || 0} variant="success" />
				</div>
			</div>
		</div>
	);
}

function StatusLegend() {
	return (
		<div className="flex items-center gap-3">
			<div className="flex items-center gap-1">
				<div className="w-2 h-2 rounded-full bg-green-500" />
				<span className="text-gt-muted">Active</span>
			</div>
			<div className="flex items-center gap-1">
				<div className="w-2 h-2 rounded-full bg-yellow-500" />
				<span className="text-gt-muted">Idle</span>
			</div>
			<div className="flex items-center gap-1">
				<div className="w-2 h-2 rounded-full bg-red-500" />
				<span className="text-gt-muted">Blocked</span>
			</div>
		</div>
	);
}

function StatBox({
	label,
	value,
	variant = "default"
}: {
	label: string;
	value: number;
	variant?: "default" | "success" | "error"
}) {
	return (
		<div className="flex flex-col items-center">
			<span className={cn(
				"text-2xl font-bold font-mono",
				variant === "success" && "text-green-400",
				variant === "error" && value > 0 && "text-red-400",
				variant === "default" && "text-gt-text"
			)}>
				{value}
			</span>
			<span className="text-xs text-gt-muted">{label}</span>
		</div>
	);
}

// Data extraction functions

function getMailData(agents: { unread_mail: number }[]): StageData {
	const totalMail = agents.reduce((sum, a) => sum + (a.unread_mail || 0), 0);
	return {
		count: totalMail,
		status: totalMail > 0 ? "active" : "empty",
		detail: totalMail > 0 ? `${totalMail} unread` : undefined,
	};
}

function getMayorData(
	agents: { name: string; running: boolean; has_work: boolean }[],
	convoys: { status: string }[]
): StageData {
	const mayor = agents.find(a => a.name === "mayor");
	const openCount = convoys.filter(c => c.status === "open").length;

	let status: StageStatus = "empty";
	if (mayor?.has_work) status = "active";
	else if (openCount > 0) status = "idle";

	return {
		count: openCount,
		status,
		detail: mayor?.has_work ? "Processing" : openCount > 0 ? `${openCount} open` : undefined,
	};
}

function getSlingData(rigs: { hooks?: { has_work: boolean }[] }[]): StageData {
	const hooks = rigs.flatMap(r => r.hooks || []);
	const activeHooks = hooks.filter(h => h.has_work).length;
	const totalHooks = hooks.length;

	return {
		count: activeHooks,
		status: activeHooks > 0 ? "active" : totalHooks > 0 ? "idle" : "empty",
		detail: activeHooks > 0 ? `${activeHooks} hooked` : undefined,
	};
}

function getPolecatData(
	rigs: { polecat_count: number; agents?: { has_work: boolean }[] }[],
	agents: { role: string; has_work: boolean }[]
): StageData {
	const totalPolecats = rigs.reduce((sum, r) => sum + (r.polecat_count || 0), 0);
	const workingPolecats = agents.filter(a => a.role === "polecat" && a.has_work).length;

	return {
		count: workingPolecats,
		status: workingPolecats > 0 ? "active" : totalPolecats > 0 ? "idle" : "empty",
		detail: `${workingPolecats}/${totalPolecats} working`,
	};
}

function getMergeData(rigs: { mq?: { pending: number; in_flight: number; blocked: number; state: string } }[]): StageData {
	const mqs = rigs.map(r => r.mq).filter(Boolean);
	const pending = mqs.reduce((sum, mq) => sum + (mq?.pending || 0), 0);
	const inFlight = mqs.reduce((sum, mq) => sum + (mq?.in_flight || 0), 0);
	const blocked = mqs.reduce((sum, mq) => sum + (mq?.blocked || 0), 0);

	let status: StageStatus = "empty";
	if (blocked > 0) status = "blocked";
	else if (inFlight > 0) status = "active";
	else if (pending > 0) status = "idle";

	return {
		count: pending + inFlight,
		status,
		detail: blocked > 0 ? `${blocked} blocked` : inFlight > 0 ? `${inFlight} merging` : undefined,
	};
}

function getSynthesisData(convoys: { completed?: number; total?: number }[]): StageData {
	const ready = convoys.filter(c => c.completed === c.total && c.total && c.total > 0).length;
	const inProgress = convoys.filter(c => (c.completed || 0) > 0 && c.completed !== c.total).length;

	return {
		count: ready + inProgress,
		status: ready > 0 ? "active" : inProgress > 0 ? "idle" : "empty",
		detail: ready > 0 ? `${ready} ready` : inProgress > 0 ? `${inProgress} in progress` : undefined,
	};
}

function getLandedData(closedConvoys: unknown[]): StageData {
	return {
		count: closedConvoys.length,
		status: closedConvoys.length > 0 ? "active" : "empty",
		detail: closedConvoys.length > 0 ? "Completed" : undefined,
	};
}

function getTotalInFlight(stageData: Record<string, StageData>): number {
	return stageData.sling.count + stageData.polecats.count + stageData.merge.count;
}
