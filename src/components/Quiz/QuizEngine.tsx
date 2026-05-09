import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ArrowRight, Brain, Volume2, Timer, Sparkles } from 'lucide-react';
import { VocabularyItem, QuizQuestion, QuestionType, PracticeMode } from '../../types';
import { cn, getLevelColor } from '../../lib/utils';
import { speakChinese } from '../../lib/tts';
import Confetti from 'react-confetti';

interface QuizEngineProps {
  vocabulary: VocabularyItem[];
  type: 'vocabulary';
  mode: PracticeMode;
  onFinish: (correctIds: string[], askedIds: string[]) => void;
  onClose: () => void;
}

// Local question generator for vocabulary
function generateLocalVocabQuestion(pool: VocabularyItem[], target: VocabularyItem, type: QuestionType): QuizQuestion {
  const distractors = pool.filter(v => v.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
  
  if (type === 'flashcard') {
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'flashcard',
      prompt: target.word,
      correctAnswer: target.meaning,
      explanation: `${target.pinyin} - ${target.exampleSentence || ''}`,
      level: target.level
    };
  }

  if (type === 'multiple-choice') {
    const options = [target.meaning, ...distractors.map(d => d.meaning)].sort(() => 0.5 - Math.random());
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'multiple-choice',
      prompt: `Từ "${target.word}" (${target.pinyin}) có nghĩa là gì?`,
      correctAnswer: target.meaning,
      options,
      level: target.level,
      explanation: `"${target.word}" nghĩa là ${target.meaning}.`
    };
  }
  
  if (type === 'fill-in-the-blank' && target.exampleSentence) {
    const hidden = target.word;
    const prompt = target.exampleSentence.replace(new RegExp(hidden, 'g'), '___');
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'fill-in-the-blank',
      prompt: prompt,
      correctAnswer: hidden,
      level: target.level,
      explanation: `Câu hoàn chỉnh: "${target.exampleSentence}"`
    };
  }

  // Fallback to simple multi-choice if no sentence or for reorder
  const options = [target.word, ...distractors.map(d => d.word)].sort(() => 0.5 - Math.random());
  return {
    id: Math.random().toString(36).substr(2, 9),
    vocabId: target.id,
    type: 'multiple-choice',
    prompt: `Chọn từ tiếng Trung có nghĩa là: "${target.meaning}"`,
    correctAnswer: target.word,
    options,
    level: target.level,
    explanation: `Thành công! ${target.word} = ${target.meaning}`
  };
}

