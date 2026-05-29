# Vanguard Clothier ERP

**Автоматизированная информационная система учёта товаров магазина одежды**

Дипломная работа. Разработка АИС для розничного магазина одежды с модулями управления товарами, кассой, складом, финансами и онлайн-витриной.

---

## Технологический стек

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Zustand, Recharts |
| Backend | Node.js, Express.js, tsx |
| ORM / БД | Prisma ORM, SQLite |
| Аутентификация | JWT (jsonwebtoken), bcryptjs |
| Локализация | i18next (ru / en) |
| Сборщик | Vite 6 |

---

## Функциональные модули

### ERP-система (персонал)
- **Dashboard** — сводная панель: KPI, график продаж, мониторинг склада, онлайн-заказы
- **Касса (POS)** — продажи с выбором товара/клиента/скидки, два способа оплаты, печать чека, возврат товара, offline-режим
- **Товары** — полный CRUD с вариантами (размер, цвет, цена), штрихкоды, импорт/экспорт Excel
- **Инвентаризация** — управление остатками, пороги тревоги, поиск и фильтрация
- **Склад** — список складов, движение товара, трансферы между складами
- **Поставки** — создание и отмена поставок, поставщики, история
- **Заказы** — онлайн-заказы с витрины, смена статусов, отмена с откатом стока
- **Финансы** — P&L отчёт, журнал расходов (CRUD), графики по категориям
- **Отчёты** — аналитика за период, топ продаж, Z-отчёт смены, экспорт Excel
- **Смены** — открытие/закрытие смены, учёт наличных
- **Клиенты** — база покупателей, программа лояльности (баллы)
- **Сотрудники** — управление пользователями, роли (ADMIN / SELLER / STOREKEEPER), invite-коды
- **Настройки** — конфигурация магазина, аудит-лог, сброс демо-данных

### Онлайн-витрина (покупатели)
- Каталог с фильтрами (категория, бренд, пол, цена, наличие)
- Карточка товара с вариантами, выбором размера (таблица размеров RU/EUR/CM)
- Корзина, вишлист, оформление заказа
- Личный кабинет покупателя, история заказов
- Поиск, сканер штрихкодов, выбор города доставки

---

## Запуск локально

### Требования
- Node.js >= 18
- npm >= 9

### Установка

```bash
cd vanguard-clothier-erp
npm install
```

### Настройка окружения

Скопируйте `.env.example` в `.env`:

```bash
copy .env.example .env
```

Минимальная конфигурация `.env`:

```env
NODE_ENV="development"
APP_URL="http://localhost:3000"
JWT_SECRET="ваш-секрет-не-менее-32-символов"
DATABASE_URL="file:./prisma/dev.db"
```

### Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

При первом запуске база данных создаётся автоматически и заполняется демо-данными.

### Учётные данные по умолчанию

| Email | Пароль | Роль |
|-------|--------|------|
| admin@vanguard.com | admin123 | Администратор |
| seller@vanguard.com | seller123 | Продавец |
| store@vanguard.com | store123 | Кладовщик |

---

## Структура проекта

```
vanguard-clothier-erp/
├── server.ts               # Точка входа Express-сервера
├── prisma/
│   ├── schema.prisma       # Схема базы данных (16 моделей)
│   └── dev.db              # SQLite база (создаётся автоматически)
├── src/
│   ├── server/             # Backend API (Express routers)
│   │   ├── auth.ts         # JWT middleware
│   │   ├── auth_routes.ts  # Аутентификация, invite, сброс пароля
│   │   ├── products.ts     # Товары и вариации
│   │   ├── sales.ts        # Продажи и возвраты
│   │   ├── orders.ts       # Онлайн-заказы
│   │   ├── customers.ts    # Клиенты
│   │   ├── warehouses.ts   # Склады
│   │   ├── supplies.ts     # Поставки
│   │   ├── shifts.ts       # Смены
│   │   ├── finances.ts     # Расходы и P&L
│   │   ├── analytics.ts    # Аналитика и отчёты
│   │   ├── intelligence.ts # AI-прогноз спроса (Gemini, опционально)
│   │   ├── users.ts        # Управление сотрудниками
│   │   ├── admin.ts        # Импорт/экспорт, сброс данных
│   │   └── public.ts       # Публичное API витрины
│   ├── pages/              # ERP-страницы (React)
│   ├── storefront/         # Онлайн-витрина (React)
│   ├── store/              # Zustand stores (корзина, вишлист, город)
│   ├── components/         # Общие компоненты
│   └── i18n/               # Локализация (ru/en)
└── vite.config.ts          # Конфигурация Vite
```

---

## API Endpoints (основные)

```
POST   /api/auth/login              — вход в систему
POST   /api/auth/register           — регистрация по invite-коду
POST   /api/auth/forgot-password    — запрос сброса пароля
POST   /api/auth/reset-password     — сброс пароля

GET    /api/products                — список товаров
POST   /api/products                — создание товара
PUT    /api/products/:id            — обновление товара

POST   /api/sales                   — оформление продажи
POST   /api/sales/returns           — возврат товара

GET    /api/orders                  — онлайн-заказы
PATCH  /api/orders/:id/status       — изменение статуса заказа
POST   /api/orders/:id/cancel       — отмена заказа

GET    /api/finance/expenses        — журнал расходов
POST   /api/finance/expenses        — добавление расхода
PATCH  /api/finance/expenses/:id    — редактирование расхода
DELETE /api/finance/expenses/:id    — удаление расхода
GET    /api/finance/p-and-l         — отчёт P&L

GET    /api/analytics/dashboard     — данные дашборда
GET    /api/analytics/reports       — отчёты за период

GET    /api/public/products         — каталог для витрины
POST   /api/public/orders           — оформление онлайн-заказа
```

---

## Роли и права доступа

| Роль | Dashboard | POS | Склад | Финансы | Настройки |
|------|-----------|-----|-------|---------|-----------|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| SELLER | ✅ | ✅ | — | — | — |
| STOREKEEPER | ✅ | — | ✅ | частично | — |

---

## Схема базы данных

16 Prisma-моделей: `User`, `Product`, `ProductVariation`, `Category`, `Brand`, `Sale`, `SaleItem`, `Return`, `ReturnItem`, `Customer`, `Warehouse`, `WarehouseStock`, `StockMovement`, `Supply`, `SupplyItem`, `Supplier`, `Expense`, `Shift`, `StorefrontOrder`, `StorefrontOrderItem`, `InviteToken`, `PasswordResetToken`, `ActivityLog`, `StoreConfig`.

---

## Лицензия

Дипломная работа. Все права защищены.
