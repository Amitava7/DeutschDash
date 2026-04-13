import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";
import { rateLimit } from "@/lib/rate-limit";

const API_RATE_LIMIT = 30;
const API_RATE_WINDOW_MS = 60_000;

const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 60_000;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const isAuth = pathname.startsWith("/api/auth/");
    const limit = isAuth ? AUTH_RATE_LIMIT : API_RATE_LIMIT;
    const window = isAuth ? AUTH_RATE_WINDOW_MS : API_RATE_WINDOW_MS;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const key = isAuth ? `auth:${ip}` : ip;
    const result = rateLimit(key, limit, window);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(result.resetMs / 1000)),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  const authMiddleware = withAuth({ pages: { signIn: "/login" } });
  return (authMiddleware as unknown as (req: NextRequest) => Response | Promise<Response>)(request);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/flashcards/:path*",
    "/tense/:path*",
    "/reading/:path*",
    "/case/:path*",
    "/crossword/:path*",
  ],
};
