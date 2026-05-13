import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isIpBlockedInMemory } from "@/lib/blocked-ips-memory";
import { findDecoyCredentialHits } from "@/lib/honeypot-decoy";

function getClientIpMw(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

const honeypotDecoyPrefixes = [
  "/admin",
  "/administrator",
  "/wp-admin",
  "/wp-login.php",
  "/phpmyadmin",
  "/.git",
  "/.env",
  "/server-status",
  "/backup",
  "/api/internal",
  "/api/debug",
  "/api/admin",
];

const honeypotSensitiveFilePattern = /\.(bak|old|sql|zip|tar|gz)$/i;

function shouldRouteToHoneypot(pathname: string): boolean {
  if (
    pathname.startsWith("/api/honeypot") ||
    pathname.startsWith("/api/security/honeypot-logs")
  ) {
    return false;
  }

  const lowerPath = pathname.toLowerCase();

  if (honeypotSensitiveFilePattern.test(lowerPath)) {
    return true;
  }

  return honeypotDecoyPrefixes.some((prefix) => lowerPath.startsWith(prefix));
}

function getDecoyCredentialReuseHits(request: NextRequest): string[] {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/honeypot")) {
    return [];
  }

  const searchParamsRaw = request.nextUrl.searchParams.toString();
  const candidateSignals = [
    pathname,
    searchParamsRaw,
    request.headers.get("authorization") ?? "",
    request.headers.get("cookie") ?? "",
    request.headers.get("x-api-key") ?? "",
    request.headers.get("x-auth-token") ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  return findDecoyCredentialHits(candidateSignals);
}

function rewriteToHoneypot(
  request: NextRequest,
  targetPath: string,
  options?: {
    reason?: string;
    hits?: string[];
  },
) {
  const honeypotUrl = request.nextUrl.clone();
  honeypotUrl.pathname = "/api/honeypot/trap";
  honeypotUrl.search = "";

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-honeypot-target", targetPath);

  if (options?.reason) {
    forwardedHeaders.set("x-honeypot-reason", options.reason);
  }

  if (options?.hits && options.hits.length > 0) {
    forwardedHeaders.set("x-honeypot-hits", options.hits.join(","));
  }

  return NextResponse.rewrite(honeypotUrl, {
    request: {
      headers: forwardedHeaders,
    },
  });
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const authToken = request.cookies.get("auth_token")?.value;
  const honeypotEnabled = process.env.HONEYPOT_ENABLED !== "false";

  // ── IP Firewall: block banned hackers ──
  const clientIp = getClientIpMw(request);
  if (
    clientIp !== "unknown" &&
    isIpBlockedInMemory(clientIp) &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/favicon")
  ) {
    console.log(`[FIREWALL] BLOCKED request from ${clientIp} → ${pathname}`);
    return new NextResponse(
      '<html><body style="background:#0a0a0a;color:#ff3333;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>⛔ ACCESS DENIED</h1><p>Your IP has been blocked by MarEye Security.</p><p style="color:#666">Incident logged. Continued access attempts will be reported.</p></div></body></html>',
      {
        status: 403,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  if (honeypotEnabled && shouldRouteToHoneypot(pathname)) {
    return rewriteToHoneypot(request, pathname);
  }

  if (honeypotEnabled) {
    const decoyHits = getDecoyCredentialReuseHits(request);
    if (decoyHits.length > 0) {
      console.log(
        `[HONEYPOT] Decoy credential reuse detected from ${clientIp} at ${pathname} (${decoyHits.join(",")})`,
      );

      return rewriteToHoneypot(request, pathname, {
        reason: "decoy-credential-reuse",
        hits: decoyHits,
      });
    }
  }

  console.log(
    `[Middleware] ${pathname} | auth_token: ${authToken ? "PRESENT" : "MISSING"}`,
  );

  const protectedRoutes = [
    "/profile",
    "/security/honeypot",
    "/command-center",
    "/detection",
    "/cnn",
    "/analytics",
    "/intelligence",
    "/war-room",
    "/mission-planner",
    "/threat-prediction",
  ];
  const authPages = ["/auth/login", "/auth/register"];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthPage = authPages.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (isProtectedRoute && !authToken) {
    console.log(`[Middleware] REDIRECT → /try (no auth_token for ${pathname})`);
    return NextResponse.redirect(new URL("/try", request.url));
  }

  if (isAuthPage && authToken) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
