import { getCurrentUser } from "@/lib/auth";
import { addComment } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Comment body required" }, { status: 400 });

  const comment = addComment(id, me.id, body.trim());
  return NextResponse.json(comment, { status: 201 });
}
