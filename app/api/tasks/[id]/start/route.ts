import { getCurrentUser } from "@/lib/auth";
import { startTask } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = startTask(id, me.id);
  return NextResponse.json(task);
}
