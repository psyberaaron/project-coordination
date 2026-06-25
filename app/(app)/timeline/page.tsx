"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TaskCard, { type TaskWithExtras } from "@/app/components/TaskCard";
import TaskModal from "@/app/components/TaskModal";
import BulkAddModal from "@/app/components/BulkAddModal";
import { formatDateTimeInZone } from "@/lib/time";

interface PresenceUser {
  id: string;
  name: string;
  timezone: string;
  awakeWindowStart: string;
  awakeWindowEnd: string;
}

export default function TimelinePage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [tasks, setTasks] = useState<TaskWithExtras[]>([]);
  const [filter, setFilter] = useState<"all" | "mine" | "theirs">("all");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);

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
    fetch("/api/tasks/deadline-check", { method: "POST" }).catch(() => {});
    const interval = setInterval(() => {
      refresh();
      fetch("/api/tasks/deadline-check", { method: "POST" }).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "mine") return t.assignee_id === meId;
      if (filter === "theirs") return t.assignee_id !== meId;
      return true;
    });
  }, [tasks, filter, meId]);

  const digest = useMemo(() => {
    if (!meId) return { dueToday: 0, pendingMyConfirmation: 0, overdue: 0 };
    const now = new Date();
    const todayKey = now.toDateString();
    let dueToday = 0;
    let overdue = 0;
    for (const t of tasks) {
      if (!t.deadline_utc || t.status === "Done") continue;
      const d = new Date(t.deadline_utc);
      if (d < now) overdue++;
      else if (d.toDateString() === todayKey) dueToday++;
    }
    const pendingMyConfirmation = tasks.filter(
      (t) => t.status === "PendingConfirmation" && t.created_by === meId
    ).length;
    return { dueToday, pendingMyConfirmation, overdue };
  }, [tasks, meId]);

  const grouped = useMemo(() => {
    const groups = new Map<string, TaskWithExtras[]>();
    const noDeadline: TaskWithExtras[] = [];
    for (const t of visibleTasks) {
      if (!t.deadline_utc) {
        noDeadline.push(t);
        continue;
      }
      const key = new Date(t.deadline_utc).toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return { sortedKeys, groups, noDeadline };
  }, [visibleTasks]);

  if (!me || !other) {
    return <div className="p-6 text-slate-500">Loading…</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <DigestCard label="Due today" value={digest.dueToday} tone="blue" />
        <DigestCard label="Pending your confirmation" value={digest.pendingMyConfirmation} tone="purple" />
        <DigestCard label="Overdue" value={digest.overdue} tone="red" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["all", "mine", "theirs"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1.5 rounded-md ${
                filter === f ? "bg-white shadow text-slate-900" : "text-slate-500"
              }`}
            >
              {f === "all" ? "All" : f === "mine" ? `Mine (${me.name})` : other.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkAdding(true)}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
          >
            Bulk add
          </button>
          <button
            onClick={() => setCreating(true)}
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900"
          >
            + Add task
          </button>
        </div>
      </div>

      {grouped.sortedKeys.length === 0 && grouped.noDeadline.length === 0 && (
        <p className="text-slate-400 text-sm">No tasks yet.</p>
      )}

      {grouped.sortedKeys.map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {formatDateTimeInZone(new Date(key), me.timezone).split(",")[0]}
          </h3>
          <div className="flex flex-col gap-2">
            {grouped.groups.get(key)!.map((t) => (
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
      ))}

      {grouped.noDeadline.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">No deadline</h3>
          <div className="flex flex-col gap-2">
            {grouped.noDeadline.map((t) => (
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
      )}

      {(openTaskId || creating) && (
        <TaskModal
          taskId={creating ? null : openTaskId}
          me={me}
          other={other}
          onClose={() => {
            setOpenTaskId(null);
            setCreating(false);
          }}
          onSaved={refresh}
        />
      )}

      {bulkAdding && <BulkAddModal me={me} other={other} onClose={() => setBulkAdding(false)} onSaved={refresh} />}
    </div>
  );
}

function DigestCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "purple" | "red" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl p-3 flex flex-col gap-0.5 ${tones[tone]}`}>
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
