import { CircleDot } from "lucide-react";

interface EmptyDetailStateProps {
  message?: string;
  description?: string;
}

export function EmptyDetailState({
  message = "Select a bead to view details",
  description,
}: EmptyDetailStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gt-muted p-8">
      <CircleDot size={64} className="mb-4 opacity-50" />
      <p className="text-lg font-medium mb-2">{message}</p>
      {description && <p className="text-sm text-center max-w-md">{description}</p>}
    </div>
  );
}
