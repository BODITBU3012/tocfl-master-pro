import { useState, useEffect } from 'react';

interface StreakData {
  currentStreak: number;
  lastActiveDate: string; // ISO string (YYYY-MM-DD)
  longestStreak: number;
  totalDaysActive: number;
}

const STORAGE_KEY = 'tocfl_study_streak';

export function useStreak() {
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    lastActiveDate: '',
    longestStreak: 0,
    totalDaysActive: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StreakData;
        checkAndUpdateStreak(parsed);
      } catch (e) {
        console.error("Failed to parse streak data", e);
      }
    } else {
      // First time user
      updateActivity();
    }
  }, []);

  const checkAndUpdateStreak = (data: StreakData) => {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = data.lastActiveDate;

    if (lastDate === today) {
      setStreak(data);
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = data.currentStreak;
    if (lastDate === yesterdayStr) {
      // Continued streak
      newStreak += 1;
    } else {
      // Streak broken
      newStreak = 1;
    }

    const updated: StreakData = {
      ...data,
      currentStreak: newStreak,
      lastActiveDate: today,
      longestStreak: Math.max(newStreak, data.longestStreak),
      totalDaysActive: data.totalDaysActive + 1
    };

    setStreak(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const updateActivity = () => {
    const today = new Date().toISOString().split('T')[0];
    
    setStreak(prev => {
      if (prev.lastActiveDate === today) return prev;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = prev.currentStreak;
      if (prev.lastActiveDate === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      const updated: StreakData = {
        currentStreak: newStreak,
        lastActiveDate: today,
        longestStreak: Math.max(newStreak, prev.longestStreak),
        totalDaysActive: prev.totalDaysActive + 1
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { streak, updateActivity };
}
