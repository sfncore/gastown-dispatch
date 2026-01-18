import { Clock, User, GitBranch } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { BeadStatusBadge } from "./BeadStatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { TypeBadge } from "./TypeBadge";
import type { Bead } from "@/types/api";

interface BeadCardProps {
  bead: Bead;
  isSelected?: boolean;
  onClick?: () => void;
  showDependencyCount?: boolean;
  dependencyCount?: number;
}

export function BeadCard({
  bead,
  isSelected = false,
  onClick,
  showDependencyCount = false,
  dependencyCount = 0,
}: BeadCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-colors hover:bg-gt-surface/50",
        isSelected && "bg-gt-surface border-l-2 border-gt-accent"
      )}
    >
      <div className="flex items-start gap-3">
        <BeadStatusBadge status={bead.status} size={16} className="mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-medium truncate">{bead.title}</h3>

          {/* ID, Priority, Type */}
          <div className="flex items-center gap-2 mt-1 text-xs text-gt-muted flex-wrap">
            <span className="font-mono">{bead.id}</span>
            <span>·</span>
            <PriorityBadge priority={bead.priority} />
            <span>·</span>
            <TypeBadge type={bead.type} />
          </div>

          {/* Labels */}
          {bead.labels && bead.labels.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {bead.labels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-0.5 text-xs bg-gt-border rounded-full"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gt-muted">
            {bead.assignee && (
              <span className="flex items-center gap-1">
                <User size={12} />
                {bead.assignee}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatRelativeTime(bead.updated_at || bead.created_at)}
            </span>
            {showDependencyCount && dependencyCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <GitBranch size={12} />
                {dependencyCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
