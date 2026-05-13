import { NextResponse } from "next/server";
import { honeypotAdminCookieName, honeypotAdminCookieOptions } from "@/lib/honeypot-admin";

export async function POST() {
  try {
    const response = NextResponse.json({ message: "Logged out successfully" });
    
    // Clear the auth token cookie
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/"
    });

    response.cookies.set(honeypotAdminCookieName(), "", {
      ...honeypotAdminCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
