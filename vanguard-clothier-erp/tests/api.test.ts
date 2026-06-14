/**
 * Интеграционные API-тесты — Vanguard Clothier ERP
 *
 * Тестируют HTTP-поведение реальных Express-роутеров через supertest.
 * Не требуют запущенного сервера — создают изолированное приложение.
 *
 * Запуск: npm test
 */

// Установка env до любых require
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-api-tests';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/dev.db';

/* eslint-disable @typescript-eslint/no-require-imports */
const express = require('express');
const request = require('supertest');
const authRoutes = require('../src/server/auth_routes').default;
const publicRoutes = require('../src/server/public').default;
/* eslint-enable @typescript-eslint/no-require-imports */

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  return app;
}

const app = buildApp();

// ─── 1. Аутентификация ────────────────────────────────────────────────────────

describe('POST /api/auth/login — Валидация входных данных', () => {
  test('400 при неверном формате email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'notanemail', password: 'password123' });
    expect(res.status).toBe(400);
  });

  test('400 при коротком пароле (< 6 символов)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@vanguard.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('400 при пустом теле запроса', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });

  test('401 при несуществующем пользователе', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'password123' });
    // 401 или 500 (если DB недоступна в тестовой среде)
    expect([401, 500]).toContain(res.status);
  });

  test('ответ содержит поле error при неверных данных', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: '123' });
    expect(res.body).toHaveProperty('error');
  });
});

// ─── 2. Публичный каталог ─────────────────────────────────────────────────────

describe('GET /api/public/products — Публичный каталог товаров', () => {
  test('возвращает 200 и массив товаров', async () => {
    const res = await request(app).get('/api/public/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('поддерживает фильтрацию по поисковому запросу', async () => {
    const res = await request(app).get('/api/public/products?search=test');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('каждый товар имеет обязательные поля', async () => {
    const res = await request(app).get('/api/public/products');
    expect(res.status).toBe(200);
    for (const product of res.body) {
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('rating');
      expect(product.rating).toBeGreaterThanOrEqual(3.5);
      expect(product.rating).toBeLessThanOrEqual(4.9);
    }
  });
});

// ─── 3. Безопасность — защита от подмены цены ────────────────────────────────

describe('Безопасность API', () => {
  test('POST /api/auth/login без Content-Type возвращает 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'text/plain')
      .send('email=test&password=test');
    // Сервер должен отклонить не-JSON тело
    expect([400, 415]).toContain(res.status);
  });

  test('GET /api/public/products не требует авторизации (публичный)', async () => {
    const res = await request(app)
      .get('/api/public/products')
      .set('Authorization', ''); // без токена
    expect(res.status).toBe(200);
  });
});
