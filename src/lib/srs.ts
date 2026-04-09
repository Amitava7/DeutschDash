/**
 * Simplified SM-2 SRS algorithm
 * Hard: Reset interval to 0 (show again this session)
 * Easy L1: 1 day
 * Easy L2: 7 days
 * Easy L3: 14 days
 * Easy L4+: double previous interval (28, 56, ...)
 */
export function calculateNextReview(
  rating: "hard" | "easy",
  currentInterval: number,
  easeLevel: number
): { nextReviewDate: Date; newInterval: number; newEaseLevel: number } {
  const now = new Date();

  if (rating === "hard") {
    return {
      nextReviewDate: now,
      newInterval: 0,
      newEaseLevel: Math.max(0, easeLevel - 1),
    };
  }

  const newEaseLevel = easeLevel + 1;
  let newInterval: number;

  switch (newEaseLevel) {
    case 1:
      newInterval = 1;
      break;
    case 2:
      newInterval = 7;
      break;
    case 3:
      newInterval = 14;
      break;
    default:
      newInterval = currentInterval > 0 ? currentInterval * 2 : 28;
  }

  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return { nextReviewDate, newInterval, newEaseLevel };
}

export function isDueForReview(nextReviewDate: Date): boolean {
  return new Date() >= new Date(nextReviewDate);
}
