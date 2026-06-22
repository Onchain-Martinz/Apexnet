export default function AdminLoading() {
  return (
    <div className="px-page pt-12 pb-6 max-w-lg mx-auto animate-pulse space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-full bg-muted" />
        <div className="h-7 w-36 rounded-full bg-muted" />
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-card bg-muted" />
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-card bg-muted" />
        ))}
      </div>
    </div>
  );
}
