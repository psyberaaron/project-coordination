import { db } from "./db";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { User } from "./types";

const SESSION_COOKIE = "session_token";

export function createSession(userId: string): string {
  const token = randomUUID();
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getUserByToken(token: string): User | null {
  const row = db
    .prepare(
      `SELECT u.* FROM users u
       JOIN sessions s ON s.user_id = u.id
       WHERE s.token = ?`
    )
    .get(token) as User | undefined;
  return row ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserByToken(token);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function getOtherUser(currentUserId: string): User {
  const row = db.prepare("SELECT * FROM users WHERE id != ?").get(currentUserId) as User;
  return row;
}

export function getUserById(id: string): User | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
  return row ?? null;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
