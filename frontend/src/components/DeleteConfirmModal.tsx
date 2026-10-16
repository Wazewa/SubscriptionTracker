import { useEffect, useRef, useState } from 'react';
import type { Subscription } from '../subscriptions/model';

export default function DeleteConfirmModal({ subscription, onClose }: { subscription: Subscription; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="delete-subscription-title" aria-describedby="delete-subscription-description" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#e1e5dc] bg-white p-6 text-[#183d20] shadow-xl backdrop:bg-black/40">
      <h2 id="delete-subscription-title" className="font-unbounded text-lg">Удалить подписку?</h2>
      <p id="delete-subscription-description" className="mt-3 text-sm text-[#687468]">Подписка «{subscription.name}». Это предпросмотр: удаление пока не подключено к API. Данные останутся без изменений.</p>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus onClick={onClose} className="rounded-full border border-[#cbdcc7] px-5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-green-700">Отмена</button>
        <button type="button" onClick={() => setMessage('Подписка не удалена: API удаления пока не подключён.')} className="rounded-full bg-red-600 px-5 py-2.5 text-sm text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-700">Удалить</button>
      </div>
    </dialog>
  );
}
