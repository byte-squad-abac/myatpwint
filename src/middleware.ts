import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Public paths that don't require authentication (unused variable removed)

  // Auth pages
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  // Protected dashboard paths
  const isDashboardPath = pathname.startsWith('/author') || 
                         pathname.startsWith('/editor') || 
                         pathname.startsWith('/publisher') ||
                         pathname.startsWith('/library') ||
                         pathname.startsWith('/manuscript-editor') ||
                         pathname.startsWith('/read')

  // Redirect logic
  if (isAuthPage && user) {
    // User is logged in but trying to access auth pages, redirect to appropriate dashboard
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role || 'user'
      const redirectPath = role === 'author' ? '/author' : 
                          role === 'editor' ? '/editor' : 
                          role === 'publisher' ? '/publisher' : '/books'
      
      return NextResponse.redirect(new URL(redirectPath, request.url))
    } catch (error) {
      console.error('Middleware profile fetch error:', error)
      // Fallback redirect
      return NextResponse.redirect(new URL('/books', request.url))
    }
  }

  if (isDashboardPath && !user) {
    // User is not logged in but trying to access protected pages
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isDashboardPath && user) {
    // User is logged in, check role-based access with timeout
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      )
      
      const { data: profile } = await Promise.race([profilePromise, timeoutPromise]) as { data: { role?: string } | null }
      const userRole = profile?.role

      // Role-based access control
      if (pathname.startsWith('/author') && userRole !== 'author') {
        const correctDashboard = userRole === 'editor' ? '/editor' : 
                                userRole === 'publisher' ? '/publisher' : '/books'
        return NextResponse.redirect(new URL(correctDashboard, request.url))
      }

      if (pathname.startsWith('/editor') && userRole !== 'editor') {
        const correctDashboard = userRole === 'author' ? '/author' : 
                                userRole === 'publisher' ? '/publisher' : '/books'
        return NextResponse.redirect(new URL(correctDashboard, request.url))
      }

      if (pathname.startsWith('/publisher') && userRole !== 'publisher') {
        const correctDashboard = userRole === 'author' ? '/author' : 
                                userRole === 'editor' ? '/editor' : '/books'
        return NextResponse.redirect(new URL(correctDashboard, request.url))
      }
    } catch (error) {
      console.error('Middleware role check timeout:', error)
      // Continue without role check if timeout occurs
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}