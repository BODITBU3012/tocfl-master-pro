import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  serverTimestamp,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { ReadingPassage } from '../types';

const COLLECTION_NAME = 'reading_passages';

export function useReadingPassages() {
  const [passages, setPassages] = useState<ReadingPassage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const items: ReadingPassage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        
        const toMillis = (ts: any) => {
          if (!ts) return Date.now();
          if (ts instanceof Timestamp) return ts.toMillis();
          if (typeof ts.toMillis === 'function') return ts.toMillis();
          if (typeof ts.seconds === 'number') return ts.seconds * 1000;
          if (typeof ts === 'number') return ts;
          return Date.now();
        };

        items.push({
          ...data,
          id: doc.id,
          createdAt: toMillis(data.createdAt),
        } as ReadingPassage);
      });
      
      setPassages(items);
      setIsLoaded(true);
    }, (error) => {
      console.error("Firestore error (passages):", error);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  const addPassage = async (passage: Omit<ReadingPassage, 'id' | 'createdAt'>) => {
    try {
      const sanitizedPassage = Object.entries(passage).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...sanitizedPassage,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Add passage failed:", error);
      throw error;
    }
  };

  const removePassage = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Remove passage failed:", error);
    }
  };

  const updatePassage = async (id: string, updates: Partial<ReadingPassage>) => {
    try {
      const { id: _, ...safeUpdates } = updates as any;
      const sanitizedUpdates = Object.entries(safeUpdates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      await updateDoc(doc(db, COLLECTION_NAME, id), sanitizedUpdates);
    } catch (error) {
      console.error("Update passage failed:", error);
    }
  };

  return { passages, isLoaded, addPassage, removePassage, updatePassage };
}
