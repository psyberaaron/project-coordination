import { getCurrentUser, getOtherUser } from "@/lib/auth";
import { sendPushRespectingQuietHours, isPushConfigured } from "@/lib/push";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = (await req.json().catch(() => ({}))) as { message?: string };
  const other = getOtherUser(me.id);

  // Manual nudges always bypass quiet hours (urgent: true).
  const { delivered } = await sendPushRespectingQuietHours(
    other,
    {
      title: `Nudge from ${me.name}`,
      body: message?.trim() || "Needs your attention — high priority.",
      tag: "nudge",
    },
    true
  );

  return NextResponse.json({ ok: true, delivered, pushConfigured: isPushConfigured() });
}
