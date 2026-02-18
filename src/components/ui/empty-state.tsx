import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="h-12 w-12 text-white/40 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-4 max-w-md">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
