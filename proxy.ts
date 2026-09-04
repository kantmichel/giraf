import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// next-auth prefixes the session cookie with `__Secure-` on an https site, and
// getToken() works that out from NEXTAUTH_URL. A deployment that lets the proxy
// decide the origin (AUTH_TRUST_HOST) has no NEXTAUTH_URL to read, so fall back
// to the scheme the browser actually used — otherwise the cookie is looked up
// under the wrong name and every signed-in request bounces back to /login.
function usesSecureCookie(request: NextRequest): boolean {
  const configured = process.env.NEXTAUTH_URL;
  if (configured) return configured.startsWith("https://");
  return request.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
}

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secureCookie: usesSecureCookie(request),
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
