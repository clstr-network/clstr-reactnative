import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UndoSnackbarProps {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function UndoSnackbar({ message, onUndo, duration = 5000 }: UndoSnackbarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useState(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  });

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-[#000000] text-white rounded-lg shadow-lg",
        "px-4 py-3 flex items-center gap-4",
        "animate-in slide-in-from-bottom-5 duration-300"
      )}
    >
      <span className="text-sm">{message}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onUndo();
          setIsVisible(false);
        }}
        className="text-white hover:text-white hover:bg-white/20"
      >
        Undo
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(false)}
        className="h-6 w-6 text-white hover:text-white hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
