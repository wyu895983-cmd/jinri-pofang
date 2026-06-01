export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="glass animate-pulse rounded-card p-5" key={index}>
          <div className="mb-5 flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-3 w-16 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 rounded-full bg-white/10" />
            <div className="h-4 w-3/4 rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
