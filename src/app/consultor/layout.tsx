'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, Stethoscope, CalendarClock, LogOut, Menu, ChevronLeft, ChevronRight
} from 'lucide-react'

const NAV = [
  { href: '/consultor',               icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/consultor/clientes',      icon: Users,           label: 'Clientes'     },
  { href: '/consultor/diagnosticos',  icon: Stethoscope,     label: 'Diagnósticos' },
  { href: '/consultor/sessoes',       icon: CalendarClock,   label: 'Sessões'      },
]

export default function ConsultorLayout({ children }: { children: React.ReactNode }) {
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
        .from('profiles').select('nome')
        .eq('id', session.user.id).single()
      setNome(profile?.nome || session.user.email?.split('@')[0] || '')
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

  const inicial = nome ? nome[0].toUpperCase() : 'C'

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden flex flex-col min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <header className="no-print flex items-center justify-between px-5 py-4"
          style={{ background: 'linear-gradient(180deg, #06261F 0%, #0A342A 50%, #0D3F31 100%)' }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
              background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(47,179,106,0.35)',
            }}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                <path d="M4 4h12v3H7.5v2.5H13v3H7.5V16H4V4z" fill="white" fillOpacity="0.95"/>
              </svg>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
              Consultoria
            </span>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', color: '#fff' }}>
            {inicial}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <nav className="no-print fixed bottom-0 left-0 right-0 z-50 border-t"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${NAV.length}, 1fr)` }}>
            {NAV.map(item => {
              const active = item.href === '/consultor'
                ? pathname === '/consultor'
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <button key={item.href} onClick={() => navegar(item.href)}
                  className="flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all w-full"
                  style={{ color: active ? '#0B3B2E' : '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Icon size={16} strokeWidth={active ? 2 : 1.75} />
                  <span style={{ fontSize: '9px', fontWeight: active ? 600 : 500 }}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex" style={{ backgroundColor: '#F7F9FB', minHeight: '100vh' }}>
        <aside className="no-print flex flex-col flex-shrink-0 transition-all duration-300"
          style={{
            width: collapsed ? '60px' : '200px',
            background: 'linear-gradient(180deg, #06261F 0%, #0A342A 50%, #0D3F31 100%)',
          }}>

          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0">
            <div style={{
              width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
              background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(47,179,106,0.35)',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path d="M4 4h12v3H7.5v2.5H13v3H7.5V16H4V4z" fill="white" fillOpacity="0.95"/>
              </svg>
            </div>
            {!collapsed && (
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                Consultoria
              </span>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-2.5 pt-2 flex flex-col gap-0.5 overflow-y-auto">
            {NAV.map(item => {
              const active = item.href === '/consultor'
                ? pathname === '/consultor'
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <button key={item.href} onClick={() => navegar(item.href)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium w-full"
                  style={{
                    backgroundColor: active ? 'rgba(88,214,141,0.16)' : 'transparent',
                    color: active ? '#58D68D' : 'rgba(255,255,255,0.65)',
                    fontWeight: active ? 600 : 500,
                    border: '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)' }}
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
              <div className="w-full flex items-center gap-2 px-2.5 py-2 mb-1 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', color: '#fff', minWidth: '28px' }}>
                  {inicial}
                </div>
                <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
                  <p className="text-xs font-medium truncate" style={{ color: '#fff' }}>{nome || 'Consultor'}</p>
                  <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)' }}>Admin</p>
                </div>
              </div>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium"
              style={{ color: 'rgba(255,255,255,0.55)', border: 'none', cursor: 'pointer', background: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'}
            >
              <LogOut size={16} strokeWidth={1.75} className="flex-shrink-0" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="no-print fixed z-10 transition-all duration-300"
            style={{ left: collapsed ? '46px' : '186px', top: '50%', transform: 'translateY(-50%)' }}>
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
