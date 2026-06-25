import { getCurrentUser } from "@/lib/auth";
import { parseBulkDrafts } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  const drafts = parseBulkDrafts(text ?? "");
  return NextResponse.json({ drafts });
}
