import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    id: me.id,
    name: me.name,
    timezone: me.timezone,
    awakeWindowStart: me.awake_window_start,
    awakeWindowEnd: me.awake_window_end,
  });
}
