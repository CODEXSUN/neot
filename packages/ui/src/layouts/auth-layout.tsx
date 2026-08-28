import type { ReactNode } from "react";

import { Building2, Crown, Headphones } from "lucide-react";

import { cn } from "../lib/utils";

type AuthLayoutProps = {
  children: ReactNode;
  description?: string;
  surface?: "admin" | "sa" | "tenant";
  title: string;
};

export function AuthLayout({ children, description, surface, title }: AuthLayoutProps) {
  const resolvedSurface = surface ?? surfaceFromTitle(title);
  const isTenant = resolvedSurface === "tenant";
  const nextDescription =
    description ??
    (isTenant
      ? "Access your workspace with your registered credentials."
      : "Use your admin email and password for this desk.");

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label={title}>
        <div className="auth-brand">
          <SurfaceMark surface={resolvedSurface} />
          <strong>Codexsun</strong>
        </div>
        <div className={cn("auth-card-frame", `auth-card-frame-${resolvedSurface}`)}>
          <div className="auth-card">
            <header className="auth-card-header">
              <h1>{isTenant ? "Welcome" : "Welcome"}</h1>
              <p>{nextDescription}</p>
            </header>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

function surfaceFromTitle(title: string): "admin" | "sa" | "tenant" {
  const normalized = title.toLowerCase();
  if (normalized.includes("super")) return "sa";
  if (normalized.includes("admin")) return "admin";
  return "tenant";
}

function SurfaceMark({ surface }: { surface: "admin" | "sa" | "tenant" }) {
  const Icon = surface === "sa" ? Crown : surface === "admin" ? Headphones : Building2;
  return (
    <span className="auth-surface-mark" data-surface={surface}>
      <img className="auth-logo-image" src="/logo/logo.svg" alt="" aria-hidden="true" />
      <span className="auth-surface-badge">
        <Icon size={13} strokeWidth={2.25} />
      </span>
    </span>
  );
}
