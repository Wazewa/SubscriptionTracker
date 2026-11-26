import { useEffect, useRef, type ReactNode } from 'react';

let scrollLocks = 0;
let savedOverflow = '';

export default function DashboardModal({ titleId, onClose, children }: {
  titleId: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    if (scrollLocks === 0) savedOverflow = document.body.style.overflow;
    scrollLocks += 1;
    element?.showModal();
    element?.querySelector<HTMLElement>('h2')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return <dialog ref={dialog} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onPointerDown={(event) => { backdropPress.current = event.target === event.currentTarget; }}
    onClick={(event) => { if (backdropPress.current && event.target === event.currentTarget) onClose(); backdropPress.current = false; }}
    className="fixed inset-0 m-auto max-h-[min(620px,calc(100dvh-2rem))] w-[calc(100%_-_2rem)] max-w-[480px] flex-col overflow-hidden rounded-[24px] border-0 bg-white p-0 text-[#101b10] shadow-2xl backdrop:bg-black/40 [&[open]]:flex">
    {children}
  </dialog>;
}
