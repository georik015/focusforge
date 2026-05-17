# LevelMe — Project Structure & Roadmap

> "Это не трекер. Это ты — в виде игрового персонажа."

---

## Vision

Мировое приложение для развития личности, где реальные действия человека
напрямую влияют на его цифрового аватара.
Не геймификация ради геймификации — а инструмент, который реально меняет людей.

---

## Core Concept

### The Avatar System
- Аватар — отражение реального состояния пользователя
- Кинематографичный 3D стиль (уровень God of War / Last of Us)
- 6 измерений развития, каждое влияет на внешность и способности персонажа
- Деградация при бездействии — через "теневую версию" (не резкое ухудшение)

### 6 Измерений (Domains)
| Domain | Иконка | Влияет на аватара |
|--------|--------|-------------------|
| Body | 💪 | Телосложение, осанка, энергетика |
| Mind | 🧠 | Выражение лица, "свечение" интеллекта |
| Emotions | ❤️ | Цвет ауры, открытость позы |
| Social | 🤝 | Харизма, уверенность в позе |
| Life Management | ⚡ | Организованность, ритм движений |
| Inner State | 🌿 | Спокойствие, глубина взгляда |

### Mastery Loop (Знание → Действие → Закрепление)
```
Concept Card
    ↓
Mini Challenge (конкретное действие на неделю)
    ↓
Reflection Check
    ↓
Spaced Repetition (повтор через 3/7/30 дней)
    ↓
XP + avatar update
```

### Degradation Mechanic
- Медленный откат XP при бездействии (не мгновенный)
- "Теневой аватар" — полупрозрачный силуэт потенциального состояния
- Нет резкого негатива — только мягкое напоминание о direction

---

## Differentiators

1. **AI-коуч** — анализирует перекосы между доменами, даёт персональные инсайты
2. **Life Events** — разовые события (бессонная ночь, болезнь, победа) влияют на аватара
3. **Auto-tracking** — интеграция с Apple Health / Google Fit снижает friction
4. **Mastery Cards** — встроенная система обучения с интервальными повторениями
5. **Public Profile** — поделиться аватаром как достижением (вирусный механизм)

---

## Monetization

### Тарифы
| Plan | RU | World |
|------|----|-------|
| Weekly | 990₽ | $9.99 |
| Monthly | 2 490₽ | $24.99 |
| Annual | 14 990₽ | $149.99 |

### Модель
- 7 дней бесплатно (все функции)
- После триала — подписка
- Freemium tier: базовый аватар + 1 домен (для роста аудитории)

---

## Tech Architecture

### Stack
```
Frontend:
  Mobile  → React Native (Expo) — iOS + Android
  Web     → Next.js 14 (App Router)

Backend:
  API     → Node.js + Fastify
  Auth    → Supabase Auth (Google, Apple, Email)
  DB      → Supabase (PostgreSQL)
  Cache   → Redis (Upstash)
  Storage → Supabase Storage + CDN

Avatar:
  3D      → Three.js + Spline (web)
  Mobile  → React Native Skia + 3D assets

AI:
  Coach   → Claude API (Anthropic)
  Voice   → Whisper API

Payments:
  Global  → Stripe
  RU      → ЮКасса / CloudPayments

Infra:
  Deploy  → Vercel (web) + EAS (mobile)
  CI/CD   → GitHub Actions
  Monitor → Sentry + PostHog
```

### Microservices (Phase 2+)
```
api-gateway
├── user-service         # профиль, настройки
├── avatar-service       # состояние аватара, рендер-данные
├── progress-service     # XP, stats, история
├── knowledge-service    # карточки, Mastery Loop
├── ai-coach-service     # анализ, рекомендации
└── notification-service # push, email, reminders
```

---

## Development Phases

### Phase 0 — Foundation (Сейчас → MVP)
**Цель:** Проверить гипотезу. Первые 100 платящих пользователей.

- [ ] Дизайн-система (цвета, типографика, компоненты)
- [ ] Концептуальный лендинг + waitlist
- [ ] MVP веб-приложение:
  - [ ] Авторизация (Supabase)
  - [ ] Создание профиля (6 доменов, начальные значения)
  - [ ] 2D аватар первой версии (placeholder для 3D)
  - [ ] Ввод активностей вручную
  - [ ] Дашборд прогресса (радарная диаграмма доменов)
  - [ ] Базовая деградация (таймер бездействия)
  - [ ] Mastery Cards (10 карточек для теста)
  - [ ] Stripe подписка

**Стек Phase 0:** Next.js + Supabase + Stripe. Чисто. Быстро. Работает.

---

### Phase 1 — Product (После первых 100 платящих)
**Цель:** Retention >40% в месяц. Product-market fit.

- [ ] Настоящий 3D аватар (Three.js / Spline интеграция)
- [ ] AI-коуч (Claude API)
- [ ] Apple Health / Google Fit интеграция
- [ ] Life Events система
- [ ] Push-уведомления
- [ ] React Native мобильное приложение
- [ ] Публичный профиль / поделиться

---

### Phase 2 — Scale (После product-market fit)
**Цель:** 10,000 MAU. Мировой рынок.

- [ ] iOS App Store + Google Play
- [ ] Wearables интеграция (Apple Watch, Fitbit)
- [ ] Голосовой ввод (Whisper)
- [ ] Многоязычность (EN, RU, ES)
- [ ] Microservices миграция
- [ ] Социальные функции (друзья, не соревнование)
- [ ] B2B: корпоративные команды

---

### Phase 3 — Vision
**Цель:** 1M MAU.

- [ ] AR аватар (телефонная камера)
- [ ] Кастомизация аватара
- [ ] Community features
- [ ] API для партнёров (тренеры, терапевты)
- [ ] LevelMe Academy (курсы через Mastery Loop)

---

## Current Status

**Дата начала:** 2026-03-30
**Текущая фаза:** Phase 0 — Foundation
**Следующий шаг:** Дизайн-система + лендинг с waitlist

---

## Key Decisions Log

| Дата | Решение | Причина |
|------|---------|---------|
| 2026-03-30 | Начинаем с веб, не мобайл | Быстрее итерировать, дешевле тестировать |
| 2026-03-30 | Supabase вместо Firebase | PostgreSQL > Firestore для сложных запросов |
| 2026-03-30 | Кинематографичный стиль вместо фото-реализма | Реализм = 12 мес работы, стиль = 2 мес |
| 2026-03-30 | Freemium tier добавлен | Рост аудитории важнее краткосрочного дохода |
| 2026-03-30 | Claude API для AI-коуча | Лучшее качество рассуждений для персонального коучинга |
