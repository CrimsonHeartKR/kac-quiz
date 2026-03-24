/**
 * Calculate score for a quiz answer.
 * Correct: 500 base + speed bonus (up to 500 based on remaining time ratio)
 * Wrong: 0
 */
export function calculateScore(
  isCorrect: boolean,
  remainingTime: number,
  timeLimit: number
): number {
  if (!isCorrect) return 0
  const BASE = 500
  const SPEED_BONUS_MAX = 500
  const ratio = Math.max(0, Math.min(1, remainingTime / timeLimit))
  return Math.round(BASE + SPEED_BONUS_MAX * ratio)
}
