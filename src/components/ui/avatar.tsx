"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

const sizeStyles: Record<string, string> = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
};

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export function Avatar({
  src,
  fallback = "?",
  size = "md",
  color = "#eaa94d",
  className,
  ...props
}: AvatarProps) {
  const [error, setError] = useState(false);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden shrink-0 flex items-center justify-center font-bold text-white",
        sizeStyles[size],
        className,
      )}
      style={{ backgroundColor: !src || error ? color : undefined }}
      {...props}
    >
      {src && !error ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}
