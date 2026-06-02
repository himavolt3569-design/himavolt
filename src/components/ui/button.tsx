import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const variantStyles: Record<string, string> = {
  primary: "bg-[var(--accent)] text-[#0c0c0c] hover:bg-[#f0b85d] shadow-lg shadow-[var(--accent)]/15",
  ghost: "bg-transparent text-[var(--text-1)] hover:bg-[#fdf9ef]",
  outline: "bg-transparent text-[var(--text-1)] border border-[#f4d69a]/40 hover:border-[var(--accent)]/40 hover:bg-[#fdf9ef]",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3.5 py-1.5 text-xs rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-sm rounded-full",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 active:scale-[0.97]",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button };
