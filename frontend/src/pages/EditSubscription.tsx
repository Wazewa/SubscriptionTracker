
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import SubscriptionForm from '../components/SubscriptionForm';
import type { Subscription } from '../subscriptions/model';

type LocationState = {
  subscription?: Subscription;
};

export default function EditSubscription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState('');

  const state = location.state as LocationState | null;
  const subscription = state?.subscription;

  if (!subscription || subscription.id !== id) {
    return (
      <section className="rounded-3xl border border-[#e1e5dc] bg-white p-6">
        <h2 className="font-unbounded text-lg">
          Не удалось открыть подписку
        </h2>

        <p className="mt-3 text-sm text-[#687468]">
          Вернись к списку и выбери подписку для редактирования.
        </p>

        <button
          type="button"
          onClick={() => navigate('/subscriptions')}
          className="mt-5 rounded-full bg-[#2e9b62] px-5 py-3 text-sm text-white hover:bg-[#257c4e]"
        >
          К списку подписок
        </button>
      </section>
    );
  }

  return (
    <SubscriptionForm
      key={subscription.id}
      mode="edit"
      initialSubscription={subscription}
      onCancel={() => navigate('/subscriptions')}
      notice={notice}
      onSubmit={() => setNotice('Форма заполнена корректно. Изменения не сохранены: API редактирования пока не подключён.')}
    />
  );
}
