import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "open":
      return "text-blue-400";
    case "in_progress":
    case "hooked":
      return "text-amber-400";
    case "closed":
      return "text-green-400";
    default:
      return "text-gray-400";
  }
}

export function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 0:
      return "Critical";
    case 1:
      return "High";
    case 2:
      return "Medium";
    case 3:
      return "Low";
    case 4:
      return "Backlog";
    default:
      return `P${priority}`;
  }
}

export function getPriorityColor(priority: number): string {
  switch (priority) {
    case 0:
      return "text-red-400";
    case 1:
      return "text-orange-400";
    case 2:
      return "text-yellow-400";
    case 3:
      return "text-green-400";
    case 4:
      return "text-gray-400";
    default:
      return "text-gray-400";
  }
}

// Convoy ETA calculation types
export interface ConvoyETAInput {
  total: number;
  completed: number;
  issues: Array<{
    status: string;
    worker?: string;
    worker_age?: string;
  }>;
}

export interface ConvoyETA {
  /** Estimated minutes until completion, null if cannot estimate */
  estimatedMinutes: number | null;
  /** Human-readable ETA string */
  display: string;
  /** Short ETA for compact display */
  short: string;
  /** Active workers count */
  wipCount: number;
  /** Blocked issues count (open, no worker) */
  blockedCount: number;
  /** Issues being actively worked */
  activeCount: number;
  /** Whether convoy is blocked (all remaining are blocked) */
  isBlocked: boolean;
  /** Confidence level */
  confidence: "high" | "medium" | "low" | "none";
}

/**
 * Parse worker_age string (e.g., "2h15m", "45m", "3d") to minutes
 */
export function parseWorkerAge(age?: string): number | null {
  if (!age) return null;

  let minutes = 0;
  const dayMatch = age.match(/(\d+)d/);
  const hourMatch = age.match(/(\d+)h/);
  const minMatch = age.match(/(\d+)m/);

  if (dayMatch) minutes += parseInt(dayMatch[1]) * 24 * 60;
  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);

  return minutes > 0 ? minutes : null;
}

/**
 * Calculate convoy ETA based on WIP, completion rate, and blocked issues
 */
export function calculateConvoyETA(input: ConvoyETAInput): ConvoyETA {
  const { total, completed, issues } = input;
  const remaining = total - completed;

  // If complete, no ETA needed
  if (remaining <= 0) {
    return {
      estimatedMinutes: 0,
      display: "Complete",
      short: "Done",
      wipCount: 0,
      blockedCount: 0,
      activeCount: 0,
      isBlocked: false,
      confidence: "high",
    };
  }

  // Count WIP (in_progress or hooked with active worker)
  const wipIssues = issues.filter(
    (i) => (i.status === "in_progress" || i.status === "hooked") && i.worker
  );
  const wipCount = wipIssues.length;

  // Count blocked (open without worker)
  const blockedIssues = issues.filter(
    (i) => i.status === "open" || (i.status !== "closed" && !i.worker)
  );
  const blockedCount = blockedIssues.filter(i => i.status === "open").length;

  // Active workers
  const activeCount = wipCount;

  // Check if all remaining are blocked
  const isBlocked = remaining > 0 && wipCount === 0;

  // If blocked, can't estimate
  if (isBlocked) {
    return {
      estimatedMinutes: null,
      display: blockedCount > 0 ? `Blocked (${blockedCount} waiting)` : "No active work",
      short: blockedCount > 0 ? "Blocked" : "Idle",
      wipCount,
      blockedCount,
      activeCount,
      isBlocked: true,
      confidence: "none",
    };
  }

  // Calculate average work time from current WIP
  let avgMinutesPerIssue = 30; // Default: 30 minutes per issue
  let confidence: "high" | "medium" | "low" = "low";

  if (wipIssues.length > 0) {
    const ages = wipIssues
      .map((i) => parseWorkerAge(i.worker_age))
      .filter((a): a is number => a !== null);

    if (ages.length > 0) {
      // Use median of current work times as estimate
      ages.sort((a, b) => a - b);
      const median = ages[Math.floor(ages.length / 2)];
      // Assume we're ~50% through on average, so double the current time
      avgMinutesPerIssue = Math.max(30, median * 2);
      confidence = ages.length >= 2 ? "medium" : "low";
    }
  }

  // Calculate ETA
  // Remaining work = (remaining - wipCount) issues to start + wipCount issues in progress
  // Time = in-progress completion time + queued work time

  // Estimate time for current WIP (assume ~50% done on average)
  const wipRemainingTime = avgMinutesPerIssue * 0.5 * wipCount;

  // Estimate time for queued work (assuming parallel workers continue)
  const queuedIssues = remaining - wipCount;
  const queuedTime = wipCount > 0
    ? (queuedIssues / wipCount) * avgMinutesPerIssue
    : queuedIssues * avgMinutesPerIssue;

  const estimatedMinutes = Math.ceil(wipRemainingTime + queuedTime);

  // Format display strings
  const display = formatETADisplay(estimatedMinutes, blockedCount);
  const short = formatETAShort(estimatedMinutes);

  return {
    estimatedMinutes,
    display,
    short,
    wipCount,
    blockedCount,
    activeCount,
    isBlocked: false,
    confidence,
  };
}

/**
 * Format ETA for display (longer form)
 */
function formatETADisplay(minutes: number, blockedCount: number): string {
  const etaStr = formatETAShort(minutes);
  if (blockedCount > 0) {
    return `~${etaStr} (${blockedCount} blocked)`;
  }
  return `~${etaStr}`;
}

/**
 * Format ETA for short display
 */
function formatETAShort(minutes: number): string {
  if (minutes < 5) return "< 5m";
  if (minutes < 60) return `${Math.round(minutes / 5) * 5}m`;
  if (minutes < 120) return `~1h`;
  if (minutes < 480) return `~${Math.round(minutes / 60)}h`;
  if (minutes < 1440) return `~${Math.round(minutes / 60)}h`;
  const days = Math.round(minutes / 1440);
  return `~${days}d`;
}
