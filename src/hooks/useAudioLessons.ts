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
    const id = crypto.randomUUID();
    const newLesson: AudioLesson = {
      id,
      title,
      description,
      fileName: file.name,
      fileSize: file.size,
      createdAt: Date.now(),
    };

    // Save to IndexedDB
    await saveAudioFile(id, file);

    // Save metadata to localStorage
    setLessons(prev => [newLesson, ...prev]);
    return newLesson;
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
