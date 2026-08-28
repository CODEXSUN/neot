import { Save, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import type { DesktopSetup as DesktopSetupState } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function DesktopSetup({
  onComplete,
  setup
}: {
  onComplete: () => Promise<void>;
  setup?: DesktopSetupState | undefined;
}) {
  const saved = setup?.profile;
  const [displayName, setDisplayName] = useState(saved?.displayName ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [rememberIdentity, setRememberIdentity] = useState(saved?.rememberIdentity ?? true);
  const [confirmOnStartup, setConfirmOnStartup] = useState(saved?.confirmOnStartup ?? false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function continueToWorkspace() {
    setSaving(true);
    setError(undefined);
    try {
      await desktopClient.saveDesktopProfile({ displayName, email: email || null, rememberIdentity, confirmOnStartup });
      await onComplete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="desktop-setup">
      <section className="desktop-setup-copy">
        <div className="setup-mark"><UserRound size={25} /></div>
        <p className="eyebrow">Local identity</p>
        <h1>Who is using this NEOT?</h1>
        <p>Your identity stays in this computer’s local SQLite database. You set work groups and repository connections on the next page.</p>
      </section>
      <section className="desktop-setup-form" aria-label="Local identity setup">
        <label>Display name<input autoFocus value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>
        <label>Email <span>Optional</span><input inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label className="desktop-setup-check"><input checked={rememberIdentity} onChange={(event) => setRememberIdentity(event.target.checked)} type="checkbox" /><span><strong>Remember me on this computer</strong><small>Use this local identity and recent workspace automatically.</small></span></label>
        <label className="desktop-setup-check"><input checked={confirmOnStartup} disabled={!rememberIdentity} onChange={(event) => setConfirmOnStartup(event.target.checked)} type="checkbox" /><span><strong>Ask before restoring a workspace</strong><small>Recommended on shared computers.</small></span></label>
        {error ? <p className="setup-error" role="alert">{error}</p> : null}
        <button disabled={saving || !displayName.trim()} onClick={() => void continueToWorkspace()} type="button"><Save size={17} />{saving ? "Saving…" : "Save identity"}</button>
        <p className="desktop-setup-note"><ShieldCheck size={15} /> Repository code and model credentials are configured separately.</p>
      </section>
    </main>
  );
}
