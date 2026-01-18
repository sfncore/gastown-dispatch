import { cn } from "@/lib/utils";
import { Bug, Sparkles, CheckSquare, Layers, Wrench } from "lucide-react";

interface TypeBadgeProps {
  type: "bug" | "feature" | "task" | "epic" | "chore" | "convoy" | "agent" | "merge-request";
  showIcon?: boolean;
  className?: string;
}

export function TypeBadge({ type, showIcon = false, className }: TypeBadgeProps) {
  const getTypeIcon = () => {
    switch (type) {
      case "bug":
        return <Bug size={12} />;
      case "feature":
        return <Sparkles size={12} />;
      case "task":
        return <CheckSquare size={12} />;
      case "epic":
      case "convoy":
        return <Layers size={12} />;
      case "chore":
      case "agent":
      case "merge-request":
        return <Wrench size={12} />;
      default:
        return null;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case "bug":
        return "bg-red-600/20 text-red-400";
      case "feature":
        return "bg-purple-600/20 text-purple-400";
      case "task":
        return "bg-blue-600/20 text-blue-400";
      case "epic":
      case "convoy":
        return "bg-orange-600/20 text-orange-400";
      case "chore":
      case "agent":
      case "merge-request":
        return "bg-gray-600/20 text-gray-400";
      default:
        return "bg-gt-border text-gt-muted";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs uppercase rounded-full",
        getTypeColor(),
        className
      )}
    >
      {showIcon && getTypeIcon()}
      {type}
    </span>
  );
}
