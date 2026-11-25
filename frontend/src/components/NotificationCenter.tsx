import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardModal from './DashboardModal';
import { filterInbox, localDayKey, notificationDayLabel, notificationPresentation, type InboxFilter, type InboxNotification } from '../notifications/inboxModel';
import type { PaymentCandidate } from '../notifications/api';
import { subscriptionStatusLabels, type Subscription } from '../subscriptions/model';

export type InboxState = { kind: 'ready'; items: InboxNotification[] } | { kind: 'loading' } | { kind: 'error' } | { kind: 'unavailable' };
type Props = {
  state: InboxState; read: ReadonlySet<string>; onRead: (id: string) => void; onHide: (id: string) => void;
  onClose: () => void; onRetry?: () => void; demo?: boolean; storageWarning?: boolean; demoControls?: ReactNode; paymentSection?: ReactNode;
  renderPaymentActions?: (item: InboxNotification) => ReactNode;
  subscriptions: PaymentCandidate[]; subscriptionsReady: boolean; undo?: ReactNode;
};
export default function NotificationCenter({ state, read, onRead, onHide, onRetry, onClose, demo = false, storageWarning = false, demoControls, paymentSection, subscriptions, subscriptionsReady, undo, renderPaymentActions }: Props) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [details, setDetails] = useState<InboxNotification | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => { document.getElementById('notification-center-title')?.focus(); }, [details]);
  const items = state.kind === 'ready' ? state.items : [];
  const unread = items.filter(item => !read.has(item.id)).length;
  const visible = useMemo(() => filterInbox(items, filter, read), [items, filter, read]);
  const subscription = details ? subscriptions.find(item => item.id === details.subscriptionId) : undefined;
  const title = (item: InboxNotification) => item.genericTitle ? 'Уведомление' : notificationPresentation[item.type].title;
  function openDetails(item: InboxNotification) { onRead(item.id); setMenu(null); setDetails(item); }
  function editSubscription(id: string) { onClose(); navigate(`/subscriptions/${encodeURIComponent(id)}/edit`); }
  return <DashboardModal titleId="notification-center-title" onClose={onClose}>
    <header className="inbox-heading"><div><h2 id="notification-center-title" tabIndex={-1} className="font-unbounded">{details ? 'Информация о подписке' : 'Уведомления'}</h2><p>{details ? title(details) : 'Важные события и предстоящие платежи'}</p></div><button type="button" className="inbox-close" aria-label="Закрыть уведомления" onClick={onClose}>×</button></header>
    {details ? <div className="inbox-detail">
      <p className="inbox-message">{details.message}</p>
      {subscription ? <dl className="inbox-subscription-info"><dt>Подписка</dt><dd>{subscription.name}</dd><dt>Стоимость за период</dt><dd>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: subscription.currency }).format(subscription.amount)}</dd><dt>Дата списания</dt><dd>{new Date(`${subscription.date}T12:00:00`).toLocaleDateString('ru-RU')}</dd><dt>Статус</dt><dd>{subscriptionStatusLabels[subscription.status as Subscription['status']] ?? subscription.status}</dd></dl>
        : <p className="inbox-payment-hint">{!details.subscriptionId ? 'Уведомление не связано с подпиской.' : subscriptionsReady ? 'Связанная подписка отсутствует или недоступна.' : 'Информация о подписке пока не загружена.'}</p>}
      <div className="inbox-actions"><button type="button" className="inbox-read-button" onClick={() => setDetails(null)}>К уведомлениям</button>{subscription && <button type="button" className="inbox-primary" onClick={() => editSubscription(subscription.id)}>Редактировать подписку</button>}</div>
    </div> : <>
      {demo && <p className="inbox-demo">Демо · тестовые уведомления</p>}
      <div className="inbox-filters" role="group" aria-label="Фильтр уведомлений">{([{ id: 'all', label: 'Все' }, { id: 'unread', label: 'Непрочитанные' }, { id: 'payments', label: 'Платежи' }] as const).map(tab => <button type="button" key={tab.id} aria-pressed={filter === tab.id} onClick={() => { setFilter(tab.id); setMenu(null); }}>{tab.label}{tab.id === 'unread' && <span className="inbox-filter-count">{unread}</span>}</button>)}</div>
      <div className="inbox-content" aria-busy={state.kind === 'loading'}>
        {undo}
        {paymentSection && <div hidden={filter === 'unread'}>{paymentSection}</div>}
        {state.kind === 'loading' && <div role="status" className="inbox-state"><h3>Загружаем уведомления…</h3><div className="skeleton h-20 w-full" /><div className="skeleton h-20 w-full" /></div>}
        {state.kind === 'error' && <div role="alert" className="inbox-state"><h3>Не удалось загрузить уведомления</h3><p>Попробуйте ещё раз чуть позже.</p>{onRetry && <button type="button" className="inbox-primary" onClick={onRetry}>Повторить</button>}</div>}
        {state.kind === 'unavailable' && <div className="inbox-state"><h3>Уведомления пока недоступны</h3><p>Пожалуйста, загляните позже.</p></div>}
        {state.kind === 'ready' && visible.length === 0 && <div role="status" className="inbox-state"><h3>{filter === 'unread' ? 'У вас нет новых уведомлений' : filter === 'payments' ? 'Нет уведомлений о платежах' : 'Пока нет уведомлений'}</h3>{filter === 'payments' && items.some(item => item.genericTitle) && <p>Типы некоторых событий пока недоступны. Посмотрите вкладку «Все».</p>}</div>}
        {state.kind === 'ready' && visible.length > 0 && <ul className="inbox-list" aria-label="Список уведомлений">{visible.map((item, index) => {
          const presentation = notificationPresentation[item.type];
          const isRead = read.has(item.id);
          const startsDay = index === 0 || localDayKey(item.createdAt) !== localDayKey(visible[index - 1].createdAt);
          return <li key={item.id}>{startsDay && <h3 className="inbox-day">{notificationDayLabel(item.createdAt)}</h3>}
            <article className={`inbox-card ${isRead ? 'is-read' : 'is-unread'}`} aria-labelledby={`notification-${item.id}`}>
              <span className={`inbox-type inbox-type-${presentation.tone}`} aria-hidden="true">{presentation.icon}</span>
              <div className="inbox-card-body">
                <button type="button" className="inbox-card-open" onClick={() => openDetails(item)} aria-label={`Открыть: ${title(item)}`}><span className="inbox-card-heading"><span id={`notification-${item.id}`} className="inbox-card-title">{title(item)}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time></span><span className="inbox-message block">{item.message}</span></button>
                <div className="inbox-card-footer">{isRead ? <span className="inbox-read-status">✓ Прочитано</span> : <><span className="inbox-unread-status"><span aria-hidden="true" />Новое</span><button type="button" className="inbox-read-button" onClick={() => onRead(item.id)}>Прочитать</button></>}</div>
                {renderPaymentActions?.(item)}
                <div className="inbox-menu" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(null); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setMenu(null); event.currentTarget.querySelector('button')?.focus(); } }}>
                  <button type="button" className="inbox-menu-trigger" aria-label={`Управление уведомлением: ${title(item)}`} aria-expanded={menu === item.id} onClick={() => setMenu(current => current === item.id ? null : item.id)}>⋮</button>
                  {menu === item.id && <div className="inbox-menu-actions" role="group" aria-label="Управление уведомлением"><button type="button" disabled={isRead} onClick={() => { onRead(item.id); setMenu(null); }}>Отметить как прочитанное</button><button type="button" onClick={() => { onHide(item.id); setMenu(null); }} className="text-red-700">Удалить из этого браузера</button></div>}
                </div>
              </div>
            </article>
          </li>;
        })}</ul>}
      </div>
      {demo && demoControls}
      <footer className="inbox-footer"><p aria-live="polite">{storageWarning ? 'Не удалось сохранить изменения. Они действуют до перезагрузки страницы.' : 'Прочтение и скрытие уведомлений сохраняются только в этом браузере.'}</p><span className="sr-only" role="status">Непрочитанных уведомлений: {unread}</span></footer>
    </>}
  </DashboardModal>;
}
