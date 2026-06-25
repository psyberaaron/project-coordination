import { db } from "./db";
import { randomUUID } from "crypto";
import type { Task, Subtask, Tag, Attachment, Comment, ActivityLogEntry, TaskStatus } from "./types";
import { getUserById, getOtherUser } from "./auth";
import { sendPushRespectingQuietHours } from "./push";

function logActivity(taskId: string, actorId: string, action: string, detail?: string | null) {
  db.prepare(
    "INSERT INTO activity_log (id, task_id, actor_id, action, detail) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), taskId, actorId, action, detail ?? null);
}

function touchTask(taskId: string) {
  db.prepare("UPDATE tasks SET updated_at = datetime('now') WHERE id = ?").run(taskId);
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  createdBy: string;
  assigneeId: string;
  priority?: string;
  deadlineUtc?: string | null;
  requiresConfirmation?: boolean;
  subtasks?: string[];
  tags?: string[];
}

export function createTask(input: CreateTaskInput): Task {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO tasks (id, title, description, created_by, assignee_id, priority, deadline_utc, requires_confirmation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title,
    input.description ?? null,
    input.createdBy,
    input.assigneeId,
    input.priority ?? "Medium",
    input.deadlineUtc ?? null,
    input.requiresConfirmation ? 1 : 0
  );

  if (input.subtasks?.length) {
    const insertSub = db.prepare(
      "INSERT INTO subtasks (id, task_id, title, sort_order) VALUES (?, ?, ?, ?)"
    );
    input.subtasks.forEach((title, i) => insertSub.run(randomUUID(), id, title, i));
  }

  if (input.tags?.length) {
    setTaskTags(id, input.tags);
  }

  logActivity(id, input.createdBy, "created", input.title);

  return getTaskById(id)!;
}

export function getTaskById(id: string): Task | null {
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
  return row ?? null;
}

export interface TaskFilter {
  assigneeId?: string;
  status?: TaskStatus;
}

export function listTasks(filter: TaskFilter = {}): Task[] {
  let query = "SELECT * FROM tasks WHERE 1=1";
  const params: unknown[] = [];
  if (filter.assigneeId) {
    query += " AND assignee_id = ?";
    params.push(filter.assigneeId);
  }
  if (filter.status) {
    query += " AND status = ?";
    params.push(filter.status);
  }
  query += " ORDER BY (deadline_utc IS NULL), deadline_utc ASC, created_at DESC";
  return db.prepare(query).all(...params) as Task[];
}

export function ensureTags(names: string[]): Tag[] {
  const tags: Tag[] = [];
  const insert = db.prepare("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)");
  const select = db.prepare("SELECT * FROM tags WHERE name = ?");
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    insert.run(randomUUID(), trimmed);
    tags.push(select.get(trimmed) as Tag);
  }
  return tags;
}

export function setTaskTags(taskId: string, tagNames: string[]) {
  const tags = ensureTags(tagNames);
  db.prepare("DELETE FROM task_tags WHERE task_id = ?").run(taskId);
  const insert = db.prepare("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)");
  for (const tag of tags) insert.run(taskId, tag.id);
}

export function getTaskTags(taskId: string): Tag[] {
  return db
    .prepare(
      `SELECT t.* FROM tags t
       JOIN task_tags tt ON tt.tag_id = t.id
       WHERE tt.task_id = ?`
    )
    .all(taskId) as Tag[];
}

export function getSubtasks(taskId: string): Subtask[] {
  return db
    .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order")
    .all(taskId) as Subtask[];
}

export function addSubtask(taskId: string, title: string): Subtask {
  const id = randomUUID();
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM subtasks WHERE task_id = ?")
    .get(taskId) as { m: number };
  db.prepare("INSERT INTO subtasks (id, task_id, title, sort_order) VALUES (?, ?, ?, ?)").run(
    id,
    taskId,
    title,
    maxOrder.m + 1
  );
  touchTask(taskId);
  return db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id) as Subtask;
}

export function toggleSubtask(subtaskId: string, done: boolean) {
  db.prepare("UPDATE subtasks SET done = ? WHERE id = ?").run(done ? 1 : 0, subtaskId);
  const row = db.prepare("SELECT task_id FROM subtasks WHERE id = ?").get(subtaskId) as
    | { task_id: string }
    | undefined;
  if (row) touchTask(row.task_id);
}

export function deleteSubtask(subtaskId: string) {
  const row = db.prepare("SELECT task_id FROM subtasks WHERE id = ?").get(subtaskId) as
    | { task_id: string }
    | undefined;
  db.prepare("DELETE FROM subtasks WHERE id = ?").run(subtaskId);
  if (row) touchTask(row.task_id);
}

export function getAttachments(taskId: string): Attachment[] {
  return db.prepare("SELECT * FROM attachments WHERE task_id = ?").all(taskId) as Attachment[];
}

export function addAttachment(taskId: string, url: string, label?: string | null): Attachment {
  const id = randomUUID();
  db.prepare("INSERT INTO attachments (id, task_id, url, label) VALUES (?, ?, ?, ?)").run(
    id,
    taskId,
    url,
    label ?? null
  );
  touchTask(taskId);
  return db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as Attachment;
}

export function getComments(taskId: string): Comment[] {
  return db
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at")
    .all(taskId) as Comment[];
}

export function addComment(taskId: string, authorId: string, body: string): Comment {
  const id = randomUUID();
  db.prepare("INSERT INTO comments (id, task_id, author_id, body) VALUES (?, ?, ?, ?)").run(
    id,
    taskId,
    authorId,
    body
  );
  logActivity(taskId, authorId, "commented", body);
  touchTask(taskId);
  return db.prepare("SELECT * FROM comments WHERE id = ?").get(id) as Comment;
}

