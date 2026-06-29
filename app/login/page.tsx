"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserOption {
  id: string;
  name: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  async function login(user: UserOption) {
    setLoadingId(user.id);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    setLoadingId(null);
    if (res.ok) {
      router.push("/timeline");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Login failed");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50">
      <h1 className="text-2xl font-semibold text-slate-800">Who's signing in?</h1>
      {users.length === 0 ? (
        <p className="text-sm text-slate-400">No accounts found — run `npm run db:seed`</p>
      ) : (
        <div className="flex gap-6">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => login(u)}
              disabled={loadingId !== null}
              className="w-40 h-40 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-xl font-medium text-slate-700 hover:border-blue-400 hover:shadow-lg transition disabled:opacity-50"
            >
              {loadingId === u.id ? "Signing in..." : u.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
    </main>
  );
}
