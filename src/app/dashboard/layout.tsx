'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, ArrowLeftRight, Target, User, LogOut, Menu, ChevronLeft
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/movimentos', icon: ArrowLeftRight,  label: 'Movimentos' },
  { href: '/dashboard/metas',      icon: Target,          label: 'Metas' },
  { href: '/dashboard/perfil',     icon: User,            label: 'Perfil' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [nome, setNome]           = useState('')
  const [familia, setFamilia]     = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function buscar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data: profile } = await supabase
        .from('profiles').select('nome, familias(nome)')
        .eq('id', session.user.id).single()
      if (profile) {
        setNome(profile.nome || '')
        setFamilia((profile.familias as any)?.nome || '')
      }
    }
    buscar()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const inicial = nome ? nome[0].toUpperCase() : 'U'

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden flex flex-col min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <main key={pathname} className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
          <div className="grid grid-cols-4">
            {NAV.map(item => {
              const active = pathname === item.href
              const Icon   = item.icon
              return (
                <Link key={item.href} href={item.href}
                  className="flex flex-col items-center justify-center py-3 gap-1 transition-all"
                  style={{ color: active ? '#0B4D3B' : '#94A3B8' }}>
                  <Icon size={20} strokeWidth={active ? 2 : 1.75} />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex h-screen overflow-hidden" style={{ backgroundColor: '#F8FAFC' }}>
        <aside className="flex flex-col flex-shrink-0 transition-all duration-300"
          style={{ width: collapsed ? '76px' : '224px', backgroundColor: '#0B4D3B' }}>
          <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(16,185,129,0.18)', minWidth: '32px' }}>
              <span className="text-sm font-bold" style={{ color: '#6EE7B7' }}>F</span>
            </div>
            {!collapsed && <span className="text-lg font-semibold text-white tracking-tight">finify</span>}
          </div>
          <nav className="flex-1 px-3 pt-2 flex flex-col gap-1 overflow-y-auto">
            {NAV.map(item => {
              const active = pathname === item.href
              const Icon   = item.icon
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium"
                  style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  }}>
                  <Icon size={18} className="flex-shrink-0" strokeWidth={1.75} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>
          <div className="p-3 flex-shrink-0">
            {!collapsed && (
              <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                  style={{ backgroundColor: '#10B981', color: '#0B4D3B', minWidth: '32px' }}>
                  {inicial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{nome}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{familia}</p>
                </div>
              </div>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
              <LogOut size={17} strokeWidth={1.75} className="flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="absolute top-6 z-10" style={{ left: collapsed ? '88px' : '236px' }}>
            <button onClick={() => setCollapsed(!collapsed)}
              className="w-8 h-8 rounded-full flex items-center justify-center border transition-all"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#64748B' }}>
              {collapsed ? <Menu size={15} strokeWidth={2} /> : <ChevronLeft size={15} strokeWidth={2} />}
            </button>
          </div>
          <main key={pathname} className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
