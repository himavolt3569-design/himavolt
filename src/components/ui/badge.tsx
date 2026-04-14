import { cn } from "@/lib/utils";

const variantStyles: Record<string, string> = {
  default: "bg-[#3e1e0c] text-white border-transparent",
  secondary: "bg-[#fdf9ef] text-[#8e491e] border-[#f4d69a]/30",
  outline: "bg-transparent text-white/80 border-white/20",
  saffron: "bg-[#eaa94d]/10 text-[#b25c1c] border-[#eaa94d]/20",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantStyles;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider border",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
