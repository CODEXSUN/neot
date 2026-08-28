import type { ReactNode } from "react";

type WebLayoutProps = {
  children: ReactNode;
};

export function WebLayout({ children }: WebLayoutProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border px-4 sm:px-6 lg:px-8">
        <a className="text-sm font-semibold" href="/">
          Codexsun
        </a>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <a href="/status">Status</a>
          <a href="/login">Application</a>
          <a href="/admin/login">Admin</a>
          <a href="/sa/login">Super Admin</a>
        </div>
      </nav>
      {children}
    </main>
  );
}
