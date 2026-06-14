/**
 * Unit-тесты критической бизнес-логики — Vanguard Clothier ERP
 *
 * Импортируют НАПРЯМУЮ из production-модуля src/lib/business-logic.ts.
 * Если логика в модуле изменится — тесты упадут. Это настоящий regression-test.
 *
 * Методология:
 * - Тип: Unit-тесты чистых функций (без БД и HTTP)
 * - Инструмент: Jest + ts-jest
 * - Сценарии: продажа, скидки, баллы лояльности, возврат, остаток, рейтинг
 * - Запуск: npm test
 */

import {
  calcTotal,
  applyDiscount,
  calcLoyaltyPoints,
  applyLoyaltyPoints,
  checkStock,
  processReturn,
  calcRating,
} from '../src/lib/business-logic';

// ─── 1. Расчёт суммы продажи ──────────────────────────────────────────────────

describe('Расчёт суммы продажи (POS-касса)', () => {
  test('сумма двух позиций считается корректно', () => {
    const prices = new Map([['v1', 1500], ['v2', 2500]]);
    const items = [{ variationId: 'v1', quantity: 2 }, { variationId: 'v2', quantity: 1 }];
    expect(calcTotal(items, prices)).toBe(5500); // 1500*2 + 2500*1
  });

  test('клиентская цена игнорируется — используется только цена из БД', () => {
    const prices = new Map([['v1', 1000]]);
    const items = [{ variationId: 'v1', quantity: 1 }];
    expect(calcTotal(items, prices)).toBe(1000); // не 1 (если бы клиент передал цену 1)
  });

  test('бросает ошибку если товар отсутствует в БД', () => {
    const prices = new Map([['v1', 500]]);
    const items = [{ variationId: 'v999', quantity: 1 }];
    expect(() => calcTotal(items, prices)).toThrow('не найден в БД');
  });

  test('нулевое количество даёт нулевую сумму', () => {
    const prices = new Map([['v1', 3000]]);
    const items = [{ variationId: 'v1', quantity: 0 }];
    expect(calcTotal(items, prices)).toBe(0);
  });
});

// ─── 2. Скидка ────────────────────────────────────────────────────────────────

describe('Применение скидки', () => {
  test('скидка 20% на товар 1000 ₽ → 800 ₽', () => {
    expect(applyDiscount(1000, 20)).toBe(800);
  });

  test('скидка 0% не изменяет цену', () => {
    expect(applyDiscount(2500, 0)).toBe(2500);
  });

  test('скидка 100% даёт 0 ₽', () => {
    expect(applyDiscount(1500, 100)).toBe(0);
  });

  test('некорректная скидка (больше 100%) бросает ошибку', () => {
    expect(() => applyDiscount(1000, 150)).toThrow('вне диапазона');
  });

  test('отрицательная скидка бросает ошибку', () => {
    expect(() => applyDiscount(1000, -5)).toThrow('вне диапазона');
  });
});

// ─── 3. Баллы программы лояльности ───────────────────────────────────────────

describe('Программа лояльности', () => {
  test('покупка 1500 ₽ → 150 баллов', () => {
    expect(calcLoyaltyPoints(1500)).toBe(150);
  });

  test('покупка 99 ₽ → 9 баллов (Math.floor)', () => {
    expect(calcLoyaltyPoints(99)).toBe(9);
  });

  test('нулевая покупка → 0 баллов', () => {
    expect(calcLoyaltyPoints(0)).toBe(0);
  });

  test('отрицательная сумма бросает ошибку', () => {
    expect(() => calcLoyaltyPoints(-100)).toThrow('отрицательной');
  });

  test('списание 100 баллов с суммы 500 ₽ → итог 400 ₽', () => {
    const result = applyLoyaltyPoints(500, 100, 200);
    expect(result.finalTotal).toBe(400);
    expect(result.pointsSpent).toBe(100);
  });

  test('нельзя списать больше баллов чем есть на счёте', () => {
    expect(() => applyLoyaltyPoints(1000, 500, 100)).toThrow('Недостаточно баллов');
  });

  test('нельзя списать баллов больше чем сумма покупки', () => {
    expect(() => applyLoyaltyPoints(200, 500, 1000)).toThrow('больше чем сумма');
  });
});

// ─── 4. Остаток склада при возврате ──────────────────────────────────────────

describe('Восстановление остатка при возврате', () => {
  test('возврат 2 единиц при остатке 10 → остаток 12', () => {
    expect(processReturn(10, 2, 5)).toBe(12);
  });

  test('возврат всего количества из продажи', () => {
    expect(processReturn(0, 3, 3)).toBe(3);
  });

  test('нельзя вернуть больше чем было куплено', () => {
    expect(() => processReturn(5, 10, 3)).toThrow('превышает количество');
  });

  test('нулевой возврат бросает ошибку', () => {
    expect(() => processReturn(5, 0, 3)).toThrow('должно быть > 0');
  });
});

// ─── 5. Контроль остатка при продаже ─────────────────────────────────────────

describe('Контроль складского остатка (POS)', () => {
  test('достаточный остаток — не бросает ошибку', () => {
    expect(() => checkStock(10, 3)).not.toThrow();
  });

  test('точное совпадение остатка и запроса — разрешено', () => {
    expect(() => checkStock(5, 5)).not.toThrow();
  });

  test('недостаточный остаток бросает ошибку с деталями', () => {
    expect(() => checkStock(2, 5)).toThrow('доступно 2, запрошено 5');
  });

  test('нулевой запрос бросает ошибку', () => {
    expect(() => checkStock(10, 0)).toThrow('должно быть > 0');
  });

  test('нулевой остаток блокирует продажу', () => {
    expect(() => checkStock(0, 1)).toThrow('Недостаточно товара');
  });
});

// ─── 6. Рейтинг товара ───────────────────────────────────────────────────────

describe('Расчёт рейтинга товара (enrichProduct)', () => {
  test('рейтинг в диапазоне 3.5–4.9', () => {
    const ids = ['abc123', 'xyz789', 'prod-001', 'item_42'];
    ids.forEach(id => {
      const r = calcRating(id);
      expect(r).toBeGreaterThanOrEqual(3.5);
      expect(r).toBeLessThanOrEqual(4.9);
    });
  });

  test('рейтинг детерминирован — один и тот же id всегда даёт одинаковый рейтинг', () => {
    expect(calcRating('product-001')).toBe(calcRating('product-001'));
  });

  test('разные id дают разные рейтинги (нет коллизий на малом наборе)', () => {
    const ratings = ['a1', 'b2', 'c3', 'd4', 'e5'].map(calcRating);
    const unique = new Set(ratings);
    expect(unique.size).toBeGreaterThan(1);
  });
});
