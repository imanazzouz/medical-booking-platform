import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ data: { status: "ok", timestamp: new Date().toISOString() } }, { headers: { "cache-control": "no-store" } });
}
