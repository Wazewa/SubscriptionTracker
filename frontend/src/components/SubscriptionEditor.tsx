import { Link, useNavigate } from 'react-router-dom';
import { useApiAction } from '../api/useApiAction';
import { createSubscriptionsApi } from '../subscriptions/api';
import { subscriptionPayload, type FormValues } from '../subscriptions/formModel';
import { useSubscriptions } from '../subscriptions/useSubscriptions';
import SubscriptionForm from './SubscriptionForm';
import { useToast } from '../notifications/ToastProvider';

export default function SubscriptionEditor({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { state, isDemo, reload } = useSubscriptions();
  const { notify } = useToast();
  const { pending, error, run } = useApiAction((message) => notify(`Не удалось сохранить подписку. ${message}`, { kind: 'error' }));
  if (state.kind === 'loading') return <p role="status" className="skeleton max-w-[680px] rounded-3xl p-8">Загружаем форму и категории…</p>;
  if (state.kind === 'error') return <section role="alert" className="rounded-3xl bg-white p-6"><p>{state.message}</p><button type="button" onClick={reload} className="mt-4 underline">Повторить загрузку</button></section>;
  const subscription = id ? state.rows.find((row) => row.id === id) : undefined;
  if (id && !subscription) return <section className="rounded-3xl bg-white p-6"><h2>Подписка не найдена</h2><p className="mt-3">Запись отсутствует или недоступна этому аккаунту.</p><Link to="/subscriptions" className="mt-4 inline-block underline">К списку подписок</Link></section>;
  async function save(values: FormValues) {
    if (state.kind !== 'ready') return;
    const result = await run(async (token, signal) => {
      const api = createSubscriptionsApi(import.meta.env.VITE_API_BASE_URL || '/api');
      const payload = subscriptionPayload(values, state.categories);
      return id ? api.update(token, id, payload, state.categories, signal) : api.create(token, payload, state.categories, signal);
    });
    if (result) {
      notify(id ? 'Подписка обновлена' : 'Подписка создана');
      navigate('/subscriptions', { replace: true });
    }
  }
  return <SubscriptionForm key={id || 'create'} mode={id ? 'edit' : 'create'} initialSubscription={subscription}
    categories={state.categories} pending={pending} isDemo={isDemo} notice={error} onSubmit={save} onCancel={() => navigate('/subscriptions')} />;
}
