import { clearSessionCookie } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  const token = store.get("session_token")?.value;
  if (token) deleteSession(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
