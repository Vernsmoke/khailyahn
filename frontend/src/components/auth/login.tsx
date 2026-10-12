"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { ErrorNotice } from "@/components/ui/primitives";
import { api } from "@/lib/client/api";

import { ThemeToggle } from "@/components/providers/theme";
import { GymLogo } from "@/components/branding/gym-logo";
export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [show, setShow] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="login-page login-refreshed">
      <div className="login-scene" aria-hidden="true" />
      <div className="login-theme-control">
        <ThemeToggle />
      </div>
      <div className="login-layout">
        <section className="login-welcome" aria-labelledby="welcome-title">
          <p className="login-welcome-eyebrow">Welcome back</p>
          <h2 id="welcome-title">Every visit counts.</h2>
          <p className="login-welcome-copy">Your gym, one workspace.</p>
        </section>
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-logo">
            <GymLogo variant="login" />
          </div>
          <h1 id="login-title">KHA-IL-YAHN</h1>
          <p className="login-gym-name">Fitness GYM</p>
          <form onSubmit={submit} aria-busy={busy}>
            <label>
              <span className="login-field-label">Username</span>
              <input
                name="username"
                autoComplete="username"
                required
                maxLength={40}
                placeholder="Username"
                disabled={busy}
              />
            </label>
            <label>
              <span className="login-field-label">Password</span>
              <div className="password-input">
                <input
                  name="password"
                  autoComplete="current-password"
                  type={show ? "text" : "password"}
                  required
                  maxLength={128}
                  placeholder="Password"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <ErrorNotice message={error} />
            <button
              type="submit"
              className="button primary full"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="login-note">Admin and Staff access only.</p>
        </section>
      </div>
      <footer className="login-footer">
        <span>KHA-IL-YAHN Fitness GYM</span>
      </footer>
    </main>
  );
}
