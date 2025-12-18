import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    // Protect API routes except health check and auth endpoints
    '/api/((?!health|auth).*)',
  ],
};
