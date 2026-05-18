import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from './ui/Button';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ru' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button 
      variant="outline" 
      onClick={toggleLanguage}
      className="h-10 px-3 rounded-xl border-slate-200 bg-white shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
    >
      <Globe size={18} className="text-slate-500" />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
        {i18n.language === 'en' ? 'RU' : 'EN'}
      </span>
    </Button>
  );
}
