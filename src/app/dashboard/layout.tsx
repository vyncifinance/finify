'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, ArrowLeftRight, Target, User, LogOut, Menu, ChevronLeft, ChevronRight, TrendingUp, Eye, EyeOff, Route
} from 'lucide-react'

// Portal (desktop, acessado pelo computador) — sidebar completa
const NAV = [
  { href: '/dashboard',               icon: LayoutDashboard, label: 'Dashboard'     },
  { href: '/dashboard/linha-do-tempo',icon: Route,           label: 'Linha do Tempo'},
  { href: '/dashboard/movimentos',    icon: ArrowLeftRight,  label: 'Movimentos'    },
  { href: '/dashboard/metas',         icon: Target,          label: 'Metas'         },
  { href: '/dashboard/investimentos', icon: TrendingUp,      label: 'Investimentos' },
  { href: '/dashboard/perfil',        icon: User,            label: 'Perfil'        },
]

// Aplicativo (PWA mobile) — bottom nav com sua própria lista, independente do Portal
const NAV_MOBILE = [
  { href: '/dashboard',               icon: LayoutDashboard, label: 'Dashboard'     },
  { href: '/dashboard/movimentos',    icon: ArrowLeftRight,  label: 'Movimentos'    },
  { href: '/dashboard/metas',         icon: Target,          label: 'Metas'         },
  { href: '/dashboard/investimentos', icon: TrendingUp,      label: 'Investimentos' },
  { href: '/dashboard/perfil',        icon: User,            label: 'Perfil'        },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [nome, setNome]           = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [zoom, setZoom] = useState('0.86')
  const [ocultarValores, setOcultarValores] = useState(false)

  useEffect(() => {
    function calcZoom() {
      setZoom(window.innerWidth < 1400 ? '0.86' : '0.94')
    }
    calcZoom()
    window.addEventListener('resize', calcZoom)
    return () => window.removeEventListener('resize', calcZoom)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('finify_ocultar_valores')
    if (saved === 'true') setOcultarValores(true)
  }, [])

  function toggleOcultar() {
    const novo = !ocultarValores
    setOcultarValores(novo)
    localStorage.setItem('finify_ocultar_valores', String(novo))
    window.dispatchEvent(new CustomEvent('finify_ocultar', { detail: novo }))
  }

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
                  <Icon size={16} strokeWidth={active ? 2 : 1.75} />
                  <span style={{ fontSize: '9px', fontWeight: active ? 600 : 500 }}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex" style={{ backgroundColor: '#F7F9FB', zoom, height: `${100 / parseFloat(zoom)}vh`, overflow: 'hidden' }}>
        <aside className="flex flex-col flex-shrink-0 transition-all duration-300"
          style={{
            width: collapsed ? '60px' : '185px',
            background: '#F7F9FB',
            borderRight: '1px solid rgba(15,23,42,0.06)',
          }}>

          {/* Logo */}
          <div className="flex items-center gap-3 px-4 h-16 flex-shrink-0">
            <div style={{
              width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
              background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(47,179,106,0.35)',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <defs>
                  <linearGradient id="lf" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#A8F0C6" stopOpacity="0.95"/>
                    <stop offset="100%" stopColor="#5DD68D" stopOpacity="0.65"/>
                  </linearGradient>
                </defs>
                <path d="M4 16 L4 7 C4 5.3 5.3 4 7 4 L16 4 L16 7 L7 7 C6.4 7 6 7.4 6 8 L6 11 L13 11 L13 14 L6 14 L6 16 Z" fill="url(#lf)" opacity="0.5"/>
                <path d="M5 15.5 L5 6.5 C5 5 6.2 4 7.5 4 L17 4 L17 7 L7.5 7 C7 7 7 7.8 7 8 L7 11 L14 11 L14 14 L7 14 L7 15.5 Z" fill="url(#lf)" opacity="0.95"/>
              </svg>
            </div>
            {!collapsed && (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.3px' }}>
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
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium w-full"
                  style={{
                    backgroundColor: active ? '#D1FAE5' : 'transparent',
                    color: active ? '#145A45' : '#64748B',
                    fontWeight: active ? 600 : 500,
                    border: '1px solid transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(15,23,42,0.04)' }}
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
              <button onClick={() => navegar('/dashboard/perfil')}
                className="w-full flex items-center gap-2 px-2.5 py-2 mb-1 rounded-lg transition-all"
                style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(15,23,42,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(15,23,42,0.06)' }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', color: '#fff', minWidth: '28px' }}>
                  {inicial}
                </div>
                <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
                  <p className="text-xs font-medium truncate" style={{ color: '#0B1F18' }}>{nome || 'Usuário'}</p>
                  <p style={{ fontSize: '10.5px', color: '#94A3B8' }}>Ver perfil</p>
                </div>
                <ChevronRight size={14} color="#CBD5E1" strokeWidth={2} className="flex-shrink-0" />
              </button>
            )}
            <button onClick={toggleOcultar}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-xs font-medium mb-1"
              style={{ color: ocultarValores ? '#145A45' : '#64748B', border: '1px solid transparent', backgroundColor: ocultarValores ? '#D1FAE5' : 'transparent', cursor: 'pointer' }}
              onMouseEnter={e => { if (!ocultarValores) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(15,23,42,0.04)' }}
              onMouseLeave={e => { if (!ocultarValores) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
            >
              {ocultarValores
                ? <EyeOff size={17} strokeWidth={1.75} className="flex-shrink-0" />
                : <Eye size={17} strokeWidth={1.75} className="flex-shrink-0" />
              }
              {!collapsed && <span>{ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}</span>}
            </button>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
              style={{ color: '#94A3B8', border: 'none', cursor: 'pointer', background: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(15,23,42,0.04)'}
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
            style={{ left: collapsed ? '70px' : '196px' }}>
            <button onClick={() => setCollapsed(!collapsed)}
              className="w-7 h-7 rounded-full flex items-center justify-center border transition-all"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#64748B', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {collapsed
                ? <Menu size={13} strokeWidth={2} />
                : <ChevronLeft size={13} strokeWidth={2} />
              }
            </button>
          </div>
          <main className="flex-1 overflow-y-auto" data-ocultar={ocultarValores ? 'true' : 'false'}>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
