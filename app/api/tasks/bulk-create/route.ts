import { getCurrentUser } from "@/lib/auth";
import { createTask } from "@/lib/tasks";
import { NextResponse } from "next/server";

interface BulkTaskInput {
  title: string;
  assigneeId: string;
  priority?: string;
  deadlineUtc?: string | null;
  requiresConfirmation?: boolean;
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tasks } = (await req.json()) as { tasks: BulkTaskInput[] };
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
  }

  const created = tasks
    .filter((t) => t.title?.trim())
    .map((t) =>
      createTask({
        title: t.title.trim(),
        createdBy: me.id,
        assigneeId: t.assigneeId,
        priority: t.priority,
        deadlineUtc: t.deadlineUtc ?? null,
        requiresConfirmation: t.requiresConfirmation,
      })
    );

  return NextResponse.json({ tasks: created });
}
