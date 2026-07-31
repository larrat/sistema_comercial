import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

type Props = {
  photos: string[];
  currentIndex: number;
  isOpen: boolean;
  title?: string;
  dateStr?: string;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
};

export function PortalPhotoLightbox({
  photos,
  currentIndex,
  isOpen,
  title,
  dateStr,
  onClose,
  onNavigate
}: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose, onNavigate]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6"
        onClick={onClose}
      >
        {/* Header Controls */}
        <div
          className="w-full max-w-5xl flex items-center justify-between z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            {title && <span className="text-white font-bold text-base sm:text-lg">{title}</span>}
            {dateStr && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Calendar size={13} className="text-teal-400" />
                <span>{dateStr}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-white/10 text-slate-300 px-3 py-1.5 rounded-full border border-white/10">
              {currentIndex + 1} / {photos.length}
            </span>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Fechar galeria"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Photo Area */}
        <div
          className="relative max-w-5xl w-full flex-1 flex items-center justify-center my-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.length > 1 && currentIndex > 0 && (
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              className="absolute left-2 sm:left-4 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 flex items-center justify-center transition-transform hover:scale-105"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <motion.img
            key={currentPhoto}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            src={currentPhoto}
            alt={title || `Foto da obra ${currentIndex + 1}`}
            className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
          />

          {photos.length > 1 && currentIndex < photos.length - 1 && (
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              className="absolute right-2 sm:right-4 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 flex items-center justify-center transition-transform hover:scale-105"
              aria-label="Próxima foto"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Thumbnails Strip */}
        {photos.length > 1 && (
          <div
            className="w-full max-w-xl flex items-center justify-center gap-2 overflow-x-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {photos.map((photo, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(idx)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                  idx === currentIndex
                    ? 'border-teal-400 scale-105 shadow-lg shadow-teal-500/20'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
