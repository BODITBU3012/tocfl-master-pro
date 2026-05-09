import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, AlertCircle, Volume2, Plus, Search, BookOpen, Brain, Trash2, ChevronRight, X, Sparkles, Filter, LayoutGrid, List, TrendingUp, Calendar, Loader2, FileText, Upload, Check, Clock } from 'lucide-react';
import { useVocabulary } from './hooks/useVocabulary';
import { ProficiencyLevel, VocabularyItem, PracticeMode } from './types';
import QuizEngine from './components/Quiz/QuizEngine';
import { cn, getLevelColor } from './lib/utils';
import { speakChinese } from './lib/tts';

export default function App() {
  const { vocabulary, addVocab, addBulkVocab, removeVocab, toggleSelect, selectAll, clearSelection, recordResult } = useVocabulary();
  
  const selectedVocabCount = vocabulary.filter(v => v.isSelected).length;

  const dueVocabCount = vocabulary.filter(v => (!v.nextReviewAt || v.nextReviewAt <= Date.now()) && v.masteryScore > 0).length;

  const [expandedVocabId, setExpandedVocabId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('standard');
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'standard' | 'custom'>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'mastery' | 'alphabetical'>('newest');
  const [showDueOnly, setShowDueOnly] = useState(false);

  // Form state
  const [newWord, setNewWord] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newLevel, setNewLevel] = useState<ProficiencyLevel>('B1');
  const [newCategoryType, setNewCategoryType] = useState<'standard' | 'custom'>('custom');

  const tagCounts = vocabulary.reduce((acc, item) => {
    (item.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const allTags = Object.keys(tagCounts).sort();

  const filteredVocab = vocabulary.filter(v => {
    const matchesSearch = v.word.includes(searchTerm) || v.meaning.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'All' || v.level === selectedLevel;
    const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => v.tags?.includes(tag));
    const isDue = !v.nextReviewAt || v.nextReviewAt <= Date.now();
    const matchesDue = !showDueOnly || isDue;
    return matchesSearch && matchesLevel && matchesCategory && matchesTags && matchesDue;
  }).sort((a, b) => {
    if (sortBy === 'mastery') return b.masteryScore - a.masteryScore;
    if (sortBy === 'alphabetical') return a.word.localeCompare(b.word);
    return b.createdAt - a.createdAt;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord || !newMeaning) return;
    addVocab({
      word: newWord,
      pinyin: newPinyin,
      meaning: newMeaning,
      level: newLevel,
      exampleSentence: newExample,
      category: newCategoryType,
      tags: newTags.split(',').map(tag => tag.trim()).filter(Boolean),
    });
    setNewWord('');
    setNewPinyin('');
    setNewMeaning('');
    setNewExample('');
    setNewTags('');
    setIsAdding(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = localStorage.getItem('daily_goal');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [isConfiguringGoal, setIsConfiguringGoal] = useState(false);
  const [goalType, setGoalType] = useState<'words' | 'time'>('words');
  const [isActive, setIsActive] = useState(false);
  const lastActivityRef = React.useRef(Date.now());

  const [todayStudyTime, setTodayStudyTime] = useState(() => {
    const saved = localStorage.getItem('study_time_data');
    const data = saved ? JSON.parse(saved) : {};
    const today = new Date().toISOString().split('T')[0];
    return data[today] || 0;
  });

  const [studyTimeGoal, setStudyTimeGoal] = useState(() => {
    const saved = localStorage.getItem('study_time_goal');
    return saved ? parseInt(saved, 10) : 30; // default 30 minutes
  });
  const [showTimeHistory, setShowTimeHistory] = useState(false);

  const getHistory = () => {
    const saved = localStorage.getItem('study_time_data');
    if (!saved) return [];
    const data = JSON.parse(saved);
    return Object.entries(data)
      .map(([date, seconds]) => ({ date, minutes: Math.round((seconds as number) / 60) }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  };
  const history = getHistory();

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActive) setIsActive(true);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      const now = Date.now();
      const isIdle = now - lastActivityRef.current > 60000; // 1 minute idle threshold for accuracy
      const isVisible = document.visibilityState === 'visible';

      if (!isIdle && isVisible) {
        setIsActive(true);
        setTodayStudyTime(prev => {
          const newTime = prev + 1;
          if (newTime % 5 === 0) { // Save every 5 seconds
            const saved = localStorage.getItem('study_time_data');
            const data = saved ? JSON.parse(saved) : {};
            const today = new Date().toISOString().split('T')[0];
            data[today] = newTime;
            localStorage.setItem('study_time_data', JSON.stringify(data));
          }
          return newTime;
        });
      } else {
        setIsActive(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [isActive]);

  useEffect(() => {
    localStorage.setItem('study_time_goal', studyTimeGoal.toString());
  }, [studyTimeGoal]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const timeGoalProgress = Math.min(100, Math.round((todayStudyTime / (studyTimeGoal * 60)) * 100));

  const reviewedToday = vocabulary.filter(item => {
    if (!item.lastReviewedAt) return false;
    const date = new Date(item.lastReviewedAt);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }).length;

  const goalProgress = Math.min(100, Math.round((reviewedToday / dailyGoal) * 100));

  useEffect(() => {
    localStorage.setItem('daily_goal', dailyGoal.toString());
  }, [dailyGoal]);

  const masteryStats = {
    total: vocabulary.length,
    mastered: vocabulary.filter(v => v.masteryScore >= 80).length,
    learning: vocabulary.filter(v => v.masteryScore > 0 && v.masteryScore < 80).length,
    new: vocabulary.filter(v => v.masteryScore === 0).length,
    due: vocabulary.filter(v => !v.nextReviewAt || v.nextReviewAt <= Date.now()).length
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-fuchsia-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 font-black text-xl rotate-3">台</div>
            <div>
              <h1 className="text-base font-black tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">Học tiếng Đài</h1>
              <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest leading-none">Taiwanese Master</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setGoalType('words');
                setIsConfiguringGoal(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium hover:bg-emerald-500/20 transition-colors"
            >
              Daily Goal: {goalProgress}% Complete
            </button>
            <button 
              onClick={() => setIsSelectingMode(true)}
              disabled={vocabulary.length < 3}
              className="p-2 hover:bg-slate-900 rounded-lg transition-colors text-slate-400 hover:text-indigo-400"
            >
              <Brain size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mode Selection Modal */}
      <AnimatePresence>
        {isSelectingMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSelectingMode(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[40px] p-10 shadow-2xl"
            >
              <div className="text-center mb-10">
                <h3 className="text-2xl font-bold mb-2">Chọn chế độ luyện tập</h3>
                <p className="text-slate-400 text-sm">Nâng cao hiệu quả học tập từ vựng với các thử thách đặc biệt.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'standard', title: 'Tiêu chuẩn', icon: Brain, desc: '5 câu hỏi ngẫu nhiên từ kho của bạn.', color: 'text-indigo-400' },
                  { id: 'flashcards', title: 'Flashcards', icon: BookOpen, desc: 'Học bằng cách lật thẻ ghi nhớ.', color: 'text-fuchsia-400' },
                  { id: 'srs', title: `Đến hạn (${dueVocabCount})`, icon: Sparkles, desc: 'Ôn tập kiến thức đã đến lúc cần ôn lại.', color: 'text-emerald-400', disabled: dueVocabCount === 0 },
                  { id: 'timed', title: 'Siêu tốc', icon: Timer, desc: 'Trả lời nhanh trong 60 giây.', color: 'text-amber-400' },
                  { id: 'mistake-review', title: 'Ôn tập sai', icon: AlertCircle, desc: 'Tập trung vào các từ bạn đang yếu.', color: 'text-red-400' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    disabled={(mode as any).disabled}
                    onClick={() => {
                      if (mode.id === 'srs') {
                         setShowDueOnly(true);
                         setPracticeMode('standard');
                      } else {
                         setPracticeMode(mode.id as PracticeMode);
                      }
                      setIsSelectingMode(false);
                      setIsQuizMode(true);
                    }}
                    className={cn(
                      "flex flex-col items-center p-6 bg-slate-950 border border-slate-800 rounded-3xl transition-all text-center group",
                      (mode as any).disabled 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:border-indigo-500/50 hover:bg-slate-800/20 shadow-hover group"
                    )}
                  >
                    <mode.icon className={cn("mb-4 group-hover:scale-110 transition-transform", mode.color)} size={32} />
                    <h4 className="font-bold text-sm mb-2">{mode.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{mode.desc}</p>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setIsSelectingMode(false)}
                className="w-full py-4 text-slate-500 font-bold hover:text-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Configuration Modal */}
      <AnimatePresence>
        {isConfiguringGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfiguringGoal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-2">Thiết lập mục tiêu</h3>
              <p className="text-sm text-slate-400 mb-6">
                {goalType === 'words' ? 'Số lượng từ vựng bạn muốn ôn tập mỗi ngày.' : 'Thời gian bạn muốn dành để học mỗi ngày (phút).'}
              </p>
              
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => goalType === 'words' ? setDailyGoal(Math.max(5, dailyGoal - 5)) : setStudyTimeGoal(Math.max(5, studyTimeGoal - 5))}
                  className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-100 hover:bg-slate-700 transition-colors"
                >
                  -
                </button>
                <div className="text-center">
                  <span className="text-4xl font-bold">{goalType === 'words' ? dailyGoal : studyTimeGoal}</span>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    {goalType === 'words' ? 'Mục tiêu ngày' : 'Phút mỗi ngày'}
                  </p>
                </div>
                <button 
                  onClick={() => goalType === 'words' ? setDailyGoal(dailyGoal + 5) : setStudyTimeGoal(studyTimeGoal + 5)}
                  className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-100 hover:bg-slate-700 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsConfiguringGoal(false)}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Bento Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-12">
          
          {/* Welcome Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between overflow-hidden relative group"
          >
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full group-hover:bg-indigo-600/20 transition-colors" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-fuchsia-600/10 blur-[100px] rounded-full group-hover:bg-fuchsia-600/20 transition-colors" />
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={120} className="text-indigo-500" />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-7xl font-black tracking-tight mb-4 leading-tight">
                <span className="bg-linear-to-r from-indigo-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(165,180,252,0.3)]">
                  App học tiếng Đài Loan
                </span>
                <br />
                <span className="text-xl md:text-2xl font-medium text-indigo-300/80 tracking-normal mt-4 block italic">
                  Chinh phục TOCFL theo cách của chính bạn.
                </span>
              </h2>
              <p className="text-slate-200/80 max-w-sm font-medium border-l-2 border-indigo-500/50 pl-4 py-1">Hãy chiến thắng bản thân của ngày hôm qua</p>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setIsSelectingMode(true)}
                disabled={vocabulary.length < 1}
                className="px-8 py-4 bg-linear-to-r from-indigo-600 to-fuchsia-600 text-white rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/25 flex items-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Brain size={20} />
                Bắt đầu học ngay
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsAdding(true)}
                  className="px-6 py-3 bg-slate-800 text-slate-100 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-700"
                >
                  <Plus size={18} />
                  Thêm từ mới
                </button>
                <button 
                  onClick={() => setIsBulkImporting(true)}
                  className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl font-bold hover:border-indigo-500/30 hover:text-indigo-400 transition-all flex items-center gap-2"
                >
                  <Upload size={18} />
                  Nhập hàng loạt
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Module */}
          <div className="md:col-span-4 grid grid-cols-1 gap-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-500/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tổng vốn từ</span>
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <TrendingUp size={16} className="text-indigo-400" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-black text-white">{masteryStats.total}</span>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter font-bold">Từ vựng đã lưu</p>
              </div>
            </div>
            <div className="bg-linear-to-br from-indigo-600 via-indigo-500 to-fuchsia-600 rounded-3xl p-6 flex flex-col justify-between text-white shadow-xl shadow-indigo-600/20 group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-20 -rotate-12 group-hover:rotate-0 transition-transform">
                <Trophy size={64} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Độ thông thạo</span>
                <div className="p-2 bg-white/10 rounded-lg">
                  <Brain size={16} className="text-white" />
                </div>
              </div>
              <div className="mt-4 relative z-10">
                <span className="text-4xl font-black">{masteryStats.mastered}</span>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-tighter">Từ đã thuộc</p>
                   <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[8px] font-black">{Math.round((masteryStats.mastered / (masteryStats.total || 1)) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Goal Card */}
          <div className="md:col-span-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-colors" />
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Tiến độ mục tiêu</h3>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-black text-white">{reviewedToday} <span className="text-sm text-slate-500">/ {dailyGoal}</span></span>
                <span className="text-xs font-black text-emerald-400">{goalProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                />
              </div>
            </div>
            <button 
              onClick={() => {
                setGoalType('words');
                setIsConfiguringGoal(true);
              }}
              className="mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-emerald-400 transition-colors self-start"
            >
              Cài đặt mục tiêu
            </button>
          </div>

          {/* TOCFL Levels Card */}
          <div className="md:col-span-4 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-amber-500 group-hover:opacity-10">
               <Trophy size={120} />
            </div>
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Phân phối trình độ</h3>
              <div className="space-y-3">
                {['A1', 'A2', 'B1'].map(level => {
                  const count = vocabulary.filter(v => v.level === level).length;
                  const total = vocabulary.length || 1;
                  const percent = Math.round((count / total) * 100);
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className={cn(getLevelColor(level as ProficiencyLevel))}>{level}</span>
                        <span className="text-slate-500 font-mono">{count} từ</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={cn("h-full transition-all duration-1000", getLevelColor(level as ProficiencyLevel, 'solid').replace('text-', 'bg-'))} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activity Heatmap Mockup / Status */}
          <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Activity</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 28 }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "aspect-square rounded-sm",
                    i % 4 === 0 ? "bg-indigo-500" : 
                    i % 3 === 0 ? "bg-indigo-900/60" : 
                    i % 5 === 0 ? "bg-indigo-700" : "bg-slate-800/50"
                  )}
                />
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Less</span>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-slate-800/50 rounded-sm" />
                <div className="w-2 h-2 bg-indigo-900/60 rounded-sm" />
                <div className="w-2 h-2 bg-indigo-700 rounded-sm" />
                <div className="w-2 h-2 bg-indigo-500 rounded-sm" />
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Next to Review Spotlight */}
          <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
              <Calendar size={120} />
            </div>
            <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4">SRS Status</h3>
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <span className="text-4xl font-bold text-slate-100">{masteryStats.due}</span>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">Words due for review</p>
              </div>
              <button 
                onClick={() => {
                  setShowDueOnly(true);
                  setIsQuizMode(true);
                }}
                disabled={masteryStats.due === 0}
                className="mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg uppercase tracking-widest hover:bg-amber-500 hover:text-slate-900 transition-all disabled:opacity-30 self-start"
              >
                Review Due Session
              </button>
            </div>
          </div>

          {/* Summary Tips */}
          <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
            <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={14} /> Learning Tips
            </h3>
            <div className="space-y-4">
              {[
                { title: "Review Regularly", desc: "Use the SRS mode to study words at the optimal time." },
                { title: "Use Examples", desc: "Always read the example sentence to understand context." }
              ].map((tip, i) => (
                <div key={i} className="flex flex-col gap-1 p-3 bg-slate-950 border border-slate-800/50 rounded-xl">
                  <span className="text-xs font-bold text-slate-200">{tip.title}</span>
                  <p className="text-[10px] text-slate-500 line-clamp-2">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Study Time Card */}
          <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-indigo-500">
               <Clock size={120} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Study Duration</h3>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-700")} />
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                    {isActive ? "Đang đếm" : "Tạm dừng"}
                  </span>
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold text-slate-100">{formatTime(todayStudyTime)} <span className="text-sm text-slate-500">/ {studyTimeGoal}m</span></span>
                <span className="text-xs font-bold text-indigo-400">{timeGoalProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${timeGoalProgress}%` }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </div>
            
            <AnimatePresence>
              {showTimeHistory && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 border-t border-slate-800 pt-4 space-y-2 overflow-hidden"
                >
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-2">Lịch sử 7 ngày qua</p>
                  {history.length > 0 ? history.map((item) => (
                    <div key={item.date} className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-slate-800/30">
                      <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                      <span className="text-[10px] font-bold text-indigo-400">{item.minutes} phút</span>
                    </div>
                  )) : (
                    <p className="text-[9px] text-slate-600 italic">Chưa có dữ liệu lịch sử.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => {
                  setGoalType('time');
                  setIsConfiguringGoal(true);
                }}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
              >
                Set Duration Goal
              </button>
              <button 
                onClick={() => setShowTimeHistory(!showTimeHistory)}
                className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
              >
                {showTimeHistory ? "Hide History" : "View History"}
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar & List Header */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 pt-4 border-t border-slate-900">
           <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setShowDueOnly(!showDueOnly)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                showDueOnly 
                  ? "bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)]" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Calendar size={12} />
              Due ({masteryStats.due})
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            {(['All', 'standard', 'custom'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  selectedCategory === cat 
                    ? "bg-slate-800 text-indigo-400 border border-indigo-500/30" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <div className="flex items-center gap-1 ml-1 px-1">
              <TrendingUp size={12} className="text-slate-600" />
              {(['newest', 'mastery', 'alphabetical'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={cn(
                    "px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all",
                    sortBy === s ? "text-indigo-400 bg-indigo-500/10" : "text-slate-600 hover:text-slate-400"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar max-w-full">
            {['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border",
                    selectedLevel === level 
                      ? cn("text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]", getLevelColor(level as ProficiencyLevel, 'solid'))
                      : "text-slate-500 hover:text-slate-300 border-transparent"
                  )}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="flex items-center gap-2 mr-2">
              <Filter size={14} className="text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Lọc theo thẻ:</span>
            </div>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 border",
                  selectedTags.includes(tag)
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                )}
              >
                {tag}
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full font-mono",
                  selectedTags.includes(tag) ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-600"
                )}>
                  {tagCounts[tag]}
                </span>
                {selectedTags.includes(tag) && <X size={10} />}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button 
                onClick={() => setSelectedTags([])}
                className="ml-2 p-2 text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                title="Xóa tất cả bộ lọc thẻ"
              >
                <X size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Xóa lọc</span>
              </button>
            )}
          </div>
        )}

        {/* Selection Action Bar */}
        <AnimatePresence>
          {selectedVocabCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6"
            >
              <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20">
                  {selectedVocabCount}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100 uppercase tracking-widest">Đã chọn</p>
                  <p className="text-[10px] text-slate-500 font-medium">Sẵn sàng để luyện tập</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSelectingMode(true)}
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-all flex items-center gap-2"
                >
                  <Brain size={14} /> Bắt đầu ôn tập
                </button>
                <button
                  onClick={() => clearSelection()}
                  className="px-5 py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-700 hover:text-slate-200 transition-all"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredVocab.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => toggleSelect(item.id)}
                className={cn(
                  "group bg-slate-900 border rounded-2xl p-5 transition-all cursor-pointer relative",
                  item.isSelected 
                    ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30" 
                    : "border-slate-800/50 hover:border-indigo-500/30 hover:bg-slate-800/30"
                )}
              >
                {item.isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg ring-4 ring-slate-950 z-20">
                    <Check size={12} strokeWidth={4} />
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest self-start border",
                      getLevelColor(item.level)
                    )}>
                      {item.level}
                    </span>
                    {item.nextReviewAt && (
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">
                        Next: {new Date(item.nextReviewAt).toLocaleDateString()}
                      </span>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.map(tag => (
                          <button
                            key={tag}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTag(tag);
                            }}
                            className={cn(
                              "px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase tracking-tighter transition-all",
                              selectedTags.includes(tag)
                                ? "bg-indigo-500 text-white"
                                : "bg-slate-800 text-slate-500 hover:text-slate-300"
                            )}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => removeVocab(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold font-serif text-slate-100">{item.word}</h3>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        speakChinese(item.word);
                      }}
                      className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-all"
                      title="Listen"
                    >
                      <Volume2 size={12} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider tabular-nums uppercase mt-0.5">{item.pinyin}</p>
                </div>

                <p className="text-xs text-slate-400 font-medium mb-4 line-clamp-2 min-h-[32px]">
                  {item.meaning}
                </p>

                {/* Usage Explanation Section */}
                <div className="mb-4">
                  <AnimatePresence>
                    {expandedVocabId === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 pb-4 border-t border-slate-800/50 mt-2">
                          {item.exampleSentence && (
                            <div className="mt-3 py-2 px-3 bg-slate-950 rounded-lg border border-slate-800/50">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Example</p>
                              <div className="flex items-start gap-2">
                                <p className="text-xs text-slate-200 font-serif italic flex-1">{item.exampleSentence}</p>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    speakChinese(item.exampleSentence);
                                  }}
                                  className="p-1 rounded-md bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 transition-all"
                                  title="Nghe câu ví dụ"
                                >
                                  <Volume2 size={12} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    onClick={() => setExpandedVocabId(expandedVocabId === item.id ? null : item.id)}
                    className="w-full text-center text-[9px] font-bold text-slate-600 hover:text-slate-400 uppercase tracking-[0.2em] py-1 border-y border-transparent hover:border-slate-800/50 transition-all"
                  >
                    {expandedVocabId === item.id ? "Ẩn bớt" : "Xem chi tiết"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.masteryScore}%` }}
                      className={cn(
                        "h-full transition-colors duration-500",
                        item.masteryScore >= 80 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                        item.masteryScore >= 40 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : 
                        "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                      )}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 tabular-nums">
                    {item.masteryScore}%
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {filteredVocab.length === 0 && (
            <div className="col-span-full py-20 text-center flex flex-col items-center border border-dashed border-slate-800 rounded-3xl">
              <BookOpen className="text-slate-700 mb-4" size={40} />
              <p className="text-slate-500 text-sm">Chưa có dữ liệu phù hợp.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">新增詞彙</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Add word to library</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Word (Hanzi)</label>
                    <input 
                      autoFocus
                      required
                      type="text"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm"
                      placeholder="學習"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Pinyin</label>
                    <input 
                      type="text"
                      value={newPinyin}
                      onChange={(e) => setNewPinyin(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm"
                      placeholder="xué xí"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Meaning / Notes</label>
                  <input 
                    required
                    type="text"
                    value={newMeaning}
                    onChange={(e) => setNewMeaning(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm"
                    placeholder="To study; learning"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Example Sentence (Optional)</label>
                  <textarea 
                    value={newExample}
                    onChange={(e) => setNewExample(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm min-h-[80px]"
                    placeholder="VD: 我很喜歡學習漢語。"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['standard', 'custom'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategoryType(cat)}
                        className={cn(
                          "py-2.5 rounded-lg text-xs font-bold transition-all border",
                          newCategoryType === cat 
                            ? "bg-slate-800 border-indigo-500 text-indigo-400" 
                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-indigo-500/50"
                        )}
                      >
                        {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">TOCFL Level</label>
                  <div className="grid grid-cols-6 gap-2">
                    {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as ProficiencyLevel[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewLevel(level)}
                        className={cn(
                          "py-2.5 rounded-lg text-xs font-bold transition-all border",
                          newLevel === level 
                            ? "bg-indigo-600 border-indigo-500 text-white" 
                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-indigo-500/50"
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Tags (comma separated)</label>
                  <input 
                    type="text"
                    placeholder="e.g. food, travel, work"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:-translate-y-0.5 transition-all mt-4"
                >
                  Save to Library
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {isBulkImporting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <Upload size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Nhập từ vựng hàng loạt</h3>
                    <p className="text-xs text-slate-500">Dán danh sách từ vựng hoặc ghi chú của bạn vào đây.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsBulkImporting(false);
                    setBulkText('');
                  }}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Dữ liệu từ vựng</label>
                  <textarea 
                    placeholder="Ví dụ:
学习 - xué xí - học tập
挑战 - tiǎo zhàn - thách thức
Hoặc dán ghi chú tiếng Trung của bạn tại đây..."
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-mono text-sm"
                  />
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                    <BookOpen size={12} className="text-indigo-400" />
                    <span>Nhập định dạng: Từ - Pinyin - Nghĩa (mỗi từ một dòng)</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={async () => {
                      if (!bulkText.trim()) return;
                      setIsParsingBulk(true);
                      try {
                        const lines = bulkText.split('\n').filter(line => line.trim());
                        const items = lines.map(line => {
                          const parts = line.split(/[-–—:]/).map(p => p.trim());
                          return {
                            word: parts[0] || '',
                            pinyin: parts[1] || '',
                            meaning: parts[2] || parts[1] || '',
                            level: 'B1' as ProficiencyLevel,
                            category: 'custom' as const,
                            tags: [],
                            exampleSentence: ''
                          };
                        }).filter(item => item.word);

                        if (items.length > 0) {
                          addBulkVocab(items);
                          setIsBulkImporting(false);
                          setBulkText('');
                        }
                      } finally {
                        setIsParsingBulk(false);
                      }
                    }}
                    disabled={!bulkText.trim() || isParsingBulk}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isParsingBulk ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Thêm tất cả
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      {isQuizMode && (
        <QuizEngine 
          type="vocabulary"
          mode={practiceMode}
          vocabulary={vocabulary}
          onClose={() => {
            setIsQuizMode(false);
            setShowDueOnly(false);
          }}
          onFinish={(correctIds, askedIds) => {
            askedIds.forEach(id => {
              const isCorrect = correctIds.includes(id);
              recordResult(id, isCorrect);
            });

            setIsQuizMode(false);
            setShowDueOnly(false);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}
