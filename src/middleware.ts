import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Ambil token dari cookie
  const token = request.cookies.get('token')?.value;

  // Cek apakah user mengakses halaman admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!token) {
      // Jika tidak ada token, tendang ke login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Jika user sudah login tapi malah buka halaman login atau beranda
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/') && token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/'],
};
