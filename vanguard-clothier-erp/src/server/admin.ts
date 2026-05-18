import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from './auth';
import * as XLSX from 'xlsx';

const router = Router();

// ─── IMPORT PRODUCTS FROM EXCEL ──────────────────────────────────────────────
// Body: { fileBase64: string }
// Expected columns (RU or EN):
//   Название/name, Описание/description, Категория/category, Бренд/brand,
//   Пол/gender, Артикул/sku, Размер/size, Цвет/color,
//   Закупочная цена/purchasePrice, Цена продажи/salePrice, Остаток/stock

router.post('/import-products', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { fileBase64 } = req.body;
  if (!fileBase64) return res.status(400).json({ error: 'No file data provided' });

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header
      try {
        const productName = String(row['Название'] ?? row['name'] ?? '').trim();
        const categoryName = String(row['Категория'] ?? row['category'] ?? '').trim();
        const brandName = String(row['Бренд'] ?? row['brand'] ?? '').trim();

        if (!productName || !categoryName || !brandName) {
          errors.push(`Строка ${rowNum}: пропущено обязательное поле (название, категория, бренд)`);
          continue;
        }

        const category = await prisma.category.upsert({
          where: { name: categoryName },
          create: { name: categoryName },
          update: {},
        });

        const brand = await prisma.brand.upsert({
          where: { name: brandName },
          create: { name: brandName },
          update: {},
        });

        const rawSku = String(row['Артикул'] ?? row['sku'] ?? '').trim();
        const sku = rawSku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

        const existingVar = await prisma.productVariation.findUnique({ where: { sku } });
        if (existingVar) {
          errors.push(`Строка ${rowNum}: артикул ${sku} уже существует — пропущен`);
          continue;
        }

        const genderRaw = String(row['Пол'] ?? row['gender'] ?? 'UNISEX').trim().toUpperCase();
        const validGenders = ['MALE', 'FEMALE', 'KIDS', 'UNISEX'];
        const gender = validGenders.includes(genderRaw) ? genderRaw : 'UNISEX';

        let product = await prisma.product.findFirst({
          where: { name: productName, brandId: brand.id, categoryId: category.id },
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: productName,
              description: String(row['Описание'] ?? row['description'] ?? '').trim() || null,
              categoryId: category.id,
              brandId: brand.id,
              gender,
            },
          });
        }

        await prisma.productVariation.create({
          data: {
            productId: product.id,
            sku,
            size: String(row['Размер'] ?? row['size'] ?? 'ONE SIZE').trim() || 'ONE SIZE',
            color: String(row['Цвет'] ?? row['color'] ?? 'Без цвета').trim() || 'Без цвета',
            purchasePrice: parseFloat(String(row['Закупочная цена'] ?? row['purchasePrice'] ?? 0)) || 0,
            salePrice: parseFloat(String(row['Цена продажи'] ?? row['salePrice'] ?? 0)) || 0,
            stock: parseInt(String(row['Остаток'] ?? row['stock'] ?? 0)) || 0,
          },
        });

        created++;
      } catch (err: any) {
        errors.push(`Строка ${rowNum}: ${err.message}`);
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'PRODUCTS_IMPORTED',
        details: `Импорт товаров: создано ${created} из ${rows.length} строк`,
      },
    });

    res.json({ created, errors, total: rows.length });
  } catch (err: any) {
    res.status(400).json({ error: 'Ошибка обработки файла: ' + err.message });
  }
});

// ─── DOWNLOAD IMPORT TEMPLATE ────────────────────────────────────────────────

