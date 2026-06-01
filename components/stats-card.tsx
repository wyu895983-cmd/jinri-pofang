export function StatsCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-card p-5">
      <p className="text-meta text-muted">{label}</p>
      <p className="mt-2 text-h2 text-white">{value}</p>
      {hint ? <p className="mt-2 text-label text-muted">{hint}</p> : null}
    </div>
  );
}
