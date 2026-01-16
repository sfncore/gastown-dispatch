import { useQuery } from "@tanstack/react-query";
import {
	X,
	Activity,
	Clock,
	AlertTriangle,
	CheckCircle2,
	PauseCircle,
	Server,
} from "lucide-react";
import { getPatrolStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PatrolStatus } from "@/types/api";

interface DeaconStatusPopupProps {
	onClose: () => void;
}

function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);

	if (diffSecs < 60) {
		return `${diffSecs}s ago`;
	}
	if (diffMins < 60) {
		return `${diffMins}m ago`;
	}

	return date.toLocaleTimeString();
}

function getDegradedReason(patrolStatus: PatrolStatus): string | null {
	if (patrolStatus.operational_mode !== "degraded") return null;

	// Check boot degraded
	if (patrolStatus.boot?.degraded) {
		return "Boot process is in degraded state";
	}

	// Check patrol paused
	if (patrolStatus.patrol_paused?.paused) {
		return patrolStatus.patrol_paused.reason || "Patrol is paused";
	}

	// Check heartbeat age (>10 min = degraded)
	if (patrolStatus.heartbeat?.timestamp) {
		const heartbeatAge =
			Date.now() - new Date(patrolStatus.heartbeat.timestamp).getTime();
		const ageMinutes = Math.floor(heartbeatAge / 60000);
		if (ageMinutes > 10) {
			if (ageMinutes > 60) {
				const hours = Math.floor(ageMinutes / 60);
				return `No heartbeat for ${hours}+ hour${hours > 1 ? "s" : ""} (last: ${ageMinutes} min ago)`;
			}
			return `No heartbeat for ${ageMinutes} minutes (threshold: 10 min)`;
		}
	}

	// No heartbeat at all
	if (!patrolStatus.heartbeat) {
		return "No heartbeat received from deacon";
	}

	return "Unknown degradation cause";
}

function StatusBadge({
	status,
	reason,
}: {
	status: PatrolStatus["operational_mode"];
	reason?: string | null;
}) {
	const config = {
		normal: { color: "bg-green-500", label: "NORMAL", icon: CheckCircle2 },
		degraded: {
			color: "bg-yellow-500",
			label: "DEGRADED",
			icon: AlertTriangle,
		},
		offline: { color: "bg-red-500", label: "OFFLINE", icon: X },
	};

	const { color, label, icon: Icon } = config[status];

	return (
		<div className="flex flex-col items-center gap-1">
			<div
				className={cn(
					"flex items-center gap-2 px-3 py-1.5 rounded-lg",
					color.replace("bg-", "bg-") + "/20",
				)}
			>
				<Icon size={16} className={color.replace("bg-", "text-")} />
				<span
					className={cn(
						"font-bold text-sm uppercase tracking-wider",
						color.replace("bg-", "text-"),
					)}
				>
					{label}
				</span>
			</div>
			{reason && (
				<p className="text-xs text-yellow-400/80 text-center max-w-xs">
					{reason}
				</p>
			)}
		</div>
	);
}

function StatRow({
	label,
	value,
	icon: Icon,
	color = "text-slate-300",
}: {
	label: string;
	value: string | React.ReactNode;
	icon?: typeof Activity;
	color?: string;
}) {
	return (
		<div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
			<div className="flex items-center gap-2 text-slate-400">
				{Icon && <Icon size={14} />}
				<span className="text-sm">{label}</span>
			</div>
			<span className={cn("text-sm font-mono", color)}>{value}</span>
		</div>
	);
}

