import { getCurrentUser } from "@/lib/auth";
import { toggleSubtask, deleteSubtask } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subtaskId } = await params;
  const { done } = await req.json();
  toggleSubtask(subtaskId, Boolean(done));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subtaskId } = await params;
  deleteSubtask(subtaskId);
  return NextResponse.json({ ok: true });
}
