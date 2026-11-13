export default function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Загрузка диаграммы" aria-busy="true" className="min-w-0">
      <span className="sr-only">Загружаем сводку по подпискам…</span>
      <div aria-hidden="true" className="rounded-3xl border border-[#e1e5dc] bg-white p-6">
        <div className="skeleton mb-8 h-5 w-48" /><div className="skeleton mx-auto h-44 w-44 !rounded-full" />
        <div className="skeleton mt-7 h-4 w-full" /><div className="skeleton mt-4 h-4 w-3/4" />
      </div>
    </div>
  );
}
