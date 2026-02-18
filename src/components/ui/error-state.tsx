import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="text-white">{title}</AlertTitle>
      <AlertDescription className="mt-2 text-white/60">
        <p>{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
          >
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
