
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SubscriptionForm from '../components/SubscriptionForm';

export default function NewSubscription() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');

  return (
    <SubscriptionForm
      mode="create"
      onCancel={() => navigate('/subscriptions')}
      notice={notice}
      onSubmit={() => setNotice('Форма заполнена корректно. Подписка не создана: API сохранения пока не подключён.')}
    />
  );
}
