export default function SectionPlaceholder({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-[#e1e5dc] bg-white p-6 sm:p-8">
      <h2 className="text-xl text-[#123d12]">{title === 'Дашборд' ? 'Сводка по подпискам' : 'Список подписок'}</h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#687468]">{title === 'Дашборд' ? 'Здесь появятся расходы за месяц, категории и ближайшие списания.' : 'Здесь появятся поиск, фильтры и управление подписками.'}</p>
      <p className="mt-4 text-sm text-[#687468]">Раздел готов для навигации. Данные и действия будут подключены в следующих задачах.</p>
    </section>
  );
}
