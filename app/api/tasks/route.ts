import { getCurrentUser } from "@/lib/auth";
import { createTask, listTasks, getTaskTags, getSubtasks } from "@/lib/tasks";
import { NextResponse } from "next/server";
import type { TaskStatus } from "@/lib/types";

export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assigneeId = searchParams.get("assigneeId") ?? undefined;
  const status = (searchParams.get("status") as TaskStatus | null) ?? undefined;

  const tasks = listTasks({ assigneeId, status });
  const withExtras = tasks.map((t) => ({
    ...t,
    tags: getTaskTags(t.id),
    subtasks: getSubtasks(t.id),
  }));

  return NextResponse.json(withExtras);
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const task = createTask({
    title: body.title,
    description: body.description ?? null,
    createdBy: me.id,
    assigneeId: body.assigneeId ?? me.id,
    priority: body.priority,
    deadlineUtc: body.deadlineUtc ?? null,
    requiresConfirmation: Boolean(body.requiresConfirmation),
    subtasks: body.subtasks ?? [],
    tags: body.tags ?? [],
  });

  return NextResponse.json(task, { status: 201 });
}
