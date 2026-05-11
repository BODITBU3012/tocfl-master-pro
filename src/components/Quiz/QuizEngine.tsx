import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ArrowRight, Brain, Volume2, Timer, Sparkles, AlertCircle, Trophy } from 'lucide-react';
import { VocabularyItem, QuizQuestion, QuestionType, PracticeMode } from '../../types';
import { cn, getLevelColor } from '../../lib/utils';
import { speakChinese } from '../../lib/tts';
import { Flashcard } from '../Flashcard';
import Confetti from 'react-confetti';

interface QuizEngineProps {
  vocabulary: VocabularyItem[];
  type: 'vocabulary';
  mode: PracticeMode;
  onAnswer?: (id: string, isCorrect: boolean) => void;
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
      pinyin: target.pinyin,
      wordType: target.wordType,
      correctAnswer: target.meaning,
      explanation: target.exampleSentence || 'Thêm ví dụ cho từ này để học hiệu quả hơn!',
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
    const distractors = pool.filter(v => v.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [hidden, ...distractors.map(d => d.word)].sort(() => 0.5 - Math.random());
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'fill-in-the-blank',
      prompt: prompt,
      correctAnswer: hidden,
      options,
      level: target.level,
      explanation: `Câu hoàn chỉnh: "${target.exampleSentence}"`
    };
  }

  if (type === 'tone-selection') {
    const tones = ['ā', 'á', 'ǎ', 'à', 'ō', 'ó', 'ǒ', 'ò', 'ē', 'é', 'ě', 'è', 'ī', 'í', 'ǐ', 'ì', 'ū', 'ú', 'ǔ', 'ù', 'ǖ', 'ǘ', 'ǚ', 'ǜ'];
    // Very simple tone distractor generator: swap a tone mark
    const options = [target.pinyin, ...distractors.map(d => d.pinyin)].sort(() => 0.5 - Math.random());
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'tone-selection',
      prompt: `Phiên âm chính xác của "${target.word}" là gì?`,
      correctAnswer: target.pinyin,
      options,
      level: target.level,
      explanation: `"${target.word}" được phát âm là ${target.pinyin}.`
    };
  }

  if (type === 'audio-to-meaning') {
    const options = [target.meaning, ...distractors.map(d => d.meaning)].sort(() => 0.5 - Math.random());
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'audio-to-meaning',
      prompt: target.word, // We'll trigger audio for this
      correctAnswer: target.meaning,
      options,
      level: target.level,
      explanation: `Bạn vừa nghe "${target.word}", nghĩa là "${target.meaning}".`
    };
  }

  if (type === 'hanzi-to-pinyin') {
    const options = [target.pinyin, ...distractors.map(d => d.pinyin)].sort(() => 0.5 - Math.random());
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'hanzi-to-pinyin',
      prompt: target.word,
      correctAnswer: target.pinyin,
      options,
      level: target.level,
      explanation: `"${target.word}" có phiên âm là ${target.pinyin}`
    };
  }

  if (type === 'typing') {
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'typing',
      prompt: `Gõ lại từ tiếng Trung có nghĩa là: "${target.meaning}"`,
      correctAnswer: target.word,
      pinyin: target.pinyin,
      level: target.level,
      explanation: `Chính xác! ${target.word} (${target.pinyin}) = ${target.meaning}`
    };
  }

  if (type === 'sentence-translation' && target.exampleSentence) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'sentence-translation',
      prompt: target.exampleTranslation ? `Dịch sang tiếng Trung: "${target.exampleTranslation}"` : `Dịch sang tiếng Trung: "${target.meaning}" (Ví dụ với từ "${target.word}")`,
      correctAnswer: target.exampleSentence,
      level: target.level,
      explanation: `Câu đúng là: "${target.exampleSentence}"`
    };
  }

  if (type === 'sentence-reorder' && target.exampleSentence) {
    const sentence = target.exampleSentence.trim();
    // Use character-splitting for Chinese, word-splitting for others (Vietnamese etc)
    const isChinese = /[\u4e00-\u9fa5]/.test(sentence);
    const parts = isChinese 
      ? sentence.split('').filter(c => c.trim() !== '') 
      : sentence.split(' ').filter(w => w.trim() !== '');

    return {
      id: Math.random().toString(36).substr(2, 9),
      vocabId: target.id,
      type: 'sentence-reorder',
      prompt: target.exampleTranslation ? `Sắp xếp các ký tự để tạo thành câu: "${target.exampleTranslation}"` : `Sắp xếp các ký tự để tạo thành câu: "${target.meaning}"`,
      correctAnswer: parts,
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

export default function QuizEngine({ vocabulary, mode, onAnswer, onFinish, onClose }: QuizEngineProps) {
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
  const [typingInput, setTypingInput] = useState('');
  const [isLastAnswerCorrect, setIsLastAnswerCorrect] = useState<boolean | null>(null);

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
    // Only prepare quiz once when vocabulary is available and questions aren't set yet
    if (vocabulary.length === 0 || questions.length > 0) return;

    function prepareQuiz() {
      let questionTypes: QuestionType[];
      if (mode === 'flashcards') {
        questionTypes = ['flashcard'];
      } else if (mode === 'typing') {
        questionTypes = ['typing'];
      } else if (mode === 'tone-master') {
        questionTypes = ['tone-selection'];
      } else if (mode === 'ear-training') {
        questionTypes = ['audio-to-meaning'];
      } else {
        questionTypes = ['multiple-choice', 'fill-in-the-blank', 'hanzi-to-pinyin', 'tone-selection', 'audio-to-meaning', 'typing', 'sentence-reorder', 'sentence-translation'];
      }
      
      try {
        const pool = vocabulary.filter(v => v.isSelected).length > 0 
          ? vocabulary.filter(v => v.isSelected) 
          : (
            mode === 'mistake-review' 
              ? vocabulary.filter(v => v.masteryScore < 60)
              : mode === 'srs'
                ? vocabulary.filter(v => !v.nextReviewAt || v.nextReviewAt <= Date.now())
                : vocabulary
          );
        
        let finalPool = [...pool];
        if (finalPool.length === 0 && mode === 'mistake-review') {
          finalPool = [...vocabulary]; // Fallback to all if no mistakes
        }

        const quizLength = mode === 'timed' ? Math.min(20, finalPool.length) : (mode === 'flashcards' ? finalPool.length : Math.min(5, finalPool.length));
        
        // Shuffle and pick
        const selectedItems = [...finalPool].sort(() => 0.5 - Math.random()).slice(0, quizLength);
        
        const generated = selectedItems.map((v, i) => {
          let type = questionTypes[i % questionTypes.length];
          
          // Fallback if no sentence for sentence types
          if ((type === 'sentence-reorder' || type === 'sentence-translation' || type === 'fill-in-the-blank') && !v.exampleSentence) {
            type = 'multiple-choice';
          }
          
          return generateLocalVocabQuestion(finalPool, v, type);
        });
        setQuestions(generated);
      } catch (err) {
        console.error("Failed to generate questions", err);
      } finally {
        setIsLoading(false);
      }
    }
    prepareQuiz();
  }, [vocabulary.length, mode, questions.length]); // Use lengths and mode to avoid re-triggering on data updates

  useEffect(() => {
    if (questions[currentStep]?.type === 'sentence-reorder') {
      const correct = questions[currentStep].correctAnswer;
      const parts = typeof correct === 'string' ? correct.split(' ') : correct;
      setShuffledReorder([...parts].sort(() => 0.5 - Math.random()));
      setSelectedAnswer([]);
    } else {
      setSelectedAnswer(null);
    }
    setTypingInput('');
    setIsAnswered(false);
    setIsLastAnswerCorrect(null);
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
    try {
      if (isAnswered) return;
      
      setSelectedAnswer(answer);
      
      const current = questions[currentStep];
      if (!current) return;

      let isCorrect = false;
      
      if (current.type === 'sentence-reorder') {
        const correctStr = Array.isArray(current.correctAnswer) 
          ? current.correctAnswer.join('').replace(/\s/g, '').toLowerCase() 
          : String(current.correctAnswer).replace(/\s/g, '').toLowerCase();
        const submittedStr = Array.isArray(answer) 
          ? answer.join('').replace(/\s/g, '').toLowerCase() 
          : String(answer).replace(/\s/g, '').toLowerCase();
        isCorrect = correctStr === submittedStr;
      } else if (current.type === 'flashcard') {
        isCorrect = answer === 'correct';
      } else {
        isCorrect = String(answer).trim() === String(current.correctAnswer).trim();
      }

      setIsAnswered(true);
      setIsLastAnswerCorrect(isCorrect);

      if (isCorrect) {
        setScore(s => s + 1);
        if (current.vocabId) {
          setCorrectIds(prev => [...prev, current.vocabId as string]);
        }
      }

      if (current.vocabId && onAnswer) {
        onAnswer(current.vocabId, isCorrect);
      }

      // Only auto-next in timed mode for speed
      if (mode === 'timed' && isCorrect) {
        setTimeout(() => {
          handleNext();
        }, 800);
      }
    } catch (err) {
      console.error("Error in handleAnswer:", err);
      // Fallback: just move to next or show error
      setIsAnswered(true);
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
  };

  const handleCompleteFinal = () => {
    const askedIds = questions.map(q => q.vocabId as string);
    onFinish(correctIds, askedIds);
  };

  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 overflow-y-auto flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
           {score === questions.length && (
            <Confetti width={windowSize.width} height={windowSize.height} colors={['#6366f1', '#4f46e5', '#a5b4fc']} recycle={false} />
          )}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 text-center shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-indigo-500 to-fuchsia-500" />
            
            <div className="mb-8 flex justify-center">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400">
                <Trophy size={40} />
              </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-2">Hoàn thành phiên học!</h2>
            <p className="text-slate-500 text-sm mb-10">Lịch ôn tập của bạn đã được cập nhật dựa trên kết quả này.</p>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Chính xác</p>
                <p className="text-3xl font-black text-white">{score} <span className="text-sm text-slate-600">/ {questions.length}</span></p>
              </div>
              <div className="p-6 bg-slate-950 rounded-3xl border border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Tỷ lệ</p>
                <p className="text-3xl font-black text-indigo-400">{Math.round((score / questions.length) * 100)}%</p>
              </div>
            </div>

            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 mb-10 text-left">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles size={18} className="text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Spaced Repetition (SRS)</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống đã tính toán lại thời gian ghi nhớ của bạn. Các từ trả lời đúng sẽ xuất hiện lại sau một khoảng thời gian dài hơn để tối ưu hóa bộ nhớ dài hạn.
              </p>
            </div>

            <button
              onClick={handleCompleteFinal}
              className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-white/10 shadow-2xl"
            >
              QUAY LẠI TRANG CHỦ
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (isLoading || !currentQuestion) {
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
        <h2 className="text-2xl font-bold text-slate-100 mb-2 font-serif italic">
          {!currentQuestion && !isLoading ? "Không tìm thấy dữ liệu..." : "Đang tổng hợp dữ liệu..."}
        </h2>
        <p className="text-slate-500 text-sm uppercase tracking-widest font-mono">
          {!currentQuestion && !isLoading ? "Vui lòng chọn từ vựng trước khi bắt đầu" : "Generative AI is crafting your session"}
        </p>
        {!currentQuestion && !isLoading && (
          <button 
            onClick={onClose}
            className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
          >
            Quay lại
          </button>
        )}
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
                <h3 className="text-xl md:text-5xl font-black text-slate-100 leading-tight tracking-tight flex-1 font-display-zh">
                  {currentQuestion.type === 'audio-to-meaning' ? (
                    <div className="flex items-center gap-4 text-indigo-400">
                      <Volume2 size={48} className="md:w-16 md:h-16 animate-pulse" />
                      <span className="text-2xl md:text-3xl text-slate-500 font-bold uppercase tracking-widest italic">Hãy tập trung lắng nghe...</span>
                    </div>
                  ) : currentQuestion.prompt}
                </h3>
                  <button 
                    onClick={() => speakChinese(currentQuestion.type === 'audio-to-meaning' ? (currentQuestion.vocabId ? vocabulary.find(v => v.id === currentQuestion.vocabId)?.word || currentQuestion.prompt : currentQuestion.prompt) : currentQuestion.prompt)}
                    className="p-2.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all md:p-4 shrink-0"
                    title="Listen"
                  >
                    <Volume2 size={20} className="md:w-6 md:h-6" />
                  </button>
              </div>

              {/* Multiple Choice & Selection Types */}
              {(currentQuestion.type === 'multiple-choice' || 
                currentQuestion.type === 'tone-selection' || 
                currentQuestion.type === 'audio-to-meaning' || 
                currentQuestion.type === 'hanzi-to-pinyin') && (
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
                        <span className="font-medium text-base md:text-lg font-zh">{option}</span>
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
                    {(Array.isArray(selectedAnswer) ? selectedAnswer : [])?.map((word, i) => (
                      <motion.button
                        layoutId={`word-selected-${word}-${i}`}
                        key={`selected-${word}-${i}`}
                        onClick={() => {
                          if (isAnswered) return;
                          const currentSelection = Array.isArray(selectedAnswer) ? [...selectedAnswer] : [];
                          const removedWord = currentSelection.splice(i, 1)[0];
                          setSelectedAnswer(currentSelection);
                          setShuffledReorder(prev => [...prev, removedWord]);
                        }}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 font-bold font-zh"
                      >
                        {word}
                      </motion.button>
                    ))}
                    {(!Array.isArray(selectedAnswer) || (selectedAnswer as string[]).length === 0) && (
                      <span className="text-slate-700 italic text-sm self-center">Nhấn vào các từ bên dưới để sắp xếp...</span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {shuffledReorder.map((word, i) => (
                      <motion.button
                        layoutId={`word-shuffle-${word}-${i}`}
                        key={`shuffle-${word}-${i}`}
                        disabled={isAnswered}
                        onClick={() => {
                          const currentSelection = Array.isArray(selectedAnswer) ? [...selectedAnswer] : [];
                          const newSelection = [...currentSelection, word];
                          setSelectedAnswer(newSelection);
                          setShuffledReorder(prev => prev.filter((_, idx) => idx !== i));
                          
                          const targetLength = Array.isArray(currentQuestion.correctAnswer) 
                            ? currentQuestion.correctAnswer.length 
                            : String(currentQuestion.correctAnswer).split(' ').length;

                          if (newSelection.length === targetLength) {
                             setTimeout(() => handleAnswer(newSelection), 400);
                          }
                        }}
                        className="px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500/50 transition-colors font-bold text-slate-300 font-zh"
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
                      {currentQuestion.options?.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswer(opt)}
                          className="p-5 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-indigo-500 transition-all font-bold text-center font-zh"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      "p-6 rounded-2xl border flex items-center justify-between",
                      isLastAnswerCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"
                    )}>
                      <span className="text-xl font-bold">{Array.isArray(selectedAnswer) ? selectedAnswer.join('') : selectedAnswer}</span>
                      {isLastAnswerCorrect ? <Check className="text-emerald-400" /> : <X className="text-red-400" />}
                    </div>
                  )}
                </div>
              )}

              {/* Flashcard */}
              {currentQuestion.type === 'flashcard' && (
                <div className="flex flex-col items-center justify-center min-h-[350px] md:min-h-[450px]">
                  <div className="w-full max-w-sm mb-12">
                    <Flashcard 
                      word={currentQuestion.prompt}
                      pinyin={currentQuestion.pinyin || ''}
                      meaning={currentQuestion.correctAnswer as string}
                      wordType={currentQuestion.wordType}
                      isFlipped={isFlipped}
                      onFlip={setIsFlipped}
                    />
                  </div>

                  {!isAnswered && (
                    <div className="flex gap-4 justify-center">
                      <div className="flex flex-col gap-1.5 items-center">
                        <button
                          onClick={() => handleAnswer("wrong")}
                          className="px-8 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                        >
                          Chưa nhớ
                        </button>
                        <span className="text-[10px] font-mono text-slate-600 border border-slate-800 px-1.5 rounded bg-slate-900">PHÍM 1</span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-center">
                        <button
                          onClick={() => handleAnswer("correct")}
                          className="px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                        >
                          Đã nhớ
                        </button>
                        <span className="text-[10px] font-mono text-slate-600 border border-slate-800 px-1.5 rounded bg-slate-900">PHÍM 2</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Typing Question & Sentence Translation */}
              {(currentQuestion.type === 'typing' || currentQuestion.type === 'sentence-translation') && (
                <div className="flex flex-col gap-6">
                  {!isAnswered ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (typingInput.trim()) {
                          handleAnswer(typingInput.trim());
                        }
                      }}
                      className="flex flex-col gap-4"
                    >
                      <textarea
                        autoFocus
                        value={typingInput}
                        onChange={(e) => setTypingInput(e.target.value)}
                        placeholder={currentQuestion.type === 'sentence-translation' ? "Nhập câu tiếng Trung hoàn chỉnh (Phồn thể)..." : "Gõ bằng chữ Hán..."}
                        rows={currentQuestion.type === 'sentence-translation' ? 3 : 1}
                        className="w-full p-6 bg-slate-950 border-2 border-slate-800 rounded-3xl text-xl md:text-2xl font-bold text-slate-100 focus:border-indigo-500 transition-all outline-hidden text-center resize-none"
                      />
                      <button
                        type="submit"
                        disabled={!typingInput.trim()}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                      >
                        KIỂM TRA ĐÁP ÁN
                      </button>
                    </form>
                  ) : (
                    <div className={cn(
                      "p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-4",
                      isLastAnswerCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"
                    )}>
                      <div className="flex flex-col items-center gap-3">
                         <span className="text-xl md:text-3xl font-bold text-center leading-relaxed font-zh">
                           {Array.isArray(selectedAnswer) ? selectedAnswer.join('') : selectedAnswer}
                         </span>
                         {isLastAnswerCorrect ? (
                           <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                             <Check size={20} />
                             Chính xác
                           </div>
                         ) : (
                           <div className="flex items-center gap-2 text-red-400 font-bold uppercase text-[10px] tracking-widest mt-2">
                             <X size={20} />
                             Chưa chính xác
                           </div>
                         )}
                      </div>
                      {!isLastAnswerCorrect && (
                        <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 w-full text-center">
                          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2 font-bold">Đáp án chuẩn:</p>
                          <p className="text-xl md:text-2xl font-bold text-emerald-400 leading-relaxed font-zh">
                            {Array.isArray(currentQuestion.correctAnswer) ? currentQuestion.correctAnswer.join('') : currentQuestion.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 pt-10 border-t border-slate-800"
                >
                  <div className="flex items-start gap-4 mb-8">
                    <div className={cn(
                      "p-3 rounded-2xl border shadow-inner",
                      isLastAnswerCorrect
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                      {isLastAnswerCorrect ? <Trophy size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dữ liệu phân tích</h4>
                      <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                        {currentQuestion.explanation || "Dữ liệu chính xác. Bạn đang tiến bộ rất nhanh trong hành trình chinh phục tiếng Trung."}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleNext}
                    className="w-full py-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-white/5 active:scale-[0.98]"
                  >
                    {currentStep < questions.length - 1 ? "TIẾP TỤC" : "HOÀN THÀNH"}
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
