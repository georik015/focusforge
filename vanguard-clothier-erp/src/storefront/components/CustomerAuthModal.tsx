import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface CustomerInfo {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  loyaltyPoints: number;
}

interface CustomerAuthModalProps {
  onClose: () => void;
  onAuth: (token: string, customer: CustomerInfo) => void;
}

type View = 'login' | 'register';

export default function CustomerAuthModal({ onClose, onAuth }: CustomerAuthModalProps) {
  const [view, setView] = useState<View>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = view === 'register' ? '/api/public/auth/register' : '/api/public/auth/login';
    const body = view === 'register'
      ? { name: form.name, email: form.email || undefined, phone: form.phone || undefined, password: form.password }
      : { email: form.email || undefined, phone: form.phone || undefined, password: form.password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      onAuth(data.token, data.customer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {view === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
            </h2>
            <p className="text-sm text-gray-500">
              {view === 'login' ? 'Войдите, чтобы отслеживать заказы' : 'Регистрация займёт 1 минуту'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {view === 'register' && (
            <Field label="Имя *" icon={User}>
              <input value={form.name} onChange={set('name')} placeholder="Как вас зовут" required className={inputCls} />
            </Field>
          )}

          <Field label="Email" icon={Mail}>
            <input value={form.email} onChange={set('email')} placeholder="name@example.com" type="email" className={inputCls} />
          </Field>

          <Field label="Телефон" icon={Phone}>
            <input value={form.phone} onChange={set('phone')} placeholder="+7 (___) ___-__-__" type="tel" className={inputCls} />
          </Field>

          {view === 'register' && (
            <p className="text-xs text-gray-400 -mt-2">Укажите email или телефон (или оба)</p>
          )}

          <Field label="Пароль *" icon={Lock}>
            <div className="relative">
              <input
                value={form.password}
                onChange={set('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder={view === 'register' ? 'Минимум 6 символов' : 'Ваш пароль'}
                required
                minLength={6}
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Подождите...' : view === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>

          {view === 'register' && (
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Регистрируясь, вы принимаете условия пользовательского соглашения и соглашаетесь с обработкой персональных данных в целях маркетинга.
            </p>
          )}

          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {view === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
              <button
                type="button"
                onClick={() => { setView(v => v === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-blue-600 font-semibold hover:underline"
              >
                {view === 'login' ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white';

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        {children}
      </div>
    </div>
  );
}
