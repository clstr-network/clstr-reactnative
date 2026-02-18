
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, getButtonTextClass } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]", 
        destructive:
          "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30", 
        outline:
          "border border-white/15 bg-transparent text-white hover:bg-white/[0.06]", 
        secondary:
          "bg-white/[0.06] text-white hover:bg-white/[0.10]", 
        ghost: "text-white hover:bg-white/[0.06] font-medium", 
        link: "text-white/60 font-semibold underline-offset-4 hover:underline hover:text-white px-2 py-1", 
        alumni: "bg-white/10 border border-white/15 text-white hover:bg-white/[0.15]",
        "alumni-outline": "border border-white/15 bg-transparent text-white hover:bg-white/[0.06] font-medium",
        "alumni-ghost": "text-white/60 hover:bg-white/[0.06] hover:text-white font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        xl: "h-12 rounded-md px-10 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const textClass = getButtonTextClass(variant)
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), textClass)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
