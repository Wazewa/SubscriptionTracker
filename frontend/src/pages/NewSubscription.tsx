import { Link } from 'react-router-dom';

export default function NewSubscription() {
  return <section className="max-w-[850px] rounded-3xl border border-[#e1e5dc] bg-white p-7">
    <h2 className="font-unbounded text-xl">Добавление подписки</h2>
    <p className="mt-4 text-sm leading-relaxed text-[#687468]">Переход с Dashboard готов. Форма создания и сохранение подписки будут реализованы в отдельной задаче после согласования API. Сейчас данные не создаются и не сохраняются.</p>
    <Link to="/dashboard" className="mt-5 inline-block rounded-lg border border-[#285d25] px-4 py-3 text-sm hover:bg-[#f5f6f2] focus-visible:outline-2 focus-visible:outline-green-700">Вернуться на дашборд</Link>
  </section>;
}
