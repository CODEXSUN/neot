const DAILY_QUOTES = [
  "Build with purpose, improve with patience.",
  "Small, consistent improvements create remarkable systems.",
  "Clarity today makes tomorrow's work lighter.",
  "Progress begins when the next useful step becomes clear.",
  "Great engineering turns careful thought into lasting value.",
  "Make today's work something your future self will thank you for.",
  "Focus on what matters, then make it work beautifully.",
  "Every solved problem strengthens the path ahead.",
  "Steady effort transforms ambitious ideas into dependable products.",
  "The best momentum comes from finishing meaningful work.",
  "Learn deliberately, build thoughtfully, and improve continuously.",
  "A strong day starts with one clear priority."
] as const;

export function quoteForDate(date: Date) {
  const day = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) /
      86_400_000
  );
  return DAILY_QUOTES[(day - 1) % DAILY_QUOTES.length];
}
