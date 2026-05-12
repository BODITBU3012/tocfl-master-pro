import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, AlertCircle, Volume2, Plus, Search, BookOpen, Brain, Trash2, ChevronRight, X, Sparkles, Filter, LayoutGrid, List, TrendingUp, Calendar, Loader2, FileText, Upload, Check, Clock, Music, Headphones, Flame, Bell, FileSpreadsheet, Book, ArrowUp, ChevronLeft, Moon, Sun } from 'lucide-react';
import { read, utils } from 'xlsx';
import { useVocabulary } from './hooks/useVocabulary';
import { useStreak } from './hooks/useStreak';
import { ProficiencyLevel, VocabularyItem, PracticeMode, QuestionType, ALL_QUESTION_TYPES } from './types';
import QuizEngine from './components/Quiz/QuizEngine';
import AudioManager from './components/Audio/AudioManager';
import SrsStats from './components/Stats/SrsStats';
import { cn, getLevelColor } from './lib/utils';
import { speakChinese } from './lib/tts';

export default function App() {
  const { vocabulary, addVocab, addBulkVocab, removeVocab, toggleSelect, selectAll, clearSelection, updateVocab, recordResult } = useVocabulary();
  const { streak, updateActivity } = useStreak();
  
  const selectedVocabCount = vocabulary.filter(v => v.isSelected).length;

  const dueVocabCount = vocabulary.filter(v => !v.nextReviewAt || v.nextReviewAt <= Date.now()).length;

  const isDarkMode = true;

  const [expandedVocabId, setExpandedVocabId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAudioBankOpen, setIsAudioBankOpen] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('standard');
  const [preferredTypes, setPreferredTypes] = useState<QuestionType[]>(ALL_QUESTION_TYPES);
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel | 'All'>('All');
  const [selectedLesson, setSelectedLesson] = useState<string | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedWordType, setSelectedWordType] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string | 'All'>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Automatically reset lesson filter when level changes
  useEffect(() => {
    setSelectedLesson('All');
  }, [selectedLevel]);

  const [sortBy, setSortBy] = useState<'newest' | 'mastery' | 'alphabetical'>('newest');
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [vocabToDelete, setVocabToDelete] = useState<VocabularyItem | null>(null);
  
  const [showScrollTop, setShowScrollTop] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const levelScrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const lessonScrollRef = useRef<HTMLDivElement>(null);
  const wordTypeScrollRef = useRef<HTMLDivElement>(null);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 200;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingBulk(true);
    setErrorMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("File Excel không có dữ liệu.");
      }

      // Detect pillars/headers
      const firstRow = jsonData[0];
      const keys = Object.keys(firstRow);
      
      const wordKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes('chữ hán') || lowerK === 'word' || lowerK === 'hanzi' || lowerK.includes('từ') || lowerK === 'w';
      });

      const pinyinKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes('phiên âm') || lowerK === 'pinyin' || lowerK.includes('đọc') || lowerK === 'p';
      });

      const meaningKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes('ý nghĩa') || lowerK === 'meaning' || lowerK.includes('nghĩa') || lowerK === 'm';
      });

      const wordTypeKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes('loại từ') || 
               lowerK.includes('từ loại') || 
               lowerK.includes('part of speech') || 
               lowerK.includes('pos') || 
               lowerK.includes('type') ||
               lowerK === 't';
      });

      const levelKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes('cấp độ') || 
               lowerK.includes('trình độ') || 
               lowerK === 'level' || 
               lowerK.includes('dangdai') ||
               lowerK.includes('당대') ||
               lowerK.includes('đương đại') ||
               lowerK.includes('當代')
      });

      const lessonKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK === 'bài' || 
               lowerK === 'lesson' || 
               lowerK === 'b' || 
               lowerK === 'l' ||
               lowerK.includes('bài học') || 
               lowerK.includes('unit') || 
               lowerK.includes('chapter');
      });

      const exampleKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes('ví dụ') || lowerK.includes('example') || lowerK.includes('câu ví dụ');
      });

      const exampleTranslationKey = keys.find(k => {
        const lowerK = k.toLowerCase();
        return lowerK.includes('nghĩa ví dụ') || lowerK.includes('dịch ví dụ') || lowerK.includes('example translation') || lowerK.includes('ví dụ dịch');
      });

      if (!levelKey || !wordKey || !meaningKey) {
        throw new Error("Yêu cầu bắt buộc: File Excel của bạn cần có ít nhất các cột: Chữ Hán (Word), Ý nghĩa (Meaning), và Cấp độ (Level).");
      }

      const items = jsonData.map(row => {
        let rawLevel = String(row[levelKey] || '').trim();
        // Standardize level mapping: 1 -> 當代1, 2 -> 當代2, etc.
        let level: ProficiencyLevel = '當代1';
        const levelMatch = rawLevel.match(/([1-6])/);
        if (levelMatch) {
          level = `當代${levelMatch[1]}` as ProficiencyLevel;
        } else if (rawLevel.includes('當代')) {
          level = rawLevel as ProficiencyLevel;
        } else {
          if (!rawLevel) return null;
        }

        const rawLesson = lessonKey ? String(row[lessonKey] || '').trim() : undefined;
        const rawWordType = wordTypeKey ? String(row[wordTypeKey] || '').trim() : undefined;
        const rawPinyin = pinyinKey ? String(row[pinyinKey] || '').trim() : '';

        return {
          word: String(row[wordKey] || '').trim(),
          pinyin: rawPinyin,
          meaning: String(row[meaningKey] || '').trim(),
          level,
          lesson: rawLesson,
          wordType: rawWordType,
          category: 'Excel Import',
          tags: [],
          exampleSentence: exampleKey ? String(row[exampleKey] || '').trim() : '',
          exampleTranslation: exampleTranslationKey ? String(row[exampleTranslationKey] || '').trim() : '',
          notes: String(row['Notes'] || row['Ghi chú'] || row['Mẹo nhớ'] || '')
        };
      }).filter((item): item is any => item !== null && item.word !== '');

      // 1. Filter out duplicates within the uploaded file itself
      const uniqueInFile = items.reduce((acc: any[], current) => {
        const isDuplicateInAcc = acc.some(item => 
          item.word.trim().toLowerCase() === current.word.trim().toLowerCase() && 
          item.meaning.trim().toLowerCase() === current.meaning.trim().toLowerCase()
        );
        return isDuplicateInAcc ? acc : [...acc, current];
      }, []);

      // 2. Filter against existing vocabulary
      const filteredItems = uniqueInFile.filter(newItem => {
        const isDuplicateInVocab = vocabulary.some(existing => 
          existing.word.trim().toLowerCase() === newItem.word.trim().toLowerCase() && 
          existing.meaning.trim().toLowerCase() === newItem.meaning.trim().toLowerCase()
        );
        return !isDuplicateInVocab;
      });

      const duplicateCount = uniqueInFile.length - filteredItems.length;

      if (filteredItems.length > 0) {
        await addBulkVocab(filteredItems);
        let msg = `Đã nhập thành công ${filteredItems.length} từ vựng mới!`;
        if (duplicateCount > 0) {
          msg += ` (Đã bỏ qua ${duplicateCount} từ bị trùng lặp)`;
        }
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 4000);
        setIsBulkImporting(false);
        
        // Reset filters
        setSearchTerm('');
        setSelectedLevel('All');
        setSelectedCategory('All');
        setSortBy('newest');
      } else {
        if (duplicateCount > 0) {
          setErrorMessage(`Tất cả từ vựng trong file đã tồn tại trong hệ thống.`);
        } else {
          setErrorMessage("Không tìm thấy dữ liệu từ vựng hợp lệ trong file.");
        }
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err: any) {
      console.error("Excel import failed:", err);
      setErrorMessage(err.message || "Lỗi khi xử lý file Excel. Vui lòng kiểm tra định dạng.");
    } finally {
      setIsParsingBulk(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Form state
  const [newWord, setNewWord] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newWordType, setNewWordType] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newLevel, setNewLevel] = useState<ProficiencyLevel>('當代1');
  const [newLesson, setNewLesson] = useState('');
  const [newCategory, setNewCategory] = useState('Chưa phân loại');
  const [newNotes, setNewNotes] = useState('');
  const [newColor, setNewColor] = useState<string | undefined>(undefined);

  const PREDEFINED_COLORS = [
    { label: 'Mặc định', value: undefined, class: 'bg-slate-800 border-slate-700', text: 'text-slate-400' },
    { label: 'Khó nhớ', value: 'rose', class: 'bg-rose-500 border-rose-400', text: 'text-rose-400' },
    { label: 'Cần ôn tập', value: 'amber', class: 'bg-amber-500 border-amber-400', text: 'text-amber-400' },
    { label: 'Đang học', value: 'indigo', class: 'bg-indigo-500 border-indigo-400', text: 'text-indigo-400' },
    { label: 'Đã thuộc', value: 'emerald', class: 'bg-emerald-500 border-emerald-400', text: 'text-emerald-400' },
    { label: 'Thú vị', value: 'fuchsia', class: 'bg-fuchsia-500 border-fuchsia-400', text: 'text-fuchsia-400' },
    { label: 'Công nghệ', value: 'cyan', class: 'bg-cyan-500 border-cyan-400', text: 'text-cyan-400' },
  ];

  const tagCounts = vocabulary.reduce((acc, item) => {
    (item.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  const allTags = Object.keys(tagCounts).sort();

  const allCategories = Array.from(new Set(vocabulary.map(v => v.category || 'Chưa phân loại'))).sort();
  const allWordTypes = Array.from(new Set(vocabulary.map(v => v.wordType).filter((type): type is string => !!type))).sort();

  const allLessonsForLevel = Array.from(new Set(
    vocabulary
      .filter(v => selectedLevel === 'All' || v.level === selectedLevel)
      .map(v => v.lesson)
      .filter((lesson): lesson is string => !!lesson)
  )).sort((a: string, b: string) => {
    // Try numeric sort if both are numbers
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const filteredVocab = vocabulary.filter(v => {
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = (v.word || '').includes(searchTerm) || 
      (v.pinyin || '').toLowerCase().includes(searchLow) ||
      (v.meaning || '').toLowerCase().includes(searchLow) || 
      (v.tags || [])?.some(tag => tag.toLowerCase().includes(searchLow));
    const matchesLevel = selectedLevel === 'All' || v.level === selectedLevel;
    const matchesLesson = selectedLesson === 'All' || v.lesson === selectedLesson;
    const matchesCategory = selectedCategory === 'All' || (v.category || 'Chưa phân loại') === selectedCategory;
    const matchesWordType = selectedWordType === 'All' || v.wordType === selectedWordType;
    const matchesColor = selectedColor === 'All' || (v.color === (selectedColor === 'none' ? undefined : selectedColor));
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => (v.tags || []).includes(tag));
    const isDue = !v.nextReviewAt || v.nextReviewAt <= Date.now();
    const matchesDue = !showDueOnly || isDue;
    return matchesSearch && matchesLevel && matchesLesson && matchesCategory && matchesWordType && matchesColor && matchesTags && matchesDue;
  }).sort((a, b) => {
    if (sortBy === 'mastery') return (b.masteryScore || 0) - (a.masteryScore || 0);
    if (sortBy === 'alphabetical') return (a.word || '').localeCompare(b.word || '');
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord || !newMeaning) return;
    
    setIsParsingBulk(true); // Reuse loader if available
    setErrorMessage(null);
    try {
      console.log("Submitting new word:", newWord);
      await addVocab({
        word: newWord,
        pinyin: newPinyin,
        meaning: newMeaning,
        wordType: newWordType || undefined,
        level: newLevel,
        lesson: newLesson || undefined,
        exampleSentence: newExample,
        category: newCategory,
        notes: newNotes,
        tags: newTags.split(',').map(tag => tag.trim()).filter(Boolean),
        color: newColor,
      });
      
      console.log("Success! Resetting form...");
      setSuccessMessage(`Đã thêm từ "${newWord}" thành công!`);
      setTimeout(() => setSuccessMessage(null), 3500);

      setNewWord('');
      setNewPinyin('');
      setNewMeaning('');
      setNewWordType('');
      setNewLesson('');
      setNewExample('');
      setNewNotes('');
      setNewTags('');
      setNewColor(undefined);
      setIsAdding(false);
      
      // Reset filters and sort to newest
      setSearchTerm('');
      setSelectedLevel('All');
      setSelectedCategory('All');
      setSelectedWordType('All');
      setSelectedColor('All');
      setSelectedTags([]);
      setShowDueOnly(false);
      setSortBy('newest');
    } catch (err: any) {
      console.error("Critical error adding word:", err);
      setErrorMessage(`Lỗi: ${err.message || "Không thể lưu dữ liệu"}. Vui lòng thử lại.`);
    } finally {
      setIsParsingBulk(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const masteryStats = {
    total: vocabulary.length,
    mastered: vocabulary.filter(v => v.masteryScore >= 80).length,
    learning: vocabulary.filter(v => v.masteryScore > 0 && v.masteryScore < 80).length,
    new: vocabulary.filter(v => v.masteryScore === 0).length,
    due: dueVocabCount
  };

  const [isActive, setIsActive] = useState(false);
  const [isGoalSettingOpen, setIsGoalSettingOpen] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => localStorage.getItem('study_reminder_time') || '09:00');
  const [isReminderEnabled, setIsReminderEnabled] = useState(() => localStorage.getItem('study_reminder_enabled') === 'true');
  const lastActivityRef = React.useRef(Date.now());
  const lastSaveTimeRef = React.useRef(0);
  const lastNotificationDateRef = React.useRef(localStorage.getItem('last_notification_date') || '');

  // Handle Notifications
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    
    try {
      const result = await Notification.requestPermission();
      return result === "granted";
    } catch (err) {
      console.error("Notification permission error", err);
      return false;
    }
  };

  const sendStudyReminder = () => {
    if (!isReminderEnabled || Notification.permission !== "granted") return;
    
    const today = new Date().toISOString().split('T')[0];
    if (lastNotificationDateRef.current === today) return;

    const notification = new Notification("Đã đến lúc học tiếng Trung!", {
      body: "Chỉ cần 15 phút mỗi ngày để tiến bộ vượt bậc. Bắt đầu ngay!",
      icon: "/favicon.ico",
    });

    notification.onclick = () => {
      window.focus();
      setIsQuizMode(true);
      notification.close();
    };

    lastNotificationDateRef.current = today;
    localStorage.setItem('last_notification_date', today);
  };

  useEffect(() => {
    const checkReminder = () => {
      if (!isReminderEnabled) return;
      
      const now = new Date();
      const currentStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentStr === reminderTime) {
        sendStudyReminder();
      }
    };

    const reminderInterval = setInterval(checkReminder, 60000);
    return () => clearInterval(reminderInterval);
  }, [isReminderEnabled, reminderTime]);

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
      const isIdle = now - lastActivityRef.current > 60000; // 1 minute idle threshold
      const isVisible = document.visibilityState === 'visible';

      // ONLY count time if:
      // 1. Not idle
      // 2. Tab is visible
      // 3. User is in active learning mode (Quiz/Flashcards)
      if (!isIdle && isVisible && isQuizMode) {
        setIsActive(true);
        setTodayStudyTime(prev => {
          const newTime = prev + 1;
          
          // Save incrementally (every 10 seconds or when closing)
          if (now - lastSaveTimeRef.current > 10000) {
            const saved = localStorage.getItem('study_time_data');
            const data = saved ? JSON.parse(saved) : {};
            const today = new Date().toISOString().split('T')[0];
            data[today] = newTime;
            localStorage.setItem('study_time_data', JSON.stringify(data));
            lastSaveTimeRef.current = now;
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
  }, [isActive, isQuizMode]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const timeGoalProgress = Math.min(100, Math.round((todayStudyTime / (studyTimeGoal * 60)) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2"
          >
            <Check size={20} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-3xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-linear-to-br from-indigo-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-500/10 font-black text-xl md:text-2xl transform hover:rotate-6 transition-transform">台</div>
            <div>
              <h1 className="text-base md:text-lg font-black tracking-tight text-white/90">Học tiếng Đài</h1>
              <p className="text-[8px] md:text-[9px] text-indigo-400 font-bold uppercase tracking-[0.2em] leading-none">Modern Study Experience</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSelectingMode(true)}
              disabled={vocabulary.length < 3}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded-full font-bold hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-30"
            >
              <Brain size={16} />
              <span className="hidden sm:inline">Brain Mode</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Scroll Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 z-[60] w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-800 transition-all border border-slate-800"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mode Selection Modal */}
      <AnimatePresence>
        {isSelectingMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSelectingMode(false)}
              className="absolute inset-0 bg-slate-950/80"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[48px] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6">
                  Practice Engine v2
                </div>
                <h3 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">Chế độ luyện tập</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto">Chọn phương pháp phù hợp nhất để củng cố kiến thức của bạn ngay hôm nay.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {[
                  { id: 'standard', title: 'Tiêu chuẩn', icon: Brain, desc: 'Bài tập tổng hợp ngẫu nhiên.', color: 'indigo' },
                  { id: 'flashcards', title: 'Thẻ ghi nhớ', icon: BookOpen, desc: 'Lật thẻ để ghi nhớ từ vựng.', color: 'fuchsia' },
                  { id: 'typing', title: 'Luyện gõ', icon: FileText, desc: 'Nhập chữ Hán từ ý nghĩa.', color: 'cyan' },
                  { id: 'tone-master', title: 'Thanh điệu', icon: Music, desc: 'Chuyên sâu về dấu và âm đọc.', color: 'violet' },
                  { id: 'ear-training', title: 'Luyện nghe', icon: Headphones, desc: 'Nghe và nhận diện từ vựng.', color: 'sky' },
                  { id: 'srs', title: `Đến hạn (${dueVocabCount})`, icon: Sparkles, desc: 'Ôn tập theo thuật toán SRS.', color: 'emerald', disabled: dueVocabCount === 0 },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    disabled={(mode as any).disabled}
                    onClick={() => {
                      setPracticeMode(mode.id as PracticeMode);
                      setIsSelectingMode(false);
                      setIsQuizMode(true);
                    }}
                    className={cn(
                      "flex items-start gap-5 p-6 rounded-3xl border transition-all text-left group",
                      (mode as any).disabled 
                         ? "opacity-40 cursor-not-allowed border-slate-800" 
                         : cn(
                            "bg-slate-950/50 border-slate-800 hover:border-white/20 hover:bg-slate-800/40 social-card-glow",
                            mode.color === 'indigo' && "hover:shadow-indigo-500/10",
                            mode.color === 'fuchsia' && "hover:shadow-fuchsia-500/10",
                            mode.color === 'emerald' && "hover:shadow-emerald-500/10"
                         )
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                      {
                        'bg-indigo-500/10 text-indigo-400': mode.color === 'indigo',
                        'bg-fuchsia-500/10 text-fuchsia-400': mode.color === 'fuchsia',
                        'bg-cyan-500/10 text-cyan-400': mode.color === 'cyan',
                        'bg-violet-500/10 text-violet-400': mode.color === 'violet',
                        'bg-sky-500/10 text-sky-400': mode.color === 'sky',
                        'bg-emerald-500/10 text-emerald-400': mode.color === 'emerald',
                      }[mode.color]
                    )}>
                      <mode.icon size={28} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-white text-lg mb-1">{mode.title}</h4>
                      <p className="text-xs text-slate-500 leading-snug">{mode.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Question Type Preferences (Only for certain modes) */}
              {['standard', 'srs', 'mistake-review', 'timed'].includes(practiceMode || '') && (
                <div className="mb-10 p-8 bg-slate-950/40 border border-slate-800 rounded-[32px]">
                   <div className="flex items-center justify-between mb-6">
                     <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                       <Plus size={12} className="text-indigo-400" /> Tùy chỉnh câu hỏi
                     </h4>
                     <span className="text-[10px] text-slate-600 font-bold italic">Ít nhất 1 loại</span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {ALL_QUESTION_TYPES.map(type => {
                       const isSelected = preferredTypes.includes(type);
                       const labelMap: Record<string, string> = {
                         'multiple-choice': 'Trắc nghiệm',
                         'fill-in-the-blank': 'Điền từ',
                         'typing': 'Gõ phím',
                         'tone-selection': 'Thanh điệu',
                         'audio-to-meaning': 'Nghe hiểu',
                         'hanzi-to-pinyin': 'Pinyin',
                         'matching': 'Ghép cặp',
                         'sentence-completion': 'Câu'
                       };
                       
                       return (
                         <button
                           key={type}
                           onClick={() => {
                             if (isSelected) {
                               if (preferredTypes.length > 1) {
                                 setPreferredTypes(prev => prev.filter(t => t !== type));
                               }
                             } else {
                               setPreferredTypes(prev => [...prev, type]);
                             }
                           }}
                           className={cn(
                             "px-4 py-2 rounded-xl text-[10px] font-black transition-all border flex items-center gap-2",
                             isSelected 
                               ? "bg-white text-slate-950 border-white shadow-xl shadow-white/10" 
                               : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
                           )}
                         >
                           {isSelected && <Check size={12} strokeWidth={4} />}
                           {labelMap[type] || type}
                         </button>
                       );
                     })}
                   </div>
                </div>
              )}

              <button 
                onClick={() => setIsSelectingMode(false)}
                className="w-full py-5 text-slate-500 font-black text-sm uppercase tracking-[0.3em] hover:text-white transition-all flex items-center justify-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                  <X size={14} className="group-hover:text-red-400" />
                </div>
                Hủy bỏ
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Audio Manager Modal */}
      <AnimatePresence>
        {isAudioBankOpen && (
          <AudioManager onClose={() => setIsAudioBankOpen(false)} />
        )}
      </AnimatePresence>

      {/* Advanced Stats Modal */}
      <AnimatePresence>
        {isStatsOpen && (
          <SrsStats 
            vocabulary={vocabulary} 
            onClose={() => setIsStatsOpen(false)} 
            isDarkMode={isDarkMode}
          />
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Simple & Modern Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 mb-16">
          
          {/* Welcome Card & Primary Action */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-[48px] p-10 md:p-16 relative overflow-hidden group shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
          >
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[140px] rounded-full -translate-y-1/2 translate-x-1/4 group-hover:bg-indigo-500/15 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-fuchsia-500/5 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4 group-hover:bg-fuchsia-500/10 transition-colors duration-700" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">AI</div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white">臺</div>
                </div>
                <div className="h-4 w-px bg-slate-800 mx-2" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Hệ thống quản trị ngôn ngữ</span>
              </div>

              <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-14">
                Làm chủ<br/>
                <span className="text-slate-500">Đài Ngữ.</span>
              </h1>

              <div className="flex flex-wrap items-center gap-6">
                <button 
                  onClick={() => setIsSelectingMode(true)}
                  disabled={vocabulary.length < 1}
                  className="px-10 py-6 bg-white text-slate-950 rounded-3xl font-black text-xl hover:scale-105 hover:shadow-[0_20px_40px_-12px_rgba(255,255,255,0.3)] active:scale-95 transition-all flex items-center gap-4 group/btn disabled:opacity-50 disabled:hover:scale-100"
                >
                  <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white group-hover/btn:rotate-12 transition-transform">
                    <Brain size={24} />
                  </div>
                  Bắt đầu học
                </button>
                
                <div className="flex items-center gap-2 p-2 bg-slate-950/40 backdrop-blur-xl border border-slate-800/50 rounded-[32px]">
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="w-14 h-14 bg-slate-800 border border-slate-700 text-white rounded-2xl flex items-center justify-center hover:bg-slate-700 hover:border-slate-600 transition-all group/plus"
                    title="Thêm từ mới"
                  >
                    <Plus size={24} className="group-hover/plus:rotate-90 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setIsBulkImporting(true)}
                    className="w-14 h-14 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all"
                    title="Nhập hàng loạt"
                  >
                    <FileSpreadsheet size={22} />
                  </button>
                  <div className="w-px h-8 bg-slate-800 mx-2" />
                  <button 
                    onClick={() => setIsAudioBankOpen(true)}
                    className="pl-5 pr-7 h-14 bg-linear-to-br from-indigo-500/10 to-fuchsia-500/10 text-fuchsia-400 rounded-2xl font-bold flex items-center gap-3 hover:border-fuchsia-500/30 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
                      <Headphones size={16} />
                    </div>
                    <span className="text-sm">Bài nghe</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Key Stats Cards */}
          <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Minimal Stat Card */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-[40px] p-8 md:p-10 flex flex-col justify-between hover:border-slate-700 transition-all duration-500 group/card relative shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tiến độ học thuật</h3>
                </div>
                <button 
                  onClick={() => setIsStatsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold rounded-full hover:bg-slate-700 hover:text-white transition-all shadow-lg"
                >
                  <TrendingUp size={12} />
                  Phân tích
                </button>
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black text-white tracking-tighter leading-none">{masteryStats.total}</span>
                  <span className="text-slate-600 text-sm font-bold tracking-widest uppercase">Từ vựng</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-8">
                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{masteryStats.mastered} Thành thạo</span>
                  </div>
                  <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">{masteryStats.due} Cần ôn tập</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SRS Status Summary */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setShowDueOnly(true);
                  setIsQuizMode(true);
                }}
                disabled={masteryStats.due === 0}
                className="group bg-linear-to-br from-indigo-500 to-indigo-700 rounded-[40px] p-7 text-white text-left relative overflow-hidden shadow-2xl hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                <Sparkles size={24} className="mb-4 text-white/50 group-hover:rotate-12 transition-transform" />
                <div className="text-3xl font-black mb-1">{masteryStats.due}</div>
                <p className="text-[9px] text-white/70 font-black uppercase tracking-widest leading-tight">Từ đến hạn<br/>ôn tập</p>
              </button>

              <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-7 flex flex-col justify-between relative overflow-hidden group/item shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", (isActive && isQuizMode) ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-700")} />
                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Thời gian</h4>
                  </div>
                  <button 
                    onClick={() => setIsGoalSettingOpen(true)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-indigo-500 transition-all"
                  >
                    <Filter size={12} />
                  </button>
                </div>
                <div className="text-3xl font-black text-white mb-4 tracking-tight leading-none">{formatTime(todayStudyTime)}</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tight">Mục tiêu {studyTimeGoal}p</span>
                    <span className="text-[8px] font-bold text-indigo-400">{timeGoalProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${timeGoalProgress}%` }}
                      className={cn(
                        "h-full transition-colors relative",
                        timeGoalProgress >= 100 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Streak Stat Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-[40px] p-7 flex flex-col justify-between relative overflow-hidden group shadow-xl hover:border-slate-700 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-orange-500">
                  <Flame size={32} />
                </div>
                <div className="flex items-center gap-1.5 mb-4 relative z-10">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Chuỗi học tập</h4>
                </div>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className={cn(
                    "text-3xl font-black transition-colors leading-none",
                    streak.currentStreak > 0 ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]" : "text-white"
                  )}>
                    {streak.currentStreak}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ngày</span>
                </div>
                <div className="mt-4 flex gap-1 relative z-10">
                  {[...Array(7)].map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 h-1 rounded-full transition-all duration-700",
                        streak.currentStreak > i ? "bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]" : "bg-slate-800"
                      )} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Toolbar */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[24px] p-2 md:p-3 mb-8 flex flex-col lg:flex-row items-center gap-4 shadow-lg shadow-slate-900/20">
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm từ vựng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800/50 rounded-[18px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto overflow-hidden relative group">
            <button 
              onClick={() => scrollContainer(levelScrollRef, 'left')}
              className="absolute left-2 z-20 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={12} />
            </button>
            <div className="flex items-center gap-1 p-1 bg-slate-950/50 border border-slate-800/50 rounded-[18px] shrink-0 overflow-x-auto no-scrollbar scroll-smooth px-6 md:px-1" ref={levelScrollRef}>
              {['All', '當代1', '當代2', '當代3', '當代4', '當代5', '當代6'].map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setSelectedLevel(level as any);
                    setSelectedLesson('All');
                  }}
                  className={cn(
                    "px-4 py-2 rounded-[14px] text-xs font-bold transition-all",
                    selectedLevel === level 
                      ? "bg-white text-slate-950 shadow-xl" 
                      : "text-slate-500 hover:text-white"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <button 
              onClick={() => scrollContainer(levelScrollRef, 'right')}
              className="absolute right-2 z-20 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="w-px h-8 bg-slate-800 mx-2 shrink-0 hidden lg:block" />

            <button
              onClick={() => setShowDueOnly(!showDueOnly)}
              className={cn(
                "px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border",
                showDueOnly 
                  ? "bg-amber-500 border-amber-400 text-slate-950 shadow-[0_20px_40px_-12px_rgba(245,158,11,0.3)]" 
                  : "bg-slate-950 border-slate-800 text-slate-500 hover:text-white"
              )}
            >
              <Clock size={16} />
              Đến hạn ôn
            </button>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-5 py-2.5 bg-slate-950/50 border border-slate-800/50 text-slate-500 text-xs font-bold rounded-[18px] focus:outline-none focus:border-indigo-500 shrink-0 cursor-pointer hover:text-white transition-colors"
            >
              <option value="newest">Mới nhất</option>
              <option value="mastery">Thành thạo</option>
              <option value="alphabetical">A-Z</option>
            </select>

            <div className="w-[1px] h-6 bg-slate-800 mx-1 shrink-0" />

            <div className="flex items-center gap-1 p-1 bg-slate-950/50 border border-slate-800/50 rounded-[18px] shrink-0">
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  "p-2 rounded-[14px] transition-all",
                  viewMode === 'card' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
                )}
                title="Chi tiết"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={cn(
                  "p-2 rounded-[14px] transition-all",
                  viewMode === 'compact' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white"
                )}
                title="Danh sách"
              >
                <List size={16} />
              </button>
            </div>
          </div>

        {allCategories.length > 0 && (
          <div className="flex items-center gap-2 mb-4 relative group">
            <div className="p-2 border border-slate-800 rounded-lg bg-slate-900 shrink-0">
              <LayoutGrid size={14} className="text-indigo-400" />
            </div>
            <button 
              onClick={() => scrollContainer(categoryScrollRef, 'left')}
              className="absolute left-10 z-10 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={12} />
            </button>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth px-2" ref={categoryScrollRef}>
              {['All', ...allCategories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                    selectedCategory === cat
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
                  )}
                >
                  {cat === 'All' ? 'Tất cả danh mục' : cat}
                </button>
              ))}
            </div>
            <button 
              onClick={() => scrollContainer(categoryScrollRef, 'right')}
              className="absolute right-0 z-10 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}

        {allWordTypes.length > 0 && (
          <div className="flex items-center gap-2 mb-4 relative group">
            <div className="p-2 border border-slate-800 rounded-lg bg-slate-900 shrink-0">
              <FileText size={14} className="text-blue-400" />
            </div>
            <button 
              onClick={() => scrollContainer(wordTypeScrollRef, 'left')}
              className="absolute left-10 z-10 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={12} />
            </button>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth px-2" ref={wordTypeScrollRef}>
              {['All', ...allWordTypes].map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedWordType(type)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                    selectedWordType === type
                      ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
                  )}
                >
                  {type === 'All' ? 'Tất cả loại từ' : type}
                </button>
              ))}
            </div>
            <button 
              onClick={() => scrollContainer(wordTypeScrollRef, 'right')}
              className="absolute right-0 z-10 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}

        {allLessonsForLevel.length > 0 && (
          <div className="flex items-center gap-2 mb-4 relative group">
            <div className="p-2 border border-slate-800 rounded-lg bg-slate-900 shrink-0">
              <Book size={14} className="text-emerald-400" />
            </div>
            <button 
              onClick={() => scrollContainer(lessonScrollRef, 'left')}
              className="absolute left-10 z-10 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={12} />
            </button>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 scroll-smooth px-2" ref={lessonScrollRef}>
              <button
                onClick={() => setSelectedLesson('All')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                  selectedLesson === 'All'
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
                )}
              >
                Tất cả các bài
              </button>
              {allLessonsForLevel.map(lesson => (
                <button
                  key={lesson}
                  onClick={() => setSelectedLesson(lesson)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                    selectedLesson === lesson
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
                  )}
                >
                  Bài {lesson}
                </button>
              ))}
            </div>
            <button 
              onClick={() => scrollContainer(lessonScrollRef, 'right')}
              className="absolute right-0 z-10 p-1 bg-slate-900/80 rounded-full border border-slate-700 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 overflow-hidden">
          <div className="p-2 border border-slate-800 rounded-lg bg-slate-900 shrink-0">
            <Sparkles size={14} className="text-fuchsia-400" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedColor('All')}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                selectedColor === 'All'
                  ? "bg-white text-slate-950 border-white"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
              )}
            >
              Tất cả trạng thái
            </button>
            {PREDEFINED_COLORS.filter(c => c.value !== undefined).map(color => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value as string)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0 flex items-center gap-2",
                  selectedColor === color.value
                    ? `${color.class} text-white shadow-lg`
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", selectedColor === color.value ? "bg-white" : color.class)} />
                {color.label}
              </button>
            ))}
            <button
              onClick={() => setSelectedColor('none')}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0",
                selectedColor === 'none'
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-white"
              )}
            >
              Chưa gán
            </button>
          </div>
        </div>

        {/* Tags filter bar removed to simplify UI as requested */}

        <AnimatePresence>
          {selectedVocabCount > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-6 md:bottom-10 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6"
            >
              <div className="flex items-center gap-3 w-full md:w-auto md:pr-6 md:border-r border-slate-800">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/20 shrink-0">
                  {selectedVocabCount}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100 uppercase tracking-widest">Đã chọn</p>
                  <p className="text-[10px] text-slate-500 font-medium">Sẵn sàng để luyện tập</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setIsSelectingMode(true)}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20"
                >
                  <Brain size={16} /> Luyện tập ({selectedVocabCount})
                </button>
                <button
                  onClick={() => clearSelection()}
                  className="flex-1 md:flex-none px-5 py-2.5 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-700 hover:text-slate-200 transition-all text-center"
                >
                  Bỏ chọn
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multi-selection info bar */}
        <div className="flex items-center justify-between mb-4 mt-8 px-2">
          <div className="flex items-center gap-3">
             <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Danh sách từ vựng</h3>
             <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[9px] font-bold text-slate-400 dark:text-slate-500">{filteredVocab.length} từ</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const allVisibleSelected = filteredVocab.every(v => v.isSelected);
                
                if (allVisibleSelected) {
                  // If all in filter are selected, unselect them
                  filteredVocab.forEach(v => {
                    if (v.isSelected) toggleSelect(v.id);
                  });
                } else {
                  // Select all in filter
                  filteredVocab.forEach(v => {
                    if (!v.isSelected) toggleSelect(v.id);
                  });
                }
              }}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all flex items-center gap-2 shadow-sm"
            >
              <Check className={cn("w-3 h-3", (filteredVocab.every(v => v.isSelected) && filteredVocab.length > 0) ? "text-indigo-400" : "")} />
              {(filteredVocab.every(v => v.isSelected) && filteredVocab.length > 0) ? "Bỏ chọn bài này" : "Chọn bài này"}
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className={cn(
          viewMode === 'card' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" 
            : "flex flex-col gap-3"
        )}>
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
                  "group transition-all cursor-pointer relative",
                  viewMode === 'card' 
                    ? "bg-slate-900 border rounded-[28px] p-6 shadow-xl" 
                    : "bg-slate-900/40 hover:bg-slate-900 border border-slate-800/50 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm",
                  item.isSelected 
                    ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30" 
                    : item.color && viewMode === 'card'
                      ? {
                          'border-indigo-400/30 shadow-[0_20px_40px_-12px_rgba(99,102,241,0.15)]': item.color === 'indigo',
                          'border-fuchsia-400/30 shadow-[0_20px_40px_-12px_rgba(217,70,239,0.15)]': item.color === 'fuchsia',
                          'border-emerald-400/30 shadow-[0_20px_40px_-12px_rgba(16,185,129,0.15)]': item.color === 'emerald',
                          'border-amber-400/30 shadow-[0_20px_40px_-12px_rgba(245,158,11,0.15)]': item.color === 'amber',
                          'border-rose-400/30 shadow-[0_20px_40px_-12px_rgba(244,63,94,0.15)]': item.color === 'rose',
                          'border-cyan-400/30 shadow-[0_20px_40px_-12px_rgba(6,182,212,0.15)]': item.color === 'cyan',
                        }[item.color]
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/30"
                )}
              >
                {/* Selection Indicator & Checkbox */}
                <div className={cn(
                  "absolute z-20 transition-all",
                  viewMode === 'card' ? "top-6 right-6" : "left-6 top-1/2 -translate-y-1/2"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                    item.isSelected 
                      ? "bg-indigo-500 border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                      : "bg-slate-950 border-slate-700 group-hover:border-slate-500"
                  )}>
                    {item.isSelected && <Check size={14} strokeWidth={4} className="text-white" />}
                  </div>
                </div>

                {/* Visual Label Indicator */}
                {item.color && viewMode === 'card' && (
                  <div className={cn(
                    "absolute -left-[1px] top-8 bottom-8 w-1.5 rounded-r-full transition-all",
                    {
                      'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]': item.color === 'indigo',
                      'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]': item.color === 'fuchsia',
                      'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]': item.color === 'emerald',
                      'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]': item.color === 'amber',
                      'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]': item.color === 'rose',
                      'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]': item.color === 'cyan',
                    }[item.color]
                  )} />
                )}
                {viewMode === 'card' ? (
                  <>
                    <div className="flex items-start justify-between mb-3 px-1">
                      <div className="flex flex-col gap-1 pr-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(
              "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest self-start border",
              getLevelColor(item.level)
            )}>
              {item.level}
            </span>
            {item.category && (
              <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold uppercase tracking-widest rounded whitespace-nowrap">
                {item.category === 'Chưa phân loại' ? 'General' : item.category}
              </span>
            )}
            {item.color && (
              <span className={cn(
                "px-2 py-0.5 border text-[9px] font-bold uppercase tracking-widest rounded whitespace-nowrap bg-white/50 dark:bg-slate-900/50",
                PREDEFINED_COLORS.find(c => c.value === item.color)?.text || 'text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800',
                PREDEFINED_COLORS.find(c => c.value === item.color)?.class.replace('bg-', 'border-').replace(' ', '') || 'border-slate-200 dark:border-slate-800'
              )}>
                {PREDEFINED_COLORS.find(c => c.value === item.color)?.label}
              </span>
            )}
          </div>
                        {item.nextReviewAt && (
                          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tight">
                            Next: {new Date(item.nextReviewAt).toLocaleDateString()}
                          </span>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                            {item.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-[9px] text-slate-500 font-medium"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setVocabToDelete(item);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        {item.wordType && (
                          <span className="text-[10px] font-bold text-indigo-400/80 mb-0.5 uppercase tracking-tighter bg-indigo-500/10 px-1.5 rounded shrink-0">
                            {item.wordType}
                          </span>
                        )}
                        <h3 className="text-2xl md:text-3xl font-black font-display-zh text-white tracking-tight">{item.word}</h3>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            speakChinese(item.word);
                          }}
                          className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 transition-all border border-transparent"
                          title="Listen"
                        >
                          <Volume2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAll(false);
                            toggleSelect(item.id);
                            setPracticeMode('flashcards');
                            setIsQuizMode(true);
                          }}
                          className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-fuchsia-400 hover:bg-slate-700 transition-all border border-transparent"
                          title="Học với flashcard"
                        >
                          <BookOpen size={12} />
                        </button>
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-500 font-mono tracking-wider tabular-nums uppercase mt-0.5">{item.pinyin}</p>
                    </div>

                    <p className="text-xs md:text-sm text-slate-300 font-medium mb-4 line-clamp-2 min-h-[32px]">
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
                              <div className="mb-4">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2 text-center">Đổi nhãn trạng thái (Mood)</p>
                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                  {PREDEFINED_COLORS.map((color) => (
                                    <button
                                      key={color.label}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateVocab(item.id, { color: color.value });
                                      }}
                                      className={cn(
                                        "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all group",
                                        item.color === color.value ? "bg-slate-800 border-indigo-500/50" : "bg-slate-950 border-transparent hover:border-slate-800"
                                      )}
                                      title={color.label}
                                    >
                                      <div className={cn(
                                        "w-6 h-6 rounded-full border flex items-center justify-center relative",
                                        color.class,
                                        item.color === color.value ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-800" : "shadow-lg group-hover:scale-110"
                                      )}>
                                        {item.color === color.value && <Check size={10} className="text-white" />}
                                      </div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-tighter",
                                        item.color === color.value ? "text-slate-100" : "text-slate-600"
                                      )}>{color.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {item.exampleSentence && (
                                <div className="mt-3 py-2 px-3 bg-slate-950 rounded-lg border border-slate-800/50">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Example</p>
                                  <div className="flex items-start gap-2">
                                    <p className="text-xs text-slate-200 font-zh italic flex-1">{item.exampleSentence}</p>
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

                              {/* Mnemonics / Notes Section */}
                              <div className="mt-3 py-3 px-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[10px] text-indigo-400 uppercase tracking-[0.2em] font-black">Ghi chú & Mẹo nhớ</p>
                                  <Sparkles size={12} className="text-indigo-400/50" />
                                </div>
                                <textarea
                                  value={item.notes || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateVocab(item.id, { notes: e.target.value });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="Thêm cách nhớ từ, mẹo học hoặc ghi chú cá nhân..."
                                  className="w-full bg-transparent text-xs text-slate-300 border-none outline-none resize-none placeholder:text-slate-600 font-medium leading-relaxed"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedVocabId(expandedVocabId === item.id ? null : item.id);
                        }}
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
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-4 flex-1 pl-10">
                      <div className={cn(
                        "w-2 h-8 rounded-full shrink-0",
                        getLevelColor(item.level, 'solid').replace('text-', 'bg-')
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-100 truncate font-zh">{item.word}</h3>
                          {item.wordType && (
                            <span className="text-[8px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-1 rounded shrink-0">
                              {item.wordType}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-500 font-mono tracking-tight uppercase">{item.pinyin}</span>
                          <span className="text-[8px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase shrink-0">{item.category || 'Chưa phân loại'}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{item.meaning}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 px-2 lg:px-6 border-x border-slate-800/50 h-10 mx-2 lg:mx-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5">{item.masteryScore}%</span>
                        <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full",
                              item.masteryScore >= 80 ? "bg-emerald-500" : 
                              item.masteryScore >= 40 ? "bg-amber-500" : "bg-indigo-500"
                            )}
                            style={{ width: `${item.masteryScore}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          speakChinese(item.word);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-all"
                      >
                        <Volume2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAll(false);
                          toggleSelect(item.id);
                          setPracticeMode('flashcards');
                          setIsQuizMode(true);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-fuchsia-400 transition-all"
                      >
                        <BookOpen size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setVocabToDelete(item);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
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

      {/* Goal Setting Modal */}
      <AnimatePresence>
        {isGoalSettingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGoalSettingOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Mục tiêu học tập</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Set your daily study target</p>
                </div>
                <button onClick={() => setIsGoalSettingOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4 text-center">
                    Bạn muốn học bao lâu mỗi ngày?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => {
                          setStudyTimeGoal(mins);
                          localStorage.setItem('study_time_goal', mins.toString());
                        }}
                        className={cn(
                          "py-4 rounded-2xl font-black transition-all border",
                          studyTimeGoal === mins
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-slate-950 border-slate-800 text-slate-500 hover:border-indigo-500/30"
                        )}
                      >
                        {mins} phút
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles className="text-amber-500" size={16} />
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Kinh nghiệm từ Mentor</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    "Học 15-30 phút mỗi ngày đều đặn hiệu quả hơn rất nhiều so với học 3 tiếng chỉ một lần duy nhất trong tuần."
                  </p>
                </div>

                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Nhắc nhở học tập</span>
                    </div>
                    <button 
                      onClick={async () => {
                        const enabled = !isReminderEnabled;
                        if (enabled) {
                          const granted = await requestNotificationPermission();
                          if (!granted) {
                            alert("Vui lòng cho phép thông báo trong trình duyệt để sử dụng tính năng này.");
                            return;
                          }
                        }
                        setIsReminderEnabled(enabled);
                        localStorage.setItem('study_reminder_enabled', enabled.toString());
                      }}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        isReminderEnabled ? "bg-indigo-600" : "bg-slate-800"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                        isReminderEnabled ? "right-1" : "left-1"
                      )} />
                    </button>
                  </div>

                  {isReminderEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Giờ thông báo hàng ngày</span>
                        <input 
                          type="time" 
                          value={reminderTime}
                          onChange={(e) => {
                            setReminderTime(e.target.value);
                            localStorage.setItem('study_reminder_time', e.target.value);
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-400 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <p className="text-[9px] text-slate-600 leading-tight italic">
                        * Bạn sẽ nhận được thông báo trình duyệt vào thời điểm này nếu chưa hoàn thành mục tiêu học tập.
                      </p>
                    </motion.div>
                  )}
                </div>

                <button 
                  onClick={() => setIsGoalSettingOpen(false)}
                  className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold hover:bg-slate-100 transition-all mt-4"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/80"
            />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[48px] p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter font-zh mb-1">新增詞彙</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Add word to library</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="w-10 h-10 flex items-center justify-center bg-slate-800/50 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-red-400 font-bold">{errorMessage}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Hán tự</label>
                    <input 
                      autoFocus
                      required
                      type="text"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-xl font-zh text-white placeholder:text-slate-700"
                      placeholder="學習"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pinyin</label>
                    <input 
                      type="text"
                      value={newPinyin}
                      onChange={(e) => setNewPinyin(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-lg font-mono text-white placeholder:text-slate-700"
                      placeholder="xué xí"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ý nghĩa / Giải thích</label>
                  <input 
                    required
                    type="text"
                    value={newMeaning}
                    onChange={(e) => setNewMeaning(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-base text-white placeholder:text-slate-700"
                    placeholder="To study; learning"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Loại từ</label>
                    <input 
                      type="text"
                      value={newWordType}
                      onChange={(e) => setNewWordType(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:outline-none transition-all text-sm text-indigo-400 font-black placeholder:text-indigo-400/20"
                      placeholder="e.g. N, V, Adj"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cấp độ (Contemporary)</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value as ProficiencyLevel)}
                      className="w-full px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:outline-none transition-all text-sm text-white"
                    >
                      {['當代1', '當代2', '當代3', '當代4', '當代5', '當代6'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Câu ví dụ</label>
                  <textarea 
                    value={newExample}
                    onChange={(e) => setNewExample(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-indigo-500 focus:outline-none transition-all text-sm min-h-[100px] font-zh text-white placeholder:text-slate-700 resize-none"
                    placeholder="Nhập câu mẫu để hiểu ngữ cảnh..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-white text-slate-950 rounded-3xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_-12px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3"
                  >
                    <Plus size={20} strokeWidth={3} />
                    Xác nhận
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-8 py-5 bg-slate-800 border border-slate-700 text-white rounded-3xl font-black text-sm hover:bg-slate-700 transition-all uppercase tracking-widest"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {isBulkImporting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
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
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-400 font-medium">{errorMessage}</p>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Dữ liệu từ vựng</label>
                  
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl border-dashed flex flex-col items-center justify-center gap-3 group hover:border-indigo-500/50 transition-all">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-300">Tải lên file Excel</p>
                        <p className="text-[10px] text-slate-500 mt-1">Yêu cầu cột cấp độ (1-6) & khuyên dùng cột bài (Lesson)</p>
                      </div>
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        ref={excelInputRef}
                        onChange={handleExcelImport}
                        className="hidden" 
                      />
                      <button 
                        onClick={() => excelInputRef.current?.click()}
                        className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-500 transition-all uppercase"
                      >
                        Chọn file
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <h4 className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Hướng dẫn Excel</h4>
                      <ul className="text-[9px] text-slate-500 space-y-1 ml-3 list-disc">
                        <li>Cột 1: Chữ Hán (Word / Hanzi / Từ)</li>
                        <li>Cột 2: Phiên âm (Pinyin / Đọc)</li>
                        <li>Cột 3: Ý nghĩa (Meaning / Nghĩa)</li>
                        <li className="text-emerald-600 dark:text-emerald-400 font-bold">Cột 4: Từ Loại (Word Type / POS)</li>
                        <li className="text-indigo-600 dark:text-indigo-400 font-bold">Cột 5: Cấp độ (1, 2, 3, 4, 5, 6) - BẮT BUỘC</li>
                        <li className="text-emerald-600 dark:text-emerald-400 font-bold">Cột 6: Bài (Lesson / Unit) - KHUYÊN DÙNG</li>
                        <li>Cột 7: Ví dụ (Example)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-4 pointer-events-none opacity-20">
                      <FileText size={24} />
                    </div>
                    <textarea 
                      placeholder="Hoặc dán văn bản tại đây:
学习 - xué xí - học tập
挑战 - tiǎo zhàn - thách thức"
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      className="w-full h-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 pl-12 text-slate-900 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-zh text-sm"
                    />
                  </div>
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
                      setErrorMessage(null);
                      try {
                        const lines = bulkText.split('\n').filter(line => line.trim());
                        const items = lines.map(line => {
                          // Match formats like: "Word (pinyin) Meaning", "Word - pinyin - Meaning", "Word Meaning"
                          // More robust splitting using multiple common delimiters
                          let parts = line.split(/[-–—:|]/).map(p => p.trim());
                          
                          // If split didn't find multiple parts, try to detect by space if it looks like HANZI PINYIN MEANING
                          if (parts.length === 1) {
                            // Regex to match Hanzi followed by anything else
                            const match = line.match(/^([\u4e00-\u9fa5]+)\s+(.+)$/);
                            if (match) {
                              const [_, word, rest] = match;
                              const restParts = rest.split(/\s+/, 1); // Get first word as pinyin potential
                              parts = [word, restParts[0], rest.substring(restParts[0].length).trim()];
                            }
                          }

                          return {
                            word: parts[0] || '',
                            pinyin: parts[1] || '',
                            meaning: parts[2] || parts[1] || '',
                            level: '當代1' as ProficiencyLevel,
                            category: 'custom' as string,
                            tags: [],
                            exampleSentence: '',
                            notes: parts[3] || ''
                          };
                        }).filter(item => item.word);

                        if (items.length > 0) {
                          await addBulkVocab(items);
                          
                          setSuccessMessage(`Đã nhập thành công ${items.length} từ vựng!`);
                          setTimeout(() => setSuccessMessage(null), 4000);

                          setIsBulkImporting(false);
                          setBulkText('');
                          
                          // Reset filters and sort to newest
                          setSearchTerm('');
                          setSelectedLevel('All');
                          setSelectedCategory('All');
                          setSelectedColor('All');
                          setSelectedTags([]);
                          setShowDueOnly(false);
                          setSortBy('newest');
                        }
                      } catch (err: any) {
                        console.error("Bulk import failed:", err);
                        setErrorMessage(`Lỗi nhập hàng loạt: ${err.message || "Đã có lỗi xảy ra"}`);
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
          preferredTypes={preferredTypes}
          vocabulary={
            selectedVocabCount > 0 
              ? vocabulary.filter(v => v.isSelected)
              : showDueOnly 
                ? vocabulary.filter(v => !v.nextReviewAt || v.nextReviewAt <= Date.now())
                : filteredVocab
          }
          onAnswer={recordResult}
          onClose={() => {
            setIsQuizMode(false);
            setShowDueOnly(false);
          }}
          onFinish={() => {
            updateActivity();
            setIsQuizMode(false);
            setShowDueOnly(false);
            clearSelection();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {vocabToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Xác nhận xóa?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">
                Bạn có chắc chắn muốn xóa từ <span className="text-red-600 dark:text-red-400 font-bold font-display-zh">{vocabToDelete.word}</span> không? Hành động này không thể hoàn tác.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setVocabToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => {
                    removeVocab(vocabToDelete.id);
                    setVocabToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-600/20 transition-all"
                >
                  Xóa ngay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
