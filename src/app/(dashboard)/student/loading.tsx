export default function StudentLoading() {
  return (
    <div className="px-page pt-12 pb-10 max-w-2xl mx-auto animate-pulse">
      {/* Greeting */}
      <div className="flex items-start justify-between pb-8">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-full bg-muted" />
          <div className="h-4 w-56 rounded-full bg-muted" />
        </div>
        <div className="h-11 w-11 rounded-full bg-muted" />
      </div>

      {/* Overview card */}
      <div className="h-24 rounded-card bg-muted mb-8" />

      {/* Section label */}
      <div className="h-5 w-44 rounded-full bg-muted mb-4" />

      {/* Semester materials grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-8 mb-8">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-square rounded-card bg-muted" />
        ))}
      </div>

      {/* Section label */}
      <div className="h-5 w-32 rounded-full bg-muted mb-4" />

      {/* Recently added row */}
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 w-28 flex-shrink-0 rounded-card bg-muted" />
        ))}
      </div>
    </div>
  );
}
