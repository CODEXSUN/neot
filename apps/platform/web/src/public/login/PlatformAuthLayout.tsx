import { Building2 } from "lucide-react";
import type { ReactNode } from "react";

type PlatformAuthLayoutProps = {
  children: ReactNode;
  surface: "app";
  title: string;
};

export function PlatformAuthLayout({ children, surface, title }: PlatformAuthLayoutProps) {
  const Icon = Building2;
  const description = "Learn today. Own tomorrow.";

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label={title}>
        <div className="auth-brand">
          <span className="auth-surface-mark" data-surface={surface}>
            <img
              className="auth-logo-image platform-auth-logo-light"
              src="/logo/logo.svg"
              alt=""
              aria-hidden="true"
            />
            <img
              className="auth-logo-image platform-auth-logo-dark"
              src="/logo/logo-dark.svg"
              alt=""
              aria-hidden="true"
            />
            <span className="auth-surface-badge">
              <Icon size={13} strokeWidth={2.25} />
            </span>
          </span>
          <strong>NEOT</strong>
        </div>
        <div className={`auth-card-frame auth-card-frame-${surface}`}>
          <div className="auth-card">
            <header className="auth-card-header">
              <h1>Welcome</h1>
              <p>{description}</p>
            </header>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
