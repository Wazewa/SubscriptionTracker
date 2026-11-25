import { useMemo, useState, type ReactNode } from 'react';
import DashboardModal from './DashboardModal';
import { filterInbox, localDayKey, notificationDayLabel, notificationPresentation, type InboxFilter, type InboxNotification } from '../notifications/inboxModel';

export type InboxState =
  | { kind: 'ready'; items: InboxNotification[] }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'unavailable' };

export default function NotificationCenter({ state, read, onRead, onRetry, onClose, demo = false, storageWarning = false, demoControls, paymentSection }: {
  state: InboxState; read: ReadonlySet<string>; onRead: (id: string) => void;
  onClose: () => void; onRetry?: () => void; demo?: boolean; storageWarning?: boolean; demoControls?: ReactNode; paymentSection?: ReactNode;
}) {
  const [filter, setFilter] = useState<InboxFilter>('all');
  const items = state.kind === 'ready' ? state.items : [];
  const unread = items.filter(item => !read.has(item.id)).length;
  const visible = useMemo(() => filterInbox(items, filter, read), [items, filter, read]);
  return <DashboardModal titleId="notification-center-title" onClose={onClose}>
    <header className="inbox-heading">
      <div><h2 id="notification-center-title" tabIndex={-1} className="font-unbounded">Уведомления</h2><p>Важные события и предстоящие платежи</p></div>
      <button type="button" className="inbox-close" aria-label="Закрыть уведомления" onClick={onClose}>×</button>
    </header>
    {demo && <p className="inbox-demo">Демо · тестовые уведомления</p>}
    <div className="inbox-filters" role="group" aria-label="Фильтр уведомлений">
      {([{ id: 'all', label: 'Все' }, { id: 'unread', label: 'Непрочитанные' }, { id: 'payments', label: 'Платежи' }] as const).map(tab =>
        <button type="button" key={tab.id} aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)}>{tab.label}{tab.id === 'unread' && <span className="inbox-filter-count">{unread}</span>}</button>)}
    </div>
    <div className="inbox-content" aria-busy={state.kind === 'loading'}>
      {paymentSection && <div hidden={filter === 'unread'}>{paymentSection}</div>}
      {state.kind === 'loading' && <div role="status" className="inbox-state"><span className="inbox-state-icon" aria-hidden="true">◷</span><h3>Загружаем уведомления…</h3><div className="skeleton h-20 w-full" /><div className="skeleton h-20 w-full" /></div>}
      {state.kind === 'error' && <div role="alert" className="inbox-state"><span className="inbox-state-icon" aria-hidden="true">!</span><h3>Не удалось загрузить уведомления</h3><p>Попробуйте ещё раз чуть позже.</p>{onRetry && <button type="button" className="inbox-primary" onClick={onRetry}>Повторить</button>}</div>}
      {state.kind === 'unavailable' && <div className="inbox-state"><span className="inbox-state-icon" aria-hidden="true">◷</span><h3>Уведомления пока недоступны</h3><p>Пожалуйста, загляните позже.</p></div>}
      {state.kind === 'ready' && visible.length === 0 && <div role="status" className="inbox-state"><span className="inbox-state-icon" aria-hidden="true">✓</span><h3>{filter === 'unread' && items.length ? 'Всё прочитано' : filter === 'payments' && items.length ? 'Нет уведомлений о платежах' : 'Пока нет уведомлений'}</h3><p>{filter === 'unread' && items.length ? 'Новых непрочитанных уведомлений нет.' : 'Здесь появятся важные события по вашим подпискам.'}</p></div>}
      {state.kind === 'ready' && visible.length > 0 && <ul className="inbox-list" aria-label="Список уведомлений">{visible.map((item, index) => {
        const presentation = notificationPresentation[item.type];
        const title = item.genericTitle ? 'Уведомление' : presentation.title;
        const isRead = read.has(item.id);
        const startsDay = index === 0 || localDayKey(item.createdAt) !== localDayKey(visible[index - 1].createdAt);
        return <li key={item.id}>
          {startsDay && <h3 className="inbox-day">{notificationDayLabel(item.createdAt)}</h3>}
          <article className={`inbox-card ${isRead ? 'is-read' : 'is-unread'}`} aria-labelledby={`notification-${item.id}`}>
            <span className={`inbox-type inbox-type-${presentation.tone}`} aria-hidden="true">{presentation.icon}</span>
            <div className="inbox-card-body"><div className="inbox-card-heading"><h4 id={`notification-${item.id}`}>{title}</h4><time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString('ru-RU')}>{new Date(item.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time></div>
              <p className="inbox-message">{item.message}</p>
              <div className="inbox-card-footer">{isRead ? <span className="inbox-read-status">✓ Прочитано</span> : <><span className="inbox-unread-status"><span aria-hidden="true" />Новое</span><button type="button" className="inbox-read-button" aria-label={`Прочитать: ${title}`} onClick={() => onRead(item.id)}>Прочитать</button></>}</div>
            </div>
          </article>
        </li>;
      })}</ul>}
    </div>
    {demo && demoControls}
    <footer className="inbox-footer"><p aria-live="polite">{storageWarning ? 'Не удалось сохранить отметку. Она действует до перезагрузки страницы.' : 'Отметки о прочтении сохраняются в этом браузере.'}</p><span className="sr-only" role="status">{state.kind === 'ready' ? `Непрочитанных уведомлений: ${unread}` : ''}</span></footer>
  </DashboardModal>;
}
