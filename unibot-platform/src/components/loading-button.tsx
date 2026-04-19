"use client";

import { useTransition, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loadingText?: string;
  loading?: boolean;
  children: ReactNode;
  variant?: "primary" | "danger" | "success" | "ghost" | "warning";
  size?: "sm" | "md" | "lg";
}

const VARIANT_CLASSES = {
  primary: "bg-action-blue text-white hover:bg-action-blue/90 disabled:bg-action-blue/50",
  danger:  "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
  success: "bg-success text-white hover:bg-success/90 disabled:bg-success/50",
  warning: "bg-warning text-white hover:bg-warning/90 disabled:bg-warning/50",
  ghost:   "border border-border bg-transparent text-text-primary hover:bg-app-bg disabled:opacity-50",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function LoadingButton({
  loadingText,
  loading: externalLoading,
  children,
  variant = "primary",
  size = "md",
  disabled,
  onClick,
  className = "",
  type = "button",
  ...props
}: LoadingButtonProps) {
  const [isPending, startTransition] = useTransition();
  const isLoading = externalLoading ?? isPending;

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!onClick) return;
    startTransition(() => {
      onClick(e);
    });
  }

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick ? handleClick : undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-all duration-200 disabled:cursor-not-allowed",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
}
