"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/composition/auth-client";

type AuthenticatedShellProps = {
  children: React.ReactNode;
  user: {
    email: string;
    name: string;
  };
};

export function AuthenticatedShell({ children, user }: AuthenticatedShellProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setPending(true);
    setError(null);

    const result = await authClient.signOut();
    if (result.error) {
      setError(result.error.message ?? "Sign out failed. Please try again.");
      setPending(false);
      return;
    }

    router.refresh();
  }

  return (
    <main className="authenticated-shell">
      <header className="account-bar">
        <div>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        {error && (
          <p className="account-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" onClick={handleSignOut} disabled={pending}>
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </header>
      {children}
    </main>
  );
}
