export default function AdminBookingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-lg" />
      </div>

      <div className="h-12 w-full bg-slate-200 rounded-lg" />

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
            <div className="space-y-2">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-24 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
