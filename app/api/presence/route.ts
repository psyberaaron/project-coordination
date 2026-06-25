import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { User } from "@/lib/types";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = db.prepare("SELECT * FROM users").all() as User[];
  const sanitized = users.map((u) => ({
    id: u.id,
    name: u.name,
    timezone: u.timezone,
    awakeWindowStart: u.awake_window_start,
    awakeWindowEnd: u.awake_window_end,
    backAtUtc: u.back_at_utc,
    backAtNote: u.back_at_note,
  }));
  return NextResponse.json(sanitized);
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { backAtUtc, backAtNote, timezone } = body as {
    backAtUtc?: string | null;
    backAtNote?: string | null;
    timezone?: string;
  };

  if (timezone) {
    db.prepare("UPDATE users SET timezone = ? WHERE id = ?").run(timezone, me.id);
  }
  if (backAtUtc !== undefined || backAtNote !== undefined) {
    db.prepare("UPDATE users SET back_at_utc = ?, back_at_note = ? WHERE id = ?").run(
      backAtUtc ?? null,
      backAtNote ?? null,
      me.id
    );
  }

  return NextResponse.json({ ok: true });
}