router.get('/import-template', authenticate, async (_req, res) => {
  const data = [
    ['Название', 'Описание', 'Категория', 'Бренд', 'Пол', 'Артикул', 'Размер', 'Цвет', 'Закупочная цена', 'Цена продажи', 'Остаток'],
    ['Джинсы slim fit', 'Мужские джинсы', 'Джинсы', 'MyBrand', 'MALE', 'SKU-001', '32', 'Синий', 1500, 3500, 10],
    ['Платье летнее', 'Легкое платье', 'Платья', 'FashionCo', 'FEMALE', 'SKU-002', 'S', 'Белый', 800, 2200, 5],
    ['Толстовка детская', '', 'Толстовки', 'KidsBrand', 'KIDS', 'SKU-003', '128', 'Серый', 500, 1400, 8],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws['!cols'] = [
    { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Товары');

  // Add instructions sheet
  const infoData = [
    ['ИНСТРУКЦИЯ ПО ИМПОРТУ ТОВАРОВ'],
    [''],
    ['Обязательные поля: Название, Категория, Бренд'],
    ['Поле Пол: MALE / FEMALE / KIDS / UNISEX (по умолчанию UNISEX)'],
    ['Артикул должен быть уникальным. Если не указан — будет создан автоматически.'],
    ['Размер: S, M, L, XL, 42, 44, 46... или любой текст'],
    ['Цены указывать в рублях без знака валюты'],
    ['Остаток — целое число (количество единиц на складе)'],
  ];
  const infoWs = XLSX.utils.aoa_to_sheet(infoData);
  infoWs['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, infoWs, 'Инструкция');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="template_import_tovarov.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ─── EXPORT PRODUCTS ─────────────────────────────────────────────────────────

router.get('/export-products', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (_req, res) => {
  try {
    const variations = await prisma.productVariation.findMany({
      include: {
        product: { include: { category: true, brand: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    const rows = variations.map(v => ({
      'Артикул': v.sku,
      'Название': v.product.name,
      'Категория': v.product.category.name,
      'Бренд': v.product.brand.name,
      'Пол': v.product.gender,
      'Размер': v.size,
      'Цвет': v.color,
      'Закупочная цена': v.purchasePrice,
      'Цена продажи': v.salePrice,
      'Остаток': v.stock,
      'Мин. остаток': v.lowStockThreshold,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 10 },
      { wch: 10 }, { wch: 15 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="tovary_${date}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ─── EXPORT SALES ─────────────────────────────────────────────────────────────

router.get('/export-sales', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { from, to } = req.query;
    const where: Record<string, unknown> = {};
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(String(from)) } : {}),
        ...(to ? { lte: new Date(String(to)) } : {}),
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        seller: true,
        customer: true,
        items: { include: { variation: { include: { product: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = sales.flatMap(sale =>
      sale.items.map(item => ({
        'ID продажи': sale.id.slice(-8).toUpperCase(),
        'Дата': new Date(sale.createdAt).toLocaleString('ru-RU'),
        'Товар': item.variation.product.name,
        'Артикул': item.variation.sku,
        'Размер': item.variation.size,
        'Цвет': item.variation.color,
        'Кол-во': item.quantity,
        'Цена': item.priceAtSale,
        'Сумма': item.priceAtSale * item.quantity,
        'Тип оплаты': sale.paymentType,
        'Продавец': sale.seller.name,
        'Клиент': sale.customer?.name ?? 'Анонимный',
        'Скидка': sale.discount,
        'Итого за чек': sale.totalAmount,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Продажи': 'Нет данных за выбранный период' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Продажи');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="prodazhi_${date}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ─── RESET DEMO DATA ─────────────────────────────────────────────────────────
// Clears all merchandise, sales, customers. Keeps users and store config.
// Body: { confirm: 'RESET_CONFIRMED' }

router.post('/reset-demo', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res) => {
  const { confirm } = req.body;
  if (confirm !== 'RESET_CONFIRMED') {
    return res.status(400).json({ error: 'Требуется подтверждение: { confirm: "RESET_CONFIRMED" }' });
  }

  try {
    // Delete in foreign-key dependency order
    await prisma.storefrontOrderItem.deleteMany({});
    await prisma.storefrontOrder.deleteMany({});
    await prisma.returnItem.deleteMany({});
    await prisma.return.deleteMany({});
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.shift.deleteMany({});
    await prisma.supplyItem.deleteMany({});
    await prisma.supply.deleteMany({});
    await prisma.warehouseStock.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.productVariation.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.brand.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.activityLog.deleteMany({});

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'DEMO_DATA_RESET',
        details: 'Администратор очистил демо-данные. Система готова к работе.',
      },
    });

    res.json({ success: true, message: 'База данных очищена. Можно добавлять реальные товары.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Сброс не удался: ' + err.message });
  }
});

// ─── FIX PRODUCT IMAGES ──────────────────────────────────────────────────────
// Patches imageUrl for existing demo products without requiring a full reset.

router.put('/fix-images', authenticate, authorize(['ADMIN']), async (_req: AuthRequest, res) => {
  const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=700&h=840&fit=crop&q=80`;

  const imageMap: Record<string, string> = {
    'Рубашка Oxford в клетку':       IMG('AXyNhjkmAQE'),
    'Блузка шёлковая с бантом':      IMG('ChX0qm60Pkw'),
    'Платье-рубашка оверсайз':       IMG('wenWJfXwhE0'),
    'Юбка джинсовая миди':           IMG('pkIqYjaKxVQ'),
    'Платье трикотажное':            IMG('DP94IxvnhIs'),
    'Шарф шерстяной 100%':           IMG('LJ3f6eHO8vs'),
    'Ремень кожаный классический':   IMG('loItVLmJomk'),
    'Перчатки кожаные классические': IMG('5fnmt6S7y4o'),
    'Носки набор 5 пар Premium':     IMG('YHmZBuNCLvQ'),
    'Очки солнцезащитные UV400':     IMG('F550EPzyIPQ'),
    'Кошелёк кожаный Compact':       IMG('AN3qsgpgb7w'),
    'Спортивный костюм Active':      IMG('4Yk2n142-Pw'),
    'Леггинсы спортивные High Waist':IMG('ZbNa-B0BR3s'),
    'Шорты мужские базовые':         IMG('RCdtLvkyLXM'),
    'Парка утеплённая Urban':        IMG('1594938298603-e20aa0099f90'),
  };

  try {
    let updated = 0;
    for (const [name, imageUrl] of Object.entries(imageMap)) {
      const result = await prisma.product.updateMany({ where: { name }, data: { imageUrl } });
      updated += result.count;
    }
    // Clear all extraImages so no product shows another product's images in its gallery
    await prisma.product.updateMany({ data: { extraImages: null } });
    res.json({ success: true, updated, message: `Обновлено изображений: ${updated}. Галереи очищены.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Обновление изображений не удалось: ' + err.message });
  }
});

export default router;
