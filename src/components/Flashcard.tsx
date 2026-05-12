import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface FlashcardProps {
  word: string;
  pinyin: string;
  meaning: string;
  wordType?: string;
  isFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  className?: string;
}

/**
 * A flip-able flashcard component for vocabulary learning.
 * Displays word/pinyin on front and meaning on back.
 */
export function Flashcard({ word, pinyin, meaning, wordType, isFlipped: controlledFlipped, onFlip, className }: FlashcardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onFlip) {
      onFlip(!isFlipped);
    } else {
      setInternalFlipped(!isFlipped);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-6 w-full max-w-sm mx-auto", className)} id="flashcard-container">
      <div 
        className="relative w-full aspect-[4/3] perspective-1000 group cursor-pointer touch-manipulation"
        onClick={handleToggle}
        id="flashcard-flip-area"
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          style={{ transformStyle: 'preserve-3d' }}
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ 
            duration: 0.6, 
            type: 'spring', 
            stiffness: 260, 
            damping: 20 
          }}
        >
          {/* Front Side */}
          <div 
            className="absolute inset-0 backface-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[32px] p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden"
            style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
            id="flashcard-front"
          >
            {/* Decoration */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center w-full">
              {wordType && (
                <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-[0.2em] rounded-full mb-4">
                  {wordType}
                </span>
              )}
              <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white font-display-zh mb-3 tracking-tight break-words max-w-full">
                {word}
              </h2>
              <p className="text-lg md:text-xl font-mono text-indigo-500 dark:text-indigo-400 font-medium tracking-[0.2em] uppercase">
                {pinyin}
              </p>
            </div>

            <div className="absolute bottom-6 flex items-center gap-2 text-slate-400 dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest transition-colors group-hover:text-indigo-500">
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>Chạm để lật</span>
            </div>
          </div>

          {/* Back Side */}
          <div 
            className="absolute inset-0 backface-hidden bg-indigo-600 rounded-[32px] p-6 md:p-8 flex flex-col items-center justify-center text-center shadow-2xl rotate-y-180 border-2 border-indigo-500/50 overflow-hidden"
            style={{ 
              WebkitBackfaceVisibility: 'hidden', 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg) translateZ(1px)' // Small translateZ helps some browsers
            }}
            id="flashcard-back"
          >
             {/* Decoration */}
             <div className="absolute inset-0 bg-linear-to-br from-indigo-500 to-indigo-700 pointer-events-none" />
             <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_50%)]" />

            <div className="relative z-10 w-full">
              <h3 className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.3em] mb-4">
                Ý NGHĨA
              </h3>
              <p className="text-xl md:text-2xl font-bold text-white leading-relaxed px-2 break-words">
                {meaning}
              </p>
            </div>

            <div className="absolute bottom-6 flex items-center gap-2 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
              <RefreshCw size={12} />
              <span>Chạm để quay lại</span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="group relative w-full py-4 px-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl overflow-hidden"
        id="flashcard-toggle-btn"
      >
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <RefreshCw 
          size={20} 
          className={cn(
            "transition-transform duration-700 ease-in-out", 
            isFlipped ? "rotate-180 text-indigo-400" : "text-slate-400"
          )} 
        />
        <span className="relative z-10">
          {isFlipped ? "Xem mặt chữ" : "Lật xem nghĩa"}
        </span>
      </button>
    </div>
  );
}
