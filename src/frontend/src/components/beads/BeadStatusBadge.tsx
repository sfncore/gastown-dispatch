import { CircleDot, CheckCircle2, Play, AlertCircle } from "lucide-react";
import { cn, getStatusColor } from "@/lib/utils";

interface BeadStatusBadgeProps {
  status: "open" | "in_progress" | "hooked" | "closed";
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function BeadStatusBadge({
  status,
  size = 16,
  showLabel = false,
  className,
}: BeadStatusBadgeProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "closed":
        return <CheckCircle2 size={size} />;
      case "in_progress":
        return <Play size={size} />;
      case "hooked":
        return <AlertCircle size={size} />;
      case "open":
      default:
        return <CircleDot size={size} />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "in_progress":
        return "In Progress";
      case "hooked":
        return "Hooked";
      case "closed":
        return "Closed";
      case "open":
      default:
        return "Open";
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(getStatusColor(status))}>{getStatusIcon()}</div>
      {showLabel && (
        <span className={cn("text-sm capitalize", getStatusColor(status))}>
          {getStatusLabel()}
        </span>
      )}
    </div>
  );
}
