import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardModal from './DashboardModal';
import { useApiAction } from '../api/useApiAction';
import { createInboxApi, paymentsToConfirm, type PaymentCandidate } from '../notifications/api';
import { SUBSCRIPTIONS_CHANGED } from '../subscriptions/events';

export default function PaymentConfirmations({ state, onReload, onCloseInbox, compact = false, isDemo = false, onConfirmed }: {
  state: { kind: 'loading' | 'ready' | 'error'; items: PaymentCandidate[] }; onReload: () => void; onCloseInbox: () => void; compact?: boolean; isDemo?: boolean; onConfirmed?: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [declined, setDeclined] = useState<PaymentCandidate | null>(null);
  const [selected, setSelected] = useState<PaymentCandidate | null>(null);
  const [message, setMessage] = useState('');
  const { run, pending, error } = useApiAction();
  const candidates = paymentsToConfirm(state.items);
  const amount = (item: PaymentCandidate) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: item.currency }).format(item.amount);
  async function confirm(item: PaymentCandidate) {
    if (isDemo) return;
    setMessage('');
    const result = await run((token, signal) => createInboxApi(import.meta.env.VITE_API_BASE_URL || '/api').confirm(token, item.id, signal));
    setSelected(null);
    if (result) {
      setMessage(`Оплата «${item.name}» подтверждена. Следующее списание: ${new Date(`${result.value.date}T12:00:00`).toLocaleDateString('ru-RU')}.`);
      onConfirmed?.(item.id);
      window.dispatchEvent(new Event(SUBSCRIPTIONS_CHANGED));
    }
    // Уточняем результат чтением с сервера, не повторяя подтверждение автоматически.
    onReload();
  }
  function goToSubscription(item: PaymentCandidate, remove: boolean) {
    onCloseInbox();
    navigate(remove ? '/subscriptions' : `/subscriptions/${encodeURIComponent(item.id)}/edit`, remove ? { state: { deleteSubscriptionId: item.id } } : undefined);
  }
  return <section aria-label="Подтверждение списаний" className="inbox-payment-section">
    {selected && <DashboardModal titleId="payment-confirm-title" onClose={() => { if (!pending) setSelected(null); }}><header className="inbox-heading"><div><h2 id="payment-confirm-title" tabIndex={-1}>Подтвердить списание?</h2></div><button type="button" className="inbox-close" disabled={pending} onClick={() => setSelected(null)} aria-label="Закрыть подтверждение">×</button></header><div className="inbox-detail"><p>Оплата {amount(selected)} за «{selected.name}» прошла?</p><p className="inbox-payment-hint">Подтверждение обновит дату следующего платежа. Деньги с карты не списываются.</p>{isDemo && <p className="inbox-payment-hint">Демо-режим: подтверждение оплаты недоступно, реальные данные не меняются.</p>}<div className="inbox-actions"><button type="button" className="inbox-read-button" disabled={pending} onClick={() => setSelected(null)}>Отмена</button><button type="button" className="inbox-primary" disabled={pending || isDemo} onClick={() => void confirm(selected)}>{pending ? 'Сохраняем…' : 'Да, оплата прошла'}</button></div></div></DashboardModal>}
    {declined && <DashboardModal titleId="payment-declined-title" onClose={() => setDeclined(null)}><header className="inbox-heading"><div><h2 id="payment-declined-title" tabIndex={-1}>Что делать с подпиской?</h2><p>Списание за «{declined.name}» не подтверждено. Выберите дальнейшее действие.</p></div><button type="button" className="inbox-close" aria-label="Закрыть выбор действия" onClick={() => setDeclined(null)}>×</button></header><div className="inbox-detail"><div className="inbox-actions"><button type="button" className="inbox-danger" onClick={() => goToSubscription(declined, true)}>Удалить подписку</button><button type="button" className="inbox-primary" onClick={() => goToSubscription(declined, false)}>Редактировать подписку</button></div><p className="inbox-payment-hint">Удаление потребуется подтвердить отдельно.</p><button type="button" className="inbox-read-button" onClick={() => setDeclined(null)}>Отмена</button></div></DashboardModal>}
    {message && <p role="status" className="inbox-payment-message">{message}</p>}
    {error && <p role="alert" className="inbox-payment-error">{error}</p>}
    {state.kind === 'loading' && <p role="status">Проверяем даты списаний…</p>}
    {state.kind === 'error' && <div role="alert"><p>Не удалось загрузить платежи.</p><button type="button" className="inbox-read-button" onClick={onReload}>Обновить платежи</button></div>}
    {state.kind === 'ready' && candidates.length > 0 && <>
      {!compact && <h3 className="inbox-day">Требуют подтверждения</h3>}
      {!compact && <p className="inbox-payment-hint">Подтвердите только платежи, которые уже состоялись.</p>}
      {candidates.map(item => <article key={item.id} className={compact ? 'inbox-payment-compact' : 'inbox-card'}><div className="inbox-card-body">
        {!compact && <h4 className="inbox-card-heading">{item.name} — {amount(item)}</h4>}
        {!compact && <p className="inbox-message">Дата списания: {new Date(`${item.date}T12:00:00`).toLocaleDateString('ru-RU')}</p>}
        <div className="inbox-card-footer"><p>Подтвердить оплату?</p><div className="inbox-actions"><button type="button" className="inbox-primary" disabled={pending} onClick={() => { setSelected(item); setMessage(''); }}>Да</button><button type="button" className="inbox-read-button" disabled={pending} onClick={() => setDeclined(item)}>Нет</button></div></div>
      </div></article>)}
    </>}
  </section>;
}
