export default function BookingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
          <div className="h-8 w-48 bg-slate-200 rounded" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-56 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
