import { useEffect, useState } from "react";

export type DesktopPerformancePhase = "agent" | "files" | "git" | "startup" | "workspace";

export type DesktopPerformanceSample = {
  at: string;
  detail?: string;
  durationMs: number;
  operation: string;
  phase: DesktopPerformancePhase;
};

const sampleLimit = 40;
const samples: DesktopPerformanceSample[] = [];
const listeners = new Set<(samples: DesktopPerformanceSample[]) => void>();

export async function measureDesktopOperation<T>(
  phase: DesktopPerformancePhase,
  operation: string,
  action: () => Promise<T>,
  detail?: string
) {
  const startedAt = performance.now();
  try {
    return await action();
  } finally {
    recordDesktopPerformance({
      at: new Date().toISOString(),
      durationMs: performance.now() - startedAt,
      operation,
      phase,
      ...(detail ? { detail } : {})
    });
  }
}

export function recordDesktopPerformance(sample: DesktopPerformanceSample) {
  samples.unshift(sample);
  samples.splice(sampleLimit);
  const snapshot = samples.slice();
  listeners.forEach((listener) => listener(snapshot));
}

export function useDesktopPerformance(limit = 4) {
  const [recent, setRecent] = useState(() => samples.slice(0, limit));

  useEffect(() => {
    const listener = (next: DesktopPerformanceSample[]) => setRecent(next.slice(0, limit));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [limit]);

  return recent;
}
