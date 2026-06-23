import { createAdminClient } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('familia_id')
      .eq('id', user.id)
      .single()

    if (!profile?.familia_id) return NextResponse.json({ membros: [] })

    const { data: membros } = await admin
      .from('profiles')
      .select('id, nome, email')
      .eq('familia_id', profile.familia_id)

    return NextResponse.json({ membros: membros || [] })
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}