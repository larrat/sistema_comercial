import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';
import { Card } from './index';

type Props = {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
};

export function ScannerModal({ onScan, onClose, title = "Escanear Código" }: Props) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        scannerRef.current?.clear();
        onClose();
      },
      (error) => {
        // console.warn(error);
      }
    );

    return () => {
      scannerRef.current?.clear().catch(err => console.error("Failed to clear scanner", err));
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <Card className="w-full max-w-lg bg-surface-card border-white/10 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div id="reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-black/40"></div>
          <p className="mt-4 text-center text-xs text-slate-500 font-medium">
            Posicione o código de barras ou QR Code dentro do quadrado para leitura automática.
          </p>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/20 flex justify-center">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border border-white/5"
          >
            Fechar Câmera
          </button>
        </div>
      </Card>
    </div>
  );
}
