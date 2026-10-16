
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SubscriptionsTable from '../components/SubscriptionsTable';
import Filters from '../components/Filters';
import {
  filterSubscriptions,
  type Subscription,
  type SubscriptionFilters,
} from '../subscriptions/model';
import {
  useSubscriptions,
  type DemoScenario,
} from '../subscriptions/useSubscriptions';

const emptyFilters: SubscriptionFilters = {
  search: '',
  category: '',
  period: '',
};

const actionClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-[#2e9b62] px-5 py-3 text-sm text-white hover:bg-[#257c4e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700';

const scenarios: { value: DemoScenario; label: string }[] = [
  { value: 'data', label: 'Есть данные' },
  { value: 'empty', label: 'Нет подписок' },
  { value: 'loading', label: 'Загрузка' },
  { value: 'error', label: 'Ошибка' },
];

export default function SubscriptionsPage() {
  const navigate = useNavigate();

  const [scenario, setScenario] = useState<DemoScenario>('data');
  const [filters, setFilters] =
    useState<SubscriptionFilters>(emptyFilters);

  const {
    state,
    isDemo,
    apiEnabled,
    categories: apiCategories,
    reload,
  } = useSubscriptions(scenario, filters);

  const allRows = state.kind === 'ready' ? state.rows : [];

  const rows = isDemo
    ? filterSubscriptions(allRows, filters)
    : allRows;

  const categories = isDemo
    ? [...new Set(allRows.map((row) => row.category))]
    : apiCategories;

  const filtered = Boolean(
    filters.search.trim() || filters.category || filters.period,
  );

  const available = state.kind === 'ready';

  const handleEdit = (subscription: Subscription) => {
    navigate(`/subscriptions/${subscription.id}/edit`, {
      state: { subscription },
    });
  };

  return (
    <div className="max-w-[1200px]">
      {isDemo && (
        <section
          aria-label="Режим демонстрации"
          className="mb-6 rounded-2xl border border-[#cbdcc7] bg-[#eef4e9] p-4"
        >
          <p className="text-sm">
            Демо-данные — не реальные подписки. API пока не подключён.
          </p>

          <div
            role="group"
            aria-label="Состояния демо"
            className="mt-3 flex flex-wrap gap-2"
          >
            {scenarios.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={scenario === item.value}
                onClick={() => {
                  setFilters(emptyFilters);
                  setScenario(item.value);
                }}
                className={`rounded-lg border px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-green-700 ${
                  scenario === item.value
                    ? 'border-[#285d25] bg-white'
                    : 'border-transparent hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#687468]">
          Все ваши подписки в одном месте
        </p>

        <Link to="/subscriptions/new" className={actionClass}>
          <span aria-hidden="true">＋</span>
          Добавить подписку
        </Link>
      </div>

      <Filters
        value={filters}
        categories={categories}
        disabled={isDemo ? !available : !apiEnabled}
        onChange={setFilters}
      />

      {state.kind === 'error' ? (
        <section
          role="alert"
          className="rounded-3xl border border-[#e1e5dc] bg-white p-7"
        >
          <h2 className="font-unbounded text-lg">
            Не удалось загрузить подписки
          </h2>

          <p className="mt-3 text-sm text-[#687468]">
            {state.message}
          </p>

          <button
            type="button"
            onClick={reload}
            className={`${actionClass} mt-5`}
          >
            Повторить загрузку
          </button>
        </section>
      ) : (
        <>
          <p role="status" className="mb-3 text-sm text-[#687468]">
            {available
              ? isDemo
                ? `Показано: ${rows.length} из ${allRows.length}`
                : `Найдено подписок: ${rows.length}`
              : 'Загружаем список…'}
          </p>

          <SubscriptionsTable
            rows={rows}
            loading={state.kind === 'loading'}
            filtered={filtered}
            onEdit={handleEdit}
          />
        </>
      )}

      <p className="mt-4 text-xs text-[#687468]">
        Формы и окно удаления доступны для проверки интерфейса. Создание, изменение и удаление данных пока не подключены к API.
      </p>
    </div>
  );
}
