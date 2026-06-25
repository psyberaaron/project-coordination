export type TaskStatus = "Todo" | "InProgress" | "Blocked" | "PendingConfirmation" | "Done";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface User {
  id: string;
  name: string;
  password_hash: string;
  timezone: string;
  awake_window_start: string;
  awake_window_end: string;
  back_at_utc: string | null;
  back_at_note: string | null;
  push_subscription: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  assignee_id: string;
  priority: TaskPriority;
  deadline_utc: string | null;
  status: TaskStatus;
  requires_confirmation: number;
  blocking_question: string | null;
  submission_link: string | null;
  submission_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: number;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  url: string;
  label: string | null;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  task_id: string;
  actor_id: string;
  action: string;
  detail: string | null;
  created_at: string;
}
