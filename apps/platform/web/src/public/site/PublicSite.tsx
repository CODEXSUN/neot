import { ArrowRight, Check, Menu, Settings2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { audiences, featureCards, navigation, pageContent, trustItems } from "./public-site.data";
import "./public-site.css";

export type PublicPage = keyof typeof pageContent | "contact" | "home" | "privacy" | "terms";

export function PublicSite({ page }: { page: PublicPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [compact, setCompact] = usePreference("neot.public.compact");
  const [warm, setWarm] = usePreference("neot.public.warm");

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  return (
    <div className="public-site" data-compact={compact} data-warm={warm}>
      <Header menuOpen={menuOpen} onMenuChange={setMenuOpen} />
      {page === "home" ? <HomePage /> : null}
      {page in pageContent ? <AudiencePage page={page as keyof typeof pageContent} /> : null}
      {page === "contact" ? <ContactPage /> : null}
      {page === "privacy" ? <LegalPage kind="privacy" /> : null}
      {page === "terms" ? <LegalPage kind="terms" /> : null}
      <Footer />
      <TweakPanel compact={compact} onCompact={setCompact} onWarm={setWarm} warm={warm} />
    </div>
  );
}

function Header({
  menuOpen,
  onMenuChange
}: {
  menuOpen: boolean;
  onMenuChange: (open: boolean) => void;
}) {
  return (
    <header className="public-header">
      <a className="public-brand" href="/" aria-label="NEOT home">
        <img src="/logo/logo.svg" alt="" />
        <span>
          <strong>NEOT</strong>
          <small>Own tomorrow</small>
        </span>
      </a>
      <button
        className="public-menu-button"
        onClick={() => onMenuChange(!menuOpen)}
        type="button"
        aria-label="Toggle navigation"
      >
        {menuOpen ? <X /> : <Menu />}
      </button>
      <nav
        className={menuOpen ? "public-nav is-open" : "public-nav"}
        aria-label="Public navigation"
      >
        {navigation.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
        <a className="public-nav-login" href="/login">
          Sign in <ArrowRight />
        </a>
      </nav>
    </header>
  );
}

function HomePage() {
  return (
    <main>
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-eyebrow">Next Era. Own Tomorrow.</span>
          <h1>A clearer place to learn, teach, and grow.</h1>
          <p>
            NEOT connects structured learning, thoughtful guidance, student welfare, and practical
            skill development in one calm environment.
          </p>
          <div className="public-actions">
            <a className="public-primary" href="/login">
              Start learning <ArrowRight />
            </a>
            <a href="/learning">Explore the learning model</a>
          </div>
        </div>
        <div className="public-hero-visual" aria-label="NEOT learning journey">
          <div className="public-orbit-mark">
            <img src="/logo/logo.svg" alt="" />
          </div>
          <div className="public-path-list">
            {["Course", "Subject", "Lesson", "Question", "Answer"].map((label, index) => (
              <span key={label}>
                <em>{String(index + 1).padStart(2, "0")}</em>
                {label}
                {index < 4 ? <i /> : null}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="public-trust" aria-label="Product principles">
        {trustItems.map(({ icon: Icon, label }) => (
          <span key={label}>
            <Icon />
            {label}
          </span>
        ))}
      </section>
      <section className="public-section public-features">
        <SectionHeading
          eyebrow="Learning, connected"
          title="The essentials stay together."
          description="Every part of NEOT supports a simple idea: students should understand their path and always know where support lives."
        />
        <div className="public-feature-grid">
          {featureCards.map(({ description, icon: Icon, title }, index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="public-section public-audiences">
        <SectionHeading
          eyebrow="Made for the whole learning community"
          title="Different roles. One shared direction."
        />
        <div>
          {audiences.map(({ description, href, icon: Icon, label }) => (
            <a href={href} key={href}>
              <Icon />
              <span>
                <strong>{label}</strong>
                <p>{description}</p>
              </span>
              <ArrowRight />
            </a>
          ))}
        </div>
      </section>
      <CallToAction />
    </main>
  );
}

function AudiencePage({ page }: { page: keyof typeof pageContent }) {
  const content = pageContent[page];
  return (
    <main>
      <section className="public-page-hero">
        <span className="public-eyebrow">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
      </section>
      <section className="public-point-list">
        {content.points.map(([title, description], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <Check />
          </article>
        ))}
      </section>
      <CallToAction />
    </main>
  );
}

function ContactPage() {
  return (
    <main>
      <section className="public-page-hero">
        <span className="public-eyebrow">Contact</span>
        <h1>Let’s talk about better learning.</h1>
        <p>Tell us about your organisation, your learners, and the change you want to make.</p>
      </section>
      <section className="public-contact">
        <div>
          <span>General enquiries</span>
          <a href="mailto:hello@neot.in">hello@neot.in</a>
        </div>
        <div>
          <span>Organisation onboarding</span>
          <a href="mailto:organisations@neot.in">organisations@neot.in</a>
        </div>
        <div>
          <span>Support</span>
          <a href="mailto:support@neot.in">support@neot.in</a>
        </div>
      </section>
    </main>
  );
}

function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const privacy = kind === "privacy";
  return (
    <main className="public-legal">
      <section className="public-page-hero">
        <span className="public-eyebrow">Legal</span>
        <h1>{privacy ? "Privacy policy" : "Terms of use"}</h1>
        <p>Last updated 28 August 2026</p>
      </section>
      <section>
        {privacy ? (
          <>
            <LegalSection title="Information we use">
              NEOT uses account, organisation, learning, assessment, and support information to
              provide the service. Administrators control access within their organisation.
            </LegalSection>
            <LegalSection title="How information is protected">
              Access is role-aware. We use reasonable technical and organisational safeguards and
              limit information to the people who need it.
            </LegalSection>
            <LegalSection title="Your choices">
              You may ask your organisation to correct or remove eligible personal information.
              Contact privacy@neot.in for privacy questions.
            </LegalSection>
          </>
        ) : (
          <>
            <LegalSection title="Using NEOT">
              Use the service for lawful education and organisation activity. Keep account
              credentials private and provide accurate registration information.
            </LegalSection>
            <LegalSection title="Learning content">
              Organisations and users remain responsible for content they upload. Do not submit
              material that violates another person’s rights.
            </LegalSection>
            <LegalSection title="Service availability">
              We work to keep NEOT dependable, but maintenance and changes may occasionally affect
              availability. Contact support@neot.in when you need help.
            </LegalSection>
          </>
        )}
      </section>
    </main>
  );
}

function LegalSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <article>
      <h2>{title}</h2>
      <p>{children}</p>
    </article>
  );
}
function SectionHeading({
  description,
  eyebrow,
  title
}: {
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="public-section-heading">
      <span className="public-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
function CallToAction() {
  return (
    <section className="public-cta">
      <span>Ready when you are.</span>
      <h2>Make the next learning day clearer.</h2>
      <a className="public-primary" href="/login">
        Enter NEOT <ArrowRight />
      </a>
    </section>
  );
}

function Footer() {
  return (
    <footer className="public-footer">
      <div className="public-brand">
        <img src="/logo/logo.svg" alt="" />
        <span>
          <strong>NEOT</strong>
          <small>Learn today. Own tomorrow.</small>
        </span>
      </div>
      <nav aria-label="Footer navigation">
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/status">Status</a>
      </nav>
      <small>© 2026 NEOT</small>
    </footer>
  );
}

function TweakPanel({
  compact,
  onCompact,
  onWarm,
  warm
}: {
  compact: boolean;
  onCompact: (value: boolean) => void;
  onWarm: (value: boolean) => void;
  warm: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={open ? "public-tweak is-open" : "public-tweak"}>
      <button aria-label="Design options" onClick={() => setOpen(!open)} type="button">
        <Settings2 />
      </button>
      {open ? (
        <div>
          <strong>Page feel</strong>
          <label>
            <span>Spacing</span>
            <select
              onChange={(event) => onCompact(event.target.value === "compact")}
              value={compact ? "compact" : "relaxed"}
            >
              <option value="relaxed">Relaxed</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label>
            <span>Surface</span>
            <select
              onChange={(event) => onWarm(event.target.value === "warm")}
              value={warm ? "warm" : "clear"}
            >
              <option value="clear">Clear</option>
              <option value="warm">Warm</option>
            </select>
          </label>
        </div>
      ) : null}
    </aside>
  );
}

function usePreference(key: string) {
  const [value, setValue] = useState(() => window.localStorage.getItem(key) === "1");
  const update = (next: boolean) => {
    setValue(next);
    window.localStorage.setItem(key, next ? "1" : "0");
  };
  return [value, update] as const;
}
