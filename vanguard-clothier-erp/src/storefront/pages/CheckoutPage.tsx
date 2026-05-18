import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Banknote, QrCode, Truck, Package, Check, Loader2 } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useCityStore } from '../../store/cityStore';

interface CheckoutPageProps {
  onBack: () => void;
  onSuccess: (orderId: string) => void;
  customerToken?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

type PaymentType = 'CARD' | 'CASH' | 'SBP';
type DeliveryType = 'courier' | 'pickup';

const PAYMENT_OPTIONS: { id: PaymentType; icon: React.ElementType; label: string; desc: string }[] = [
  { id: 'CARD', icon: CreditCard, label: 'Банковская карта', desc: 'Visa, Mastercard, МИР' },
  { id: 'SBP', icon: QrCode, label: 'СБП', desc: 'QR-код, Быстрые платежи' },
  { id: 'CASH', icon: Banknote, label: 'Наличными', desc: 'Курьеру при получении' },
];

export default function CheckoutPage({ onBack, onSuccess, customerToken, customerName, customerEmail, customerPhone }: CheckoutPageProps) {
  const { items, total, clearCart } = useCartStore();
  const { city } = useCityStore();

  const [delivery, setDelivery] = useState<DeliveryType>('courier');
  const [payment, setPayment] = useState<PaymentType>('CARD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: customerName ?? '',
    email: customerEmail ?? '',
    phone: customerPhone ?? '',
    address: '',
    apartment: '',
    comment: '',
  });

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const finalTotal = total();
  const deliveryCost = delivery === 'pickup' ? 0 : finalTotal >= 5000 ? 0 : 290;
  const grandTotal = finalTotal + deliveryCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Укажите имя'); return; }
    if (!form.phone.trim() && !form.email.trim()) { setError('Укажите телефон или email'); return; }
    if (delivery === 'courier' && !form.address.trim()) { setError('Укажите адрес доставки'); return; }

    const fullAddress = delivery === 'courier'
      ? `${form.address}${form.apartment ? `, кв. ${form.apartment}` : ''}`
      : `Самовывоз, г. ${city.name}`;

    setLoading(true);
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}),
        },
        body: JSON.stringify({
          items: items.map(i => ({ variationId: i.variationId, quantity: i.quantity, price: i.price })),
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: fullAddress,
          city: city.name,
          paymentType: payment,
          comment: form.comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');

      clearCart();
      onSuccess(data.orderId);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Package size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium mb-4">Корзина пуста</p>
        <button onClick={onBack} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
          В каталог
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors">
          <ArrowLeft size={14} />
          Назад к корзине
        </button>
        <h1 className="text-2xl font-black text-gray-900 mb-6">Оформление заказа</h1>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contact info */}
            <Section title="Контактные данные">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Имя *">
                  <input value={form.name} onChange={set('name')} placeholder="Как к вам обращаться" required className={inputCls} />
                </Field>
                <Field label="Телефон">
                  <input value={form.phone} onChange={set('phone')} placeholder="+7 (___) ___-__-__" type="tel" className={inputCls} />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <input value={form.email} onChange={set('email')} placeholder="name@example.com" type="email" className={inputCls} />
                </Field>
              </div>
            </Section>

            {/* Delivery type */}
            <Section title="Способ получения">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { id: 'courier' as DeliveryType, icon: Truck, label: 'Курьером', desc: finalTotal >= 5000 ? 'Бесплатно' : '290 ₽ · 1–3 дня' },
                  { id: 'pickup' as DeliveryType, icon: Package, label: 'Самовывоз', desc: 'Бесплатно · г. ' + city.name },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDelivery(opt.id)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${delivery === opt.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <opt.icon size={20} className={delivery === opt.id ? 'text-blue-600' : 'text-gray-400'} />
                    <div>
                      <p className={`text-sm font-semibold ${delivery === opt.id ? 'text-blue-700' : 'text-gray-900'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                    {delivery === opt.id && <Check size={16} className="text-blue-600 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>

              {delivery === 'courier' && (
                <div className="grid sm:grid-cols-3 gap-4 mt-4">
                  <Field label="Адрес *" className="sm:col-span-2">
                    <input value={form.address} onChange={set('address')} placeholder="Улица, дом" className={inputCls} />
                  </Field>
                  <Field label="Кв. / офис">
                    <input value={form.apartment} onChange={set('apartment')} placeholder="15" className={inputCls} />
                  </Field>
                </div>
              )}
            </Section>

            {/* Payment */}
            <Section title="Способ оплаты">
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPayment(opt.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${payment === opt.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${payment === opt.id ? 'bg-blue-600' : 'bg-gray-100'}`}>
                      <opt.icon size={18} className={payment === opt.id ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${payment === opt.id ? 'text-blue-700' : 'text-gray-900'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                    {payment === opt.id && <Check size={16} className="text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </Section>

            {/* Comment */}
            <Section title="Комментарий к заказу">
              <textarea
                value={form.comment}
                onChange={set('comment')}
                placeholder="Любые пожелания курьеру или к заказу..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </Section>
          </div>

          {/* Right: order summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-36">
              <h3 className="font-bold text-gray-900 mb-4">Ваш заказ</h3>

              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {items.map(item => (
                  <div key={item.variationId} className="flex gap-3">
                    <div className="w-12 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-100" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 leading-tight truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.size} · {item.color}</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{item.quantity} × {item.price.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Товары</span>
                  <span>{finalTotal.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Доставка</span>
                  <span>{deliveryCost === 0 ? <span className="text-green-600">Бесплатно</span> : `${deliveryCost} ₽`}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Итого</span>
                  <span className="text-blue-600">{grandTotal.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>

              {error && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" />Оформляем...</> : 'Оформить заказ'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Нажимая «Оформить», вы соглашаетесь с условиями публичной оферты
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helpers
const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
