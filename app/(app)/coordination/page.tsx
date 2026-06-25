"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TaskCard, { type TaskWithExtras } from "@/app/components/TaskCard";
import TaskModal from "@/app/components/TaskModal";

interface PresenceUser {
  id: string;
  name: string;
  timezone: string;
  awakeWindowStart: string;
  awakeWindowEnd: string;
}

const STATUS_ORDER = ["Blocked", "PendingConfirmation", "InProgress", "Todo", "Done"] as const;
const STATUS_LABELS: Record<string, string> = {
  Blocked: "Blocked / needs clarification",
  PendingConfirmation: "Pending confirmation",
  InProgress: "In progress",
  Todo: "To do",
  Done: "Done",
};

export default function CoordinationPage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [tasks, setTasks] = useState<TaskWithExtras[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const me = users.find((u) => u.id === meId);
  const other = users.find((u) => u.id !== meId);

  const refresh = useCallback(async () => {
    const [meRes, presenceRes, tasksRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/presence"),
      fetch("/api/tasks"),
    ]);
    if (meRes.ok) setMeId((await meRes.json()).id);
    if (presenceRes.ok) setUsers(await presenceRes.json());
    if (tasksRes.ok) setTasks(await tasksRes.json());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<string, TaskWithExtras[]>();
    for (const status of STATUS_ORDER) map.set(status, []);
    for (const t of tasks) {
      if (!map.has(t.status)) map.set(t.status, []);
      map.get(t.status)!.push(t);
    }
    return map;
  }, [tasks]);

  if (!me || !other) {
    return <div className="p-6 text-slate-500">Loading…</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-6">
      {STATUS_ORDER.map((status) => {
        const items = grouped.get(status) ?? [];
        if (items.length === 0) return null;
        return (
          <div key={status} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              {STATUS_LABELS[status]} ({items.length})
            </h3>
            <div className="flex flex-col gap-2">
              {items.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  assigneeName={t.assignee_id === me.id ? me.name : other.name}
                  viewerTz={me.timezone}
                  onClick={() => setOpenTaskId(t.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && <p className="text-slate-400 text-sm">No tasks yet.</p>}

      {openTaskId && (
        <TaskModal taskId={openTaskId} me={me} other={other} onClose={() => setOpenTaskId(null)} onSaved={refresh} />
      )}
    </div>
  );
}
