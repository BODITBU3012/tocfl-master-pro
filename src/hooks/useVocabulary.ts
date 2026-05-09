import { useState, useEffect } from 'react';
import { VocabularyItem, ProficiencyLevel } from '../types';
import { calculateNextReview } from '../lib/srs';

const STANDARD_VOCAB: Omit<VocabularyItem, 'id' | 'createdAt' | 'masteryScore' | 'repetitionCount' | 'srsInterval' | 'srsEase'>[] = [
  { word: '學習', pinyin: 'xué xí', meaning: 'Học tập; nghiên cứu', level: 'B1', category: 'standard', tags: [], exampleSentence: '他每天努力學習中文。' },
  { word: '挑戰', pinyin: 'tiǎo zhàn', meaning: 'Thách thức; thử thách', level: 'B1', category: 'standard', tags: [], exampleSentence: '人生充滿了各種挑戰。' },
  { word: '發展', pinyin: 'fā zhǎn', meaning: 'Phát triển', level: 'B1', category: 'standard', tags: [], exampleSentence: '這座城市的發展非常迅速。' },
  { word: '成功', pinyin: 'chéng gōng', meaning: 'Thành công', level: 'B1', category: 'standard', tags: [], exampleSentence: '只有努力才能獲得成功。' },
  { word: '簡單', pinyin: 'jiǎn dān', meaning: 'Đơn giản', level: 'A1', category: 'standard', tags: [], exampleSentence: '這個問題很簡單。' },
];

const INITIAL_EASE = 2.5;

export function useVocabulary() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tocfl_vocab');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure missing fields are populated for migration
        const migrated = parsed.map((v: any) => ({
          ...v,
          repetitionCount: v.repetitionCount ?? 0,
          srsInterval: v.srsInterval ?? 0,
          srsEase: v.srsEase ?? INITIAL_EASE
        }));
        setVocabulary(migrated);
      } catch (e) {
        console.error("Failed to parse vocab", e);
      }
    } else {
      // Pre-populate with standard vocab if empty
      const initial = STANDARD_VOCAB.map(v => ({
        ...v,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        masteryScore: 0,
        srsInterval: 0,
        srsEase: INITIAL_EASE,
        repetitionCount: 0,
      }));
      setVocabulary(initial as VocabularyItem[]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('tocfl_vocab', JSON.stringify(vocabulary));
      } catch (error) {
        console.error("Failed to save vocab to localStorage:", error);
      }
    }
  }, [vocabulary, isLoaded]);

  const addVocab = (item: Omit<VocabularyItem, 'id' | 'createdAt' | 'masteryScore' | 'srsInterval' | 'srsEase' | 'repetitionCount'>) => {
    const newItem: VocabularyItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      masteryScore: 0,
      srsInterval: 0,
      srsEase: INITIAL_EASE,
      repetitionCount: 0,
    };
    setVocabulary(prev => [...prev, newItem]);
  };

  const removeVocab = (id: string) => {
    setVocabulary(prev => prev.filter(v => v.id !== id));
  };

  const recordResult = (id: string, isCorrect: boolean) => {
    setVocabulary(prev => prev.map(v => {
      if (v.id !== id) return v;

      const srsData = calculateNextReview(
        isCorrect,
        v.srsInterval,
        v.srsEase,
        v.repetitionCount
      );

      const delta = isCorrect ? 15 : -10;
      const newMastery = Math.min(100, Math.max(0, v.masteryScore + delta));

      return {
        ...v,
        lastReviewedAt: Date.now(),
        nextReviewAt: srsData.nextReviewAt,
        srsInterval: srsData.interval,
        srsEase: srsData.ease,
        repetitionCount: srsData.repetitionCount,
        masteryScore: newMastery,
      };
    }));
  };

  return { vocabulary, isLoaded, addVocab, removeVocab, recordResult, updateUsageExplanation: (id: string, explanation: string) => {
    setVocabulary(prev => prev.map(v => v.id === id ? { ...v, usageExplanation: explanation } : v));
  } };
}
