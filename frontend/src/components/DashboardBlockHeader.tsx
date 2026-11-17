export const dashboardRetryClass = 'mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f445db] px-5 py-3 text-sm text-white shadow-sm hover:bg-[#dc34c4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a91e9e]';

const actionClass = 'min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-[#2e9b62] transition-colors hover:bg-[#eef4e9] hover:text-[#247e4e] focus-visible:bg-[#eef4e9] focus-visible:text-[#247e4e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed';

export default function DashboardBlockHeader({ titleId, title, action, actionLabel, onAction, disabled, actionTitle }: {
  titleId: string;
  title: string;
  action: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled: boolean;
  actionTitle?: string;
}) {
  return <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
    <h2 id={titleId} className="font-unbounded min-w-0 break-words text-lg text-[#285d25]">{title}</h2>
    <button type="button" aria-label={actionLabel} aria-haspopup="dialog" disabled={disabled} title={actionTitle} onClick={onAction} className={actionClass}>{action}</button>
  </div>;
}
