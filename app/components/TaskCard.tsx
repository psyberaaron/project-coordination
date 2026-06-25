"use client";

import { formatDateTimeInZone } from "@/lib/time";

export interface TaskTag {
  id: string;
  name: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  done: number;
}

export interface TaskWithExtras {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  assignee_id: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  deadline_utc: string | null;
  status: "Todo" | "InProgress" | "Blocked" | "PendingConfirmation" | "Done";
  requires_confirmation: number;
  blocking_question: string | null;
  submission_link: string | null;
  submission_note: string | null;
  created_at: string;
  updated_at: string;
  tags: TaskTag[];
  subtasks: TaskSubtask[];
}

const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

const STATUS_STYLES: Record<string, string> = {
  Todo: "bg-slate-100 text-slate-600",
  InProgress: "bg-indigo-100 text-indigo-700",
  Blocked: "bg-amber-100 text-amber-800",
  PendingConfirmation: "bg-purple-100 text-purple-700",
  Done: "bg-green-100 text-green-700",
};

export function agingHours(task: TaskWithExtras): number {
  return (Date.now() - new Date(task.updated_at.replace(" ", "T") + "Z").getTime()) / 3600000;
}

interface TaskCardProps {
  task: TaskWithExtras;
  assigneeName: string;
  viewerTz: string;
  agingThresholdHours?: number;
  onClick: () => void;
}

export default function TaskCard({
  task,
  assigneeName,
  viewerTz,
  agingThresholdHours = 24,
  onClick,
}: TaskCardProps) {
  const isAging = task.status === "PendingConfirmation" && agingHours(task) >= agingThresholdHours;
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-400 hover:shadow-sm transition flex flex-col gap-1.5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-900">{task.title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${PRIORITY_STYLES[task.priority]}`}>
          {task.priority}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className={`px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}>{task.status}</span>
        {isAging && (
          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
            ⏳ Aging
          </span>
        )}
        <span className="text-slate-400">→ {assigneeName}</span>
        {task.deadline_utc && (
          <span className="text-slate-500">
            Due {formatDateTimeInZone(new Date(task.deadline_utc), viewerTz)}
          </span>
        )}
        {task.subtasks.length > 0 && (
          <span className="text-slate-400">
            {doneSubtasks}/{task.subtasks.length} subtasks
          </span>
        )}
      </div>

      {task.status === "Blocked" && task.blocking_question && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
          ❓ {task.blocking_question}
        </p>
      )}

      {task.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {task.tags.map((tag) => (
            <span key={tag.id} className="text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
              #{tag.name}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