export function DeaconStatusPopup({ onClose }: DeaconStatusPopupProps) {
	const {
		data: patrolStatus,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["patrol-status"],
		queryFn: getPatrolStatus,
		refetchInterval: 5000,
	});

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
			onClick={onClose}
		>
			<div
				className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-w-md w-full"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-slate-700">
					<div className="flex items-center gap-3">
						<Server size={20} className="text-blue-400" />
						<h2 className="text-lg font-semibold text-slate-100">
							Deacon Status
						</h2>
					</div>
					<button
						onClick={onClose}
						className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-200"
					>
						<X size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-4 space-y-4">
					{isLoading && (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
						</div>
					)}

					{error && (
						<div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
							<p className="text-sm text-red-400">
								Failed to load patrol status
							</p>
						</div>
					)}

					{patrolStatus && (
						<>
							{/* Overall Status */}
							<div className="flex items-center justify-center pb-2">
								<StatusBadge
									status={patrolStatus.operational_mode}
									reason={getDegradedReason(patrolStatus)}
								/>
							</div>

							{/* Health Section */}
							<div className="bg-slate-800/50 rounded-lg p-3">
								<h3 className="text-xs uppercase text-slate-400 font-semibold mb-2 tracking-wider">
									Health Status
								</h3>
								<StatRow
									label="Patrol Count"
									value={
										patrolStatus.deacon_state?.patrol_count?.toString() || "0"
									}
									icon={Activity}
									color="text-green-400"
								/>
								<StatRow
									label="Boot Status"
									value={
										patrolStatus.boot?.degraded
											? "DEGRADED"
											: patrolStatus.boot?.running
												? "RUNNING"
												: "READY"
									}
									icon={Server}
									color={
										patrolStatus.boot?.degraded
											? "text-yellow-400"
											: patrolStatus.boot?.running
												? "text-blue-400"
												: "text-green-400"
									}
								/>
								{patrolStatus.degraded_mode && (
									<StatRow
										label="Mode"
										value="DEGRADED"
										icon={AlertTriangle}
										color="text-yellow-400"
									/>
								)}
							</div>

							{/* Patrol Section */}
							<div className="bg-slate-800/50 rounded-lg p-3">
								<h3 className="text-xs uppercase text-slate-400 font-semibold mb-2 tracking-wider">
									Patrol Status
								</h3>
								<StatRow
									label="Patrol"
									value={patrolStatus.patrol_muted ? "MUTED" : "ACTIVE"}
									icon={patrolStatus.patrol_muted ? PauseCircle : Activity}
									color={
										patrolStatus.patrol_muted
											? "text-yellow-400"
											: "text-green-400"
									}
								/>
								{patrolStatus.patrol_paused?.paused &&
									patrolStatus.patrol_paused.reason && (
										<StatRow
											label="Pause Reason"
											value={patrolStatus.patrol_paused.reason}
											color="text-yellow-400"
										/>
									)}
								{patrolStatus.patrol_paused?.paused_at && (
									<StatRow
										label="Paused At"
										value={formatTimestamp(
											patrolStatus.patrol_paused.paused_at,
										)}
										icon={Clock}
										color="text-slate-400"
									/>
								)}
							</div>

							{/* Heartbeat Section */}
							{patrolStatus.heartbeat && (
								<div className="bg-slate-800/50 rounded-lg p-3">
									<h3 className="text-xs uppercase text-slate-400 font-semibold mb-2 tracking-wider">
										Heartbeat
									</h3>
									<StatRow
										label="Last Heartbeat"
										value={formatTimestamp(patrolStatus.heartbeat.timestamp)}
										icon={Clock}
										color="text-slate-300"
									/>
									<StatRow
										label="Cycle"
										value={patrolStatus.heartbeat.cycle.toString()}
										color="text-blue-400"
									/>
									<StatRow
										label="Healthy Agents"
										value={patrolStatus.heartbeat.healthy_agents.toString()}
										icon={Activity}
										color="text-green-400"
									/>
									{patrolStatus.heartbeat.unhealthy_agents > 0 && (
										<StatRow
											label="Unhealthy Agents"
											value={patrolStatus.heartbeat.unhealthy_agents.toString()}
											icon={AlertTriangle}
											color="text-red-400"
										/>
									)}
									{patrolStatus.heartbeat.last_action && (
										<div className="mt-2 bg-slate-700/50 rounded p-2">
											<p className="text-xs text-slate-300">
												<Activity size={12} className="inline mr-1" />
												{patrolStatus.heartbeat.last_action}
											</p>
										</div>
									)}
								</div>
							)}

							{/* Alerts Section */}
							{((patrolStatus.heartbeat?.unhealthy_agents ?? 0) > 0 ||
								patrolStatus.degraded_mode) && (
								<div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
									<h3 className="text-xs uppercase text-red-400 font-semibold mb-2 tracking-wider flex items-center gap-1">
										<AlertTriangle size={12} />
										Alerts
									</h3>
									{patrolStatus.degraded_mode && (
										<p className="text-sm text-red-300 mb-1">
											• System is in degraded mode
										</p>
									)}
									{(patrolStatus.heartbeat?.unhealthy_agents ?? 0) > 0 && (
										<p className="text-sm text-red-300">
											• {patrolStatus.heartbeat?.unhealthy_agents} unhealthy
											agent(s)
										</p>
									)}
								</div>
							)}
						</>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-end p-4 border-t border-slate-700">
					<button
						onClick={onClose}
						className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-200"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
