export type ProficiencyLevel = '當代1' | '當代2' | '當代3' | '當代4' | '當代5' | '當代6';

export interface VocabularyItem {
  id: string;
  word: string;
  pinyin: string;
  meaning: string;
  level: ProficiencyLevel;
  exampleSentence?: string;
  exampleTranslation?: string;
  category: string;
  usageExplanation?: string;
  tags: string[];
  createdAt: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  srsInterval: number; // in days
  srsEase: number; // SM-2 ease factor
  repetitionCount: number;
  masteryScore: number; // 0 to 100
  notes?: string;
  lesson?: string;
  wordType?: string;
  isSelected?: boolean;
  color?: string;
}

export interface AudioLesson {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  duration?: number;
  createdAt: number;
}

export type PracticeMode = 'standard' | 'timed' | 'mistake-review' | 'flashcards' | 'typing' | 'srs' | 'tone-master' | 'ear-training';

export type QuestionType = 'multiple-choice' | 'fill-in-the-blank' | 'flashcard' | 'typing' | 'tone-selection' | 'audio-to-meaning' | 'hanzi-to-pinyin' | 'sentence-translation';

export const ALL_QUESTION_TYPES: QuestionType[] = [
  'multiple-choice', 
  'fill-in-the-blank', 
  'typing', 
  'tone-selection', 
  'audio-to-meaning', 
  'hanzi-to-pinyin', 
  'sentence-translation'
];

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // For multiple choice
  correctAnswer: string; // Correct answer for the question
  explanation?: string;
  pinyin?: string;
  wordType?: string;
  vocabId?: string;
  level: ProficiencyLevel;
}
