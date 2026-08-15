import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// POST-only: a GET logout gets triggered by Next.js Link prefetching,
// which silently destroys the session as soon as a page linking to it renders.
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
