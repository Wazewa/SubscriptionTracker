import { useEffect, useRef } from 'react';
import { useApiAction } from '../api/useApiAction';
import type { Subscription } from '../subscriptions/model';

export default function DeleteConfirmModal({ subscription, onClose, onDelete, isDemo }: {
  subscription: Subscription; onClose: () => void; isDemo: boolean;
  onDelete: (subscription: Subscription, token: string, signal: AbortSignal) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { pending, error, run } = useApiAction();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!pending) onClose(); }} aria-busy={pending} aria-labelledby="delete-subscription-title" aria-describedby="delete-subscription-description" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#e1e5dc] bg-white p-6 text-[#183d20] shadow-xl backdrop:bg-black/40">
      <h2 id="delete-subscription-title" className="font-unbounded text-lg">Удалить подписку?</h2>
      <p id="delete-subscription-description" className="mt-3 text-sm text-[#687468]">Подписка «{subscription.name}». {isDemo ? 'Демо: удаление недоступно, данные не изменятся.' : 'Подписка будет удалена с сервера. Это действие нельзя отменить.'}</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus disabled={pending} onClick={onClose} className="rounded-full border border-[#cbdcc7] px-5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-green-700">Отмена</button>
        <button type="button" disabled={pending || isDemo} onClick={async () => { const result = await run((token, signal) => onDelete(subscription, token, signal)); if (result) onClose(); }} className="rounded-full bg-red-600 px-5 py-2.5 text-sm text-white hover:bg-red-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-red-700">{pending ? 'Удаляем…' : 'Удалить'}</button>
      </div>
    </dialog>
  );
}
