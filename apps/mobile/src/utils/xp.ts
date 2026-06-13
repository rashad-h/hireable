export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpForCurrentLevel(xp: number): number {
  return xp % 100;
}

export function xpProgressPercent(xp: number): number {
  return (xp % 100) / 100;
}

export function levelTitle(level: number): string {
  if (level <= 2) return "Beginner";
  if (level <= 4) return "Junior Developer";
  if (level <= 7) return "Mid-Level Developer";
  if (level <= 10) return "Senior Developer";
  return "Expert";
}

export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}
