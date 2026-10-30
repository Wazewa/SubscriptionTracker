export default function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Загрузка сводки" aria-busy="true" className="grid gap-5 lg:grid-cols-2">
      <span className="sr-only">Загружаем сводку по подпискам…</span>
      <div aria-hidden="true" className="rounded-3xl border border-[#e1e5dc] bg-white p-6">
        <div className="skeleton mb-8 h-5 w-48" /><div className="skeleton mx-auto h-44 w-44 !rounded-full" />
        <div className="skeleton mt-7 h-4 w-full" /><div className="skeleton mt-4 h-4 w-3/4" />
      </div>
      <div aria-hidden="true" className="rounded-3xl border border-[#e1e5dc] bg-white p-6">
        <div className="skeleton mb-8 h-5 w-48" />
        {[1, 2, 3, 4, 5].map((id) => <div key={id} className="mb-6 flex gap-4"><div className="skeleton h-10 w-10 shrink-0" /><div className="flex-1"><div className="skeleton h-4 w-full" /><div className="skeleton mt-3 h-3 w-24" /></div></div>)}
      </div>
    </div>
  );
}
