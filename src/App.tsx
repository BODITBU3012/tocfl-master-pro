import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, AlertCircle, Volume2, Plus, Search, BookOpen, Brain, Trash2, ChevronRight, X, Sparkles, Filter, LayoutGrid, List, TrendingUp, Calendar, Loader2, FileText, Upload, Check, Clock, Music, Headphones, Flame, Bell, FileSpreadsheet, Book, ArrowUp, ChevronLeft, Moon, Sun, MoreVertical, ArrowUpRight } from 'lucide-react';
import { read, utils } from 'xlsx';
import { useVocabulary } from './hooks/useVocabulary';
import { useStreak } from './hooks/useStreak';
import { ProficiencyLevel, VocabularyItem, PracticeMode, QuestionType, ALL_QUESTION_TYPES } from './types';
import QuizEngine from './components/Quiz/QuizEngine';
import AudioManager from './components/Audio/AudioManager';
import SrsStats from './components/Stats/SrsStats';
import { cn, getLevelColor } from './lib/utils';
import { speakChinese } from './lib/tts';
import { ReadingPassageManager } from './components/Reading/ReadingPassageManager';
import { ReadingPractice } from './components/Reading/ReadingPractice';
import { useReadingPassages } from './hooks/useReadingPassages';
import { ReadingPassage } from './types';

