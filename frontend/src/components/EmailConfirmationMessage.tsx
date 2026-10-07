export default function EmailConfirmationMessage({ preview, onBack }: { preview: boolean; onBack: () => void }) {
  return <section aria-labelledby="check-email-title" className="mt-4 w-full max-w-[504px] rounded-3xl border border-[#e1e5dc] bg-white p-7 text-center text-[#183d20]">
    {preview && <p className="mb-5 rounded-xl bg-[#eef4e9] p-3 text-xs">Предпросмотр интерфейса. Регистрация не выполнялась, письмо не отправлялось.</p>}
    <h2 id="check-email-title" className="font-unbounded text-2xl">Подтвердите почту</h2>
    <p role="status" className="mt-5 text-sm leading-relaxed">Проверьте указанный при регистрации email и перейдите по ссылке в письме, чтобы подтвердить почту.</p>
    <p className="mt-3 text-sm text-[#687468]">Если письма нет, проверьте папку «Спам».</p>
    <button type="button" onClick={onBack} className="mt-6 rounded-full border border-[#285d25] px-5 py-3 text-sm hover:bg-[#f5f6f2] focus-visible:outline-2 focus-visible:outline-green-700">Вернуться к регистрации</button>
  </section>;
}
