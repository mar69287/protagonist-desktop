import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();

  const { pathname } = request.nextUrl;

  // Routes that require an authenticated user. Non-authed visits are
  // redirected to /login with a ?redirect=... param so the login flow can
  // send them back here once signed in.
  const isProtectedRoute =
    pathname.startsWith("/subscriptions/manage") ||
    pathname.startsWith("/admin");

  if (isProtectedRoute) {
    // Check for an authenticated user
    const user = await authenticatedUser({ request, response });

    // If not authenticated, redirect to login
    if (!user) {
      const url = new URL("/login", request.url);
      // Store the intended destination (including any query string)
      const fullPath = `${pathname}${request.nextUrl.search || ""}`;
      url.searchParams.set("redirect", fullPath);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  /**
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - public folder files (images, fonts, etc.)
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.pdf$|.*\\.ttf$|.*\\.woff$|.*\\.woff2$|.*\\.eot$|.*\\.svg$|.*\\.ico$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.json$).*)",
  ],
};
