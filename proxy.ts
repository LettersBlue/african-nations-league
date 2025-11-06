import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/tournament/matches',
    '/tournament/scorers',
    '/tournament/history',
  ];
  
  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Admin routes
  if (pathname.startsWith('/admin')) {
    // TODO: Check if user is admin
    // For now, allow access (will be implemented with auth)
    return NextResponse.next();
  }
  
  // Representative routes
  if (pathname.startsWith('/representative')) {
    // TODO: Check if user is representative
    // For now, allow access (will be implemented with auth)
    return NextResponse.next();
  }
  
  // Default: allow access (will be properly implemented with Firebase Auth)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};



