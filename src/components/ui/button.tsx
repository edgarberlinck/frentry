import * as React from "react";
import { cn } from "@/lib/utils";

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const variants: Record<string, string> = {
    default: "bg-neutral-900 text-white hover:bg-neutral-800",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-neutral-300 bg-white hover:bg-neutral-50",
    secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
    ghost: "hover:bg-neutral-100",
    link: "text-neutral-900 underline-offset-4 hover:underline",
  };

  const sizes: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export { Button };
