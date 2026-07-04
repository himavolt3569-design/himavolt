import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const typographyVariants = cva("text-[var(--text-1)]", {
  variants: {
    variant: {
      h1: "font-fraunces text-4xl md:text-5xl font-bold tracking-tight",
      h2: "font-fraunces text-3xl md:text-4xl font-bold tracking-tight",
      h3: "font-fraunces text-2xl md:text-3xl font-bold tracking-tight",
      h4: "font-fraunces text-xl md:text-2xl font-bold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-l-2 pl-6 italic text-[var(--text-2)]",
      list: "my-6 ml-6 list-disc [&>li]:mt-2",
      inlineCode: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-xl text-[var(--text-2)]",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-[var(--text-3)]",
    },
  },
  defaultVariants: {
    variant: "p",
  },
})

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as: Component, ...props }, ref) => {
    // Intelligently default the HTML element based on the variant
    const Comp = Component || (
      variant === "h1" ? "h1" :
      variant === "h2" ? "h2" :
      variant === "h3" ? "h3" :
      variant === "h4" ? "h4" :
      variant === "blockquote" ? "blockquote" :
      variant === "list" ? "ul" :
      variant === "inlineCode" ? "code" :
      "p"
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AnyComp = Comp as any
    return (
      <AnyComp
        className={cn(typographyVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Typography.displayName = "Typography"

export { Typography, typographyVariants }
