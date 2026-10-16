import type { Subscription } from './model.ts';

export type FormValues = {
  name: string;
  price: string;
  period: 'monthly' | 'yearly';
  nextPaymentDate: string;
  category: string;
};
export type FormErrors = Partial<Record<keyof FormValues, string>>;

export function initialFormValues(subscription?: Subscription): FormValues {
  return {
    name: subscription?.name ?? '',
    price: subscription ? (subscription.monthlyPriceMinor / 100).toFixed(2) : '',
    period: subscription?.period ?? 'monthly',
    nextPaymentDate: subscription?.nextPaymentDate ?? '',
    category: subscription?.category ?? '',
  };
}

export function validateSubscriptionForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = 'Введите название подписки.';
  const price = values.price.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) {
    errors.price = 'Введите стоимость больше нуля, не более двух знаков после запятой.';
  } else if (!Number.isSafeInteger(Math.round(Number(price) * 100))) {
    errors.price = 'Слишком большая сумма.';
  }
  if (values.period !== 'monthly' && values.period !== 'yearly') errors.period = 'Выберите период списания.';
  if (!values.category.trim()) errors.category = 'Выберите категорию.';
  const date = new Date(`${values.nextPaymentDate}T12:00:00`);
  if (!values.nextPaymentDate) errors.nextPaymentDate = 'Укажите дату списания.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.nextPaymentDate) || !Number.isFinite(date.getTime())
    || date.getFullYear() !== Number(values.nextPaymentDate.slice(0, 4))
    || date.getMonth() + 1 !== Number(values.nextPaymentDate.slice(5, 7))
    || date.getDate() !== Number(values.nextPaymentDate.slice(8, 10))) {
    errors.nextPaymentDate = 'Укажите корректную дату.';
  }
  return errors;
}