export default function QuizEngine({ vocabulary, mode, onFinish, onClose }: QuizEngineProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[] | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [shuffledReorder, setShuffledReorder] = useState<string[]>([]);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [timeLeft, setTimeLeft] = useState(60);
  const [isFinished, setIsFinished] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentQuestion = questions[currentStep];

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Timer logic for timed mode
  useEffect(() => {
    if (mode === 'timed' && !isLoading && !isFinished) {
      if (timeLeft <= 0) {
        handleFinish();
        return;
      }
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, isLoading, timeLeft, isFinished]);

  useEffect(() => {
    function prepareQuiz() {
      const questionTypes: QuestionType[] = mode === 'flashcards' ? ['flashcard'] : ['multiple-choice', 'fill-in-the-blank', 'multiple-choice'];
      
      try {
        const selected = vocabulary.filter(v => v.isSelected);
        let pool = selected.length > 0 ? selected : (mode === 'mistake-review' 
          ? vocabulary.filter(v => v.masteryScore < 60)
          : vocabulary);
        
        if (pool.length === 0 && mode === 'mistake-review') {
          pool = vocabulary; // Fallback to all if no mistakes
        }

        const quizLength = mode === 'timed' ? Math.min(20, pool.length) : (mode === 'flashcards' ? pool.length : Math.min(5, pool.length));
        const selectedItems = [...pool].sort(() => 0.5 - Math.random()).slice(0, quizLength);
        
        const generated = selectedItems.map((v, i) => 
          generateLocalVocabQuestion(pool, v, questionTypes[i % questionTypes.length])
        );
        setQuestions(generated);
      } catch (err) {
        console.error("Failed to generate questions", err);
      } finally {
        setIsLoading(false);
      }
    }
    prepareQuiz();
  }, [vocabulary, mode]);

  useEffect(() => {
    if (questions[currentStep]?.type === 'sentence-reorder') {
      const correct = questions[currentStep].correctAnswer;
      const parts = typeof correct === 'string' ? correct.split(' ') : correct;
      setShuffledReorder([...parts].sort(() => 0.5 - Math.random()));
      setSelectedAnswer([]);
    } else {
      setSelectedAnswer(null);
    }
    setIsAnswered(false);
    setIsFlipped(false);
  }, [currentStep, questions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentQuestion?.type === 'flashcard') {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsFlipped(prev => !prev);
        } else if (isFlipped && isAnswered === false) {
          if (e.key === '1') {
            handleAnswer('wrong');
          } else if (e.key === '2') {
            handleAnswer('correct');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, isFlipped, isAnswered]);

  const handleAnswer = (answer: string | string[]) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    const current = questions[currentStep];
    let isCorrect = false;
    
    if (current.type === 'sentence-reorder') {
      const correctStr = Array.isArray(current.correctAnswer) 
        ? current.correctAnswer.join(' ') 
        : current.correctAnswer;
      const submittedStr = (answer as string[]).join(' ');
      isCorrect = correctStr === submittedStr;
    } else if (current.type === 'flashcard') {
      isCorrect = answer === 'correct';
    } else {
      isCorrect = answer === current.correctAnswer;
    }

    if (isCorrect) {
      setScore(s => s + 1);
      if (current.vocabId) {
        setCorrectIds(prev => [...prev, current.vocabId as string]);
      }
    }

    // In timed mode or flashcard mode, move faster
    if ((mode === 'timed' || mode === 'flashcards') && isCorrect) {
      setTimeout(() => {
        handleNext();
      }, 500);
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setIsFinished(true);
    const askedIds = questions.map(q => q.vocabId as string);
    onFinish(correctIds, askedIds);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="mb-8 text-indigo-500"
        >
          <Brain size={64} strokeWidth={1.5} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2 font-serif italic">Đang tổng hợp dữ liệu...</h2>
        <p className="text-slate-500 text-sm uppercase tracking-widest font-mono">Generative AI is crafting your session</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 overflow-y-auto selection:bg-indigo-500/30">
      {score === questions.length && isAnswered && currentStep === questions.length - 1 && (
        <Confetti width={windowSize.width} height={windowSize.height} colors={['#6366f1', '#4f46e5', '#a5b4fc']} />
      )}
      
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-12 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="mb-6 md:mb-12 flex items-center justify-between">
          <button onClick={onClose} className="p-2 hover:bg-slate-900 rounded-full text-slate-500 hover:text-slate-100 transition-colors">
            <X size={20} className="md:w-6 md:h-6" />
          </button>
          <div className="flex-1 mx-4 md:mx-8">
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: mode === 'timed' ? `${(timeLeft / 60) * 100}%` : `${((currentStep + 1) / questions.length) * 100}%` }}
                className={cn(
                  "h-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]",
                  mode === 'timed' && timeLeft < 10 ? "bg-red-500 shadow-red-500/50" : "bg-indigo-500"
                )}
              />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {mode === 'timed' ? (
              <div className={cn(
                "flex items-center gap-2 font-mono font-bold",
                timeLeft < 10 ? "text-red-400 animate-pulse" : "text-amber-400"
              )}>
                <Timer size={16} />
                <span>{timeLeft}s</span>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {currentStep + 1} / {questions.length}
              </span>
            )}
            {mode !== 'standard' && (
              <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">
                {mode === 'timed' ? 'Blitz Mode' : 'Refining Weak Points'}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl md:rounded-[40px] p-6 md:p-16 relative overflow-hidden"
            >
              <div className="absolute top-6 left-6 md:top-10 md:left-10 opacity-5">
                <Sparkles size={32} className="md:w-10 md:h-10" />
              </div>

              <div className="mb-6 md:mb-8 flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full">
                  {currentQuestion.type}
                </span>
                <span className={cn(
                  "px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full border",
                  getLevelColor(currentQuestion.level)
                )}>
                  {currentQuestion.level}
                </span>
              </div>
              
              <div className="flex items-center gap-3 mb-8 md:mb-12">
                <h3 className="text-xl md:text-4xl font-bold text-slate-100 leading-tight tracking-tight flex-1">
                  {currentQuestion.prompt}
                </h3>
                  <button 
                    onClick={() => speakChinese(currentQuestion.prompt)}
                    className="p-2.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all md:p-4 shrink-0"
                    title="Listen"
                  >
                    <Volume2 size={20} className="md:w-6 md:h-6" />
                  </button>
              </div>

              {/* Multiple Choice */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="grid gap-3">
                  {currentQuestion.options?.map((option, i) => {
                    const isCorrect = option === currentQuestion.correctAnswer;
                    const isSelected = selectedAnswer === option;
                    
                    return (
                      <button
                        key={i}
                        disabled={isAnswered}
                        onClick={() => handleAnswer(option)}
                        className={cn(
                          "w-full p-4 md:p-5 text-left rounded-xl md:rounded-2xl border transition-all flex items-center justify-between group",
                          !isAnswered && "border-slate-800 bg-slate-950/50 hover:border-indigo-500/50 hover:bg-slate-800/30",
                          isAnswered && isCorrect && "border-emerald-500 bg-emerald-500/10 text-emerald-400",
                          isAnswered && isSelected && !isCorrect && "border-red-500 bg-red-500/10 text-red-400",
                          isAnswered && !isSelected && !isCorrect && "border-slate-800 opacity-30"
                        )}
                      >
                        <span className="font-medium text-base md:text-lg">{option}</span>
                        {isAnswered && isCorrect && <Check size={18} className="md:w-5 md:h-5" />}
                        {isAnswered && isSelected && !isCorrect && <X size={18} className="md:w-5 md:h-5" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sentence Reorder */}
              {currentQuestion.type === 'sentence-reorder' && (
                <div className="space-y-8">
                  <div className="min-h-[120px] p-6 rounded-3xl bg-slate-950 border border-slate-800 flex flex-wrap gap-3 content-start">
                    {(selectedAnswer as string[])?.map((word, i) => (
                      <motion.button
                        layoutId={`word-${word}-${i}`}
                        key={`${word}-${i}`}
                        onClick={() => {
                          if (isAnswered) return;
                          const newSelection = [...(selectedAnswer as string[])];
                          newSelection.splice(i, 1);
                          setSelectedAnswer(newSelection);
                          setShuffledReorder([...shuffledReorder, word]);
                        }}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 font-bold"
                      >
                        {word}
                      </motion.button>
                    ))}
                    {(!selectedAnswer || (selectedAnswer as string[]).length === 0) && (
                      <span className="text-slate-700 italic text-sm self-center">Nhấn vào các từ bên dưới để sắp xếp...</span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {shuffledReorder.map((word, i) => (
                      <motion.button
                        layoutId={`word-${word}-${i}`}
                        key={`${word}-${i}`}
                        disabled={isAnswered}
                        onClick={() => {
                          const newSelection = [...(selectedAnswer as string[]), word];
                          setSelectedAnswer(newSelection);
                          setShuffledReorder(shuffledReorder.filter((_, idx) => idx !== i));
                          
                          const targetLength = typeof currentQuestion.correctAnswer === 'string' 
                            ? currentQuestion.correctAnswer.split(' ').length 
                            : currentQuestion.correctAnswer.length;

                          if (newSelection.length === targetLength) {
                             setTimeout(() => handleAnswer(newSelection), 400);
                          }
                        }}
                        className="px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500/50 transition-colors font-bold text-slate-300"
                      >
                        {word}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fill in the blank */}
              {currentQuestion.type === 'fill-in-the-blank' && (
                <div className="flex flex-col gap-6">
                  {!isAnswered ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[currentQuestion.correctAnswer as string, ' 甚至 ', ' 而是 ', ' 所以 '].sort(() => 0.5 - Math.random()).map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(opt)}
                          className="p-5 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-indigo-500 transition-all font-bold text-center"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      "p-6 rounded-2xl border flex items-center justify-between",
                      selectedAnswer === currentQuestion.correctAnswer ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"
                    )}>
                      <span className="text-xl font-bold">{selectedAnswer}</span>
                      {selectedAnswer === currentQuestion.correctAnswer ? <Check className="text-emerald-400" /> : <X className="text-red-400" />}
                    </div>
                  )}
                </div>
              )}

              {/* Flashcard */}
              {currentQuestion.type === 'flashcard' && (
                <div className="flex flex-col items-center justify-center min-h-[350px] md:min-h-[450px]">
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="relative w-full aspect-[4/3] max-w-sm cursor-pointer [perspective:1000px] group mb-8"
                  >
                    <div className={cn(
                      "absolute inset-0 w-full h-full rounded-[40px] border-2 border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-10 backface-hidden transition-all duration-500 shadow-2xl overflow-hidden",
                      isFlipped ? "[transform:rotateY(180deg)] opacity-0 pointer-events-none" : "group-hover:border-indigo-500/50 group-hover:bg-slate-900/50"
                    )}>
                      <div className="absolute top-6 left-6 opacity-10">
                        <Brain size={40} />
                      </div>
                      <h2 className="text-6xl md:text-8xl font-bold font-serif text-slate-100 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        {currentQuestion.prompt}
                      </h2>
                      <div className="mt-4 flex flex-col items-center gap-2">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Nhấn để lật</p>
                        <span className="px-2 py-0.5 bg-slate-900 text-[8px] text-slate-600 rounded font-mono border border-slate-800">SPACE</span>
                      </div>
                    </div>

                    <div className={cn(
                      "absolute inset-0 w-full h-full rounded-[40px] border-2 border-indigo-500/30 bg-slate-900 flex flex-col items-center justify-center p-10 backface-hidden transition-all duration-500 shadow-2xl [transform:rotateY(180deg)]",
                      !isFlipped ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}>
                      <div className="w-full h-full flex flex-col items-center justify-center text-center">
                        <div className="mb-2">
                           <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold tracking-widest rounded uppercase border border-indigo-500/20">NGHĨA</span>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">{currentQuestion.correctAnswer}</h3>
                        
                        <div className="w-full max-w-xs h-[1px] bg-linear-to-r from-transparent via-slate-700 to-transparent mb-6" />
                        
                        <div className="space-y-4 w-full">
                          <p className="text-slate-300 italic text-sm md:text-base leading-relaxed line-clamp-3 px-4">
                            {currentQuestion.explanation}
                          </p>
                          
                          {!isAnswered && (
                            <div className="flex gap-3 justify-center pt-4">
                              <div className="flex flex-col gap-1.5 items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnswer("wrong");
                                  }}
                                  className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all text-xs"
                                >
                                  Chưa nhớ
                                </button>
                                <span className="text-[8px] font-mono text-slate-600 border border-slate-800 px-1 rounded">1</span>
                              </div>
                              <div className="flex flex-col gap-1.5 items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnswer("correct");
                                  }}
                                  className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500 hover:text-white transition-all text-xs"
                                >
                                  Đã nhớ
                                </button>
                                <span className="text-[8px] font-mono text-slate-600 border border-slate-800 px-1 rounded">2</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              {isAnswered && currentQuestion.type !== 'flashcard' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 pt-10 border-t border-slate-800"
                >
                  <div className="flex items-start gap-4 mb-8">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-indigo-400 shadow-inner">
                      <Brain size={24} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dữ liệu phân tích</h4>
                      <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                        {currentQuestion.explanation || "Dữ liệu chính xác. Bạn đang tiến bộ rất nhanh trong hành trình chinh phục TOCFL."}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleNext}
                    className="w-full py-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-white/5 active:scale-[0.98]"
                  >
                    {currentStep < questions.length - 1 ? "NEXT PHASE" : "COMPLETE SEQUENCE"}
                    <ArrowRight size={22} strokeWidth={3} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
