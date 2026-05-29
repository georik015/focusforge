import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user, pass },
  });
}

const FROM = () => `"${process.env.STORE_NAME || 'Vanguard Clothier'}" <${process.env.SMTP_USER || 'no-reply@vanguard.local'}>`;

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'Принят, ожидает подтверждения',
  CONFIRMED: 'Подтверждён',
  SHIPPED:   'Передан в доставку',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

export async function sendOrderConfirmation(order: {
  id: string;
  guestName?: string | null;
  guestEmail?: string | null;
  total: number;
  items: { quantity: number; priceAtSale: number; variation: { sku: string; size: string; color: string; product: { name: string } } }[];
}) {
  const transport = createTransport();
  const email = order.guestEmail;
  if (!transport || !email) return;

  const itemsHtml = order.items.map(i =>
    `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #eee">${i.variation.product.name} (${i.variation.size}, ${i.variation.color})</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">₽${(i.priceAtSale * i.quantity).toLocaleString('ru-RU')}</td>
    </tr>`
  ).join('');

  await transport.sendMail({
    from: FROM(),
    to: email,
    subject: `Заказ #${order.id.slice(-8).toUpperCase()} принят`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0070f3">Ваш заказ принят!</h2>
        <p>Здравствуйте, ${order.guestName ?? 'покупатель'}!</p>
        <p>Заказ <strong>#${order.id.slice(-8).toUpperCase()}</strong> успешно оформлен. Мы свяжемся с вами для подтверждения.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left">Товар</th>
              <th style="padding:8px;text-align:center">Кол-во</th>
              <th style="padding:8px;text-align:right">Сумма</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="font-size:18px;font-weight:bold">Итого: ₽${order.total.toLocaleString('ru-RU')}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="color:#888;font-size:12px">Vanguard Clothier · ${process.env.STORE_PHONE || ''}</p>
      </div>
    `,
  }).catch((err: Error) => console.error('[EMAIL] Failed to send order confirmation:', err.message));
}

export async function sendOrderStatusUpdate(order: {
  id: string;
  guestEmail?: string | null;
  guestName?: string | null;
  status: string;
}) {
  const transport = createTransport();
  const email = order.guestEmail;
  if (!transport || !email) return;

  const label = STATUS_LABELS[order.status] ?? order.status;

  await transport.sendMail({
    from: FROM(),
    to: email,
    subject: `Заказ #${order.id.slice(-8).toUpperCase()} — статус обновлён`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0070f3">Статус вашего заказа изменился</h2>
        <p>Здравствуйте, ${order.guestName ?? 'покупатель'}!</p>
        <p>Заказ <strong>#${order.id.slice(-8).toUpperCase()}</strong>:</p>
        <p style="font-size:20px;font-weight:bold;color:${order.status === 'CANCELLED' ? '#dc2626' : '#16a34a'}">${label}</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
        <p style="color:#888;font-size:12px">Vanguard Clothier · ${process.env.STORE_PHONE || ''}</p>
      </div>
    `,
  }).catch((err: Error) => console.error('[EMAIL] Failed to send status update:', err.message));
}
