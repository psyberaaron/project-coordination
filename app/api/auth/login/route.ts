import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const { userId, password } = await req.json();
  if (!userId || !password) {
    return NextResponse.json({ error: "Missing userId or password" }, { status: 400 });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const token = createSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true, name: user.name });
}
