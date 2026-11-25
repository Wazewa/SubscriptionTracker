import { useState } from 'react';
import { useApiAction } from '../api/useApiAction';
import { createInboxApi, paymentsToConfirm, type PaymentCandidate } from '../notifications/api';
import { SUBSCRIPTIONS_CHANGED } from '../subscriptions/events';

export default function PaymentConfirmations({ state, onReload }: {
  state: { kind: 'loading' | 'ready' | 'error'; items: PaymentCandidate[] }; onReload: () => void;
}) {
  const [selected, setSelected] = useState<PaymentCandidate | null>(null);
  const [message, setMessage] = useState('');
  const { run, pending, error } = useApiAction();
  const candidates = paymentsToConfirm(state.items);
  const amount = (item: PaymentCandidate) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: item.currency }).format(item.amount);
  async function confirm(item: PaymentCandidate) {
    setMessage('');
    const result = await run((token, signal) => createInboxApi(import.meta.env.VITE_API_BASE_URL || '/api').confirm(token, item.id, signal));
    setSelected(null);
    if (result) {
      setMessage(`Оплата «${item.name}» подтверждена. Следующее списание: ${new Date(`${result.value.date}T12:00:00`).toLocaleDateString('ru-RU')}.`);
      window.dispatchEvent(new Event(SUBSCRIPTIONS_CHANGED));
    }
    // Уточняем результат чтением с сервера, не повторяя подтверждение автоматически.
    onReload();
  }
  return <section aria-label="Подтверждение списаний" className="inbox-payment-section">
    {message && <p role="status" className="inbox-payment-message">{message}</p>}
    {error && <p role="alert" className="inbox-payment-error">{error}</p>}
    {state.kind === 'loading' && <p role="status">Проверяем даты списаний…</p>}
    {state.kind === 'error' && <div role="alert"><p>Не удалось загрузить платежи.</p><button type="button" className="inbox-read-button" onClick={onReload}>Обновить платежи</button></div>}
    {state.kind === 'ready' && candidates.length > 0 && <>
      <h3 className="inbox-day">Требуют подтверждения</h3>
      <p className="inbox-payment-hint">Подтвердите только платежи, которые уже состоялись.</p>
      {candidates.map(item => <article key={item.id} className="inbox-card"><div className="inbox-card-body">
        <h4 className="inbox-card-heading">{item.name} — {amount(item)}</h4>
        <p className="inbox-message">Дата списания: {new Date(`${item.date}T12:00:00`).toLocaleDateString('ru-RU')}</p>
        {selected?.id === item.id ? <div className="inbox-payment-confirm" role="group" aria-label={`Подтвердить оплату ${item.name}`}>
          <p>Оплата {amount(item)} за «{item.name}» прошла? Следующая дата будет рассчитана от дня подтверждения. Деньги с карты не списываются.</p>
          <div className="inbox-card-footer"><button type="button" className="inbox-read-button" disabled={pending} onClick={() => setSelected(null)}>Отмена</button><button type="button" className="inbox-primary" disabled={pending} onClick={() => void confirm(item)}>{pending ? 'Сохраняем…' : 'Да, оплата прошла'}</button></div>
        </div> : <button type="button" className="inbox-read-button mt-2" disabled={pending} onClick={() => { setSelected(item); setMessage(''); }}>Подтвердить списание</button>}
      </div></article>)}
    </>}
  </section>;
}
