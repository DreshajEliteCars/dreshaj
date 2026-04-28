import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Logout is simple - just return success
  // The client will handle clearing sessionStorage
  return NextResponse.json({ success: true });
}
