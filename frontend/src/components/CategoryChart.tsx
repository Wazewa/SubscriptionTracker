import { categoryPercentages, formatMoney, type CategoryTotal } from '../dashboard/model';

const colors = ['#2e9b62', '#8bb65a', '#d1df7f', '#367e83', '#bc9962', '#8666a3'];
export default function CategoryChart({ categories }: { categories: CategoryTotal[] }) {
  const visible = categories.filter((item) => item.amountMinor > 0);
  const total = visible.reduce((sum, item) => sum + item.amountMinor, 0);
  const percentages = categoryPercentages(visible);
  let cumulative = 0;
  const segments = visible.map((category, index) => {
    const start = cumulative;
    cumulative += category.amountMinor / total * 100;
    return `${colors[index % colors.length]} ${start}% ${cumulative}%`;
  });
  return (
    <section className="rounded-3xl border border-[#e1e5dc] bg-white p-6 sm:p-7" aria-labelledby="category-title">
      <h2 id="category-title" className="font-unbounded text-lg text-[#101b10]">Расходы по категориям</h2>
      {total === 0 ? <p className="mt-8 text-sm text-[#687468]">За этот месяц нет расходов для диаграммы.</p> : <>
        <div aria-hidden="true" className="mx-auto my-8 h-44 w-44 rounded-full" style={{ background: `conic-gradient(${segments.join(', ')})` }} />
        <ul className="space-y-4" aria-label="Расходы по категориям: суммы и доли">
          {visible.map((category, index) => <li key={category.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="break-words">{category.name}</span></span>
            <span>{formatMoney(category.amountMinor)} · {percentages[index]}%</span>
          </li>)}
        </ul>
      </>}
    </section>
  );
}
