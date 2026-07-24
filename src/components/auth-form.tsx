"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/composition/auth-client";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Authentication failed. Please try again.");
      setPending(false);
      return;
    }

    router.refresh();
  }

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title">Photography Weather Forecast</h1>
        <p>Sign in to view and manage your private photography map.</p>

        <div className="auth-mode" role="group" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === "sign-in" ? "active" : undefined}
            aria-pressed={mode === "sign-in"}
            onClick={() => selectMode("sign-in")}
            disabled={pending}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "sign-up" ? "active" : undefined}
            aria-pressed={mode === "sign-up"}
            onClick={() => selectMode("sign-up")}
            disabled={pending}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} aria-busy={pending}>
          {isSignUp && (
            <label>
              Name
              <input name="name" type="text" autoComplete="name" required />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
