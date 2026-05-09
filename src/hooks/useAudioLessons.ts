import { useState, useEffect } from 'react';
import { AudioLesson } from '../types';
import { saveAudioFile, deleteAudioFile } from '../services/audioStorage';

const STORAGE_KEY = 'taiwanese_audio_lessons';

export function useAudioLessons() {
  const [lessons, setLessons] = useState<AudioLesson[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
  }, [lessons]);

  const addLesson = async (title: string, file: File, description?: string) => {
    // Robust ID generation with fallback
    const id = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newLesson: AudioLesson = {
      id,
      title,
      description,
      fileName: file.name || 'audio-file',
      fileSize: file.size,
      createdAt: Date.now(),
    };

    try {
      // Ensure we're saving a clean Blob version of the file for better IDB compatibility on mobile
      const blob = new Blob([file], { type: file.type });
      await saveAudioFile(id, blob);

      // Save metadata to localStorage
      setLessons(prev => [newLesson, ...prev]);
      return newLesson;
    } catch (error) {
      console.error("Failed to add lesson:", error);
      throw error;
    }
  };

  const removeLesson = async (id: string) => {
    await deleteAudioFile(id);
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  return {
    lessons,
    addLesson,
    removeLesson,
  };
}
