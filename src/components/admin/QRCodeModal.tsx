import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, Download, Printer } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Training } from '@/src/types';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: Training | null;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, training }) => {
  if (!training) return null;

  const checkInUrl = `${window.location.origin}/checkin/${training.id}`;

  const downloadQR = () => {
    const canvas = document.getElementById('checkin-qr') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `checkin-${training.id}.png`;
      link.href = url;
      link.click();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Check-in Terminal</span>
                  <h3 className="text-xl font-black text-slate-900 truncate max-w-[250px]">{training.title}</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="text-slate-400" size={24} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-[2.5rem] p-10 flex flex-col items-center justify-center border border-slate-100 mb-8 print:p-0 print:border-none">
                <QRCodeCanvas 
                  id="checkin-qr"
                  value={checkInUrl}
                  size={240}
                  level="H"
                  includeMargin={true}
                  className="rounded-3xl shadow-xl bg-white p-4"
                />
                <p className="mt-6 text-[10px] text-slate-400 font-black uppercase tracking-widest text-center">
                  Scan to automatically check-in <br />approved participants
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 print:hidden">
                <button 
                  onClick={downloadQR}
                  className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                >
                  <Download size={16} />
                  <span>Download</span>
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-slate-50 transition-all"
                >
                  <Printer size={16} />
                  <span>Print QR</span>
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50 py-4 px-8 border-t border-slate-100 flex items-center justify-center gap-2 print:hidden">
              <QrCode size={14} className="text-slate-400" />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-full">
                {checkInUrl}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
