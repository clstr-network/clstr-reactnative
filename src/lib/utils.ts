
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add debounce utility function
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Updated button style helper with enhanced contrast
export function getButtonTextClass(variant?: string): string {
  // Only enforce weight; never force text color.
  // Text color should come from the variant styles and/or caller-provided classes.
  return variant ? 'font-semibold' : 'font-semibold';
}

// Add a utility to generate contrast background colors
export function getContrastBackground(color: string): string {
  return `bg-${color}/10`;
}
