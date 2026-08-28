import { GlobalLoader } from "@neot/ui/components/global-loader";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  apiGet,
  getToken,
  redirectToLoginForExpiredSession,
  tokenExpiresAt,
  tokenIsCurrent
} from "../api/platform-api";

export function AuthGate({ children }: { children: ReactElement }) {
  const token = useMemo(() => getToken(), []);
  const expiresAt = useMemo(() => tokenExpiresAt(token), [token]);
  const localValid = useMemo(() => tokenIsCurrent(token), [token]);
  const [serverValid, setServerValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localValid) {
      setServerValid(false);
      return;
    }
    let cancelled = false;
    void apiGet<{ authenticated: boolean }>("/auth/session")
      .then((session) => !cancelled && setServerValid(session.authenticated))
      .catch(() => !cancelled && setServerValid(false));
    return () => {
      cancelled = true;
    };
  }, [localValid]);

  useEffect(() => {
    if (serverValid !== false) return;
    redirectToLoginForExpiredSession();
  }, [serverValid]);

  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      redirectToLoginForExpiredSession();
      return;
    }
    const timeout = window.setTimeout(redirectToLoginForExpiredSession, remaining);
    return () => window.clearTimeout(timeout);
  }, [expiresAt]);

  if (serverValid === true) return children;
  return <GlobalLoader />;
}
