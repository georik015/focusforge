/**
 * Чистые функции бизнес-логики — без зависимостей от БД и HTTP.
 * Импортируются как production-кодом (sales.ts, public.ts), так и тестами.
 * Если здесь что-то меняется — тесты ломаются. Это и есть настоящий unit-test.
 */

/** Считает итоговую сумму чека из верифицированных цен БД. */
export function calcTotal(
  items: { variationId: string; quantity: number }[],
  verifiedPrices: Map<string, number>
): number {
  return items.reduce((sum, item) => {
    const price = verifiedPrices.get(item.variationId);
    if (price === undefined) throw new Error(`Товар ${item.variationId} не найден в БД`);
    return sum + price * item.quantity;
  }, 0);
}

/** Применяет процентную скидку. Выбрасывает ошибку при значении вне 0–100%. */
export function applyDiscount(price: number, discountPercent: number): number {
  if (discountPercent < 0 || discountPercent > 100)
    throw new Error('Скидка вне диапазона 0–100%');
  return Math.round(price * (1 - discountPercent / 100));
}

/** Начисляет баллы лояльности: 1 балл за каждые 10 ₽ покупки. */
export function calcLoyaltyPoints(total: number): number {
  if (total < 0) throw new Error('Сумма покупки не может быть отрицательной');
  return Math.floor(total / 10);
}

/** Списывает баллы при частичной/полной оплате. 1 балл = 1 ₽. */
export function applyLoyaltyPoints(
  total: number,
  pointsToUse: number,
  availablePoints: number
): { finalTotal: number; pointsSpent: number } {
  if (pointsToUse > availablePoints) throw new Error('Недостаточно баллов');
  if (pointsToUse > total) throw new Error('Баллов больше чем сумма покупки');
  return { finalTotal: total - pointsToUse, pointsSpent: pointsToUse };
}

/** Проверяет наличие товара перед продажей. Выбрасывает ошибку при нехватке. */
export function checkStock(available: number, requested: number): void {
  if (requested <= 0) throw new Error('Количество должно быть > 0');
  if (requested > available)
    throw new Error(`Недостаточно товара: доступно ${available}, запрошено ${requested}`);
}

/** Восстанавливает складской остаток при возврате. */
export function processReturn(
  currentStock: number,
  returnQty: number,
  originalQty: number
): number {
  if (returnQty <= 0) throw new Error('Количество возврата должно быть > 0');
  if (returnQty > originalQty)
    throw new Error('Количество возврата превышает количество в продаже');
  return currentStock + returnQty;
}

/** Детерминированный рейтинг товара: хэш от id → диапазон 3.5–4.9. */
export function calcRating(productId: string): number {
  const idHash = productId
    .split('')
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return parseFloat((3.5 + (idHash % 15) / 10).toFixed(1));
}
