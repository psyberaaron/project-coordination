import { getCurrentUser } from "@/lib/auth";
import { checkDeadlines } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notified = checkDeadlines();
  return NextResponse.json({ notified: notified.length });
}
