import { periodLabels, type Category, type SubscriptionFilters } from '../subscriptions/model';

type Props = {
  value: SubscriptionFilters;
  categories: Category[];
  disabled?: boolean;
  onChange: (filters: SubscriptionFilters) => void;
};
const fieldClass = 'mt-2 w-full rounded-xl border border-[#cbdcc7] bg-white px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50';

export default function Filters({ value, categories, disabled = false, onChange }: Props) {
  const options = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
  const filtered = Boolean(value.search || value.category || value.period);
  const change = (field: keyof SubscriptionFilters, next: string) => onChange({ ...value, [field]: next });
  return (
    <section aria-label="Фильтры подписок" className="mb-5 grid gap-4 rounded-3xl border border-[#e1e5dc] bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">Поиск<input type="search" placeholder="Название подписки" value={value.search} disabled={disabled} onChange={(event) => change('search', event.target.value)} className={fieldClass} /></label>
      <label className="text-sm">Категория<select value={value.category} disabled={disabled} onChange={(event) => change('category', event.target.value)} className={fieldClass}><option value="">Все категории</option>{options.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="text-sm">Период<select value={value.period} disabled={disabled} onChange={(event) => change('period', event.target.value)} className={fieldClass}><option value="">Все периоды</option>{Object.entries(periodLabels).map(([period, label]) => <option key={period} value={period}>{label}</option>)}</select></label>
      <button type="button" disabled={disabled || !filtered} onClick={() => onChange({ search: '', category: '', period: '' })} className="self-end rounded-xl border border-[#cbdcc7] px-3 py-3 text-sm hover:bg-[#eef4e9] focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50">Сбросить фильтры</button>
    </section>
  );
}
