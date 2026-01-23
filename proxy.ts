import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticatedUser } from "@/services/aws/amplify-server-utils";

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();

  const { pathname } = request.nextUrl;

  // Only check authentication for the subscription management page
  const isManageSubscriptionRoute = pathname.startsWith("/subscriptions/manage");

  if (isManageSubscriptionRoute) {
    // Check for an authenticated user
    const user = await authenticatedUser({ request, response });

    // If not authenticated, redirect to login
    if (!user) {
      const url = new URL("/login", request.url);
      // Store the intended destination
      url.searchParams.set("redirect", pathname);
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
