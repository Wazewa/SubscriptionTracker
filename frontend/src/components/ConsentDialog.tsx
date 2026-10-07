import { useEffect, useRef } from 'react';
import { consentDocument } from '../registration/consentDocument';

export default function ConsentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="consent-title" className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-[#e1e5dc] bg-white p-6 text-[#183d20] shadow-xl backdrop:bg-black/40 sm:p-8">
      <h2 id="consent-title" className="font-unbounded text-xl">Согласие на обработку персональных данных</h2>
      {consentDocument.text ? <>
        <p className="mt-3 text-xs text-[#687468]">Версия: {consentDocument.version}</p>
        {!consentDocument.approved && <p role="status" className="mt-3 rounded-xl bg-[#eef4e9] p-3 text-sm">Черновик для согласования. Необходимо заполнить контактный email в пункте 6.2. Данные формы не отправляются, отметка в макете не фиксируется как юридическое согласие.</p>}
        <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{consentDocument.text}</div>
      </> : <div className="mt-5 space-y-3 text-sm leading-relaxed">
        <p role="status">Утверждённый текст согласия пока не предоставлен.</p>
        <p>Это макет интерфейса, а не действующий документ согласия. До запуска регистрации команда должна предоставить отдельный согласованный текст и его версию.</p>
        <p>Сейчас данные формы не отправляются на сервер. Отметка в макете не фиксируется как юридическое согласие.</p>
      </div>}
      <button type="button" autoFocus onClick={onClose} className="mt-6 rounded-full bg-[#2e9b62] px-6 py-3 text-sm text-white hover:bg-[#257c4e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700">Закрыть</button>
    </dialog>
  );
}
