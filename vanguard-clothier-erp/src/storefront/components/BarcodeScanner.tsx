import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onClose: () => void;
  onFound: (sku: string) => void;
}

export default function BarcodeScanner({ onClose, onFound }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualSku, setManualSku] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startScanner();
    return () => stopCamera();
  }, []);

  const startScanner = async () => {
    setError('');

    // Check BarcodeDetector API support
    if (!('BarcodeDetector' in window)) {
      setError('Ваш браузер не поддерживает сканирование штрих-кодов. Введите артикул вручную.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
      });
      detectorRef.current = detector;
      setScanning(true);
      scan(detector);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Нет доступа к камере. Разрешите доступ в настройках браузера.');
      } else {
        setError('Не удалось запустить камеру. Введите артикул вручную.');
      }
    }
  };

  const scan = async (detector: any) => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => scan(detector));
      return;
    }
    try {
      const codes = await detector.detect(videoRef.current);
      if (codes.length > 0) {
        const raw = codes[0].rawValue as string;
        stopCamera();
        onFound(raw.trim().toUpperCase());
        return;
      }
    } catch { /* continue */ }
    rafRef.current = requestAnimationFrame(() => scan(detector));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSku.trim()) {
      onFound(manualSku.trim().toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-900">Сканер штрих-кода</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black aspect-video">
          {!error && (
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          )}

          {/* Scanning overlay */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-32 border-2 border-white/80 rounded-lg relative">
                {/* Corner indicators */}
                {['-top-0.5 -left-0.5', '-top-0.5 -right-0.5', '-bottom-0.5 -left-0.5', '-bottom-0.5 -right-0.5'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-5 h-5 border-blue-400`} style={{ borderWidth: i < 2 ? '3px 0 0 3px' : '0 0 3px 3px', ...(i % 2 !== 0 ? { borderLeftWidth: 0, borderRightWidth: 3 } : {}), ...(i < 2 ? {} : {}), transform: i === 1 ? 'scaleX(-1)' : i === 2 ? 'scaleY(-1)' : i === 3 ? 'scale(-1)' : '' }} />
                ))}
                {/* Scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-blue-400/80 animate-bounce" style={{ top: '50%' }} />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
                Наведите камеру на штрих-код
              </p>
            </div>
          )}

          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={32} className="text-white animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle size={32} className="text-red-400 mb-2" />
              <p className="text-white/90 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Manual input fallback */}
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-3 text-center">или введите артикул вручную</p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              value={manualSku}
              onChange={e => setManualSku(e.target.value.toUpperCase())}
              placeholder="VNG-1000"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!manualSku.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Найти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
