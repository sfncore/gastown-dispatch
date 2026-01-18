import { cn, getPriorityColor } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: number;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "text-xs font-medium uppercase px-2 py-0.5 rounded-full",
        getPriorityColor(priority),
        className
      )}
    >
      P{priority}
    </span>
  );
}
