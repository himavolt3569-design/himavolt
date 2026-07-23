import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-[var(--canvas)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
        destructive: "bg-[var(--state-error)] text-white hover:bg-[var(--state-error)]/90",
        outline: "border border-[var(--border)] hover:bg-[var(--surface-alt)] text-[var(--text-1)]",
        secondary: "bg-[var(--surface-alt)] text-[var(--text-1)] hover:bg-[var(--surface)]",
        ghost: "hover:bg-[var(--surface-alt)] text-[var(--text-2)] hover:text-[var(--text-1)]",
        link: "underline-offset-4 hover:underline text-[var(--accent)]",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
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
    // If asChild is implemented via Radix Slot, it would go here. 
    // We stick to standard button for now to avoid dependency overload.
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
