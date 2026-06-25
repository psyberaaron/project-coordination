import { getCurrentUser } from "@/lib/auth";
import {
  getTaskById,
  updateTask,
  deleteTask,
  getTaskTags,
  getSubtasks,
  getAttachments,
  getComments,
  getActivityLog,
} from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = getTaskById(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...task,
    tags: getTaskTags(id),
    subtasks: getSubtasks(id),
    attachments: getAttachments(id),
    comments: getComments(id),
    activityLog: getActivityLog(id),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const task = updateTask(id, me.id, {
    title: body.title,
    description: body.description,
    assigneeId: body.assigneeId,
    priority: body.priority,
    deadlineUtc: body.deadlineUtc,
    tags: body.tags,
  });

  return NextResponse.json(task);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  deleteTask(id);
  return NextResponse.json({ ok: true });
}
