import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths the proxy will let through without a user session. Each entry
// matches either an exact path or anything below it (e.g. '/auth' covers
// '/auth/callback'). Order doesn't matter — `Array.some` short-circuits.
//
// `/api/cron` and `/api/admin` are listed because those routes do their
// own auth (Bearer token + requireAdmin respectively) and would otherwise
// receive an HTML redirect to /login that breaks the calling client
// (e.g. the GitHub Actions cron got "Redirecting..." instead of JSON).
const PUBLIC_PATHS = ['/login', '/auth', '/api/cron', '/api/admin']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and getUser.
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve where the user was trying to go so login can return them there
    url.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
