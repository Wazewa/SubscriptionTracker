import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import notificationIcon from '../assets/icons/notification1.svg';
import NotificationCenter, { type InboxState } from './NotificationCenter';
import { createInboxDemo } from '../notifications/inboxDemo';
import { loadReadNotifications, saveReadNotifications, loadHiddenNotifications, saveHiddenNotifications } from '../notifications/inboxModel';
import { useInbox } from '../notifications/useInbox';
import PaymentConfirmations from './PaymentConfirmations';
import { createDemoSubscriptions } from '../subscriptions/demo';
import type { InboxNotification } from '../notifications/inboxModel';

function storage() { try { return window.localStorage; } catch { return null; } }

// При смене аккаунта AppLayout пересоздаёт компонент и сбрасывает состояние уведомлений.
export default function NotificationBell() {
  const { user } = useAuth();
  const demo = import.meta.env.DEV && user?.isDemo === true;
  const identity = demo ? `demo:${user.email}` : user?.email ?? '';
  const demoItems = useMemo(() => demo ? createInboxDemo() : [], [demo]);
  const [read, setRead] = useState(() => loadReadNotifications(identity, storage()));
  const [hidden, setHidden] = useState(() => loadHiddenNotifications(identity, storage()));
  const [lastHidden, setLastHidden] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const inbox = useInbox(!demo, open);
  const [storageWarning, setStorageWarning] = useState(false);
  const [scenario, setScenario] = useState<'data' | 'empty' | 'loading' | 'error'>('data');
  const allItems = demo ? demoItems : inbox.state.kind === 'ready' ? inbox.state.items : [];
  const items = allItems.filter(item => !hidden.has(item.id));
  const demoSubscriptions = useMemo(() => demo ? createDemoSubscriptions().map(item => ({ id: item.id, name: item.name, amount: item.amountMinor / 100, currency: item.currency, date: item.nextPaymentDate, status: item.status })) : [], [demo]);
  const paymentState = demo ? { kind: 'ready' as const, items: demoSubscriptions } : inbox.paymentState;
  const hasCardActions = (item: InboxNotification) => ['PAYMENT_PROBLEM', 'PAYMENT_REMINDER'].includes(item.type) && !!item.subscriptionId;
  const linkedIds = new Set(items.filter(hasCardActions).map(item => item.subscriptionId));
  const unread = items.filter(item => !read.has(item.id)).length;
  const state: InboxState = !demo ? (inbox.state.kind === 'ready' ? { kind: 'ready', items } : inbox.state) : scenario === 'data'
    ? { kind: 'ready', items } : scenario === 'empty' ? { kind: 'ready', items: [] } : { kind: scenario };
  const markRead = (id: string) => {
    if (!items.some(item => item.id === id)) return;
    const next = new Set(read); next.add(id);
    setRead(next); setStorageWarning(!saveReadNotifications(identity, next, storage()));
  };
  function hide(id: string) {
    const next = new Set(hidden); next.add(id); setHidden(next); setLastHidden(id);
    setStorageWarning(!saveHiddenNotifications(identity, next, storage()));
  }
  function restore() {
    if (!lastHidden) return;
    const next = new Set(hidden); next.delete(lastHidden); setHidden(next); setLastHidden(null);
    setStorageWarning(!saveHiddenNotifications(identity, next, storage()));
  }
  function archiveConfirmed(id: string) {
    const next = new Set(hidden);
    for (const item of allItems) if (item.subscriptionId === id && hasCardActions(item)) next.add(item.id);
    setHidden(next); setStorageWarning(!saveHiddenNotifications(identity, next, storage()));
  }
  return <>
    <button type="button" className="inbox-bell" aria-label={`Открыть уведомления. Непрочитанных: ${unread}`} title="Уведомления" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <img src={notificationIcon} alt="" className="h-8 w-8" />{unread > 0 && <span className="inbox-bell-count" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <NotificationCenter state={state} read={read} onRead={markRead} onHide={hide}
      subscriptions={paymentState.items} subscriptionsReady={paymentState.kind === 'ready'}
      renderPaymentActions={item => hasCardActions(item) && paymentState.kind === 'ready' ? <PaymentConfirmations compact isDemo={demo} state={{ kind: 'ready', items: paymentState.items.filter(subscription => subscription.id === item.subscriptionId) }} onReload={inbox.reload} onCloseInbox={() => setOpen(false)} onConfirmed={archiveConfirmed} /> : null}
      undo={lastHidden && <p role="status" className="inbox-payment-message">Уведомление скрыто. <button type="button" className="inbox-read-button" onClick={restore}>Отменить</button></p>} onRetry={demo ? () => setScenario('data') : inbox.reload} onClose={() => setOpen(false)} demo={demo} storageWarning={storageWarning}
      paymentSection={<PaymentConfirmations isDemo={demo} state={{ ...paymentState, items: paymentState.items.filter(item => !linkedIds.has(item.id)) }} onReload={inbox.reload} onCloseInbox={() => setOpen(false)} onConfirmed={archiveConfirmed} />}
      demoControls={<details className="inbox-demo-controls"><summary>Состояния макета</summary><div role="group" aria-label="Состояния макета уведомлений">{([{ id: 'data', title: 'Есть данные' }, { id: 'empty', title: 'Пусто' }, { id: 'loading', title: 'Загрузка' }, { id: 'error', title: 'Ошибка' }] as const).map(item => <button type="button" key={item.id} aria-pressed={scenario === item.id} onClick={() => setScenario(item.id)}>{item.title}</button>)}</div></details>} />}
  </>;
}
