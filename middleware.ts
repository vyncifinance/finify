import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log('[middleware] pathname:', pathname)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
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

  const { data: { user }, error } = await supabase.auth.getUser()
  console.log('[middleware] user:', user?.email ?? 'null', '| error:', error?.message ?? 'none')

  const isDashboard = pathname.startsWith('/dashboard')
  const isLogin     = pathname === '/'
  const isCadastro  = pathname === '/cadastro'

  if (!user && isDashboard) {
    console.log('[middleware] → redirecionando para login')
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && (isLogin || isCadastro)) {
    console.log('[middleware] → redirecionando para dashboard')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}