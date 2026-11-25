import { useState } from 'react';
import DashboardModal from './DashboardModal';
import { subscriptionStatusLabels, type Subscription } from '../subscriptions/model';

export default function SubscriptionStatusDialog({ subscription, onClose }: { subscription: Subscription; onClose: () => void }) {
  const [selected, setSelected] = useState(subscription.status);
  return <DashboardModal titleId="subscription-status-title" onClose={onClose}>
    <header className="inbox-heading"><div><h2 id="subscription-status-title" tabIndex={-1}>Изменить статус</h2><p>{subscription.name}</p></div><button type="button" className="inbox-close" aria-label="Закрыть окно статуса" onClick={onClose}>×</button></header>
    <div className="inbox-detail">
      <p>Текущий статус: <strong>{subscriptionStatusLabels[subscription.status]}</strong></p>
      <fieldset className="status-options"><legend>Новый статус</legend>
        {(['ACTIVE', 'PAUSED', 'UNPAID'] as const).map(status => <label key={status}><input type="radio" name="subscription-status" value={status} checked={selected === status} onChange={() => setSelected(status)} />{subscriptionStatusLabels[status]}</label>)}
      </fieldset>
      <p id="status-unavailable" className="inbox-payment-hint">Смена статуса пока недоступна. Выбранное значение не сохраняется, текущий статус подписки остаётся прежним.</p>
      <div className="inbox-actions"><button type="button" className="inbox-read-button" onClick={onClose}>Отмена</button><button type="button" className="inbox-primary" disabled aria-describedby="status-unavailable">Сохранить</button></div>
    </div>
  </DashboardModal>;
}
