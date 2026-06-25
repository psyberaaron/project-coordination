import { db } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export function seed() {
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (count.c > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, password_hash, timezone, awake_window_start, awake_window_end)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    randomUUID(),
    "Ada",
    bcrypt.hashSync("ada1234", 10),
    "Asia/Manila",
    "07:00",
    "23:00"
  );

  insertUser.run(
    randomUUID(),
    "Aaron",
    bcrypt.hashSync("aaron1234", 10),
    "Asia/Manila",
    "07:00",
    "23:00"
  );

  console.log("Seeded users Ada and Aaron with default PINs (change via /api/auth/change-pin).");
}

if (require.main === module) {
  seed();
}
