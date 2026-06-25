import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = db.prepare("SELECT id, name FROM users ORDER BY name").all();
  return NextResponse.json(rows);
}
