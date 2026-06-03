"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  iconColor = "bg-academic-navy/10 text-academic-navy",
  trend,
}: KpiCardProps) {
  const trendColor =
    trend?.direction === "up"
      ? "text-success"
      : trend?.direction === "down"
      ? "text-danger"
      : "text-text-secondary";

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
      ? TrendingDown
      : null;

  return (
    <div className="rounded-2xl border border-border bg-card-bg p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-secondary">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-text-primary">{value}</p>
          {trend && (
            <div className="mt-1.5 flex items-center gap-1">
              {TrendIcon && <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />}
              <span className={`text-xs font-medium ${trendColor}`}>
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-xs text-text-secondary">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
