// Reusable skeleton primitives
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-border/60 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-3 mt-2 ${i === 0 ? "w-full" : i === 1 ? "w-5/6" : "w-4/6"}`} />
      ))}
    </div>
  );
}

export function PageLoadingSkeleton({ title, cards = 3 }: { title: string; cards?: number }) {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <SkeletonBlock className="h-7 w-48 mb-2" />
        <SkeletonBlock className="h-4 w-72" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <SkeletonCard key={i} rows={2} />
        ))}
      </div>
    </div>
  );
}
