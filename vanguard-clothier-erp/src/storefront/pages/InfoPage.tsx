import React from 'react';
import { Truck, RotateCcw, HelpCircle, Phone, MapPin, Package, ArrowLeft, Info, Shield, FileText, Star } from 'lucide-react';

interface InfoPageProps {
  section?: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

type InfoSection = 'delivery' | 'returns' | 'faq' | 'contacts' | 'pickup' | 'about' | 'privacy' | 'terms' | 'loyalty';

const SECTIONS: { id: InfoSection; label: string; icon: React.ElementType }[] = [
  { id: 'delivery', label: 'Доставка и оплата', icon: Truck },
  { id: 'pickup', label: 'Самовывоз', icon: Package },
  { id: 'returns', label: 'Возврат и обмен', icon: RotateCcw },
  { id: 'loyalty', label: 'Карта лояльности', icon: Star },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'contacts', label: 'Контакты', icon: Phone },
  { id: 'about', label: 'О компании', icon: Info },
  { id: 'privacy', label: 'Конфиденциальность', icon: Shield },
  { id: 'terms', label: 'Соглашение', icon: FileText },
];

export default function InfoPage({ section = 'delivery', onNavigate }: InfoPageProps) {
  const current = (section as InfoSection) ?? 'delivery';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          На главную
        </button>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden sm:block w-52 shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-100 p-3 space-y-1 sticky top-36">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => onNavigate('info', { section: s.id })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors ${current === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <s.icon size={15} className={current === s.id ? 'text-blue-600' : 'text-gray-400'} />
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
            {current === 'delivery' && <DeliverySection />}
            {current === 'returns' && <ReturnsSection />}
            {current === 'faq' && <FAQSection />}
            {current === 'contacts' && <ContactsSection />}
            {current === 'pickup' && <PickupSection />}
            {current === 'about' && <AboutSection />}
            {current === 'privacy' && <PrivacySection />}
            {current === 'terms' && <TermsSection />}
            {current === 'loyalty' && <LoyaltySection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliverySection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Доставка и оплата</h1>

      <div className="space-y-6">
        <Section title="Курьерская доставка">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-2.5 text-gray-600">Москва и МО</td><td className="py-2.5 font-medium text-right">290 ₽ · 1–2 дня</td></tr>
              <tr><td className="py-2.5 text-gray-600">Санкт-Петербург</td><td className="py-2.5 font-medium text-right">390 ₽ · 2–3 дня</td></tr>
              <tr><td className="py-2.5 text-gray-600">Другие города</td><td className="py-2.5 font-medium text-right">490 ₽ · 3–7 дней</td></tr>
              <tr><td className="py-2.5 text-green-600 font-medium">Бесплатно от 5 000 ₽</td><td className="py-2.5 text-green-600 font-medium text-right">для всех регионов</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="Доставка в пункт выдачи СДЭК / Boxberry">
          <p className="text-sm text-gray-600">от 199 ₽ · срок 2–5 дней · более 2500 пунктов по России</p>
        </Section>

        <Section title="Способы оплаты">
          <ul className="text-sm text-gray-600 space-y-1.5">
            {['Банковская карта (Visa, Mastercard, МИР)', 'Наличными курьеру', 'СБП (QR-код)', 'Рассрочка Tinkoff / Сбер', 'Баллы карты лояльности VANGUARD'].map(m => (
              <li key={m} className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0" />{m}</li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function ReturnsSection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Возврат и обмен</h1>
      <div className="space-y-6">
        <Section title="Условия возврата">
          <ul className="text-sm text-gray-600 space-y-2">
            {[
              'Возврат в течение 30 дней с момента получения',
              'Товар должен быть в оригинальной упаковке с бирками',
              'Без следов ношения и повреждений',
              'Возврат оформляется через личный кабинет или в магазине',
            ].map(i => <li key={i} className="flex gap-2"><span className="text-blue-500 shrink-0">✓</span>{i}</li>)}
          </ul>
        </Section>
        <Section title="Обмен размера">
          <p className="text-sm text-gray-600">Обмен на другой размер бесплатен при наличии товара. Если нужного размера нет — оформим возврат и новый заказ.</p>
        </Section>
        <Section title="Возврат средств">
          <p className="text-sm text-gray-600">На карту — 3–5 рабочих дней. На баллы лояльности — мгновенно.</p>
        </Section>
      </div>
    </div>
  );
}

function FAQSection() {
  const faq = [
    { q: 'Как отследить заказ?', a: 'Трек-номер отправляется на email сразу после отгрузки. Также статус доступен в личном кабинете в разделе «Мои заказы».' },
    { q: 'Можно ли изменить адрес доставки?', a: 'Да, пока заказ не передан в доставку. Свяжитесь с нами по телефону или через чат.' },
    { q: 'Как применить промокод?', a: 'Введите промокод в корзине перед оформлением заказа в поле «Промокод».' },
    { q: 'Есть ли программа лояльности?', a: 'Да! С каждой покупки вы получаете баллы (1 балл = 1 ₽). Баллами можно оплатить до 30% стоимости следующего заказа.' },
    { q: 'Как узнать свой размер?', a: 'На каждой карточке товара есть кнопка «Таблица размеров». Измерьте объём груди, талии и бёдер и сверьтесь с таблицей.' },
    { q: 'Оригинальные ли товары?', a: 'Да, все товары 100% оригинальные, закупаемые напрямую у производителей.' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Часто задаваемые вопросы</h1>
      <div className="space-y-4">
        {faq.map((item, i) => (
          <details key={i} className="group border border-gray-100 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer text-sm font-semibold text-gray-900 hover:bg-gray-50 list-none">
              {item.q}
              <span className="text-gray-400 group-open:rotate-180 transition-transform text-lg leading-none">›</span>
            </summary>
            <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function ContactsSection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Контакты</h1>
      <div className="space-y-5">
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
          <Phone size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900">8 800 123-45-67</p>
            <p className="text-sm text-gray-500">Бесплатно по России · Пн–Вс 9:00–21:00</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
          <MapPin size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900">ТЦ «Авиапарк»</p>
            <p className="text-sm text-gray-500">Ходынский б-р, 4, ул. 3 этаж · 10:00–22:00</p>
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="font-semibold text-gray-900 mb-1">Юридический адрес</p>
          <p className="text-sm text-gray-500">ООО «Вангард Клотье» · ИНН 7701234567 · 125080, Москва, Ходынский б-р, 4</p>
        </div>
      </div>
    </div>
  );
}

function PickupSection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Самовывоз</h1>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Самовывоз из магазина — бесплатно. Заказ будет готов в течение 2 часов после оформления.</p>
        <Section title="Наш магазин">
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">ТЦ «Авиапарк», Ходынский б-р, 4, 3 этаж</p>
              <p className="text-gray-500">Пн–Вс 10:00–22:00</p>
              <p className="text-gray-500">+7 (495) 123-45-67</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">О компании</h1>
      <p className="text-sm text-gray-600 leading-relaxed mb-4">VANGUARD Clothier — российский бренд городской одежды, основанный в 2015 году. Мы создаём качественную одежду для активной городской жизни.</p>
      <p className="text-sm text-gray-600 leading-relaxed">Наши коллекции сочетают функциональность и стиль, используя только сертифицированные материалы от проверенных поставщиков.</p>
    </div>
  );
}

function PrivacySection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Политика конфиденциальности</h1>
      <p className="text-sm text-gray-600 leading-relaxed">Мы уважаем вашу конфиденциальность. Персональные данные обрабатываются в соответствии с ФЗ №152 «О персональных данных» и используются исключительно для обработки заказов и улучшения качества сервиса.</p>
    </div>
  );
}

function TermsSection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Пользовательское соглашение</h1>
      <p className="text-sm text-gray-600 leading-relaxed">Используя сайт VANGUARD Clothier, вы соглашаетесь с условиями настоящего соглашения. Все материалы сайта защищены авторским правом.</p>
    </div>
  );
}

function LoyaltySection() {
  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 mb-6">Карта лояльности</h1>
      <div className="space-y-4">
        <Section title="Как накапливать баллы">
          <ul className="text-sm text-gray-600 space-y-1.5">
            {['1 балл за каждые 10 ₽ покупки', 'Двойные баллы в дни рождения', 'Баллы за отзывы о товарах'].map(i => (
              <li key={i} className="flex gap-2"><span className="text-amber-400">★</span>{i}</li>
            ))}
          </ul>
        </Section>
        <Section title="Как использовать">
          <p className="text-sm text-gray-600">1 балл = 1 ₽. Оплачивайте до 30% стоимости заказа накопленными баллами.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}
