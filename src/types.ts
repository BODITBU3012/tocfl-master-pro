export type ProficiencyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface VocabularyItem {
  id: string;
  word: string;
  pinyin: string;
  meaning: string;
  level: ProficiencyLevel;
  exampleSentence?: string;
  category: 'standard' | 'custom';
  usageExplanation?: string;
  tags: string[];
  createdAt: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  srsInterval: number; // in days
  srsEase: number; // SM-2 ease factor
  repetitionCount: number;
  masteryScore: number; // 0 to 100
}

export interface GrammarItem {
  id: string;
  title: string;
  pattern: string;
  description: string;
  level: ProficiencyLevel;
  exampleSentences: string[];
  masteryScore: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  srsInterval: number;
  srsEase: number;
  repetitionCount: number;
  tags: string[];
  aiExplanation?: string;
}

export type PracticeMode = 'standard' | 'timed' | 'mistake-review';

export type QuestionType = 'multiple-choice' | 'fill-in-the-blank' | 'sentence-reorder';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // For multiple choice
  correctAnswer: string | string[]; // string for MC/FITB, array for reorder
  explanation?: string;
  vocabId?: string;
  grammarId?: string;
  level: ProficiencyLevel;
}
