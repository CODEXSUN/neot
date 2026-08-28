import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function PlatformLandingLayout({ children }: { children: ReactNode }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % messages.length),
      4200
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="platform-login-page">
      <section className="platform-login-shell" aria-label="NEOT Login">
        <div className="platform-login-story">
          <div className="platform-login-brand">
            <span className="auth-surface-mark" data-surface="app">
              <Logo />
              <span className="auth-surface-badge">
                <Building2 size={13} strokeWidth={2.25} />
              </span>
            </span>
            <span>
              <strong>NEOT</strong>
              <small>Learn today. Own tomorrow.</small>
            </span>
          </div>
          <div className="platform-login-slider" aria-live="polite">
            <span className="platform-login-eyebrow">
              <CheckCircle2 size={14} /> Local authentication
            </span>
            <p key={messages[slide]}>{messages[slide]}</p>
            <div className="platform-login-dots" aria-hidden="true">
              {messages.map((message, index) => (
                <span className={index === slide ? "is-active" : ""} key={message} />
              ))}
            </div>
          </div>
          <p className="platform-login-footnote">
            Classes, lessons, welfare, and skill growth in one learning space{" "}
            <ArrowRight size={14} />
          </p>
        </div>
        <div className="platform-login-panel">
          <div className="platform-login-panel-brand" aria-hidden="true">
            <Logo />
            <span>NEOT</span>
          </div>
          <div className="auth-card-frame auth-card-frame-app platform-login-card-frame">
            <div className="auth-card platform-login-card">
              <header className="auth-card-header">
                <h1>Welcome back</h1>
                <p>Access NEOT with your registered credentials.</p>
              </header>
              {children}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Logo() {
  return (
    <>
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
    </>
  );
}

const messages = [
  "Connect organisations, masters, students, classes, subjects, and lessons.",
  "Give every student a clear place to ask questions and review answers.",
  "Support learner welfare and track practical skill development."
];
