"use client";

import { useEffect, useState } from "react";
import TimeInput from "@/app/components/TimeInput";
import { formatDateTimeInZone } from "@/lib/time";
import type { TaskWithExtras } from "@/app/components/TaskCard";

interface PresenceUser {
  id: string;
  name: string;
  timezone: string;
  awakeWindowStart: string;
  awakeWindowEnd: string;
}

interface Comment {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface ActivityEntry {
  id: string;
  actor_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}

interface TaskModalProps {
  taskId: string | null; // null => create mode
  defaultAssigneeId?: string;
  me: PresenceUser;
  other: PresenceUser;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export default function TaskModal({ taskId, defaultAssigneeId, me, other, onClose, onSaved }: TaskModalProps) {
  const isCreate = taskId === null;
  const [task, setTask] = useState<TaskWithExtras | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(!isCreate);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? me.id);
  const [priority, setPriority] = useState("Medium");
  const [deadlineUtc, setDeadlineUtc] = useState<string | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [blockQuestion, setBlockQuestion] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionNote, setSubmissionNote] = useState("");
  const [saving, setSaving] = useState(false);

  const userById = (id: string) => (id === me.id ? me : other);

  async function load() {
    if (isCreate || !taskId) return;
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data);
      setComments(data.comments);
      setActivity(data.activityLog);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setAssigneeId(data.assignee_id);
      setPriority(data.priority);
      setDeadlineUtc(data.deadline_utc);
      setRequiresConfirmation(Boolean(data.requires_confirmation));
      setSubmissionLink(data.submission_link ?? "");
      setSubmissionNote(data.submission_note ?? "");
      setTagsInput((data.tags as { name: string }[]).map((t) => t.name).join(", "));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        assigneeId,
        priority,
        deadlineUtc,
        requiresConfirmation,
        tags,
      }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  async function handleSaveEdits() {
    if (!taskId) return;
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || null, assigneeId, priority, deadlineUtc, tags }),
    });
    setSaving(false);
    await load();
    onSaved();
  }

  async function callAction(path: string, body?: object) {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    await load();
    onSaved();
  }

  async function addSubtask() {
    if (!taskId || !newSubtask.trim()) return;
    await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubtask.trim() }),
    });
    setNewSubtask("");
    await load();
  }

  async function toggleSubtask(subtaskId: string, done: boolean) {
    if (!taskId) return;
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    await load();
  }

  async function addComment() {
    if (!taskId || !newComment.trim()) return;
    await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    setNewComment("");
    await load();
  }

  async function deleteTask() {
    if (!taskId) return;
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    onSaved();
    onClose();
  }

  const fmt = (ts: string) => formatDateTimeInZone(new Date(ts.replace(" ", "T") + "Z"), me.timezone);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{isCreate ? "New task" : "Task"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2"
                placeholder="What needs to happen?"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-600">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value={me.id}>{me.name}</option>
                  <option value={other.id}>{other.name}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-600">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <TimeInput
              label="Deadline"
              value={deadlineUtc}
              onChange={setDeadlineUtc}
              viewerTz={me.timezone}
              viewerName={me.name}
              otherName={other.name}
              otherTz={other.timezone}
              otherAwakeStart={other.awakeWindowStart}
              otherAwakeEnd={other.awakeWindowEnd}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-600">Tags (comma separated)</label>
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={requiresConfirmation}
                disabled={!isCreate}
                onChange={(e) => setRequiresConfirmation(e.target.checked)}
              />
              Requires confirmation before Done
            </label>

            {isCreate ? (
              <button
                onClick={handleCreate}
                disabled={saving || !title.trim()}
                className="bg-slate-800 text-white rounded-lg px-4 py-2 font-medium hover:bg-slate-900 disabled:opacity-50"
              >
                Create task
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="bg-slate-800 text-white rounded-lg px-4 py-2 font-medium hover:bg-slate-900 disabled:opacity-50"
                >
                  Save changes
                </button>

                {task && (
                  <div className="border-t border-slate-200 pt-3 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-600">Status:</span>
                      <span>{task.status}</span>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {task.status === "Todo" && (
                        <button onClick={() => callAction("start")} className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                          Start
                        </button>
                      )}
                      {(task.status === "Todo" || task.status === "InProgress") && (
                        <button
                          onClick={() => setBlockQuestion(blockQuestion === null ? "" : blockQuestion)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                        >
                          Mark blocked
                        </button>
                      )}
                      {task.status === "Blocked" && (
                        <button onClick={() => callAction("unblock")} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">
                          Resolve / unblock
                        </button>
                      )}
                      {task.status !== "Done" && task.status !== "PendingConfirmation" && (
                        <button
                          onClick={() =>
                            callAction("submit", { link: submissionLink || null, note: submissionNote || null })
                          }
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Submit / Mark done
                        </button>
                      )}
                      {task.status === "PendingConfirmation" && (
                        <>
                          <button onClick={() => callAction("confirm", { action: "approve" })} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200">
                            Approve
                          </button>
                          <button onClick={() => callAction("confirm", { action: "request_changes" })} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200">
                            Request changes
                          </button>
                        </>
                      )}
                      <button onClick={deleteTask} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                        Delete
                      </button>
                    </div>

                    {(task.status === "Todo" || task.status === "InProgress") && blockQuestion !== null && (
                      <div className="flex gap-2">
                        <input
                          value={blockQuestion}
                          onChange={(e) => setBlockQuestion(e.target.value)}
                          placeholder="What's blocking this?"
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                        <button
                          onClick={() => {
                            if (blockQuestion.trim()) callAction("block", { question: blockQuestion.trim() });
                            setBlockQuestion("");
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                        >
                          Confirm block
                        </button>
                      </div>
                    )}

                    {task.status !== "Done" && task.status !== "PendingConfirmation" && (
                      <div className="grid grid-cols-1 gap-2 bg-slate-50 rounded-lg p-2">
                        <input
                          value={submissionLink}
                          onChange={(e) => setSubmissionLink(e.target.value)}
                          placeholder="Deliverable link (optional)"
                          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                        <input
                          value={submissionNote}
                          onChange={(e) => setSubmissionNote(e.target.value)}
                          placeholder="Submission note (optional)"
                          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                      </div>
                    )}

                    {task.submission_link && (
                      <a href={task.submission_link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                        View submitted deliverable →
                      </a>
                    )}

                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Subtasks</p>
                      <div className="flex flex-col gap-1">
                        {task.subtasks.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={Boolean(s.done)} onChange={(e) => toggleSubtask(s.id, e.target.checked)} />
                            <span className={s.done ? "line-through text-slate-400" : ""}>{s.title}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          value={newSubtask}
                          onChange={(e) => setNewSubtask(e.target.value)}
                          placeholder="Add subtask"
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                        <button onClick={addSubtask} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
                          Add
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Comments</p>
                      <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                        {comments.map((c) => (
                          <div key={c.id} className="text-sm bg-slate-50 rounded px-2 py-1">
                            <span className="font-medium text-slate-700">{userById(c.author_id).name}: </span>
                            <span className="text-slate-700">{c.body}</span>
                            <div className="text-[11px] text-slate-400">{fmt(c.created_at)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment"
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                        />
                        <button onClick={addComment} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
                          Post
                        </button>
                      </div>
                    </div>

                    <details>
                      <summary className="text-sm font-medium text-slate-600 cursor-pointer">Activity log</summary>
                      <div className="flex flex-col gap-1 mt-1">
                        {activity.map((a) => (
                          <div key={a.id} className="text-xs text-slate-500">
                            {fmt(a.created_at)} — {userById(a.actor_id).name} {a.action.replace(/_/g, " ")}
                            {a.detail ? `: ${a.detail}` : ""}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
