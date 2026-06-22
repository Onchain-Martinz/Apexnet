export default function TextbooksLoading() {
  return (
    <div className="px-page pt-12 pb-6 max-w-lg mx-auto animate-pulse space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-full bg-muted" />
        <div className="h-4 w-64 rounded-full bg-muted" />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-muted" />
        ))}
      </div>

      {/* Book grid */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="overflow-hidden rounded-card bg-muted">
            <div className="aspect-[3/4] w-full" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-full rounded-full bg-muted-foreground/10" />
              <div className="h-3 w-20 rounded-full bg-muted-foreground/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
