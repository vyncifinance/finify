'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, ArrowLeftRight, Target, User, LogOut, Menu, ChevronLeft, TrendingUp
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',               icon: LayoutDashboard, label: 'Dashboard'     },
  { href: '/dashboard/movimentos',    icon: ArrowLeftRight,  label: 'Movimentos'    },
  { href: '/dashboard/metas',         icon: Target,          label: 'Metas'         },
  { href: '/dashboard/investimentos', icon: TrendingUp,      label: 'Investimentos' },
  { href: '/dashboard/perfil',        icon: User,            label: 'Perfil'        },
]

// Bottom nav mobile: só 5 itens (todos)
const NAV_MOBILE = NAV

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [nome, setNome]           = useState('')
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
      if (profile) setNome(profile.nome || '')
    }
    buscar()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function navegar(href: string) {
    window.location.assign(href + '?reload=' + Date.now())
  }

  const inicial = nome ? nome[0].toUpperCase() : 'U'

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden flex flex-col min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${NAV_MOBILE.length}, 1fr)` }}>
            {NAV_MOBILE.map(item => {
              const active = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <button key={item.href} onClick={() => navegar(item.href)}
                  className="flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all w-full"
                  style={{ color: active ? '#0B3B2E' : '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Icon size={19} strokeWidth={active ? 2 : 1.75} />
                  <span style={{ fontSize: '9.5px', fontWeight: active ? 600 : 500 }}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex h-screen overflow-hidden" style={{ backgroundColor: '#F8FAFC' }}>
        <aside className="flex flex-col flex-shrink-0 transition-all duration-300"
          style={{
            width: collapsed ? '72px' : '220px',
            background: 'linear-gradient(180deg, #06261F 0%, #0A342A 60%, #0D3F31 100%)',
          }}>

          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0">
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
              background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(47,179,106,0.35)',
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 4h12v3H7.5v2.5H13v3H7.5V16H4V4z" fill="white" fillOpacity="0.95"/>
              </svg>
            </div>
            {!collapsed && (
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '-0.4px' }}>
                finify
              </span>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-2.5 pt-2 flex flex-col gap-0.5 overflow-y-auto">
            {NAV.map(item => {
              const active = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <button key={item.href} onClick={() => navegar(item.href)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium w-full"
                  style={{
                    backgroundColor: active ? 'rgba(47,179,106,0.15)' : 'transparent',
                    color: active ? '#58D68D' : 'rgba(255,255,255,0.45)',
                    border: active ? '1px solid rgba(47,179,106,0.2)' : '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                >
                  <Icon size={17} className="flex-shrink-0" strokeWidth={active ? 2 : 1.75} />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-2.5 flex-shrink-0">
            {!collapsed && (
              <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)', color: '#fff', minWidth: '32px' }}>
                  {inicial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{nome || 'Usuário'}</p>
                </div>
              </div>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ color: 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', background: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
            >
              <LogOut size={16} strokeWidth={1.75} className="flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toggle collapse */}
          <div className="absolute top-6 z-10 transition-all duration-300"
            style={{ left: collapsed ? '84px' : '232px' }}>
            <button onClick={() => setCollapsed(!collapsed)}
              className="w-7 h-7 rounded-full flex items-center justify-center border transition-all"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#64748B', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {collapsed
                ? <Menu size={13} strokeWidth={2} />
                : <ChevronLeft size={13} strokeWidth={2} />
              }
            </button>
          </div>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
