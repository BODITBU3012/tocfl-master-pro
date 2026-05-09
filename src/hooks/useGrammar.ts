import { useState, useEffect } from 'react';
import { GrammarItem, ProficiencyLevel } from '../types';
import { calculateNextReview } from '../lib/srs';

const INITIAL_EASE = 2.5;

const INITIAL_GRAMMAR: GrammarItem[] = [
  {
    id: 'g4',
    title: 'So sánh hơn với 比 (Bǐ)',
    pattern: 'A + 比 + B + Adjective',
    description: 'Dùng để so sánh hai đối tượng.',
    level: 'A1',
    exampleSentences: ['今天比昨天熱。', '他比我高。'],
    masteryScore: 0,
    tags: ['Comparison', 'Basics'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  },
  {
    id: 'g5',
    title: 'Biểu thị sự hoàn thành với 了 (Le)',
    pattern: 'Verb + 了',
    description: 'Dùng để chỉ hành động đã xảy ra hoặc thay đổi trạng thái.',
    level: 'A1',
    exampleSentences: ['我吃飯了。', '他來了。'],
    masteryScore: 0,
    tags: ['Aspect', 'Past'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  },
  {
    id: 'g2',
    title: 'Cấu trúc 是... đích (Shì...de)',
    pattern: 'Subject + 是 + [Time/Place/Manner] + Verb + 的',
    description: 'Dùng để nhấn mạnh thời gian, địa điểm hoặc cách thức của một hành động đã xảy ra trong quá khứ.',
    level: 'A2',
    exampleSentences: ['我是昨天來的。', '這本書是在台北買的。'],
    masteryScore: 0,
    tags: ['Emphasis', 'Context'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  },
  {
    id: 'g3',
    title: 'Bổ ngữ kết quả (Resultative Complement)',
    pattern: 'Verb + Resultative Adjective/Verb',
    description: 'Diễn tả kết quả của hành động (như 完, 見, 懂, 到, 好).',
    level: 'A2',
    exampleSentences: ['我看懂了這封信。', '飯做好了。'],
    masteryScore: 0,
    tags: ['Complement', 'Results'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  },
  {
    id: 'g1',
    title: 'Câu chữ 把 (Bǎ)',
    pattern: 'S + 把 + O + V + result/direction',
    description: 'Dùng để nhấn mạnh sự tác động của chủ ngữ lên tân ngữ làm thay đổi trạng thái hoặc vị trí của nó.',
    level: 'B1',
    exampleSentences: ['我把作業做完了。', '請把書放回桌子上。'],
    masteryScore: 0,
    tags: ['Sentence Structure', 'Action'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  },
  {
    id: 'g6',
    title: 'Câu chữ 被 (Bèi)',
    pattern: 'Object + 被 + (Agent) + Verb + result',
    description: 'Dùng để biểu thị thể bị động.',
    level: 'B1',
    exampleSentences: ['我的手機被偷了。', '他被老師批評了。'],
    masteryScore: 0,
    tags: ['Passive', 'Sentence Structure'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  },
  {
    id: 'g7',
    title: 'Cấu trúc mặc dù... nhưng... (Suīrán...dànshì)',
    pattern: '虽然 + Clause 1, 但是 + Clause 2',
    description: 'Dùng để diễn đạt ý nhượng bộ: "Mặc dù... nhưng...".',
    level: 'B1',
    exampleSentences: ['虽然天下雨，但是他还是出去了。'],
    masteryScore: 0,
    tags: ['Conjunctions', 'Contrast'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  },
  {
    id: 'g8',
    title: 'Cấu trúc không những... mà còn... (Bùjǐn...érqiě)',
    pattern: '不仅 + Clause 1, 而且 + Clause 2',
    description: 'Dùng để nhấn mạnh sự tăng tiến: "Không những... mà còn...".',
    level: 'B2',
    exampleSentences: ['他不仅会说中文，而且说得很流利。'],
    masteryScore: 0,
    tags: ['Conjunctions', 'Progression'],
    srsInterval: 0,
    srsEase: INITIAL_EASE,
    repetitionCount: 0,
  }
];

export function useGrammar() {
  const [grammar, setGrammar] = useState<GrammarItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tocfl_grammar');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge initial grammar to ensure keys exist if I added new ones
        const combined = INITIAL_GRAMMAR.map(initial => {
          const found = parsed.find((p: any) => p.id === initial.id);
          return found ? { 
            ...initial, 
            ...found,
            srsInterval: found.srsInterval ?? 0,
            srsEase: found.srsEase ?? INITIAL_EASE,
            repetitionCount: found.repetitionCount ?? 0
          } : initial;
        });
        setGrammar(combined);
      } catch (e) {
        setGrammar(INITIAL_GRAMMAR);
      }
    } else {
      setGrammar(INITIAL_GRAMMAR);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('tocfl_grammar', JSON.stringify(grammar));
      } catch (error) {
        console.error("Failed to save grammar to localStorage:", error);
      }
    }
  }, [grammar, isLoaded]);

  const updateGrammarMastery = (id: string, isCorrect: boolean) => {
    setGrammar(prev => prev.map(g => {
      if (g.id !== id) return g;
      
      const srsData = calculateNextReview(
        isCorrect,
        g.srsInterval,
        g.srsEase,
        g.repetitionCount
      );

      const delta = isCorrect ? 15 : -8;
      const newMastery = Math.min(100, Math.max(0, g.masteryScore + delta));

      return { 
        ...g, 
        masteryScore: newMastery,
        lastReviewedAt: Date.now(),
        nextReviewAt: srsData.nextReviewAt,
        srsInterval: srsData.interval,
        srsEase: srsData.ease,
        repetitionCount: srsData.repetitionCount
      };
    }));
  };

  const getLevelProgress = (level: ProficiencyLevel) => {
    const levelItems = grammar.filter(g => g.level === level);
    if (levelItems.length === 0) return 0;
    const totalMastery = levelItems.reduce((acc, curr) => acc + curr.masteryScore, 0);
    return Math.round(totalMastery / levelItems.length);
  };

  const isLevelUnlocked = (level: ProficiencyLevel) => {
    const levels: ProficiencyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const idx = levels.indexOf(level);
    if (idx === 0) return true;
    
    const prevLevel = levels[idx - 1];
    return getLevelProgress(prevLevel) >= 80;
  };

  const currentLevel = (() => {
    const levels: ProficiencyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (isLevelUnlocked(levels[i])) return levels[i];
    }
    return 'A1' as ProficiencyLevel;
  })();

  const getRecommendations = () => {
    return [...grammar]
      .filter(g => isLevelUnlocked(g.level) && g.masteryScore < 80)
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .slice(0, 3);
  };

  return { 
    grammar, 
    updateGrammarMastery, 
    getLevelProgress, 
    isLevelUnlocked,
    currentLevel,
    getRecommendations
  };
}
