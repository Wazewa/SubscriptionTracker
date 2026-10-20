
import { useState, type FormEvent } from 'react';
import { currencies, localDateKey, periodLabels, type Category, type Subscription } from '../subscriptions/model';
import { initialFormValues, validateSubscriptionForm, type FormValues, type FormErrors } from '../subscriptions/formModel';

type Props = {
  initialSubscription?: Subscription;
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSubmit: (values: FormValues) => void;
  notice?: string;
  categories: Category[];
  pending?: boolean;
  isDemo?: boolean;
};

const inputClass =
  'mt-2 w-full rounded-xl border border-[#cbd2c8] bg-white px-4 py-3 text-sm text-[#263526] outline-none transition focus:border-[#389f6b] focus:ring-2 focus:ring-[#389f6b]/20';

export default function SubscriptionForm({
  initialSubscription,
  mode,
  onCancel,
  onSubmit,
  notice,
  categories,
  pending = false,
  isDemo = false,
}: Props) {
  const [values, setValues] = useState<FormValues>(() => initialFormValues(initialSubscription));

  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState('');

  function update<K extends keyof FormValues>(
    field: K,
    value: FormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const validationErrors = validateSubscriptionForm(values, categories);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setMessage('Проверьте правильность заполнения полей.');
      return;
    }

    onSubmit(values);
  }

  return (
    <section className="w-full min-w-0">

      <div className="w-full max-w-[680px] rounded-3xl border border-[#e3e7df] bg-white p-5 shadow-sm sm:p-8">
        {isDemo && <p className="mb-5 rounded-xl bg-[#eef4e9] p-3 text-sm text-[#285d25]">Демо-режим: изменения не сохраняются на сервере.</p>}
        {!categories.length && <p role="status" className="mb-5 text-sm">В справочнике нет категорий. Сохранение недоступно, пока backend не заполнит справочник.</p>}
        <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-busy={pending}>
          <fieldset disabled={pending} className="min-w-0 space-y-5">
          <div>
            <label htmlFor="subscription-name" className="block text-sm font-semibold text-[#285d25]">
              Название
            </label>
            <input
              id="subscription-name"
              className={inputClass}
              placeholder="Например: Spotify"
              maxLength={100}
              value={values.name}
              onChange={(event) => update('name', event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && <p id="name-error" role="alert" className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="subscription-price" className="block text-sm font-semibold text-[#285d25]">
              Стоимость за период
            </label>
            <input
              id="subscription-price"
              type="text"
              inputMode="decimal"
              className={inputClass}
              placeholder="Введите сумму"
              value={values.price}
              onChange={(event) => update('price', event.target.value)}
              aria-invalid={Boolean(errors.price)}
              aria-describedby={errors.price ? 'price-error' : undefined}
            />
            {errors.price && <p id="price-error" role="alert" className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>

          <label className="block text-sm font-semibold text-[#285d25]">Валюта
            <select value={values.currency} onChange={(event) => update('currency', event.target.value as FormValues['currency'])} className={inputClass}>
              {currencies.map((currency) => <option key={currency}>{currency}</option>)}
            </select>
          </label>

          <div>
            <label htmlFor="subscription-period" className="block text-sm font-semibold text-[#285d25]">
              Период списания
            </label>
            <select
              id="subscription-period"
              className={inputClass}
              value={values.period}
              onChange={(event) => update('period', event.target.value as FormValues['period'])}
              aria-invalid={Boolean(errors.period)}
              aria-describedby={errors.period ? 'period-error' : undefined}
            >
              {Object.entries(periodLabels).map(([period, label]) => <option key={period} value={period}>{label}</option>)}
            </select>
            {errors.period && <p id="period-error" role="alert" className="mt-1 text-sm text-red-600">{errors.period}</p>}
          </div>

          {values.period === 'custom' && <label className="block text-sm font-semibold text-[#285d25]">Количество дней
            <input inputMode="numeric" value={values.periodDays} onChange={(event) => update('periodDays', event.target.value)} className={inputClass} aria-invalid={Boolean(errors.periodDays)} aria-describedby={errors.periodDays ? 'days-error' : undefined} />
            {errors.periodDays && <span id="days-error" role="alert" className="mt-1 block text-sm text-red-600">{errors.periodDays}</span>}
          </label>}

          <div>
            <label htmlFor="subscription-date" className="block text-sm font-semibold text-[#285d25]">
              Дата списания
            </label>
            <input
              id="subscription-date"
              type="date"
              min={localDateKey()}
              className={inputClass}
              value={values.nextPaymentDate}
              onChange={(event) => update('nextPaymentDate', event.target.value)}
              aria-invalid={Boolean(errors.nextPaymentDate)}
              aria-describedby={errors.nextPaymentDate ? 'date-error' : undefined}
            />
            {errors.nextPaymentDate && <p id="date-error" role="alert" className="mt-1 text-sm text-red-600">{errors.nextPaymentDate}</p>}
          </div>

          <div>
            <label htmlFor="subscription-category" className="block text-sm font-semibold text-[#285d25]">
              Категория
            </label>
            <select
              id="subscription-category"
              className={inputClass}
              value={values.category}
              onChange={(event) => update('category', event.target.value)}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'category-error' : undefined}
            >
              <option value="">Выберите категорию</option>
              {initialSubscription && !categories.some((item) => item.id === values.category) && values.category && <option value={values.category} disabled>{initialSubscription.category} — недоступна</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {errors.category && <p id="category-error" role="alert" className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          {message && (
            <p role="status" className="text-sm text-red-600">{message}</p>
          )}
          {notice && <p role="alert" className="text-sm text-red-700">{notice}</p>}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={pending || !categories.length}
              className="w-full rounded-full bg-[#389f6b] px-6 py-3 font-semibold text-white transition hover:bg-[#2e8c5c] focus:outline-none focus:ring-2 focus:ring-[#389f6b] focus:ring-offset-2 sm:flex-1"
            >
              {pending ? 'Сохраняем…' : mode === 'create' ? 'Сохранить' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-full border-2 border-[#389f6b] px-6 py-3 font-semibold text-[#389f6b] transition hover:bg-[#f0faf4] focus:outline-none focus:ring-2 focus:ring-[#389f6b] focus:ring-offset-2 sm:flex-1"
            >
              Отменить
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
