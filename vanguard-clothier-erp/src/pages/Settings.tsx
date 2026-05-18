import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  UserPlus,
  Key,
  Activity,
  History,
  Plus,
  Edit,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  Copy,
  CheckCheck,
  Link2,
  RefreshCw,
  Store,
  Database,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

type Panel = 'general' | 'security' | 'users' | 'store' | 'data';

interface StoreConfig {
  id: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  currency: string;
  taxRate: number;
  city: string;
}

interface ImportResult {
  created: number;
  errors: string[];
  total: number;
}

interface Invite {
  token: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface UserWithCreatedAt extends User {
  createdAt: string;
}

export function Settings() {
  const [activePanel, setActivePanel] = useState<Panel>('general');
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<UserWithCreatedAt[]>([]);
  const [loading, setLoading] = useState(false);

  // Store config state
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [configForm, setConfigForm] = useState({
    storeName: '', storeAddress: '', storePhone: '',
    storeEmail: '', currency: '₽', taxRate: '0', city: '',
  });

  // Data panel state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDoneMsg, setResetDoneMsg] = useState('');
  const [fixingImages, setFixingImages] = useState(false);
  const [fixImagesMsg, setFixImagesMsg] = useState('');

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithCreatedAt | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SELLER' as 'ADMIN' | 'SELLER' | 'STOREKEEPER',
  });

  // Reset password state
  const [resetUser, setResetUser] = useState<UserWithCreatedAt | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState(false);

  // Invite state
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteRole, setInviteRole] = useState<'SELLER' | 'STOREKEEPER' | 'ADMIN'>('SELLER');
  const [generatedInvite, setGeneratedInvite] = useState<Invite | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activePanel === 'security') fetchLogs();
    if (activePanel === 'users') { fetchUsers(); fetchInvites(); }
    if (activePanel === 'store') fetchConfig();
  }, [activePanel]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>('/audit');
      setLogs(data);
    } catch {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.get<UserWithCreatedAt[]>('/users');
      setUsers(data);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const data = await api.get<Invite[]>('/auth/invites');
      setInvites(data);
    } catch {
      console.error('Failed to fetch invites');
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await api.get<StoreConfig>('/config');
      setStoreConfig(data);
      setConfigForm({
        storeName: data.storeName,
        storeAddress: data.storeAddress,
        storePhone: data.storePhone,
        storeEmail: data.storeEmail,
        currency: data.currency,
        taxRate: String(data.taxRate),
        city: data.city,
      });
    } catch {
      console.error('Failed to fetch store config');
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const updated = await api.patch<StoreConfig>('/config', {
        ...configForm,
        taxRate: parseFloat(configForm.taxRate) || 0,
      });
      setStoreConfig(updated);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch {
      console.error('Failed to save config');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError('');
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileBase64 = btoa(binary);
      const result = await api.post<ImportResult>('/admin/import-products', { fileBase64 });
      setImportResult(result);
    } catch (err: any) {
      setImportError(err.message || 'Ошибка импорта');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const token = localStorage.getItem('token');
    const a = document.createElement('a');
    a.href = `/api/admin/import-template`;
    a.setAttribute('download', 'template_import_tovarov.xlsx');
    const headers = token ? `Bearer ${token}` : '';
    fetch(a.href, { headers: { Authorization: headers } })
      .then(r => r.blob())
      .then(blob => {
        a.href = URL.createObjectURL(blob);
        a.click();
      });
  };

  const handleExportProducts = () => {
    setExporting(true);
    const token = localStorage.getItem('token');
    fetch('/api/admin/export-products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tovary_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
      })
      .finally(() => setExporting(false));
  };

  const handleExportSales = () => {
    setExporting(true);
    const token = localStorage.getItem('token');
    fetch('/api/admin/export-sales', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `prodazhi_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
      })
      .finally(() => setExporting(false));
  };

  const handleResetDemo = async () => {
    if (resetConfirmText !== 'СБРОСИТЬ') return;
    setResetting(true);
    try {
      const result = await api.post<{ message: string }>('/admin/reset-demo', { confirm: 'RESET_CONFIRMED' });
      setResetDoneMsg(result.message);
      setResetConfirmText('');
    } catch (err: any) {
      setResetDoneMsg('Ошибка: ' + (err.message || 'Сброс не удался'));
    } finally {
      setResetting(false);
    }
  };

  const handleFixImages = async () => {
    setFixingImages(true);
    setFixImagesMsg('');
    try {
      const result = await api.put<{ message: string }>('/admin/fix-images', {});
      setFixImagesMsg(result.message);
    } catch (err: any) {
      setFixImagesMsg('Ошибка: ' + (err.message || 'Обновление не удалось'));
    } finally {
      setFixingImages(false);
    }
  };

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const data = await api.post<Invite>('/auth/invite', { role: inviteRole });
      setGeneratedInvite(data);
      setInvites(prev => [data, ...prev]);
    } catch (err: any) {
      console.error('Failed to create invite', err);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', password: '', role: 'SELLER' });
    setSaveError('');
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: UserWithCreatedAt) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, password: '', role: user.role });
    setSaveError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      return setSaveError('Имя и email обязательны');
    }
    if (!editingUser && !userForm.password) {
      return setSaveError('Пароль обязателен для нового пользователя');
    }
    setSaving(true);
    setSaveError('');
    try {
      if (editingUser) {
        const body: any = { name: userForm.name, email: userForm.email, role: userForm.role };
        if (userForm.password) body.password = userForm.password;
        const updated = await api.patch<UserWithCreatedAt>(`/users/${editingUser.id}`, body);
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
      } else {
        const created = await api.post<UserWithCreatedAt>('/users', userForm);
        setUsers(prev => [created, ...prev]);
      }
      setIsUserModalOpen(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const openResetPassword = (user: UserWithCreatedAt) => {
    setResetUser(user);
    setResetPassword('');
    setResetError('');
    setResetDone(false);
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (!resetPassword || resetPassword.length < 6) return setResetError('Минимум 6 символов');
    setResetSaving(true);
    setResetError('');
    try {
      await api.post(`/users/${resetUser.id}/reset-password`, { newPassword: resetPassword });
      setResetDone(true);
      setTimeout(() => setResetUser(null), 1500);
    } catch (err: any) {
      setResetError(err?.message || 'Ошибка сброса');
    } finally {
      setResetSaving(false);
    }
  };

  const handleToggleUser = async (user: UserWithCreatedAt) => {
    try {
      const updated = await api.patch<UserWithCreatedAt>(`/users/${user.id}/toggle`, {});
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, isActive: updated.isActive } : u));
    } catch {
      console.error('Failed to toggle user');
    }
  };

  const roleLabel: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Администратор', color: 'text-indigo-600 bg-indigo-50' },
    SELLER: { label: 'Продавец', color: 'text-emerald-600 bg-emerald-50' },
    STOREKEEPER: { label: 'Кладовщик', color: 'text-amber-600 bg-amber-50' },
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Настройки системы</h2>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Конфигурация и безопасность предприятия</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <NavButton active={activePanel === 'general'} onClick={() => setActivePanel('general')} icon={SettingsIcon} label="Общие" sub="Системные параметры" />
          <NavButton active={activePanel === 'store'} onClick={() => setActivePanel('store')} icon={Store} label="Магазин" sub="Название и контакты" />
          <NavButton active={activePanel === 'security'} onClick={() => setActivePanel('security')} icon={Shield} label="Безопасность" sub="Журнал аудита" />
          <NavButton active={activePanel === 'users'} onClick={() => setActivePanel('users')} icon={UserPlus} label="Пользователи" sub="Управление доступом" />
          <NavButton active={activePanel === 'data'} onClick={() => setActivePanel('data')} icon={Database} label="Данные" sub="Импорт, экспорт, сброс" />
        </div>

        {/* Content */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">

            {/* GENERAL */}
            {activePanel === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Статус системы</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">Vanguard Clothier ERP v1.0</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Активна
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <ConfigCard label="Версия системы" value="v1.0.0-PROD" />
                  <ConfigCard label="Часовой пояс" value="UTC+3 (МСК)" />
                  <ConfigCard label="База данных" value="SQLite (локальная)" />
                  <ConfigCard label="Аутентификация" value="JWT (24ч токен)" />
                  <ConfigCard label="Хэширование паролей" value="bcrypt (10 раундов)" />
                  <ConfigCard label="Rate Limiting" value="100 req / 15 мин" />
                </div>
              </motion.div>
            )}

            {/* SECURITY */}
            {activePanel === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Журнал аудита</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">Все действия в системе в реальном времени</p>
                  </div>
                  <Button
                    onClick={fetchLogs}
                    variant="outline"
                    className="border-slate-100 rounded-xl h-10 px-4 gap-2 text-slate-400 text-xs font-black uppercase"
                  >
                    {loading ? <span className="animate-pulse">Загрузка...</span> : 'Обновить'}
                  </Button>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-6 p-5 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-all group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        log.action.includes('LOGIN') ? 'bg-indigo-50 text-indigo-600' :
                        log.action.includes('CREATED') ? 'bg-emerald-50 text-emerald-600' :
                        log.action.includes('DELETED') ? 'bg-red-50 text-red-500' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        <Activity size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 uppercase">{log.action}</span>
                          <span className="text-[10px] text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(new Date(log.createdAt), 'HH:mm:ss')}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                          {log.user?.name} ({log.user?.email})
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">{log.details}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                          {format(new Date(log.createdAt), 'dd MMM')}
                        </div>
                      </div>
                    </div>
                  ))}

                  {logs.length === 0 && !loading && (
                    <div className="text-center py-20 text-slate-300">
                      <History size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-black text-xs uppercase tracking-widest">Журнал пуст</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STORE CONFIG */}
            {activePanel === 'store' && (
              <motion.div
                key="store"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Настройки магазина</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">Отображается в чеках и витрине</p>
                  </div>
                  {configSaved && (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                      <Check size={14} /> Сохранено
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Название магазина *</label>
                      <Input value={configForm.storeName} onChange={e => setConfigForm(f => ({ ...f, storeName: e.target.value }))} placeholder="Мой Магазин" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Город</label>
                      <Input value={configForm.city} onChange={e => setConfigForm(f => ({ ...f, city: e.target.value }))} placeholder="Москва" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Адрес</label>
                    <Input value={configForm.storeAddress} onChange={e => setConfigForm(f => ({ ...f, storeAddress: e.target.value }))} placeholder="ул. Тверская, д. 1, ТЦ Центральный, 2 этаж" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Телефон</label>
                      <Input value={configForm.storePhone} onChange={e => setConfigForm(f => ({ ...f, storePhone: e.target.value }))} placeholder="+7 (999) 000-00-00" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email</label>
                      <Input value={configForm.storeEmail} onChange={e => setConfigForm(f => ({ ...f, storeEmail: e.target.value }))} placeholder="info@magazin.ru" type="email" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Символ валюты</label>
                      <Input value={configForm.currency} onChange={e => setConfigForm(f => ({ ...f, currency: e.target.value }))} placeholder="₽" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Ставка налога (%)</label>
                      <Input value={configForm.taxRate} onChange={e => setConfigForm(f => ({ ...f, taxRate: e.target.value }))} placeholder="0" type="number" min="0" max="100" className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                  className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm gap-2"
                >
                  {configSaving ? <span className="animate-pulse">Сохранение...</span> : <><Save size={16} /> Сохранить настройки</>}
                </Button>
              </motion.div>
            )}

            {/* DATA */}
            {activePanel === 'data' && (
              <motion.div
                key="data"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {/* Import */}
                <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Импорт товаров</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">Загрузите Excel-файл (.xlsx) с вашим каталогом</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleDownloadTemplate}
                      variant="outline"
                      className="h-11 px-6 border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest gap-2"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-500" />
                      Скачать шаблон
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importing}
                      className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest gap-2"
                    >
                      <Upload size={16} />
                      {importing ? 'Импорт...' : 'Загрузить файл'}
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
                  </div>

                  {importError && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">
                      {importError}
                    </div>
                  )}

                  {importResult && (
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <div className="flex-1 bg-emerald-50 rounded-2xl p-4 text-center">
                          <div className="text-2xl font-black text-emerald-600">{importResult.created}</div>
                          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Создано</div>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl p-4 text-center">
                          <div className="text-2xl font-black text-slate-700">{importResult.total}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Всего строк</div>
                        </div>
                        <div className="flex-1 bg-red-50 rounded-2xl p-4 text-center">
                          <div className="text-2xl font-black text-red-500">{importResult.errors.length}</div>
                          <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">Ошибок</div>
                        </div>
                      </div>
                      {importResult.errors.length > 0 && (
                        <div className="bg-red-50 rounded-2xl p-4 space-y-1 max-h-40 overflow-y-auto">
                          {importResult.errors.map((e, i) => (
                            <p key={i} className="text-[10px] font-mono text-red-700">{e}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Export */}
                <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Экспорт данных</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">Выгрузка в Excel для анализа и резервных копий</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleExportProducts}
                      disabled={exporting}
                      variant="outline"
                      className="h-11 px-6 border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest gap-2"
                    >
                      <Download size={16} className="text-indigo-500" />
                      {exporting ? 'Формирование...' : 'Экспорт товаров'}
                    </Button>
                    <Button
                      onClick={handleExportSales}
                      disabled={exporting}
                      variant="outline"
                      className="h-11 px-6 border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest gap-2"
                    >
                      <Download size={16} className="text-emerald-500" />
                      {exporting ? 'Формирование...' : 'Экспорт продаж'}
                    </Button>
                  </div>
                </div>

                {/* Fix Images */}
                <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Исправить изображения товаров</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">Обновляет фото демо-товаров в базе до актуальных. Не удаляет данные.</p>
                  </div>
                  {fixImagesMsg ? (
                    <div className={`text-xs font-bold px-4 py-3 rounded-xl border ${fixImagesMsg.startsWith('Ошибка') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                      {fixImagesMsg}
                    </div>
                  ) : null}
                  <Button
                    onClick={handleFixImages}
                    disabled={fixingImages}
                    variant="outline"
                    className="h-11 px-6 border-slate-200 rounded-xl font-black text-xs uppercase tracking-widest gap-2"
                  >
                    <RefreshCw size={16} className={fixingImages ? 'animate-spin text-indigo-500' : 'text-indigo-500'} />
                    {fixingImages ? 'Обновление...' : 'Обновить изображения'}
                  </Button>
                </div>

                {/* Danger zone */}
                <div className="bg-white rounded-[40px] p-10 border border-red-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">Сброс демо-данных</h3>
                      <p className="text-slate-400 text-xs font-bold mt-0.5">Удаляет все товары, продажи, клиентов. Пользователи остаются.</p>
                    </div>
                  </div>

                  {resetDoneMsg ? (
                    <div className={`text-xs font-bold px-4 py-3 rounded-xl border ${resetDoneMsg.startsWith('Ошибка') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                      {resetDoneMsg}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-500">
                        Введите <span className="font-black text-red-600 font-mono">СБРОСИТЬ</span> для подтверждения:
                      </p>
                      <div className="flex gap-3">
                        <Input
                          value={resetConfirmText}
                          onChange={e => setResetConfirmText(e.target.value)}
                          placeholder="СБРОСИТЬ"
                          className="h-12 rounded-xl bg-red-50 border-red-100 font-black text-red-700 tracking-widest placeholder:text-red-200 placeholder:font-normal"
                        />
                        <Button
                          onClick={handleResetDemo}
                          disabled={resetting || resetConfirmText !== 'СБРОСИТЬ'}
                          className="h-12 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-widest gap-2 shrink-0"
                        >
                          {resetting ? 'Сброс...' : 'Очистить базу'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* USERS */}
            {activePanel === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-8"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Пользователи системы</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1">Управление ролями и доступом</p>
                  </div>
                  <Button
                    onClick={openCreateUser}
                    className="bg-indigo-600 text-white rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2"
                  >
                    <Plus size={16} /> Добавить
                  </Button>
                </div>

                {/* Invite Code Generator */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-indigo-500" />
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Код приглашения</h4>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Создайте одноразовый код — сотрудник зарегистрируется самостоятельно. Действует 48 часов.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value as typeof inviteRole)}
                      className="h-10 border border-slate-200 bg-white px-3 text-xs font-bold rounded-xl flex-1 min-w-[160px]"
                    >
                      <option value="SELLER">Продавец</option>
                      <option value="STOREKEEPER">Кладовщик</option>
                      <option value="ADMIN">Администратор</option>
                    </select>
                    <Button
                      onClick={handleCreateInvite}
                      disabled={inviteLoading}
                      className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest gap-2"
                    >
                      <Key size={14} />
                      {inviteLoading ? 'Создание...' : 'Сгенерировать'}
                    </Button>
                  </div>

                  {generatedInvite && (
                    <div className="bg-indigo-950 rounded-xl p-4 space-y-2">
                      <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Код приглашения (передайте сотруднику)</div>
                      <div className="flex items-center gap-3">
                        <code className="flex-1 text-indigo-200 font-mono text-xs break-all leading-relaxed">
                          {generatedInvite.token}
                        </code>
                        <button
                          onClick={() => handleCopy(generatedInvite.token)}
                          className="shrink-0 p-2 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 rounded-lg transition-colors"
                          title="Скопировать"
                        >
                          {copied ? <CheckCheck size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                      </div>
                      <div className="text-[9px] text-indigo-500 font-bold">
                        Роль: {generatedInvite.role} · Истекает: {new Date(generatedInvite.expiresAt).toLocaleString('ru')}
                      </div>
                    </div>
                  )}

                  {invites.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Активные приглашения</div>
                      {invites.map(inv => (
                        <div key={inv.token} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-4 py-2.5">
                          <code className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">{inv.token}</code>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] font-black text-slate-400 uppercase">{inv.role}</span>
                            <button onClick={() => handleCopy(inv.token)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-12 text-slate-300 text-xs font-black uppercase animate-pulse">Загрузка...</div>
                ) : (
                  <div className="space-y-3">
                    {users.map(user => {
                      const role = roleLabel[user.role] ?? { label: user.role, color: 'text-slate-600 bg-slate-50' };
                      return (
                        <div key={user.id} className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${role.color}`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-sm">{user.name}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${role.color}`}>
                                  {role.label}
                                </span>
                                {!user.isActive && (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-red-50 text-red-500">
                                    Деактивирован
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 mt-0.5">{user.email}</div>
                              <div className="text-[9px] text-slate-300 mt-0.5 font-mono">
                                Добавлен: {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => openEditUser(user)}
                              className="p-2 hover:text-indigo-600 transition-colors"
                              title="Редактировать"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => openResetPassword(user)}
                              className="p-2 hover:text-amber-600 transition-colors"
                              title="Сбросить пароль"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleUser(user)}
                              className={`p-2 transition-colors ${user.isActive ? 'hover:text-red-500' : 'hover:text-emerald-500'}`}
                              title={user.isActive ? 'Деактивировать' : 'Активировать'}
                            >
                              {user.isActive ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-slate-300" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {users.length === 0 && (
                      <div className="text-center py-12 text-slate-300 text-xs font-black uppercase tracking-widest">
                        Пользователи не найдены
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white w-full max-w-md border border-slate-100 shadow-2xl rounded-[32px] overflow-hidden mx-4">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {editingUser ? editingUser.email : 'Настройка роли и доступа'}
                </p>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">
                  {saveError}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Полное имя *</label>
                <Input
                  value={userForm.name}
                  onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Иванов Иван"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email *</label>
                <Input
                  value={userForm.email}
                  onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@vanguard.com"
                  type="email"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Пароль {editingUser ? '(оставьте пустым чтобы не менять)' : '*'}
                </label>
                <Input
                  value={userForm.password}
                  onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Минимум 6 символов"
                  type="password"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Роль *</label>
                <select
                  className="w-full h-12 border border-slate-200 bg-slate-50 px-4 text-sm font-bold rounded-xl"
                  value={userForm.role}
                  onChange={e => setUserForm(f => ({ ...f, role: e.target.value as any }))}
                >
                  <option value="SELLER">Продавец — POS и клиенты</option>
                  <option value="STOREKEEPER">Кладовщик — Склад и инвентарь</option>
                  <option value="ADMIN">Администратор — Полный доступ</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-8 pt-0">
              <Button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm gap-2"
              >
                {saving ? <span className="animate-pulse">Сохранение...</span> : <><Check size={16} /> {editingUser ? 'Сохранить' : 'Создать'}</>}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
                className="px-6 h-12 rounded-xl border-slate-200 font-black text-sm"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm border border-slate-100 shadow-2xl rounded-[32px] overflow-hidden mx-4">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Сброс пароля</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{resetUser.name}</p>
              </div>
              <button onClick={() => setResetUser(null)} className="p-2 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              {resetDone ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-3 rounded-xl">
                  <Check size={16} /> Пароль успешно изменён
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">
                      {resetError}
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Новый пароль *</label>
                    <Input
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      type="password"
                      className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleResetPassword}
                      disabled={resetSaving}
                      className="flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-sm gap-2"
                    >
                      {resetSaving ? <span className="animate-pulse">Сохранение...</span> : <><RefreshCw size={16} /> Сбросить</>}
                    </Button>
                    <Button variant="outline" onClick={() => setResetUser(null)} className="px-6 h-12 rounded-xl border-slate-200 font-black text-sm">
                      Отмена
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, sub }: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-6 rounded-3xl text-left transition-all duration-300 group ${active ? 'bg-slate-900 text-white shadow-2xl scale-[1.02]' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${active ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 transition-colors'}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className={`text-xs font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-600'}`}>{label}</div>
          <div className="text-[10px] font-medium opacity-60">{sub}</div>
        </div>
      </div>
    </button>
  );
}

function ConfigCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}
