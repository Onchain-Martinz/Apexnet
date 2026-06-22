export default function DashboardLoading() {
  return (
    <div className="px-page pt-14 pb-14 max-w-lg mx-auto animate-pulse">
      <div className="h-4 w-28 rounded-full bg-muted mb-2" />
      <div className="h-9 w-52 rounded-full bg-muted mb-8" />
      <div className="h-40 rounded-[28px] bg-muted mb-8" />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="h-24 rounded-card bg-muted" />
        <div className="h-24 rounded-card bg-muted" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 rounded-card bg-muted" />
        ))}
      </div>
    </div>
  );
}
