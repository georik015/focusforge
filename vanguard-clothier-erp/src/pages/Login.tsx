import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Lock, Mail, ArrowRight, ShieldCheck, UserPlus, KeyRound } from 'lucide-react';
import { User } from '../types';
import { motion } from 'motion/react';

type AuthView = 'login' | 'register' | 'forgot';

interface LoginProps {
  onLogin: (token: string, user: User) => void;
  initialView?: AuthView;
  onBack?: () => void;
}

export function Login({ onLogin, initialView = 'login', onBack }: LoginProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Register fields
  const [inviteToken, setInviteToken] = useState('');
  const [name, setName] = useState('');

  // Forgot password fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code'>('email');
  const [resetEmail, setResetEmail] = useState('');

  const resetState = () => {
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
    setName('');
    setInviteToken('');
    setResetCode('');
    setNewPassword('');
    setResetStep('email');
    setResetEmail('');
  };

  const switchView = (v: AuthView) => {
    resetState();
    setView(v);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Ошибка авторизации');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken: inviteToken.trim().toUpperCase(), name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
      } else {
        setError(data.error || 'Ошибка регистрации');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Код сброса отправлен. Проверьте консоль сервера (режим разработки).');
        setResetStep('code');
      } else {
        setError(data.error || 'Ошибка запроса');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetCode.trim().toUpperCase(), newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Пароль успешно обновлён. Войдите с новым паролем.');
        setTimeout(() => switchView('login'), 2000);
      } else {
        setError(data.error || 'Ошибка сброса пароля');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setIsLoading(false);
    }
  };

  const titles: Record<AuthView, { title: string; sub: string }> = {
    login: { title: 'Вход в систему', sub: 'АИС управления магазином одежды' },
    register: { title: 'Регистрация', sub: 'Введите код приглашения от администратора' },
    forgot: { title: 'Сброс пароля', sub: resetStep === 'email' ? 'Введите ваш email для получения кода' : 'Введите код и новый пароль' },
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <motion.div
        key={view}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[440px] relative z-10"
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-6 left-6 text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-1"
          >
            ← В магазин
          </button>
        )}

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[24px] mx-auto mb-6 flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-indigo-500/20 rotate-3">
            V
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight">Vanguard ERP</h1>
          <p className="text-slate-400 font-medium mt-2">{titles[view].sub}</p>
        </div>

        <Card className="border-none bg-white/5 backdrop-blur-xl shadow-2xl rounded-[32px] overflow-hidden">
          <CardContent className="p-10">

            {/* LOGIN */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <Input type="email" placeholder="name@vanguard.com"
                      className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Пароль</label>
                    <button type="button" onClick={() => switchView('forgot')}
                      className="text-[10px] font-black text-indigo-400 uppercase tracking-wider hover:text-indigo-300">
                      Забыл пароль
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <Input type="password" placeholder="••••••••"
                      className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                <Button type="submit"
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl gap-3"
                  disabled={isLoading}>
                  {isLoading ? 'Проверка...' : 'Войти'}
                  {!isLoading && <ArrowRight size={20} />}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => switchView('register')}
                    className="text-[11px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto">
                    <UserPlus size={14} />
                    Зарегистрироваться по коду приглашения
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER */}
            {view === 'register' && (
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Код приглашения</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <Input placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600 font-mono text-xs tracking-widest"
                      value={inviteToken} onChange={e => setInviteToken(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ваше имя</label>
                  <Input placeholder="Иван Иванов"
                    className="h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600"
                    value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-3.5 text-slate-500" size={20} />
                    <Input type="email" placeholder="name@company.com"
                      className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Пароль</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 text-slate-500" size={20} />
                    <Input type="password" placeholder="Минимум 6 символов"
                      className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </div>
                {error && <ErrorBox message={error} />}
                <Button type="submit"
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl gap-3"
                  disabled={isLoading}>
                  {isLoading ? 'Регистрация...' : 'Создать аккаунт'}
                  {!isLoading && <ArrowRight size={20} />}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => switchView('login')}
                    className="text-[11px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">
                    ← Назад к входу
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD */}
            {view === 'forgot' && (
              <div className="space-y-5">
                {resetStep === 'email' ? (
                  <form onSubmit={handleForgotRequest} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ваш Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 text-slate-500" size={20} />
                        <Input type="email" placeholder="name@company.com"
                          className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600"
                          value={resetEmail} onChange={e => setResetEmail(e.target.value)} required />
                      </div>
                    </div>
                    {error && <ErrorBox message={error} />}
                    {success && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold p-4 rounded-xl font-mono tracking-widest">
                        {success}
                      </div>
                    )}
                    <Button type="submit"
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl gap-3"
                      disabled={isLoading}>
                      {isLoading ? 'Отправка...' : 'Получить код'}
                      {!isLoading && <ArrowRight size={20} />}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    {success && (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold p-4 rounded-xl font-mono break-all">
                        {success}
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Код сброса</label>
                      <Input placeholder="Введите код из системы"
                        className="h-14 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600 font-mono text-center tracking-[0.3em]"
                        value={resetCode} onChange={e => setResetCode(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Новый пароль</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 text-slate-500" size={20} />
                        <Input type="password" placeholder="Минимум 6 символов"
                          className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus-visible:ring-indigo-500 focus-visible:bg-white/10 placeholder:text-slate-600"
                          value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                      </div>
                    </div>
                    {error && <ErrorBox message={error} />}
                    <Button type="submit"
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg rounded-2xl shadow-xl gap-3"
                      disabled={isLoading}>
                      {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
                      {!isLoading && <ArrowRight size={20} />}
                    </Button>
                  </form>
                )}
                <div className="text-center">
                  <button type="button" onClick={() => switchView('login')}
                    className="text-[11px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">
                    ← Назад к входу
                  </button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <p className="text-center mt-8 text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">
          Только для сотрудников · Vanguard Clothier Group © 2026
        </p>
      </motion.div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-xl flex items-center gap-3"
    >
      <ShieldCheck size={18} />
      {message}
    </motion.div>
  );
}
