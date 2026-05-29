import React from 'react';
import Barcode from 'react-barcode';
import { useTranslation } from 'react-i18next';

interface ReceiptProps {
  sale: any;
  items: any[];
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  cashierName?: string;
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ sale, items, storeName, storeAddress, storePhone, cashierName }, ref) => {
  const { t } = useTranslation();
  const currency = t('common.ru_currency', '₽');

  const displayName = storeName || t('receipt.header');
  const displayAddress = storeAddress || '';
  const displayPhone = storePhone ? `ТЕЛ: ${storePhone}` : '';

  return (
    <div ref={ref} className="w-[80mm] p-4 bg-white text-black font-mono text-xs leading-tight">
      <div className="text-center space-y-1 mb-4 border-b border-dashed border-black pb-4">
        <h1 className="text-lg font-bold">{displayName}</h1>
        <p>{t('receipt.sub_header')}</p>
        {displayAddress && <p>{displayAddress}</p>}
        <p>{displayPhone}</p>
      </div>

      <div className="space-y-1 mb-4">
        <div className="flex justify-between">
          <span>{t('receipt.receipt')}:</span>
          <span className="font-bold">{sale.id?.slice(-8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('receipt.date')}:</span>
          <span>{new Date().toLocaleString('ru-RU')}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('receipt.terminal')}:</span>
          <span>TERM-01</span>
        </div>
        <div className="flex justify-between">
          <span>{t('receipt.cashier')}:</span>
          <span>{cashierName || 'Кассир'}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black mb-4">
        <div className="flex justify-between font-bold mb-1">
          <span className="w-1/2">{t('receipt.item')}</span>
          <span className="w-1/4 text-center">{t('receipt.qty')}</span>
          <span className="w-1/4 text-right">{t('common.total')}</span>
        </div>
        {items.map((item, index) => (
          <div key={index} className="flex justify-between mb-1">
            <span className="w-1/2 truncate">{item.variation.product?.name}</span>
            <span className="w-1/4 text-center">x{item.quantity}</span>
            <span className="w-1/4 text-right">{currency}{(item.variation.salePrice * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 mb-6">
        <div className="flex justify-between">
          <span>{t('pos.subtotal')}:</span>
          <span>{currency}{items.reduce((acc, i) => acc + (i.variation.salePrice * i.quantity), 0).toLocaleString()}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between italic">
            <span>{t('receipt.promo_discount')}:</span>
            <span>-{currency}{sale.discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold pt-2 border-t border-black">
          <span>{t('common.total')}:</span>
          <span>{currency}{sale.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center space-y-2 border-t border-dashed border-black pt-4">
        <div className="font-bold uppercase">
          {(t('receipt.payment') as string)}: {(t(`pos.${sale.paymentType?.toLowerCase()}`, sale.paymentType) as string)}
        </div>
        <p className="mt-4">{(t('receipt.thank_you') as string)}</p>
        <div className="flex justify-center py-2">
          <Barcode
            value={sale.id?.slice(-12).toUpperCase() || '000000000000'}
            width={1.2}
            height={32}
            fontSize={8}
            margin={0}
            displayValue={true}
          />
        </div>
        <p className="text-[8px]">{t('receipt.scan_loyalty')}</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
