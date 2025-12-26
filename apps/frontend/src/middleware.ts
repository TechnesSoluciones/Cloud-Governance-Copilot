import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/recommendations/:path*',
    '/costs/:path*',
    '/security/:path*',
    '/assets/:path*',
    '/azure-advisor/:path*',
    '/cloud-accounts/:path*',
    '/audit-logs/:path*',
    '/incidents/:path*',
    '/settings/:path*',
    // Protect API routes except health check and auth endpoints
    '/api/((?!health|auth).*)',
  ],
};