export function getActivityLog(taskId: string): ActivityLogEntry[] {
  return db
    .prepare("SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at")
    .all(taskId) as ActivityLogEntry[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  assigneeId?: string;
  priority?: string;
  deadlineUtc?: string | null;
  tags?: string[];
}

export function updateTask(taskId: string, actorId: string, patch: UpdateTaskInput): Task {
  const task = getTaskById(taskId);
  if (!task) throw new Error("Task not found");

  const fields: string[] = [];
  const params: unknown[] = [];

  if (patch.title !== undefined) {
    fields.push("title = ?");
    params.push(patch.title);
  }
  if (patch.description !== undefined) {
    fields.push("description = ?");
    params.push(patch.description);
  }
  if (patch.priority !== undefined) {
    fields.push("priority = ?");
    params.push(patch.priority);
  }
  if (patch.deadlineUtc !== undefined) {
    fields.push("deadline_utc = ?");
    params.push(patch.deadlineUtc);
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== task.assignee_id) {
    fields.push("assignee_id = ?");
    params.push(patch.assigneeId);
    logActivity(taskId, actorId, "assigned", patch.assigneeId);
  }

  if (fields.length) {
    fields.push("updated_at = datetime('now')");
    db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...params, taskId);
  }

  if (patch.tags !== undefined) {
    setTaskTags(taskId, patch.tags);
  }

  return getTaskById(taskId)!;
}

function setStatus(taskId: string, actorId: string, status: TaskStatus, detail?: string | null) {
  db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
    status,
    taskId
  );
  logActivity(taskId, actorId, "status_changed", detail ?? status);
}

export function startTask(taskId: string, actorId: string): Task {
  setStatus(taskId, actorId, "InProgress");
  return getTaskById(taskId)!;
}

export function blockTask(taskId: string, actorId: string, question: string): Task {
  db.prepare("UPDATE tasks SET blocking_question = ?, updated_at = datetime('now') WHERE id = ?").run(
    question,
    taskId
  );
  setStatus(taskId, actorId, "Blocked", question);
  notifyOther(taskId, actorId, "Blocked / needs clarification", question);
  return getTaskById(taskId)!;
}

export function unblockTask(taskId: string, actorId: string): Task {
  db.prepare("UPDATE tasks SET blocking_question = NULL, updated_at = datetime('now') WHERE id = ?").run(
    taskId
  );
  setStatus(taskId, actorId, "InProgress", "clarification resolved");
  return getTaskById(taskId)!;
}

export interface SubmitTaskInput {
  link?: string | null;
  note?: string | null;
}

export function submitTask(taskId: string, actorId: string, input: SubmitTaskInput): Task {
  const task = getTaskById(taskId);
  if (!task) throw new Error("Task not found");

  db.prepare(
    "UPDATE tasks SET submission_link = ?, submission_note = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(input.link ?? null, input.note ?? null, taskId);

  const nextStatus: TaskStatus = task.requires_confirmation ? "PendingConfirmation" : "Done";
  setStatus(taskId, actorId, nextStatus, "submitted");
  logActivity(taskId, actorId, "submitted", input.link ?? input.note ?? "");

  if (nextStatus === "PendingConfirmation") {
    notifyOther(taskId, actorId, "Task submitted — needs your confirmation", task.title);
  }

  return getTaskById(taskId)!;
}

export type ConfirmAction = "approve" | "request_changes";

export function confirmTask(
  taskId: string,
  actorId: string,
  action: ConfirmAction,
  comment?: string | null
): Task {
  if (comment) addComment(taskId, actorId, comment);

  if (action === "approve") {
    setStatus(taskId, actorId, "Done", "approved");
    logActivity(taskId, actorId, "approved", comment ?? null);
  } else {
    setStatus(taskId, actorId, "InProgress", "changes requested");
    logActivity(taskId, actorId, "changes_requested", comment ?? null);
    notifyOther(taskId, actorId, "Changes requested on your task", comment ?? "");
  }

  return getTaskById(taskId)!;
}

function notifyOther(taskId: string, actorId: string, title: string, body: string) {
  const actor = getUserById(actorId);
  if (!actor) return;
  const other = getOtherUser(actorId);
  sendPushRespectingQuietHours(other, { title, body, tag: `task-${taskId}` }, false).catch(() => {});
}

export function deleteTask(taskId: string) {
  db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
}

/**
 * Sends a deadline reminder push for tasks whose deadline has passed or is within
 * the next hour, that aren't already Done, and haven't been notified yet. Marks
 * each as notified so repeated calls (e.g. periodic client polling) don't re-send.
 */
export function checkDeadlines(): Task[] {
  const dueSoon = db
    .prepare(
      `SELECT * FROM tasks
       WHERE deadline_utc IS NOT NULL
         AND status != 'Done'
         AND deadline_notified_at IS NULL
         AND datetime(deadline_utc) <= datetime('now', '+1 hour')`
    )
    .all() as Task[];

  for (const task of dueSoon) {
    db.prepare("UPDATE tasks SET deadline_notified_at = datetime('now') WHERE id = ?").run(task.id);
    const assignee = getUserById(task.assignee_id);
    if (!assignee) continue;
    const overdue = new Date(task.deadline_utc!) < new Date();
    const urgent = task.priority === "Urgent";
    sendPushRespectingQuietHours(
      assignee,
      {
        title: overdue ? "Task overdue" : "Task deadline approaching",
        body: task.title,
        tag: `task-${task.id}`,
      },
      urgent
    ).catch(() => {});
  }

  return dueSoon;
}

/** Splits a pasted block of text into draft task titles, one per non-empty line. */
export function parseBulkDrafts(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0);
}
