import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

export const proxy = withAuth as unknown as (req: NextRequest) => Response | Promise<Response>;

export const config = {
  matcher: ["/dashboard/:path*", "/flashcards/:path*", "/tense/:path*", "/reading/:path*"],
};
