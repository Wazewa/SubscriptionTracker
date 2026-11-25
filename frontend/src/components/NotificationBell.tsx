import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import notificationIcon from '../assets/icons/notification1.svg';
import NotificationCenter, { type InboxState } from './NotificationCenter';
import { createInboxDemo } from '../notifications/inboxDemo';
import { loadReadNotifications, saveReadNotifications } from '../notifications/inboxModel';
import { useInbox } from '../notifications/useInbox';
import PaymentConfirmations from './PaymentConfirmations';

function storage() { try { return window.localStorage; } catch { return null; } }

// При смене аккаунта AppLayout пересоздаёт компонент и сбрасывает состояние уведомлений.
export default function NotificationBell() {
  const { user } = useAuth();
  const demo = import.meta.env.DEV && user?.isDemo === true;
  const identity = demo ? `demo:${user.email}` : user?.email ?? '';
  const demoItems = useMemo(() => demo ? createInboxDemo() : [], [demo]);
  const [read, setRead] = useState(() => loadReadNotifications(identity, storage()));
  const [open, setOpen] = useState(false);
  const inbox = useInbox(!demo, open);
  const [storageWarning, setStorageWarning] = useState(false);
  const [scenario, setScenario] = useState<'data' | 'empty' | 'loading' | 'error'>('data');
  const items = demo ? demoItems : inbox.state.kind === 'ready' ? inbox.state.items : [];
  const unread = items.filter(item => !read.has(item.id)).length;
  const state: InboxState = !demo ? inbox.state : scenario === 'data'
    ? { kind: 'ready', items } : scenario === 'empty' ? { kind: 'ready', items: [] } : { kind: scenario };
  const markRead = (id: string) => {
    if (!items.some(item => item.id === id)) return;
    const next = new Set(read); next.add(id);
    setRead(next); setStorageWarning(!saveReadNotifications(identity, next, storage()));
  };
  return <>
    <button type="button" className="inbox-bell" aria-label={`Открыть уведомления. Непрочитанных: ${unread}`} title="Уведомления" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <img src={notificationIcon} alt="" className="h-8 w-8" />{unread > 0 && <span className="inbox-bell-dot" aria-hidden="true" />}
    </button>
    {open && <NotificationCenter state={state} read={read} onRead={markRead} onRetry={demo ? () => setScenario('data') : inbox.reload} onClose={() => setOpen(false)} demo={demo} storageWarning={storageWarning}
      paymentSection={demo ? undefined : <PaymentConfirmations state={inbox.paymentState} onReload={inbox.reload} />}
      demoControls={<details className="inbox-demo-controls"><summary>Состояния макета</summary><div role="group" aria-label="Состояния макета уведомлений">{([{ id: 'data', title: 'Есть данные' }, { id: 'empty', title: 'Пусто' }, { id: 'loading', title: 'Загрузка' }, { id: 'error', title: 'Ошибка' }] as const).map(item => <button type="button" key={item.id} aria-pressed={scenario === item.id} onClick={() => setScenario(item.id)}>{item.title}</button>)}</div></details>} />}
  </>;
}
