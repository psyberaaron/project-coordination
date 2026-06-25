import webpush from "web-push";
import { db } from "./db";
import type { User } from "./types";
import { isWithinAwakeWindow } from "./time";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:ops@psyberscribe.com", VAPID_PUBLIC, VAPID_PRIVATE);
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
}

export async function sendPushToUser(
  user: User,
  payload: { title: string; body: string; tag?: string }
): Promise<boolean> {
  if (!isPushConfigured() || !user.push_subscription) return false;
  try {
    const sub = JSON.parse(user.push_subscription);
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error("push send failed", err);
    if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
      db.prepare("UPDATE users SET push_subscription = NULL WHERE id = ?").run(user.id);
    }
    return false;
  }
}

/**
 * Sends a push to `recipient`, suppressing it during the recipient's own
 * off-hours (quiet hours) unless `urgent` is true. Manual nudges should
 * always pass `urgent: true` so they bypass quiet hours.
 */
export async function sendPushRespectingQuietHours(
  recipient: User,
  payload: { title: string; body: string; tag?: string },
  urgent: boolean
): Promise<{ delivered: boolean; suppressed: boolean }> {
  if (!urgent) {
    const awake = isWithinAwakeWindow(
      new Date(),
      recipient.timezone,
      recipient.awake_window_start,
      recipient.awake_window_end
    );
    if (!awake) return { delivered: false, suppressed: true };
  }
  const delivered = await sendPushToUser(recipient, payload);
  return { delivered, suppressed: false };
}
