
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.10]",
        secondary:
          "border border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]",
        destructive:
          "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
        outline: "text-white border border-white/15",
        alumni: "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.10]",
        success: "border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
        warning: "border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
        info: "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
