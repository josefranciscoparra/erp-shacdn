import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "secondary" | "ghost";
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
  xl: "h-12 w-12 border-4",
};

const variantClasses = {
  default: "border-muted-foreground/30 border-t-muted-foreground",
  primary: "border-primary/30 border-t-primary",
  secondary: "border-secondary/30 border-t-secondary",
  ghost: "border-white/30 border-t-white",
};

export function Spinner({ className, size = "md", variant = "default", ...props }: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin rounded-full", sizeClasses[size], variantClasses[variant], className)}
      {...props}
    />
  );
}
