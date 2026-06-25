import { getCurrentUser } from "@/lib/auth";
import { submitTask } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { link, note } = await req.json().catch(() => ({}));
  const task = submitTask(id, me.id, { link, note });
  return NextResponse.json(task);
}
