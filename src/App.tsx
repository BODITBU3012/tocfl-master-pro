import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, AlertCircle, Volume2, Plus, Search, BookOpen, Brain, Trash2, ChevronRight, X, Sparkles, Filter, LayoutGrid, List, TrendingUp, Calendar, Loader2, FileText, Upload, Check, Clock, Music, Headphones, Flame, Bell, FileSpreadsheet, Book, ArrowUp, ChevronLeft } from 'lucide-react';
import { read, utils } from 'xlsx';
import { useVocabulary } from './hooks/useVocabulary';
import { useStreak } from './hooks/useStreak';
import { ProficiencyLevel, VocabularyItem, PracticeMode } from './types';
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
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel | 'All'>('All');
  const [selectedLesson, setSelectedLesson] = useState<string | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string | 'All'>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'mastery' | 'alphabetical'>('newest');
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const levelScrollRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const lessonScrollRef = useRef<HTMLDivElement>(null);

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
    const matchesColor = selectedColor === 'All' || (v.color === (selectedColor === 'none' ? undefined : selectedColor));
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => (v.tags || []).includes(tag));
    const isDue = !v.nextReviewAt || v.nextReviewAt <= Date.now();
    const matchesDue = !showDueOnly || isDue;
    return matchesSearch && matchesLevel && matchesLesson && matchesCategory && matchesColor && matchesTags && matchesDue;
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
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
            className="fixed bottom-24 right-6 z-[60] w-12 h-12 bg-white text-slate-950 rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-200"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

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
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="text-center mb-10">
                <h3 className="text-2xl font-bold mb-2">Chọn chế độ luyện tập</h3>
                <p className="text-slate-400 text-sm">Nâng cao hiệu quả học tập từ vựng với các thử thách đặc biệt.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'standard', title: 'Tiêu chuẩn', icon: Brain, desc: 'Hỗn hợp các loại bài tập ngẫu nhiên.', color: 'text-indigo-400' },
                  { id: 'flashcards', title: 'Flashcards', icon: BookOpen, desc: 'Học bằng cách lật thẻ ghi nhớ.', color: 'text-fuchsia-400' },
                  { id: 'typing', title: 'Gõ chữ', icon: FileText, desc: 'Nhập từ tiếng Trung từ ý nghĩa.', color: 'text-cyan-400' },
                  { id: 'tone-master', title: 'Luyện Thanh điệu', icon: Music, desc: 'Chuyên biệt cho việc học cách đọc pinyin.', color: 'text-violet-400' },
                  { id: 'ear-training', title: 'Luyện Nghe', icon: Headphones, desc: 'Nghe phát âm và chọn ý nghĩa chính xác.', color: 'text-sky-400' },
                  { id: 'srs', title: `Sống sót SRS (${dueVocabCount})`, icon: Sparkles, desc: 'Ôn tập các từ đã đến hạn ghi nhớ.', color: 'text-emerald-400', disabled: dueVocabCount === 0 },
                  { id: 'timed', title: 'Siêu tốc', icon: Timer, desc: 'Trả lời nhanh nhiều nhất trong 60 giây.', color: 'text-amber-400' },
                  { id: 'mistake-review', title: 'Khắc phục lỗi', icon: AlertCircle, desc: 'Tập trung vào các từ bạn thường sai.', color: 'text-red-400' }
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
            className="md:col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-[32px] p-8 md:p-12 relative overflow-hidden group shadow-2xl"
          >
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full group-hover:bg-indigo-500/15 transition-colors" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-fuchsia-500/10 blur-[120px] rounded-full group-hover:bg-fuchsia-500/15 transition-colors" />
            
            <div className="relative z-10 max-w-2xl">
              <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
                Learning Dashboard
              </span>
              

              <h2 className="text-4xl md:text-7xl font-black text-white leading-[1.1] mb-8">
                Học tiếng Đài<br />
                <span className="text-slate-500">Dễ dàng hơn.</span>
              </h2>
              
              <div className="flex flex-wrap gap-4 mt-12">
                <button 
                  onClick={() => setIsSelectingMode(true)}
                  disabled={vocabulary.length < 1}
                  className="px-8 md:px-10 py-5 md:py-6 bg-white text-slate-950 rounded-2xl md:rounded-3xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-white/10 shadow-2xl disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3"
                >
                  <Brain size={24} />
                  Học ngay
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="px-6 py-5 bg-slate-800 text-white rounded-2xl md:rounded-3xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center border border-slate-700 gap-2"
                  >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Thêm từ</span>
                  </button>
                  <button 
                    onClick={() => setIsBulkImporting(true)}
                    className="px-6 py-5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl md:rounded-3xl font-bold hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet size={20} />
                    <span className="hidden sm:inline">Nhập hàng loạt</span>
                  </button>
                  <button 
                    onClick={() => setIsAudioBankOpen(true)}
                    className="px-6 py-5 bg-linear-to-br from-indigo-500/10 to-fuchsia-500/10 border border-slate-800 text-fuchsia-400 rounded-2xl md:rounded-3xl font-bold hover:border-fuchsia-500/30 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                  >
                    <Headphones size={20} />
                    <span className="hidden sm:inline">Bài nghe</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Key Stats Cards */}
          <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Minimal Stat Card */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-[32px] p-8 flex flex-col justify-between hover:border-slate-700 transition-colors group/card relative">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tiến độ tổng quát</h3>
                <button 
                  onClick={() => setIsStatsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full hover:bg-indigo-500 hover:text-white transition-all shadow-indigo-500/20 shadow-lg"
                >
                  <TrendingUp size={12} />
                  Chi tiết
                </button>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-white">{masteryStats.total}</span>
                  <span className="text-slate-500 text-sm font-bold tracking-widest uppercase">Vốn từ</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/15 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{masteryStats.mastered} Mastered</span>
                  </div>
                  <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/15 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">{masteryStats.due} Due Review</span>
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
                className="group bg-linear-to-br from-indigo-600 to-fuchsia-600 rounded-[32px] p-6 text-white text-left relative overflow-hidden shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="absolute top-0 right-0 p-4 opacity-20 -rotate-12 group-hover:rotate-0 transition-transform">
                  <Sparkles size={32} />
                </div>
                <h4 className="text-[8px] font-bold text-white/70 uppercase tracking-widest mb-1 relative z-10">Smart Review</h4>
                <div className="text-2xl font-black relative z-10">{masteryStats.due}</div>
                <p className="text-[10px] text-white/80 relative z-10 font-bold uppercase tracking-tight">Từ đến hạn</p>
              </button>

              <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-indigo-500">
                  <Clock size={32} />
                </div>
                <div className="flex items-center justify-between mb-1 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1 h-1 rounded-full", (isActive && isQuizMode) ? "bg-emerald-500 animate-pulse" : "bg-slate-700")} />
                    <h4 className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Thời gian học</h4>
                  </div>
                  <button 
                    onClick={() => setIsGoalSettingOpen(true)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-indigo-400 transition-all"
                    title="Cài đặt mục tiêu"
                  >
                    <Filter size={12} />
                  </button>
                </div>
                <div className="text-2xl font-black text-white relative z-10">{formatTime(todayStudyTime)}</div>
                <div className="flex items-center justify-between mt-2 mb-1">
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">Mục tiêu {studyTimeGoal}p</span>
                  <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tight">{timeGoalProgress}%</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${timeGoalProgress}%` }}
                    className={cn(
                      "h-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-colors",
                      timeGoalProgress >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                    )}
                  />
                </div>
              </div>

              {/* Streak Stat Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-orange-500">
                  <Flame size={32} />
                </div>
                <div className="flex items-center gap-1.5 mb-1 relative z-10">
                  <h4 className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Chuỗi học tập</h4>
                </div>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className={cn(
                    "text-2xl font-black transition-colors",
                    streak.currentStreak > 0 ? "text-orange-500" : "text-white"
                  )}>
                    {streak.currentStreak}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Ngày liên tiếp</span>
                </div>
                <div className="mt-2 flex gap-1 relative z-10">
                  {[...Array(7)].map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 h-1 rounded-full transition-all duration-500",
                        streak.currentStreak > i ? "bg-orange-500" : "bg-slate-800"
                      )} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Filter Toolbar */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[24px] p-2 md:p-3 mb-8 flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 w-full lg:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Tìm kiếm từ vựng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800/50 rounded-[18px] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm font-medium"
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

          <div className="w-[1px] h-6 bg-slate-800 mx-1 shrink-0" />

            <button
              onClick={() => setShowDueOnly(!showDueOnly)}
              className={cn(
                "px-5 py-2.5 rounded-[18px] text-xs font-bold transition-all flex items-center gap-2 shrink-0 border",
                showDueOnly 
                  ? "bg-amber-500 border-amber-400 text-slate-950 shadow-xl shadow-amber-500/20" 
                  : "bg-slate-950/50 border-slate-800/50 text-slate-500 hover:text-white"
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
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Danh sách từ vựng</h3>
             <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9px] font-bold text-slate-500">{filteredVocab.length} từ</span>
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
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all flex items-center gap-2"
            >
              <Check className={cn("w-3 h-3", (filteredVocab.every(v => v.isSelected) && filteredVocab.length > 0) ? "text-indigo-400" : "")} />
              {(filteredVocab.every(v => v.isSelected) && filteredVocab.length > 0) ? "Bỏ chọn bài này" : "Chọn bài này"}
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className={cn(
          viewMode === 'card' 
            ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" 
            : "flex flex-col gap-2"
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
                    ? "bg-slate-900 border rounded-2xl p-4 md:p-5" 
                    : "bg-slate-900/40 hover:bg-slate-900 border border-slate-800/50 rounded-xl px-4 py-3 flex items-center justify-between",
                  item.isSelected 
                    ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/30" 
                    : item.color && viewMode === 'card'
                      ? {
                          'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/10': item.color === 'indigo',
                          'border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.15)] ring-1 ring-fuchsia-500/10': item.color === 'fuchsia',
                          'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10': item.color === 'emerald',
                          'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/10': item.color === 'amber',
                          'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/10': item.color === 'rose',
                          'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/10': item.color === 'cyan',
                        }[item.color]
                      : "border-slate-800/50 hover:border-indigo-500/30 hover:bg-slate-800/30"
                )}
              >
                {/* Selection Indicator & Checkbox */}
                <div className={cn(
                  "absolute z-20 transition-all",
                  viewMode === 'card' ? "top-4 right-4" : "left-4 top-1/2 -translate-y-1/2"
                )}>
                  <div className={cn(
                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                    item.isSelected 
                      ? "bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30" 
                      : "bg-slate-950 border-slate-700 group-hover:border-slate-500"
                  )}>
                    {item.isSelected && <Check size={12} strokeWidth={4} className="text-white" />}
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
                "px-2 py-0.5 border text-[9px] font-bold uppercase tracking-widest rounded whitespace-nowrap bg-slate-900/50",
                PREDEFINED_COLORS.find(c => c.value === item.color)?.text || 'text-slate-500 border-slate-800',
                PREDEFINED_COLORS.find(c => c.value === item.color)?.class.replace('bg-', 'border-').replace(' ', '') || 'border-slate-800'
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
                          removeVocab(item.id);
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
                        <h3 className="text-2xl md:text-3xl font-black font-display-zh text-slate-100 tracking-tight">{item.word}</h3>
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
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAll(false);
                            toggleSelect(item.id);
                            setPracticeMode('flashcards');
                            setIsQuizMode(true);
                          }}
                          className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-fuchsia-400 hover:bg-slate-700 transition-all"
                          title="Học với flashcard"
                        >
                          <BookOpen size={12} />
                        </button>
                      </div>
                      <p className="text-[10px] md:text-xs text-slate-500 font-mono tracking-wider tabular-nums uppercase mt-0.5">{item.pinyin}</p>
                    </div>

                    <p className="text-xs md:text-sm text-slate-400 font-medium mb-4 line-clamp-2 min-h-[32px]">
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
                          removeVocab(item.id);
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
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
                className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
              >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 font-zh">新增詞彙</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Add word to library</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-400 font-medium">{errorMessage}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Word (Hanzi)</label>
                    <input 
                      autoFocus
                      required
                      type="text"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm font-zh"
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
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Word Type (e.g. N, V, Adj, Phrase...)</label>
                  <input 
                    type="text"
                    value={newWordType}
                    onChange={(e) => setNewWordType(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm text-indigo-400 font-bold"
                    placeholder="VD: N, V, Adj, Adv..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Example Sentence (Optional)</label>
                  <textarea 
                    value={newExample}
                    onChange={(e) => setNewExample(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm min-h-[80px] font-zh"
                    placeholder="VD: 我 rất thích học Hán ngữ."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Ghi chú & Mẹo nhớ (Mnemonics)</label>
                  <textarea 
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm min-h-[80px] text-indigo-300"
                    placeholder="VD: Chữ 'Học' có bộ 'Tử' là đứa trẻ đang ngồi học dưới mái nhà..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Phân loại (Category)</label>
                    <input 
                      type="text"
                      list="category-suggestions"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm"
                      placeholder="e.g. Travel, Life"
                    />
                    <datalist id="category-suggestions">
                      {allCategories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 font-black">Bài học (Lesson/Chapter)</label>
                    <input 
                      type="text"
                      value={newLesson}
                      onChange={(e) => setNewLesson(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-emerald-900/30 rounded-xl focus:border-emerald-500 focus:outline-none transition-all text-sm text-emerald-400 font-bold"
                      placeholder="e.g. Bài 1, Lesson 2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Contemporary Chinese Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['當代1', '當代2', '當代3', '當代4', '當代5', '當代6'] as ProficiencyLevel[]).map((level) => (
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
                {/* Secondary metadata moved to the bottom */}
                <div className="pt-4 mt-4 border-t border-slate-800/50">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Thêm nhãn (Tags)</label>
                  <input 
                    type="text"
                    placeholder="e.g. food, travel, work (cách nhau bằng dấu phẩy)"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-xs text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Nhãn trạng thái (Mood Label)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color.label}
                        type="button"
                        onClick={() => setNewColor(color.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                          newColor === color.value ? "bg-slate-800 border-indigo-500/50 shadow-inner" : "bg-slate-950 border-slate-800/20 hover:border-slate-800"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full shadow-lg",
                          color.class
                        )} />
                        <span className={cn(
                          "text-[8px] font-bold uppercase tracking-tighter whitespace-nowrap",
                          newColor === color.value ? "text-slate-100" : "text-slate-600"
                        )}>{color.label}</span>
                      </button>
                    ))}
                  </div>
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
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-400 font-medium">{errorMessage}</p>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Dữ liệu từ vựng</label>
                  
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1 p-4 bg-slate-950 border border-slate-800 rounded-2xl border-dashed flex flex-col items-center justify-center gap-3 group hover:border-indigo-500/50 transition-all">
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

                    <div className="flex-1 flex flex-col justify-center p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                      <h4 className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Hướng dẫn Excel</h4>
                      <ul className="text-[9px] text-slate-500 space-y-1 ml-3 list-disc">
                        <li>Cột 1: Chữ Hán (Word / Hanzi / Từ)</li>
                        <li>Cột 2: Phiên âm (Pinyin / Đọc)</li>
                        <li>Cột 3: Ý nghĩa (Meaning / Nghĩa)</li>
                        <li className="text-emerald-400 font-bold">Cột 4: Từ Loại (Word Type / POS)</li>
                        <li className="text-indigo-400 font-bold">Cột 5: Cấp độ (1, 2, 3, 4, 5, 6) - BẮT BUỘC</li>
                        <li className="text-emerald-400 font-bold">Cột 6: Bài (Lesson / Unit) - KHUYÊN DÙNG</li>
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
                      className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-12 text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none font-zh text-sm"
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
    </div>
  );
}
