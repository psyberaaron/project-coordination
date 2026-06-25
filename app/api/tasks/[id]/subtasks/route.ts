import { getCurrentUser } from "@/lib/auth";
import { addSubtask } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const subtask = addSubtask(id, title.trim());
  return NextResponse.json(subtask, { status: 201 });
}
