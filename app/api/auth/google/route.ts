import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthorizationUrl, getBaseUrlFromRequest } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrlFromRequest(request);
    const url = getGoogleAuthorizationUrl(baseUrl);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Google OAuth start error:", error);
    return NextResponse.json({ message: "Failed to start Google OAuth" }, { status: 500 });
  }
}
