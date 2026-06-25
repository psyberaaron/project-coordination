"use client";

import { useState } from "react";

interface PresenceUser {
  id: string;
  name: string;
}

interface Draft {
  title: string;
  assigneeId: string;
  priority: string;
  requiresConfirmation: boolean;
}

interface BulkAddModalProps {
  me: PresenceUser;
  other: PresenceUser;
  onClose: () => void;
  onSaved: () => void;
}

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export default function BulkAddModal({ me, other, onClose, onSaved }: BulkAddModalProps) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function parse() {
    setBusy(true);
    const res = await fetch("/api/tasks/bulk-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setDrafts(
      (data.drafts as string[]).map((title) => ({
        title,
        assigneeId: me.id,
        priority: "Medium",
        requiresConfirmation: false,
      }))
    );
    setBusy(false);
  }

  function updateDraft(i: number, patch: Partial<Draft>) {
    setDrafts((d) => d?.map((draft, idx) => (idx === i ? { ...draft, ...patch } : draft)) ?? null);
  }

  function removeDraft(i: number) {
    setDrafts((d) => d?.filter((_, idx) => idx !== i) ?? null);
  }

  async function save() {
    if (!drafts?.length) return;
    setBusy(true);
    await fetch("/api/tasks/bulk-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: drafts }),
    });
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Bulk add tasks</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {!drafts ? (
          <>
            <p className="text-sm text-slate-500">
              Paste a block of text (e.g. copied from a Teams message) — one task per line.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder={"- Draft Q3 report\n- Follow up with vendor\n- Book flight for next trip"}
            />
            <button
              onClick={parse}
              disabled={busy || !text.trim()}
              className="bg-slate-800 text-white rounded-lg px-4 py-2 font-medium hover:bg-slate-900 disabled:opacity-50"
            >
              Split into drafts
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {drafts.length} draft{drafts.length === 1 ? "" : "s"} — review before saving.
            </p>
            <div className="flex flex-col gap-2">
              {drafts.map((d, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-2 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      value={d.title}
                      onChange={(e) => updateDraft(i, { title: e.target.value })}
                      className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                    />
                    <button onClick={() => removeDraft(i)} className="text-slate-400 hover:text-red-600 text-sm px-1">
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <select
                      value={d.assigneeId}
                      onChange={(e) => updateDraft(i, { assigneeId: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1"
                    >
                      <option value={me.id}>{me.name}</option>
                      <option value={other.id}>{other.name}</option>
                    </select>
                    <select
                      value={d.priority}
                      onChange={(e) => updateDraft(i, { priority: e.target.value })}
                      className="border border-slate-300 rounded px-2 py-1"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-slate-600">
                      <input
                        type="checkbox"
                        checked={d.requiresConfirmation}
                        onChange={(e) => updateDraft(i, { requiresConfirmation: e.target.checked })}
                      />
                      Needs confirmation
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDrafts(null)} className="text-slate-500 px-3 py-2 text-sm hover:text-slate-800">
                Back
              </button>
              <button
                onClick={save}
                disabled={busy || drafts.length === 0}
                className="bg-slate-800 text-white rounded-lg px-4 py-2 font-medium hover:bg-slate-900 disabled:opacity-50"
              >
                Save {drafts.length} task{drafts.length === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
