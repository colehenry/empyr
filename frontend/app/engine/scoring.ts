export const ROUND_BASE_POINTS = 1000;
export const FULL_SPEED_MS = 5_000;
export const SLOWEST_WEIGHTED_MS = 30_000;
export const MIN_TIME_WEIGHT = 0.5;
export const YEAR_DECAY_WINDOW = 200;

export function timeWeight(elapsedMs: number): number {
  if (elapsedMs <= FULL_SPEED_MS) {
    return 1;
  }
  if (elapsedMs >= SLOWEST_WEIGHTED_MS) {
    return MIN_TIME_WEIGHT;
  }
  const progress = (elapsedMs - FULL_SPEED_MS) / (SLOWEST_WEIGHTED_MS - FULL_SPEED_MS);
  return 1 - progress * (1 - MIN_TIME_WEIGHT);
}

export function identifyPoints(correct: boolean, elapsedMs: number): number {
  if (!correct) {
    return 0;
  }
  return Math.round(ROUND_BASE_POINTS * timeWeight(elapsedMs));
}

export function yearDistance(guess: number, validFrom: number, validTo: number): number {
  if (guess < validFrom) {
    return validFrom - guess;
  }
  if (guess > validTo) {
    return guess - validTo;
  }
  return 0;
}

export function yearPoints(guess: number, validFrom: number, validTo: number, elapsedMs: number): number {
  const distance = yearDistance(guess, validFrom, validTo);
  const base = ROUND_BASE_POINTS * Math.max(0, 1 - distance / YEAR_DECAY_WINDOW);
  return Math.round(base * timeWeight(elapsedMs));
}
