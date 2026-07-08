'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, Lock, Shield,
  Users, Home, BarChart2, FileText,
  ArrowRight, Play
} from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [mounted, setMounted]     = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setLoading(false)
    if (error) { setErro('E-mail ou senha incorretos.'); return }
    router.push('/dashboard')
  }

  async function handleEsqueceuSenha() {
    if (!email) { setErro('Digite seu e-mail primeiro.'); return }
    await supabase.auth.resetPasswordForEmail(email)
    setErro('')
  }

  const Logo = ({ size = 36, textSize = 20 }: { size?: number; textSize?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(47,179,106,0.35)',
        flexShrink: 0,
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 20 20" fill="none">
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
      <span style={{ fontSize: textSize, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1 }}>
        Finify
      </span>
    </div>
  )

  const LogoDark = ({ size = 34, textSize = 19 }: { size?: number; textSize?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(47,179,106,0.3)',
        flexShrink: 0,
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 20 20" fill="none">
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
      <span style={{ fontSize: textSize, fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.4px', lineHeight: 1 }}>
        Finify
      </span>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease',
    }}>

      {/* ── LADO ESQUERDO ── */}
      <div className="hidden lg:flex" style={{
        width: '55%',
        background: 'linear-gradient(180deg, #06261F 0%, #0A342A 50%, #0D3F31 100%)',
        flexDirection: 'column',
        padding: '22px 36px 26px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,179,106,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-60px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,90,69,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        {/* Glow discreto atrás do mockup do dashboard */}
        <div style={{ position: 'absolute', top: '38%', right: '6%', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,214,141,0.14) 0%, transparent 68%)', pointerEvents: 'none' }} />
        {/* Brilho verde suave vindo de baixo */}
        <div style={{ position: 'absolute', bottom: '-140px', left: 0, right: 0, height: '320px', background: 'radial-gradient(ellipse at bottom, rgba(47,179,106,0.16) 0%, transparent 72%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '24px' }}>
          <Logo size={30} textSize={17} />
        </div>

        {/* Hero */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '4px 12px', borderRadius: '999px', marginBottom: '16px',
            backgroundColor: 'rgba(47,179,106,0.12)',
            border: '1px solid rgba(47,179,106,0.25)',
          }}>
            <Users size={11} color="#58D68D" strokeWidth={2} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#58D68D', letterSpacing: '0.03em' }}>
              Gestão Patrimonial Familiar
            </span>
          </div>

          {/* Título + dashboard grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', alignItems: 'start', marginBottom: '22px' }}>

            {/* Texto esquerdo */}
            <div>
              <h1 style={{
                fontSize: '34px', fontWeight: 800, lineHeight: 1.05,
                letterSpacing: '-1.2px', marginBottom: '10px',
              }}>
                <span style={{ color: '#fff', display: 'block' }}>Prosperidade</span>
                <span style={{ color: '#2FB36A', display: 'block' }}>para famílias.</span>
              </h1>
              <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.55, marginBottom: '16px', maxWidth: '240px' }}>
                Organize seu patrimônio, acompanhe seus objetivos e construa um futuro financeiro sólido.
              </p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <a href="/cadastro" style={{
                  padding: '9px 18px', borderRadius: '10px',
                  backgroundColor: '#2FB36A', color: '#07271F',
                  fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
                >
                  Criar conta gratuita
                </a>
                <a href="#" style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '9px 18px', borderRadius: '10px',
                  backgroundColor: 'transparent', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.4)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.2)' }}
                >
                  <Play size={12} fill="currentColor" strokeWidth={0} />
                  Ver demonstração
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex' }}>
                  {['#D97757', '#5B8DEF', '#9B7FE0', '#E0B860'].map((cor, i) => (
                    <div key={cor} style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      backgroundColor: cor, border: '2px solid #0A342A',
                      marginLeft: i === 0 ? 0 : '-7px',
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                  Mais de <strong style={{ color: '#fff' }}>1.200 famílias</strong> confiam na Finify
                </span>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div style={{ height: '208px', overflow: 'visible' }}>
            <div style={{ position: 'relative', height: '320px', width: '153.8%', transform: 'scale(0.65)', transformOrigin: 'top left' }}>
              {/* Linhas pontilhadas */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 280 320">
                <line x1="240" y1="20" x2="180" y2="100" stroke="rgba(47,179,106,0.2)" strokeWidth="1" strokeDasharray="3 4"/>
                <line x1="240" y1="200" x2="180" y2="160" stroke="rgba(47,179,106,0.2)" strokeWidth="1" strokeDasharray="3 4"/>
                <line x1="20" y1="280" x2="80" y2="220" stroke="rgba(47,179,106,0.2)" strokeWidth="1" strokeDasharray="3 4"/>
                <line x1="20" y1="40" x2="80" y2="100" stroke="rgba(47,179,106,0.2)" strokeWidth="1" strokeDasharray="3 4"/>
              </svg>

              {/* Mini cards flutuantes */}
              {/* TL — BarChart */}
              <div style={{
                position: 'absolute', top: '0px', right: '0px', zIndex: 3,
                width: '52px', height: '52px', borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BarChart2 size={22} color="#2FB36A" strokeWidth={1.5} />
              </div>

              {/* TR — Home */}
              <div style={{
                position: 'absolute', top: '180px', right: '-8px', zIndex: 3,
                width: '48px', height: '48px', borderRadius: '13px',
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Home size={20} color="#58D68D" strokeWidth={1.5} />
              </div>

              {/* BL — Users */}
              <div style={{
                position: 'absolute', bottom: '16px', left: '-8px', zIndex: 3,
                width: '48px', height: '48px', borderRadius: '13px',
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={20} color="#58D68D" strokeWidth={1.5} />
              </div>

              {/* Card principal Visão Geral */}
              <div style={{
                position: 'absolute', top: '32px', left: '16px', right: '16px', zIndex: 2,
                borderRadius: '18px', padding: '18px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>VISÃO GERAL</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>Patrimônio total</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.8px', marginBottom: '12px' }}>R$ 12.450.000</p>
                {/* Gráfico linha */}
                <svg width="100%" height="44" viewBox="0 0 220 44" preserveAspectRatio="none" style={{ marginBottom: '14px' }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2FB36A" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#2FB36A" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,36 C18,32 36,26 60,20 C84,14 100,28 130,18 C160,8 180,12 220,4 L220,44 L0,44 Z" fill="url(#lineGrad)"/>
                  <path d="M0,36 C18,32 36,26 60,20 C84,14 100,28 130,18 C160,8 180,12 220,4" fill="none" stroke="#2FB36A" strokeWidth="2" strokeLinecap="round"/>
                  {[[60,20],[130,18],[220,4]].map(([x,y], i) => (
                    <circle key={i} cx={x} cy={y} r="3" fill="#fff" stroke="#2FB36A" strokeWidth="1.5"/>
                  ))}
                </svg>
                {/* Gráfico donut + legenda */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <svg width="56" height="56" viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#3B82F6" strokeWidth="10" strokeDasharray="87 51" strokeDashoffset="0" strokeLinecap="round"/>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#2FB36A" strokeWidth="10" strokeDasharray="28 110" strokeDashoffset="-87" strokeLinecap="round"/>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#F59E0B" strokeWidth="10" strokeDasharray="14 124" strokeDashoffset="-115" strokeLinecap="round"/>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" strokeDasharray="9 129" strokeDashoffset="-129" strokeLinecap="round"/>
                    <circle cx="28" cy="28" r="16" fill="rgba(6,38,31,0.8)"/>
                  </svg>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      { cor: '#3B82F6', label: 'Investimentos', pct: '65%' },
                      { cor: '#2FB36A', label: 'Imóveis',       pct: '20%' },
                      { cor: '#F59E0B', label: 'Caixa',         pct: '10%' },
                      { cor: 'rgba(255,255,255,0.2)', label: 'Outros', pct: '5%' },
                    ].map(d => (
                      <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: d.cor, flexShrink: 0 }} />
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)' }}>{d.label}</span>
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{d.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FileText card BL */}
              <div style={{
                position: 'absolute', top: '0px', left: '-8px', zIndex: 3,
                width: '48px', height: '48px', borderRadius: '13px',
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileText size={20} color="#58D68D" strokeWidth={1.5} />
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LADO DIREITO ── */}
      <div style={{
        flex: 1, backgroundColor: '#fff',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Leve efeito de luz atrás do card de login */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '560px', height: '560px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(47,179,106,0.07) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Nav */}
        <div className="hidden lg:flex" style={{
          alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 36px', position: 'relative', zIndex: 1,
        }}>
          <div className="lg:hidden">
            <LogoDark />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {['Sobre o Finify', 'Recursos', 'Preços'].map(item => (
              <a key={item} href="#" style={{ fontSize: '14px', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>
                {item}
              </a>
            ))}
            <a href="/cadastro" style={{
              padding: '9px 22px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #07271F 0%, #0F4737 100%)',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              textDecoration: 'none', letterSpacing: '-0.1px',
            }}>
              Entrar
            </a>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '100%', maxWidth: '400px',
            backgroundColor: '#fff',
            borderRadius: '20px',
            padding: '26px 30px 22px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)',
            border: '1px solid #ECEFF3',
          }}>
            {/* Logo mobile */}
            <div className="lg:hidden" style={{ marginBottom: '16px' }}>
              <LogoDark />
            </div>

            {/* Ícone cadeado */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: '#F0FDF4', border: '1.5px solid #D1FAE5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={17} color="#0F4737" strokeWidth={1.75} />
              </div>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.5px', marginBottom: '3px' }}>
              Acesse sua conta
            </h2>
            <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px', lineHeight: 1.45 }}>
              Patrimônio e planejamento ao alcance da família
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  E-mail
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  style={{
                    width: '100%', height: '42px', padding: '0 14px',
                    borderRadius: '11px', border: '1.5px solid #E5E7EB',
                    fontSize: '13.5px', color: '#111827', outline: 'none',
                    backgroundColor: '#FAFAFA', boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#2FB36A'
                    e.target.style.boxShadow = '0 0 0 3px rgba(47,179,106,0.12)'
                    e.target.style.backgroundColor = '#fff'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E5E7EB'
                    e.target.style.boxShadow = 'none'
                    e.target.style.backgroundColor = '#FAFAFA'
                  }}
                />
              </div>

              {/* Senha */}
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                    placeholder="Sua senha" required
                    style={{
                      width: '100%', height: '42px', padding: '0 44px 0 14px',
                      borderRadius: '11px', border: '1.5px solid #E5E7EB',
                      fontSize: '13.5px', color: '#111827', outline: 'none',
                      backgroundColor: '#FAFAFA', boxSizing: 'border-box',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#2FB36A'
                      e.target.style.boxShadow = '0 0 0 3px rgba(47,179,106,0.12)'
                      e.target.style.backgroundColor = '#fff'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#E5E7EB'
                      e.target.style.boxShadow = 'none'
                      e.target.style.backgroundColor = '#FAFAFA'
                    }}
                  />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                    display: 'flex', alignItems: 'center', padding: 0,
                  }}>
                    {showSenha ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {/* Esqueceu */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
                <button type="button" onClick={handleEsqueceuSenha} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13.5px', fontWeight: 500, color: '#0F4737',
                }}>
                  Esqueci minha senha
                </button>
              </div>

              {/* Erro */}
              {erro && (
                <div style={{
                  backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: '10px', padding: '10px 14px',
                  fontSize: '13px', color: '#DC2626',
                }}>
                  {erro}
                </div>
              )}

              {/* Botão principal */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', height: '44px', borderRadius: '12px', border: 'none',
                  background: loading ? '#6B7280' : 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(11,59,46,0.3)',
                  transition: 'all 0.2s',
                  letterSpacing: '-0.1px',
                }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(11,59,46,0.45)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(11,59,46,0.3)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
              >
                <Lock size={15} strokeWidth={2.5} />
                {loading ? 'Acessando...' : 'Acessar plataforma'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '2px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ECEFF3' }} />
                <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>ou</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#ECEFF3' }} />
              </div>

              {/* Botão criar conta */}
              <a
                href="/cadastro"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  height: '42px', borderRadius: '11px',
                  border: '1.5px solid #E5E7EB',
                  backgroundColor: '#fff', color: '#0B3B2E',
                  fontSize: '14.5px', fontWeight: 600, textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2FB36A'
                  ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#F0FDF4'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E5E7EB'
                  ;(e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#fff'
                }}
              >
                <ArrowRight size={15} color="#0F4737" strokeWidth={2.5} />
                Criar conta gratuita
              </a>
            </form>

            {/* Selo de confiança */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F7F8FA',
            }}>
              <Shield size={12} color="#9CA3AF" strokeWidth={1.75} />
              <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 500, letterSpacing: '0.01em' }}>
                Criptografia bancária <span style={{ margin: '0 5px', color: '#D1D5DB' }}>•</span> LGPD <span style={{ margin: '0 5px', color: '#D1D5DB' }}>•</span> Dados protegidos
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
