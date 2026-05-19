import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { X, Check, RotateCcw, Type, ChevronRight, AlertCircle, GripVertical, ListOrdered } from 'lucide-react';
import { ReadingPassage, PassageLine } from '../../types';
import { cn } from '../../lib/utils';
import Confetti from 'react-confetti';

interface Props {
  passage: ReadingPassage;
  onClose: () => void;
}

type PracticeMode = 'typing' | 'ordering';

export function ReadingPractice({ passage, onClose }: Props) {
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  
  // For ordering mode
  const [draggableLines, setDraggableLines] = useState<(PassageLine & { originalIndex: number })[]>([]);
  
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to normalize strings for comparison
  const normalizeString = (str: string) => {
    if (!str) return '';
    return str
      .normalize('NFC')
      .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/g, ' ') // Normalize various space characters
      .replace(/[。．.]/g, '.')
      .replace(/[，,、]/g, ',')
      .replace(/[！!]/g, '!')
      .replace(/[？?]/g, '?')
      .replace(/[：:]/g, ':')
      .replace(/[；;]/g, ';')
      .replace(/[（(]/g, '(')
      .replace(/[）)]/g, ')')
      .replace(/[「」『』""＂＂'']/g, '"')
      .replace(/[—–-]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const stripPunctuation = (str: string) => {
    if (!str) return '';
    return str
      .normalize('NFC')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()。，！？；：「」『』、]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  };

  const normalizeChar = (char: string) => {
    if (!char) return '';
    const normalized = char.normalize('NFC');
    const map: Record<string, string> = {
      '。': '.', '．': '.',
      '，': ',', '、': ',',
      '！': '!', '？': '?', '：': ':', '；': ';',
      '（': '(', '）': ')', 
      '「': '"', '」': '"', '『': '"', '』': '"', '＂': '"'
    };
    return (map[normalized] || normalized).toLowerCase();
  };

  // Initialize modes
  useEffect(() => {
    if (mode === 'ordering') {
      const shuffled = passage.lines.map((line, index) => ({ ...line, originalIndex: index }))
        .sort(() => Math.random() - 0.5);
      setDraggableLines(shuffled);
      setIsFinished(false);
    } else if (mode === 'typing') {
      setCurrentLineIndex(0);
      setUserInput('');
      setIsFinished(false);
    }
  }, [mode, passage]);

  // Focus input automatically in typing mode
  useEffect(() => {
    if (mode === 'typing' && !isFinished) {
      inputRef.current?.focus();
    }
  }, [mode, currentLineIndex, isFinished]);

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentLineRaw = passage.lines[currentLineIndex].text;
    const currentLineNormalized = normalizeString(currentLineRaw);
    const inputNormalized = normalizeString(userInput);

    // Flexible comparison logic
    const isExactMatch = userInput.trim() === currentLineRaw.trim();
    const isNormalizedMatch = inputNormalized === currentLineNormalized;
    const isPunctuationAgnosticMatch = stripPunctuation(userInput) === stripPunctuation(currentLineRaw);

    if (isExactMatch || isNormalizedMatch || isPunctuationAgnosticMatch) {
      if (currentLineIndex === passage.lines.length - 1) {
        setIsFinished(true);
      } else {
        setCurrentLineIndex(prev => prev + 1);
        setUserInput('');
        setShowError(false);
      }
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 1000);
    }
  };

  const checkOrder = () => {
    const isCorrect = draggableLines.every((line, index) => line.originalIndex === index);
    if (isCorrect) {
      setIsFinished(true);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  };

  const reset = () => {
    setMode(null);
    setCurrentLineIndex(0);
    setUserInput('');
    setIsFinished(false);
    setDraggableLines([]);
  };

  // Helper to render text with highlighting for typing mode
  const renderHighlightedText = (target: string, input: string) => {
    return (
      <div className="flex flex-wrap justify-center gap-x-0.5">
        {target.split('').map((char, index) => {
          let colorClass = "text-slate-700"; // Future characters
          if (index < input.length) {
            const inputChar = input[index];
            const isMatch = char === inputChar || normalizeChar(char) === normalizeChar(inputChar);
            colorClass = isMatch ? "text-emerald-500" : "text-red-500";
          } else if (index === input.length) {
            colorClass = "text-indigo-400 border-b-2 border-indigo-400 animate-pulse"; // Current cursor position
          }
          
          return (
            <span key={index} className={cn("inline-block transition-colors", colorClass)}>
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </div>
    );
  };

  if (!mode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-950/90">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white"
          >
            <X size={24} />
          </button>

          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{passage.title}</h3>
            <p className="text-slate-500 text-sm">Chọn một chế độ để bắt đầu luyện tập.</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => setMode('typing')}
              className="w-full flex items-center gap-4 p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Type size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white">Luyện gõ</h4>
                <p className="text-xs text-slate-500">Gõ lại từng dòng bài khóa.</p>
              </div>
            </button>

            <button 
              onClick={() => setMode('ordering')}
              className="w-full flex items-center gap-4 p-5 bg-slate-950 border border-slate-800 rounded-2xl hover:border-violet-500 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                <ListOrdered size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white">Sắp xếp câu</h4>
                <p className="text-xs text-slate-500">Kéo thả các câu theo thứ tự đúng.</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 font-zh">
      {isFinished && <Confetti recycle={false} numberOfPieces={500} />}
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between font-sans">
        <div className="flex items-center gap-4">
          <button 
            onClick={reset}
            className="p-2 hover:bg-slate-900 rounded-lg text-slate-400"
          >
            <RotateCcw size={20} />
          </button>
          <div>
            <h2 className="font-bold text-lg">{passage.title}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                {mode === 'typing' ? 'Luyện gõ' : 'Sắp xếp câu'}
              </span>
              <span className="w-1 h-1 bg-slate-700 rounded-full" />
              <span className="text-[10px] text-slate-500 flex items-center gap-2">
                {mode === 'typing' 
                  ? (
                    <>
                      <span>{currentLineIndex + 1} / {passage.lines.length}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                      <span className="text-indigo-400 font-bold">{Math.round((currentLineIndex / passage.lines.length) * 100)}%</span>
                    </>
                  )
                  : `${passage.lines.length} câu`
                }
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-900 rounded-lg text-slate-400"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {!isFinished ? (
              mode === 'typing' ? (
                <motion.div 
                  key="typing-mode"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  {/* Previous Lines (Faded) */}
                  <div className="space-y-4 opacity-10">
                    {passage.lines.slice(Math.max(0, currentLineIndex - 2), currentLineIndex).map((line, i) => (
                      <p key={i} className="text-xl text-center">{line.text}</p>
                    ))}
                  </div>

                  {/* Current Line with Highlighting */}
                  <div className="text-center px-4">
                    <div className="text-4xl md:text-5xl font-bold leading-relaxed mb-6 text-white min-h-[4rem]">
                      {renderHighlightedText(passage.lines[currentLineIndex].text, userInput)}
                    </div>
                    {passage.lines[currentLineIndex].translation && (
                      <p className="text-slate-500 italic mb-8 font-sans">{passage.lines[currentLineIndex].translation}</p>
                    )}
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleTypingSubmit} className="relative max-w-lg mx-auto font-sans">
                    <input 
                      ref={inputRef}
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      value={userInput}
                      onChange={(e) => {
                        setUserInput(e.target.value);
                      }}
                      placeholder="Bắt đầu gõ..."
                      className={cn(
                        "w-full px-6 py-4 bg-slate-900 border-2 rounded-2xl text-xl font-zh text-center focus:outline-none transition-all",
                        showError ? "border-red-500 animate-shake" : "border-slate-800 focus:border-indigo-500"
                      )}
                    />
                    <button 
                      type="submit"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl text-white shadow-lg"
                    >
                      <ChevronRight size={24} />
                    </button>
                    {showError && (
                      <div className="absolute -bottom-8 left-0 right-0 text-center text-red-500 text-xs font-bold font-sans">
                        <AlertCircle size={12} className="inline mr-1" />
                        Chưa chính xác, hãy kiểm tra lại!
                      </div>
                    )}
                  </form>
                </motion.div>
              ) : (
                <motion.div 
                  key="ordering-mode"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8 font-sans"
                >
                  <div className="text-center mb-6">
                    <p className="text-slate-400 text-sm">Nhấn và kéo để sắp xếp các câu đúng thứ tự bài khóa.</p>
                  </div>

                  <Reorder.Group 
                    axis="y" 
                    values={draggableLines} 
                    onReorder={setDraggableLines}
                    className="space-y-3"
                  >
                    {draggableLines.map((line) => (
                      <Reorder.Item 
                        key={line.originalIndex} 
                        value={line}
                        as="div"
                        whileDrag={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
                        className={cn(
                          "w-full p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4 cursor-grab active:cursor-grabbing hover:border-indigo-500/30 shadow-none z-10",
                          showError && "border-red-500/50 bg-red-500/5"
                        )}
                      >
                        <GripVertical className="text-slate-700 shrink-0" size={20} />
                        <div className="flex-1">
                          <p className="text-lg font-zh text-slate-100">{line.text}</p>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>

                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={checkOrder}
                      className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
                    >
                      <Check size={20} strokeWidth={3} />
                      Kiểm tra kết quả
                    </button>
                  </div>

                  {showError && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-red-500 font-bold"
                    >
                      Thứ tự các câu chưa chính xác! Hãy thử lại.
                    </motion.p>
                  )}
                </motion.div>
              )
            ) : (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-8 bg-slate-900 border border-slate-800 rounded-3xl font-sans"
              >
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h3 className="text-3xl font-bold mb-2 text-white">Tuyệt vời!</h3>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto">Bạn đã hoàn thành bài luyện bài khóa: <br/><span className="text-indigo-400 font-bold">{passage.title}</span></p>
                <div className="flex gap-4">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
                  >
                    Xong
                  </button>
                  <button 
                    onClick={reset}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg"
                  >
                    Luyện lại
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Progress Footer */}
      <div className="relative font-sans">
        {mode === 'typing' && !isFinished && (
          <div 
            className="absolute -top-6 text-[10px] font-bold text-indigo-400 transition-all duration-300 pointer-events-none"
            style={{ 
              left: `${(currentLineIndex / passage.lines.length) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            {Math.round((currentLineIndex / passage.lines.length) * 100)}%
          </div>
        )}
        <div className="h-2 w-full bg-slate-900">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ 
              width: mode === 'typing' 
                ? `${((currentLineIndex) / passage.lines.length) * 100}%`
                : isFinished ? '100%' : '5%'
            }}
            className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
          />
        </div>
      </div>
    </div>
  );
}
