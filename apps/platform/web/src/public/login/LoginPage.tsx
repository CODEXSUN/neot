import { Button } from "@neot/ui/components/button";
import { Field } from "@neot/ui/components/Field";
import { GlobalLoader } from "@neot/ui/components/global-loader";
import { Alert, AlertDescription, AlertTitle } from "@neot/ui/components/alert";
import { useNavigate } from "@tanstack/react-router";
import { LogIn, TriangleAlert, UserPlus } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import {
  apiGet,
  clearToken,
  clearSessionExpiredWarning,
  developmentLogin,
  getToken,
  hasSessionExpiredWarning,
  login,
  registerAccount,
  redirectToLoginForExpiredSession,
  tokenIsCurrent
} from "../../shared/api/platform-api";
import { applicationEntryPath } from "../../desks/app/app-shell-access";
import { PlatformAuthLayout } from "./PlatformAuthLayout";
import { PlatformLandingLayout } from "./PlatformLandingLayout";

export function LoginPage() {
  return <LoginSurface landing={false} />;
}

export function LandingLoginPage() {
  return <LoginSurface landing />;
}

function LoginSurface({ landing }: { landing: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"master" | "student">("student");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sessionExpiredWarning] = useState(hasSessionExpiredWarning);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(clearSessionExpiredWarning, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!tokenIsCurrent(token)) {
      if (token) {
        redirectToLoginForExpiredSession();
        return;
      }
      clearToken();
      setSessionChecked(true);
      return;
    }
    let cancelled = false;
    void apiGet<{ authenticated: boolean; role?: string }>("/auth/session")
      .then((session) => {
        if (cancelled) return;
        if (session.authenticated) {
          void navigate({ replace: true, to: applicationEntryPath(session.role) });
          return;
        }
        clearToken();
        setSessionChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (
      !sessionChecked ||
      !import.meta.env.DEV ||
      import.meta.env.VITE_DEV_AUTO_LOGIN !== "1" ||
      autoLoginStarted.current
    ) {
      return;
    }
    autoLoginStarted.current = true;
    setLoading(true);
    void developmentLogin()
      .then((result) => {
        if (result.success) {
          void navigate({ replace: true, to: applicationEntryPath() });
        } else setMessage(result.error.message);
      })
      .finally(() => setLoading(false));
  }, [navigate, sessionChecked]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result =
      mode === "login"
        ? await login({ email, password })
        : await registerAccount({ email, name, password, role });
    if (result.success) {
      void navigate({ replace: true, to: applicationEntryPath(result.data.role) });
    } else setMessage(result.error.message);
    setLoading(false);
  }

  if (!sessionChecked) return <GlobalLoader />;

  const form = (
    <form className="auth-form" onSubmit={submit}>
      {sessionExpiredWarning ? (
        <Alert className="auth-session-warning" variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>Session expired</AlertTitle>
          <AlertDescription>Your session ended. Sign in again to continue.</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex gap-2" role="group" aria-label="Account action">
        <Button
          type="button"
          variant={mode === "login" ? "default" : "outline"}
          onClick={() => setMode("login")}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "register" ? "default" : "outline"}
          onClick={() => setMode("register")}
        >
          Register
        </Button>
      </div>
      {mode === "register" ? (
        <Field
          autoComplete="name"
          className="auth-field"
          label="Full name"
          name="name"
          disabled={loading}
          minLength={2}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
          required
          value={name}
        />
      ) : null}
      <Field
        autoComplete="email"
        className="auth-field"
        label="Email"
        name="email"
        disabled={loading}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      <Field
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        className="auth-field"
        label="Password"
        name="password"
        disabled={loading}
        minLength={8}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
        type="password"
        value={password}
      />
      {mode === "register" ? (
        <label className="grid gap-2 text-sm font-medium" htmlFor="account-role">
          Register as
          <select
            className="h-10 rounded-md border border-input bg-white px-3 text-sm"
            disabled={loading}
            id="account-role"
            onChange={(event) => setRole(event.target.value as "master" | "student")}
            value={role}
          >
            <option value="student">Student</option>
            <option value="master">Master</option>
          </select>
        </label>
      ) : null}
      {message ? <p className="form-error">{message}</p> : null}
      <Button
        className={landing ? "auth-submit" : undefined}
        disabled={loading}
        icon={mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
        type="submit"
      >
        {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </Button>
    </form>
  );

  return landing ? (
    <PlatformLandingLayout>{form}</PlatformLandingLayout>
  ) : (
    <PlatformAuthLayout surface="app" title="NEOT Login">
      {form}
    </PlatformAuthLayout>
  );
}
