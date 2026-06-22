export default function LecturerLoading() {
  return (
    <div className="px-page pt-14 pb-14 max-w-lg mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between pb-4">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded-full bg-muted" />
          <div className="h-8 w-52 rounded-full bg-muted" />
          <div className="h-5 w-36 rounded-full bg-muted" />
        </div>
        <div className="h-9 w-9 rounded-full bg-muted" />
      </div>

      {/* Balance hero card */}
      <div className="h-44 rounded-[28px] bg-muted mb-8" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="h-24 rounded-card bg-muted" />
        <div className="h-24 rounded-card bg-muted" />
      </div>

      {/* Upload CTA */}
      <div className="h-16 rounded-[18px] bg-muted mb-10" />

      {/* Activity section */}
      <div className="h-6 w-36 rounded-full bg-muted mb-4" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-card bg-muted" />
        ))}
      </div>
    </div>
  );
}