export default function App() {
  const { vocabulary, addVocab, addBulkVocab, removeVocab, toggleSelect, selectAll, clearSelection, updateVocab, recordResult } = useVocabulary();
  const { streak, updateActivity } = useStreak();
  
  const selectedVocabCount = vocabulary.filter(v => v.isSelected).length;

  const dueVocabCount = vocabulary.filter(v => !v.nextReviewAt || v.nextReviewAt <= Date.now()).length;

  const isDarkMode = true;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel | 'All'>('All');
  const [selectedLesson, setSelectedLesson] = useState<string | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedWordType, setSelectedWordType] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string | 'All'>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { passages, isLoaded: isPassagesLoaded } = useReadingPassages();
  
  const filteredPassages = passages.filter(p => selectedLevel === 'All' || p.level === selectedLevel);

  const [activeTab, setActiveTab] = useState<'vocabulary' | 'passages'>('vocabulary');
  
  // Switch back to vocabulary if a level has no passages and we are on passages tab
  useEffect(() => {
    if (activeTab === 'passages' && filteredPassages.length === 0 && selectedLevel !== 'All') {
      setActiveTab('vocabulary');
    }
  }, [selectedLevel, filteredPassages.length, activeTab]);

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
  
  // Automatically reset lesson filter when level changes
  useEffect(() => {
    setSelectedLesson('All');
  }, [selectedLevel]);

  const [sortBy, setSortBy] = useState<'newest' | 'mastery' | 'alphabetical'>('newest');
  const [showDueOnly, setShowDueOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [vocabToDelete, setVocabToDelete] = useState<VocabularyItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedVocab, setSelectedVocab] = useState<VocabularyItem | null>(null);
  const [isReadingManagerOpen, setIsReadingManagerOpen] = useState(false);
  const [currentReadingPassage, setCurrentReadingPassage] = useState<ReadingPassage | null>(null);
  
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
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">台</div>
            <h1 className="font-bold text-slate-100 hidden sm:block">Đài Loan Study</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSelectingMode(true)}
              disabled={vocabulary.length < 3}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs rounded-lg font-bold hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
              <Brain size={16} />
              <span>Luyện tập</span>
            </button>
            <div className="w-px h-6 bg-slate-800 mx-2" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsAdding(true)}
                className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Thêm mới"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Reading Passage Modals */}
      {isReadingManagerOpen && (
        <ReadingPassageManager 
          onPractice={(passage) => {
            setIsReadingManagerOpen(false);
            setCurrentReadingPassage(passage);
          }}
          onClose={() => setIsReadingManagerOpen(false)}
        />
      )}

      {currentReadingPassage && (
        <ReadingPractice 
          passage={currentReadingPassage}
          onClose={() => setCurrentReadingPassage(null)}
        />
      )}

      {/* Main Content Padding for Fixed Nav */}
      <div className="pt-24 md:pt-32" />

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
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
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-100">Chọn chế độ luyện tập</h3>
                <button onClick={() => setIsSelectingMode(false)} className="text-slate-500 hover:text-slate-300">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  { id: 'standard', title: 'Tiêu chuẩn', icon: Brain, desc: 'Bài tập tổng hợp.' },
                  { id: 'flashcards', title: 'Thẻ ghi nhớ', icon: BookOpen, desc: 'Lật thẻ ghi nhớ.' },
                  { id: 'typing', title: 'Luyện gõ', icon: FileText, desc: 'Nhập chữ Hán.' },
                  { id: 'tone-master', title: 'Thanh điệu', icon: Music, desc: 'Chuyên về dấu.' },
                  { id: 'ear-training', title: 'Luyện nghe', icon: Headphones, desc: 'Nghe nhận diện.' },
                  { id: 'srs', title: `Đến hạn (${dueVocabCount})`, icon: Clock, desc: 'Ôn tập SRS.', disabled: dueVocabCount === 0 },
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
                      "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                      (mode as any).disabled 
                         ? "opacity-30 cursor-not-allowed border-slate-800" 
                         : "bg-slate-950 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                      <mode.icon size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{mode.title}</h4>
                      <p className="text-[10px] text-slate-500">{mode.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Question types toggles if needed */}
              {['standard', 'srs'].includes(practiceMode || '') && (
                 <div className="mb-6 p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tùy chọn câu hỏi</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_QUESTION_TYPES.map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            if (preferredTypes.includes(type)) {
                              if (preferredTypes.length > 1) setPreferredTypes(prev => prev.filter(t => t !== type));
                            } else {
                              setPreferredTypes(prev => [...prev, type]);
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                            preferredTypes.includes(type) 
                              ? "bg-indigo-600 border-indigo-500 text-white" 
                              : "bg-slate-900 border-slate-800 text-slate-500"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                 </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 md:p-12 bg-linear-to-br from-indigo-600 to-violet-700 rounded-3xl text-white relative overflow-hidden"
          >
            <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">Luyện tập tiếng Trung <br/> mỗi ngày</h1>
              <p className="text-indigo-100 mb-8 max-w-lg text-sm md:text-base">Học từ vựng hiệu quả với phương pháp lặp lại ngắt quãng (SRS) và các bài tập đa dạng.</p>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setIsSelectingMode(true)}
                  disabled={vocabulary.length < 1}
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Brain size={20} />
                  Bắt đầu luyện tập
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="p-3 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl transition-all border border-white/10"
                    title="Thêm từ mới"
                  >
                    <Plus size={20} />
                  </button>
                  <button 
                    onClick={() => setIsBulkImporting(true)}
                    className="p-3 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl transition-all border border-white/10"
                    title="Nhập hàng loạt"
                  >
                    <Upload size={20} />
                  </button>
                  <button 
                    onClick={() => setIsAudioBankOpen(true)}
                    className="p-3 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl transition-all border border-white/10"
                    title="Quản lý file nghe"
                  >
                    <Volume2 size={20} />
                  </button>
                  <button 
                    onClick={() => setIsReadingManagerOpen(true)}
                    className="p-3 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-xl transition-all border border-white/10"
                    title="Quản lý bài khóa"
                  >
                    <BookOpen size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          </motion.div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tổng cộng</p>
            <p className="text-2xl font-bold text-slate-100">{masteryStats.total}</p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Đã thuộc</p>
            <p className="text-2xl font-bold text-slate-100">{masteryStats.mastered}</p>
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Cần ôn tập</p>
              <p className="text-2xl font-bold text-slate-100">{masteryStats.due}</p>
            </div>
            {masteryStats.due > 0 && (
              <button 
                onClick={() => {
                  setShowDueOnly(true);
                  setIsQuizMode(true);
                }}
                className="absolute inset-0 bg-amber-500/0 hover:bg-amber-500/10 transition-all flex items-center justify-end pr-4 text-amber-500"
              >
                <ChevronRight size={20} className="translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
              </button>
            )}
          </div>
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Chuỗi ngày</p>
              <Flame size={14} className={streak.currentStreak > 0 ? "text-orange-500" : "text-slate-700"} />
            </div>
            <p className="text-2xl font-bold text-slate-100">{streak.currentStreak} ngày</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text"
                placeholder="Tìm kiếm chữ Hán, Pinyin, ý nghĩa hoặc thẻ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-1">
              {['All', '當代1', '當代2', '當代3', '當代4', '當代5', '當代6'].map((level) => {
                const passageCount = passages.filter(p => level === 'All' || p.level === level).length;
                return (
                  <button
                    key={level}
                    onClick={() => {
                      setSelectedLevel(level as any);
                      setSelectedLesson('All');
                    }}
                    className={cn(
                      "group relative px-4 py-2 rounded-lg text-xs font-bold transition-all border whitespace-nowrap",
                      selectedLevel === level 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <span>{level}</span>
                    {passageCount > 0 && selectedLevel !== level && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[8px] flex items-center justify-center rounded-full shadow-lg border border-slate-900 group-hover:scale-110 transition-transform">
                        {passageCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowDueOnly(!showDueOnly)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border",
                  showDueOnly 
                    ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20" 
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                )}
              >
                <Clock size={16} />
                Đến hạn ôn
              </button>
              
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-bold rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="newest">Mới nhất</option>
                <option value="mastery">Thành thạo</option>
                <option value="alphabetical">A-Z</option>
              </select>

              <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  onClick={() => setViewMode('card')}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    viewMode === 'card' ? "bg-slate-800 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={cn(
                    "p-1.5 rounded transition-all",
                    viewMode === 'compact' ? "bg-slate-800 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
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

      {/* Content Toolbar / Stats Summary */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6 group">
          <div className="w-1.5 h-12 bg-brand-500 rounded-full group-hover:h-14 transition-all" />
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase font-zh">資料庫 <span className="text-slate-600">/ Library</span></h2>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                <button 
                  onClick={() => setActiveTab('vocabulary')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === 'vocabulary' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Từ vựng ({filteredVocab.length})
                </button>
                {filteredPassages.length > 0 && (
                  <button 
                    onClick={() => setActiveTab('passages')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      activeTab === 'passages' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Bài khóa ({filteredPassages.length})
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{activeTab === 'vocabulary' ? `${filteredVocab.length} UNITS DETECTED` : `${filteredPassages.length} PASSAGES DETECTED`}</span>
               {activeTab === 'vocabulary' && (
                 <>
                   <div className="w-1 h-1 bg-slate-800 rounded-full" />
                   <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{selectedVocabCount} SELECTED</span>
                 </>
               )}
            </div>
          </div>
        </div>

        {activeTab === 'vocabulary' ? (
          <div className="flex items-center gap-2 glass-morphism rounded-3xl p-1.5 border border-white/10">
            <button 
              onClick={() => {
                  const allVisibleSelected = filteredVocab.every(v => v.isSelected);
                  if (allVisibleSelected) {
                    filteredVocab.forEach(v => { if (v.isSelected) toggleSelect(v.id); });
                  } else {
                    filteredVocab.forEach(v => { if (!v.isSelected) toggleSelect(v.id); });
                  }
              }}
              className="px-4 py-2 hover:bg-white/5 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest"
            >
                {filteredVocab.every(v => v.isSelected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <div className="flex items-center gap-1 bg-slate-950/80 rounded-2xl p-1">
                <button 
                  onClick={() => setViewMode('card')}
                  className={cn("p-2 rounded-xl transition-all", viewMode === 'card' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white")}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('compact')}
                  className={cn("p-2 rounded-xl transition-all", viewMode === 'compact' ? "bg-white text-slate-950 shadow-xl" : "text-slate-500 hover:text-white")}
                >
                  <List size={16} />
                </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsReadingManagerOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest"
          >
            <Plus size={16} /> Quản lý bài khóa
          </button>
        )}
      </div>

      {/* List Content */}
      <div className={cn(
        activeTab === 'vocabulary' && (viewMode === 'card' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" 
          : "flex flex-col gap-4"),
        activeTab === 'passages' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      )}>
        <AnimatePresence mode="popLayout">
          {activeTab === 'vocabulary' ? 
            filteredVocab.map((item, index) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(index * 0.02, 0.4) }}
                onClick={() => toggleSelect(item.id)}
                className={cn(
                  "group relative transition-all cursor-pointer overflow-hidden border",
                  viewMode === 'card' 
                    ? "bg-slate-900 border-white/5 rounded-[40px] p-8 shadow-2xl flex flex-col h-full" 
                    : "bg-slate-900/40 border-white/5 rounded-3xl p-6 flex items-center justify-between backdrop-blur-sm",
                  item.isSelected 
                    ? "border-brand-500/50 bg-brand-500/5 shadow-[0_0_40px_rgba(139,92,246,0.15)]" 
                    : "hover:border-brand-500/20 hover:bg-slate-800/40"
                )}
              >
              {/* Card Aura Background */}
              {viewMode === 'card' && (
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 blur-[64px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-20 transition-opacity group-hover:opacity-40",
                  item.color === 'indigo' ? "bg-indigo-500" :
                  item.color === 'fuchsia' ? "bg-fuchsia-500" :
                  item.color === 'emerald' ? "bg-emerald-500" :
                  item.color === 'amber' ? "bg-amber-500" :
                  item.color === 'rose' ? "bg-rose-500" :
                  item.color === 'cyan' ? "bg-cyan-500" : "bg-brand-500"
                )} />
              )}

              {viewMode === 'card' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                      getLevelColor(item.level)
                    )}>
                      {item.level}
                    </span>
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                      item.isSelected ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/20" : "bg-slate-950 border-slate-800"
                    )}>
                      {item.isSelected && <Check size={12} strokeWidth={4} className="text-white" />}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl font-bold text-slate-100 font-zh">{item.word}</h3>
                      {item.wordType && (
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-medium">
                          {item.wordType}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono text-indigo-400 mb-3">{item.pinyin}</p>
                    <p className="text-slate-300 font-medium mb-4 line-clamp-2">{item.meaning}</p>
                    
                    <AnimatePresence>
                      {expandedVocabId === item.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-4 pt-4 border-t border-slate-800">
                            {item.exampleSentence && (
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ví dụ</p>
                                <p className="text-xs text-slate-300 leading-relaxed font-zh">{item.exampleSentence}</p>
                                {item.exampleTranslation && <p className="text-[10px] text-slate-500 italic">{item.exampleTranslation}</p>}
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ghi chú</p>
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <textarea 
                                  value={item.notes || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateVocab(item.id, { notes: e.target.value });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="Thêm ghi chú cá nhân..."
                                  className="w-full bg-transparent text-xs text-slate-300 border-none outline-none resize-none placeholder:text-slate-700 leading-relaxed"
                                  rows={2}
                                />
                              </div>
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
                      className="w-full mt-2 text-center text-[10px] font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest py-1 border-t border-transparent hover:border-slate-800 transition-all"
                    >
                      {expandedVocabId === item.id ? "Ẩn bớt" : "Xem chi tiết"}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1 w-12 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            item.masteryScore >= 80 ? "bg-emerald-500" : 
                            item.masteryScore >= 40 ? "bg-amber-500" : "bg-indigo-500"
                          )}
                          style={{ width: `${item.masteryScore}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 ml-1">{item.masteryScore}%</span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); speakChinese(item.word); }}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-all"
                      >
                        <Volume2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setVocabToDelete(item); }}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                      "w-1 h-8 rounded-full shrink-0",
                      getLevelColor(item.level, 'solid').replace('text-', 'bg-')
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-100 truncate font-zh">{item.word}</h3>
                        <span className="text-[10px] text-slate-500 font-mono tracking-tight uppercase">{item.pinyin}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{item.meaning}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0 pr-2">
                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
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
                      <span className="text-[10px] font-mono text-slate-500">{item.masteryScore}%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); speakChinese(item.word); }}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-all"
                      >
                        <Volume2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setVocabToDelete(item); }}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )) : 
            filteredPassages.map((passage, index) => (
              <motion.div
                key={passage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: Math.min(index * 0.05, 0.4) }}
                className="p-8 bg-slate-900 border border-white/5 rounded-[40px] shadow-2xl flex flex-col group relative overflow-hidden"
              >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                
                <div className="flex items-center justify-between mb-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border",
                    getLevelColor(passage.level)
                  )}>
                    {passage.level}
                  </span>
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <BookOpen size={16} />
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-100 mb-2 font-zh line-clamp-2">{passage.title}</h3>
                  <p className="text-xs text-slate-500 mb-6">{passage.lines.length} câu thoại trong bài này</p>
                  
                  <div className="space-y-2 opacity-40 group-hover:opacity-60 transition-opacity">
                    {passage.lines.slice(0, 2).map((line, i) => (
                      <p key={i} className="text-sm font-zh text-slate-400 truncate">
                        {line.text}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800">
                  <button 
                    onClick={() => setCurrentReadingPassage(passage)}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white text-sm rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Bắt đầu học
                    <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          }
        </AnimatePresence>
      </div>
    </main>

      {/* Goal Setting Modal */}
      <AnimatePresence>
        {isGoalSettingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-2xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGoalSettingOpen(false)}
              className="absolute inset-0 bg-slate-950/80"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/5 rounded-[48px] p-10 md:p-12 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[64px] rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="text-left">
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase font-zh">學期目標</h3>
                    <p className="text-[10px] text-brand-400 font-black uppercase tracking-[0.3em] mt-1">Target Calibration</p>
                  </div>
                  <button onClick={() => setIsGoalSettingOpen(false)} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-8 text-left">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 text-center">
                      Daily Intensity Duration
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {[15, 30, 45, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => {
                            setStudyTimeGoal(mins);
                            localStorage.setItem('study_time_goal', mins.toString());
                          }}
                          className={cn(
                            "py-4 rounded-[20px] font-black transition-all border",
                            studyTimeGoal === mins
                              ? "bg-brand-600 border-brand-400 text-white shadow-[0_12px_24px_-8px_rgba(139,92,246,0.6)]"
                              : "bg-slate-950 border-white/5 text-slate-500 hover:border-brand-500/30"
                          )}
                        >
                          {mins} MINS
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-3xl p-5 border border-white/5 flex gap-4">
                    <Sparkles className="text-amber-500 shrink-0" size={16} />
                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic">
                      "Học 15-30 phút mỗi ngày đều đặn hiệu quả hơn rất nhiều so với học 3 tiếng chỉ một lần duy nhất trong tuần."
                    </p>
                  </div>

                  <div className="bg-slate-950 rounded-3xl p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Bell size={16} className={isReminderEnabled ? "text-brand-400" : "text-slate-600"} />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Cấu hình thông báo</span>
                      </div>
                      <button 
                        onClick={async () => {
                          const enabled = !isReminderEnabled;
                          if (enabled) {
                            const granted = await requestNotificationPermission();
                            if (!granted) {
                              alert("Vui lòng cho phép thông báo để sử dụng tính năng này.");
                              return;
                            }
                          }
                          setIsReminderEnabled(enabled);
                          localStorage.setItem('study_reminder_enabled', enabled.toString());
                        }}
                        className={cn(
                          "w-10 h-5 rounded-full transition-all relative p-1",
                          isReminderEnabled ? "bg-brand-600" : "bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "w-3 h-3 rounded-full bg-white transition-all",
                          isReminderEnabled ? "translate-x-5" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    {isReminderEnabled && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-4 border-t border-white/5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Thời điểm đồng bộ</span>
                          <input 
                            type="time" 
                            value={reminderTime}
                            onChange={(e) => {
                              setReminderTime(e.target.value);
                              localStorage.setItem('study_reminder_time', e.target.value);
                            }}
                            className="bg-slate-900 border border-white/5 rounded-xl px-3 py-1 text-xs text-brand-400 font-bold focus:outline-none"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <button 
                    onClick={() => setIsGoalSettingOpen(false)}
                    className="w-full py-5 bg-white text-slate-950 rounded-[24px] font-black text-base hover:scale-[1.02] active:scale-95 transition-all shadow-2xl"
                  >
                    Xác nhận cấu hình
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/80"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-100">Thêm từ vựng mới</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-slate-300">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs">
                    <AlertCircle size={16} />
                    {errorMessage}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Chữ Hán</label>
                    <input 
                      autoFocus
                      required
                      type="text"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-xl font-zh text-slate-100"
                      placeholder="學習"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Pinyin</label>
                    <input 
                      type="text"
                      value={newPinyin}
                      onChange={(e) => setNewPinyin(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-lg font-mono text-slate-100"
                      placeholder="xué xí"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Ý nghĩa</label>
                  <input 
                    required
                    type="text"
                    value={newMeaning}
                    onChange={(e) => setNewMeaning(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-slate-100"
                    placeholder="Học tập"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Loại từ</label>
                    <input 
                      type="text"
                      value={newWordType}
                      onChange={(e) => setNewWordType(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-xs text-slate-100"
                      placeholder="N, V, Adj..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Cấp độ</label>
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value as ProficiencyLevel)}
                      className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-xs text-slate-100"
                    >
                      {['當代1', '當代2', '當代3', '當代4', '當代5', '當代6'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Câu ví dụ</label>
                  <textarea 
                    value={newExample}
                    onChange={(e) => setNewExample(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none transition-all text-sm min-h-[80px] font-zh text-slate-100"
                    placeholder="Nhập câu ví dụ sử dụng từ này..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 border border-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Lưu từ vựng
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkImporting(false)}
              className="absolute inset-0 bg-slate-950/80"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
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
                <button onClick={() => setIsBulkImporting(false)} className="text-slate-500 hover:text-slate-300">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-xs text-left">
                    <AlertCircle size={16} />
                    {errorMessage}
                  </div>
                )}
                
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">Cập nhật qua Excel</p>
                      <p className="text-[10px] text-slate-500">Hỗ trợ .xlsx, .xls, .csv</p>
                    </div>
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
                    className="w-full md:w-auto px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-all uppercase"
                  >
                    Chọn file
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Dữ liệu văn bản</label>
                  <textarea 
                    placeholder="Copy paste list của bạn tại đây...&#10;Định dạng: Word | Pinyin | Meaning"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-zh text-slate-100 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                  />
                  <p className="text-[10px] text-slate-500 italic text-center">Mỗi từ vựng nằm trên một dòng riêng biệt.</p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={async () => {
                      if (!bulkText.trim()) return;
                      setIsParsingBulk(true);
                      setErrorMessage(null);
                      try {
                        const lines = bulkText.split('\n').filter(line => line.trim());
                        const items = lines.map(line => {
                          let parts = line.split(/[-–—:|]/).map(p => p.trim());
                          if (parts.length === 1) {
                            const match = line.match(/^([\u4e00-\u9fa5]+)\s+(.+)$/);
                            if (match) {
                              const [_, word, rest] = match;
                              const restParts = rest.split(/\s+/, 1);
                              parts = [word, restParts[0], rest.substring(restParts[0].length).trim()];
                            }
                          }
                          return {
                            word: parts[0] || '',
                            pinyin: parts[1] || '',
                            meaning: parts[2] || parts[1] || '',
                            level: '當代1' as ProficiencyLevel,
                            category: 'custom',
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
                        }
                      } catch (err: any) {
                        setErrorMessage(`Lỗi: ${err.message || "Đã có lỗi xảy ra"}`);
                      } finally {
                        setIsParsingBulk(false);
                      }
                    }}
                    disabled={!bulkText.trim() || isParsingBulk}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg",
                      bulkText.trim() && !isParsingBulk
                        ? "bg-indigo-600 text-white hover:bg-indigo-500"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed"
                    )}
                  >
                    {isParsingBulk ? "Đang xử lý..." : "Bắt đầu nhập"}
                  </button>
                  <button 
                    onClick={() => {
                      setIsBulkImporting(false);
                      setBulkText('');
                    }}
                    className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all text-sm"
                  >
                    Hủy
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
