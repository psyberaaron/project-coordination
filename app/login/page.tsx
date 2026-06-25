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
  const [selected, setSelected] = useState<UserOption | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selected.id, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/timeline");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Login failed");
    }
  }

  if (!selected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8 bg-slate-50">
        <h1 className="text-2xl font-semibold text-slate-800">Who's signing in?</h1>
        <div className="flex gap-6">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u)}
              className="w-40 h-40 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center text-xl font-medium text-slate-700 hover:border-blue-400 hover:shadow-lg transition"
            >
              {u.name}
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50">
      <h1 className="text-xl font-medium text-slate-800">Enter PIN for {selected.name}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3 w-64">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-center text-lg"
          placeholder="PIN"
        />
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setPassword("");
            setError("");
          }}
          className="text-sm text-slate-500 hover:underline"
        >
          ← back
        </button>
      </form>
    </main>
  );
}
