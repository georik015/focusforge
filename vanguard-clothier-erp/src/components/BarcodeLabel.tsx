import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { Button } from './ui/Button';
import { Printer } from 'lucide-react';

interface BarcodeLabelProps {
  sku: string;
  name: string;
  price: number;
  size: string;
  brand: string;
}

export function BarcodeLabel({ sku, name, price, size, brand }: BarcodeLabelProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={componentRef}
        className="bg-white p-4 border border-slate-100 flex flex-col items-center justify-center w-[60mm] h-[40mm] text-center"
        style={{ width: '60mm', height: '40mm' }}
      >
        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{brand}</div>
        <div className="text-[10px] font-black text-slate-900 truncate w-full px-2">{name}</div>
        <div className="mt-1">
          <Barcode 
            value={sku} 
            width={1.2} 
            height={40} 
            fontSize={10} 
            background="transparent"
            margin={0}
          />
        </div>
        <div className="flex justify-between w-full px-4 mt-1">
          <span className="text-[10px] font-black text-slate-900">SIZE: {size}</span>
          <span className="text-[10px] font-black text-indigo-600">${price.toFixed(2)}</span>
        </div>
      </div>
      
      <Button 
        onClick={() => handlePrint()}
        variant="outline" 
        className="h-8 px-3 rounded-lg border-slate-200 text-[10px] font-black uppercase tracking-widest gap-2"
      >
        <Printer size={14} /> Print Label
      </Button>
    </div>
  );
}
