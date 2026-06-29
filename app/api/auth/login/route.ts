import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;
  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 401 });
  }

  const token = createSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, name: user.name });
}
