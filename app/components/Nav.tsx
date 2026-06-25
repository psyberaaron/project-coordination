"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/timeline", label: "Timeline" },
  { href: "/coordination", label: "Coordination" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="px-4 pt-2 flex items-center justify-between border-b border-slate-200 bg-white">
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
                active
                  ? "text-slate-900 border-b-2 border-slate-800"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-600 pb-2">
        Log out
      </button>
    </div>
  );
}
