import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await req.json();
  db.prepare("UPDATE users SET push_subscription = ? WHERE id = ?").run(
    JSON.stringify(subscription),
    me.id
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  db.prepare("UPDATE users SET push_subscription = NULL WHERE id = ?").run(me.id);
  return NextResponse.json({ ok: true });
}
