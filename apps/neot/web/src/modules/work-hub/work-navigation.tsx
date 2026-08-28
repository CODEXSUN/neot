import type { ReactNode } from "react";

export function WorkShell({ children }: { children: ReactNode; current: string }) {
  return <div className="min-h-full">{children}</div>;
}
