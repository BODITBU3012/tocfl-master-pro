export interface SrsData {
  interval: number;
  ease: number;
  repetitionCount: number;
  nextReviewAt: number;
}

export function calculateNextReview(
  isCorrect: boolean,
  currentInterval: number,
  currentEase: number,
  currentRepetitionCount: number
): SrsData {
  let nextInterval: number;
  let nextEase: number;
  let nextRepetitionCount: number;

  if (isCorrect) {
    if (currentRepetitionCount === 0) {
      nextInterval = 1;
    } else if (currentRepetitionCount === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEase);
    }
    nextRepetitionCount = currentRepetitionCount + 1;
    // For "Correct" (q=4 equivalent), ease stays roughly the same or slightly increases
    nextEase = currentEase + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)); 
  } else {
    nextInterval = 1;
    nextRepetitionCount = 0;
    // For "Incorrect" (q=0 equivalent), ease drops significantly
    nextEase = currentEase + (0.1 - (5 - 0) * (0.08 + (5 - 0) * 0.02));
  }

  // Sanity checks
  nextEase = Math.max(1.3, nextEase);
  
  const now = Date.now();
  const nextReviewAt = now + nextInterval * 24 * 60 * 60 * 1000;

  return {
    interval: nextInterval,
    ease: nextEase,
    repetitionCount: nextRepetitionCount,
    nextReviewAt
  };
}
