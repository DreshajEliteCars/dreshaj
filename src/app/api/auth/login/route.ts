import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dhe passwordi janë të detyrueshëm" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Backend nuk është i konfiguruar" },
        { status: 500 }
      );
    }

    // Query admins table
    const { data: admins, error } = await supabase
      .from("admins")
      .select("id, email, emri, mbiemri, password")
      .eq("email", email)
      .single();

    if (error || !admins) {
      return NextResponse.json(
        { error: "Email ose password i gabuar" },
        { status: 401 }
      );
    }

    // Simple password check - in production, use bcrypt
    // WARNING: This assumes passwords are stored as plain text which is NOT SECURE
    if (admins.password !== password) {
      return NextResponse.json(
        { error: "Email ose password i gabuar" },
        { status: 401 }
      );
    }

    // Create a simple token (in production, use JWT)
    const token = Buffer.from(
      JSON.stringify({
        id: admins.id,
        email: admins.email,
        name: `${admins.emri} ${admins.mbiemri}`,
        iat: Date.now(),
      })
    ).toString("base64");

    return NextResponse.json({
      token,
      admin: {
        id: admins.id,
        email: admins.email,
        name: `${admins.emri} ${admins.mbiemri}`,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
