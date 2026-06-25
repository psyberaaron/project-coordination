"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTimeInZone, tzAbbrev } from "@/lib/time";

interface PresenceUser {
  id: string;
  name: string;
  timezone: string;
  awakeWindowStart: string;
  awakeWindowEnd: string;
  backAtUtc: string | null;
  backAtNote: string | null;
}

const QUICK_OPTIONS = [
  { label: "Back in 1h", minutes: 60 },
  { label: "Back in 2h", minutes: 120 },
  { label: "Back in 4h", minutes: 240 },
  { label: "Back tomorrow 9am", tomorrow9am: true },
];

export default function PresenceBar() {
  const [meId, setMeId] = useState<string | null>(null);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [now, setNow] = useState(new Date());
  const [showBackAtPicker, setShowBackAtPicker] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [meRes, presenceRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/presence"),
    ]);
    if (meRes.ok) setMeId((await meRes.json()).id);
    if (presenceRes.ok) setUsers(await presenceRes.json());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [refresh]);

  const me = users.find((u) => u.id === meId);
  const other = users.find((u) => u.id !== meId);

  async function setBackAt(utcIso: string | null, note: string | null) {
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backAtUtc: utcIso, backAtNote: note }),
    });
    setShowBackAtPicker(false);
    refresh();
  }

  function quickBackAt(opt: (typeof QUICK_OPTIONS)[number]) {
    let date: Date;
    if (opt.tomorrow9am) {
      date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
    } else {
      date = new Date(Date.now() + (opt.minutes ?? 0) * 60000);
    }
    setBackAt(date.toISOString(), opt.label);
  }

  async function sendNudge() {
    setNudging(true);
    const res = await fetch("/api/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setNudging(false);
    setNudgeMsg(data.delivered ? "Nudge sent." : "Nudge logged (push not set up on their device yet).");
    setTimeout(() => setNudgeMsg(null), 4000);
  }

  function renderStatus(u: PresenceUser, viewerTz: string) {
    if (u.backAtUtc) {
      const backDate = new Date(u.backAtUtc);
      if (backDate.getTime() > now.getTime()) {
        return (
          <span className="text-amber-600">
            Away · back at {formatTimeInZone(backDate, viewerTz)} {tzAbbrev(viewerTz, backDate)}
          </span>
        );
      }
    }
    return <span className="text-slate-400">Status not updated</span>;
  }

  if (!me || !other) {
    return <div className="h-12 bg-slate-100 border-b border-slate-200" />;
  }

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-between gap-4 flex-wrap text-sm">
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <span className="font-semibold text-slate-800">{other.name}: </span>
          <span className="text-slate-700">
            {formatTimeInZone(now, other.timezone)} {tzAbbrev(other.timezone, now)}
          </span>
          <span className="ml-2">{renderStatus(other, me.timezone)}</span>
        </div>
        <div>
          <span className="font-semibold text-slate-800">{me.name}: </span>
          <span className="text-slate-700">
            {formatTimeInZone(now, me.timezone)} {tzAbbrev(me.timezone, now)}
          </span>
          <span className="ml-2">{renderStatus(me, me.timezone)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {nudgeMsg && <span className="text-xs text-slate-500">{nudgeMsg}</span>}
        <div className="relative">
          <button
            onClick={() => setShowBackAtPicker((s) => !s)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
          >
            Set "Back at..."
          </button>
          {showBackAtPicker && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10 flex flex-col gap-1">
              {QUICK_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => quickBackAt(opt)}
                  className="text-left px-2 py-1.5 rounded hover:bg-slate-100 text-slate-700"
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setBackAt(null, null)}
                className="text-left px-2 py-1.5 rounded hover:bg-slate-100 text-red-600"
              >
                Clear status
              </button>
            </div>
          )}
        </div>
        <button
          onClick={sendNudge}
          disabled={nudging}
          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 font-medium"
        >
          🔔 Nudge {other.name}
        </button>
      </div>
    </div>
  );
}
