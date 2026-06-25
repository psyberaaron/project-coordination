import { getCurrentUser } from "@/lib/auth";
import { confirmTask, type ConfirmAction } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action, comment } = (await req.json()) as { action: ConfirmAction; comment?: string };
  if (action !== "approve" && action !== "request_changes") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const task = confirmTask(id, me.id, action, comment);
  return NextResponse.json(task);
}
