import { getCurrentUser } from "@/lib/auth";
import { blockTask } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { question } = await req.json();
  if (!question?.trim()) {
    return NextResponse.json({ error: "Blocking question required" }, { status: 400 });
  }

  const task = blockTask(id, me.id, question.trim());
  return NextResponse.json(task);
}
