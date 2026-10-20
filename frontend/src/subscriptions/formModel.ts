import { currencies, localDateKey, periodLabels, validDate, validId } from './model.ts';
import type { Category, Currency, Period, Subscription } from './model.ts';
export type FormValues = { name: string; price: string; currency: Currency; period: Period; periodDays: string; nextPaymentDate: string; category: string };
export type FormErrors = Partial<Record<keyof FormValues, string>>;
export type SubscriptionPayload = { name: string; amount: number; currency: Currency; period: string; periodDays: number | null; nextPaymentDate: string; categoryId: number };
export function initialFormValues(subscription?: Subscription): FormValues {
  return { name: subscription?.name ?? '', price: subscription ? (subscription.amountMinor / 100).toFixed(2) : '',
    currency: subscription?.currency ?? 'RUB', period: subscription?.period ?? 'monthly', periodDays: subscription?.periodDays?.toString() ?? '',
    nextPaymentDate: subscription?.nextPaymentDate ?? '', category: subscription?.categoryId ?? '' };
}
export function validateSubscriptionForm(values: FormValues, categories?: Category[], today = localDateKey()): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = 'Введите название подписки.';
  else if (values.name.trim().length > 100) errors.name = 'Название — не более 100 символов.';
  const price = values.price.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) <= 0) errors.price = 'Введите стоимость больше нуля, не более двух знаков после запятой.';
  else if (!Number.isSafeInteger(Math.round(Number(price) * 100)) || Number(price) > 9999999999.99) errors.price = 'Слишком большая сумма. Максимум — 9 999 999 999,99.';
  if (!Object.hasOwn(periodLabels, values.period)) errors.period = 'Выберите период списания.';
  if (values.period === 'custom' && (!/^\d+$/.test(values.periodDays) || !validId(Number(values.periodDays)) || Number(values.periodDays) > 2147483647)) errors.periodDays = 'Укажите целое количество дней от 1 до 2147483647.';
  if (!currencies.includes(values.currency)) errors.currency = 'Выберите валюту.';
  if (!/^\d+$/.test(values.category) || !validId(Number(values.category)) || (categories && !categories.some((item) => item.id === values.category))) errors.category = 'Выберите категорию из справочника.';
  if (!validDate(values.nextPaymentDate)) errors.nextPaymentDate = 'Укажите корректную дату списания.';
  else if (values.nextPaymentDate < today) errors.nextPaymentDate = 'Дата списания не может быть раньше сегодняшней.';
  return errors;
}
export function subscriptionPayload(values: FormValues, categories: Category[]): SubscriptionPayload {
  if (Object.keys(validateSubscriptionForm(values, categories)).length) throw new Error('Проверьте заполнение полей.');
  return { name: values.name.trim(), amount: Number(values.price.trim().replace(',', '.')), currency: values.currency,
    period: values.period.toUpperCase(), periodDays: values.period === 'custom' ? Number(values.periodDays) : null,
    nextPaymentDate: values.nextPaymentDate, categoryId: Number(values.category) };
}
