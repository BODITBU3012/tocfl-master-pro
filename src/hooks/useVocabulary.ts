import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { VocabularyItem, ProficiencyLevel } from '../types';
import { calculateNextReview } from '../lib/srs';

const STANDARD_VOCAB: Omit<VocabularyItem, 'id' | 'createdAt' | 'masteryScore' | 'repetitionCount' | 'srsInterval' | 'srsEase'>[] = [
  { word: '學習', pinyin: 'xué xí', meaning: 'Học tập; nghiên cứu', level: '當代1', category: 'Giáo dục', tags: ['Giáo dục', 'Hoạt động'], exampleSentence: '他每天努力學習中文。' },
  { word: '挑戰', pinyin: 'tiǎo zhàn', meaning: 'Thách thức; thử thách', level: '當代2', category: 'Cuộc sống', tags: ['Cuộc sống', 'Công việc'], exampleSentence: '人生充滿了各種挑戰。' },
  { word: '發展', pinyin: 'fā zhǎn', meaning: 'Phát triển', level: '當代3', category: 'Kinh tế', tags: ['Kinh tế', 'Xã hội'], exampleSentence: '這座城市的發展非常迅速。' },
  { word: '成功', pinyin: 'chéng gōng', meaning: 'Thành công', level: '當代2', category: 'Thành tựu', tags: ['Cuộc sống', 'Thành tựu'], exampleSentence: '只有努力才能獲得成功。' },
  { word: '簡單', pinyin: 'jiǎn dān', meaning: 'Đơn giản', level: '當代1', category: 'Tính từ', tags: ['Tính chất'], exampleSentence: '這個問題很簡單。' },
];

const INITIAL_EASE = 2.5;
const COLLECTION_NAME = 'vocabularies';

export function useVocabulary() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Remove orderBy from query to avoid documents with null createdAt being filtered out during local writes
    const q = query(collection(db, COLLECTION_NAME));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: VocabularyItem[] = [];
      snapshot.forEach((doc) => {
        // Use estimate to get a value for serverTimestamp during local writes
        const data = doc.data({ serverTimestamps: 'estimate' });
        items.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          lastReviewedAt: data.lastReviewedAt instanceof Timestamp ? data.lastReviewedAt.toMillis() : data.lastReviewedAt,
          nextReviewAt: data.nextReviewAt instanceof Timestamp ? data.nextReviewAt.toMillis() : data.nextReviewAt,
        } as VocabularyItem);
      });
      
      // Sort on client side
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      setVocabulary(items);
      setIsLoaded(true);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // Map vocabulary to include selection state for the UI
  const vocabWithSelection = vocabulary.map(v => ({
    ...v,
    isSelected: selectedIds.has(v.id)
  }));

  const addVocab = async (item: Omit<VocabularyItem, 'id' | 'createdAt' | 'masteryScore' | 'srsInterval' | 'srsEase' | 'repetitionCount'>) => {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...item,
        createdAt: serverTimestamp(),
        masteryScore: 0,
        srsInterval: 0,
        srsEase: INITIAL_EASE,
        repetitionCount: 0,
      });
    } catch (error) {
      console.error("Add failed:", error);
    }
  };

  const addBulkVocab = async (items: Omit<VocabularyItem, 'id' | 'createdAt' | 'masteryScore' | 'srsInterval' | 'srsEase' | 'repetitionCount'>[]) => {
    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        const docRef = doc(collection(db, COLLECTION_NAME));
        batch.set(docRef, {
          ...item,
          createdAt: serverTimestamp(),
          masteryScore: 0,
          srsInterval: 0,
          srsEase: INITIAL_EASE,
          repetitionCount: 0,
        });
      });
      await batch.commit();
    } catch (error) {
      console.error("Bulk add failed:", error);
    }
  };

  const removeVocab = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error("Remove failed:", error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(vocabulary.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const clearSelection = () => selectAll(false);

  const recordResult = async (id: string, isCorrect: boolean) => {
    const item = vocabulary.find(v => v.id === id);
    if (!item) return;

    const srsData = calculateNextReview(
      isCorrect,
      item.srsInterval,
      item.srsEase,
      item.repetitionCount
    );

    const delta = isCorrect ? 15 : -10;
    const newMastery = Math.min(100, Math.max(0, item.masteryScore + delta));

    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), {
        lastReviewedAt: serverTimestamp(),
        nextReviewAt: Timestamp.fromMillis(srsData.nextReviewAt),
        srsInterval: srsData.interval,
        srsEase: srsData.ease,
        repetitionCount: srsData.repetitionCount,
        masteryScore: newMastery,
      });
    } catch (error) {
      console.error("Record result failed:", error);
    }
  };

  const updateVocab = async (id: string, updates: Partial<VocabularyItem>) => {
    try {
      const { id: _, isSelected: __, ...safeUpdates } = updates as any;
      await updateDoc(doc(db, COLLECTION_NAME, id), safeUpdates);
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  return { vocabulary: vocabWithSelection, isLoaded, addVocab, addBulkVocab, removeVocab, toggleSelect, selectAll, clearSelection, updateVocab, recordResult };
}
