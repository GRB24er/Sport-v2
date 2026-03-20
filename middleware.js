import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes - require admin role
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Dashboard routes - require approved user (not admin, not pending/rejected/suspended)
    if (pathname.startsWith("/dashboard")) {
      if (!token || token.role === "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (token.status && token.status !== "approved") {
        const url = new URL("/login", req.url);
        const msgs = {
          pending: "Account pending — payment verification in progress",
          rejected: "Account rejected. Contact our team for assistance.",
          suspended: "Account suspended. Contact our team for assistance.",
          banned: "Account has been permanently banned.",
          blocked: "Account is temporarily blocked. Contact our team for assistance.",
        };
        url.searchParams.set("error", msgs[token.status] || "Account not active");
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
