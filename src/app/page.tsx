'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Shield, RefreshCw, Smartphone, Users, TrendingUp, Target, Home, BarChart2, RefreshCcw } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── LADO ESQUERDO ── */}
      <div className="hidden lg:flex" style={{
        width: '58%', backgroundColor: '#0D2B1F',
        flexDirection: 'column', padding: '36px 48px 40px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle radial glow top right */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '500px', height: '500px', background: 'radial-gradient(ellipse at top right, rgba(16,185,129,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Logo topo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '9px',
            backgroundColor: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white"/>
              <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5"/>
              <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5"/>
              <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>Finify</span>
        </div>

        {/* Hero content */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '999px', marginBottom: '24px',
            backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <Users size={13} color="rgba(255,255,255,0.7)" strokeWidth={1.75} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Gestão Patrimonial Familiar</span>
          </div>

          {/* Título + mockups lado a lado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', marginBottom: '36px' }}>
            <div>
              <h1 style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: '16px' }}>
                <span style={{ color: '#fff' }}>Prosperidade</span><br />
                <span style={{ color: '#10B981' }}>para famílias.</span>
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: '28px' }}>
                Organize seu patrimônio, acompanhe seus objetivos e construa um futuro financeiro sólido.
              </p>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" fill="#10B981"/><rect x="8" y="1" width="5" height="5" rx="1" fill="#10B981" fillOpacity="0.5"/><rect x="1" y="8" width="5" height="5" rx="1" fill="#10B981" fillOpacity="0.5"/><rect x="8" y="8" width="5" height="5" rx="1" fill="#10B981"/></svg>, title: 'Visão completa', desc: 'Tenha todos os seus bens, investimentos e dívidas em um só lugar.' },
                  { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="#10B981" strokeWidth="1.5"/><path d="M7 4v3l2 2" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/></svg>, title: 'Planejamento inteligente', desc: 'Defina metas, acompanhe seu progresso e tome decisões melhores.' },
                  { icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2C4.24 2 2 4.24 2 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 2c.83 0 1.5.67 1.5 1.5S7.83 7 7 7s-1.5-.67-1.5-1.5S6.17 4 7 4zm0 7c-1.25 0-2.36-.62-3.03-1.57C4.64 8.55 5.76 8 7 8s2.36.55 3.03 1.43C9.36 10.38 8.25 11 7 11z" fill="#10B981"/></svg>, title: 'Para toda a família', desc: 'Compartilhe informações e alinhe objetivos com quem importa.' },
                ].map(f => (
                  <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                      backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {f.icon}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{f.title}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mockups flutuantes */}
            <div style={{ position: 'relative', height: '340px' }}>
              {/* Card ícone BarChart topo direito */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: '64px', height: '64px', borderRadius: '16px',
                backgroundColor: '#0F766E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}>
                <BarChart2 size={28} color="#fff" strokeWidth={1.5} />
              </div>

              {/* Card Visão Geral */}
              <div style={{
                position: 'absolute', top: '48px', left: 0, right: '40px',
                borderRadius: '16px', padding: '16px',
                backgroundColor: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>Visão Geral</p>
                <p style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '6px' }}>Patrimônio total</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '10px', letterSpacing: '-0.5px' }}>R$ 12.450.000,00</p>
                <svg width="100%" height="44" viewBox="0 0 200 44" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,34 C20,30 40,24 70,18 C100,12 120,26 140,16 C160,6 180,10 200,4 L200,44 L0,44 Z" fill="url(#g1)"/>
                  <path d="M0,34 C20,30 40,24 70,18 C100,12 120,26 140,16 C160,6 180,10 200,4" fill="none" stroke="#10B981" strokeWidth="2"/>
                </svg>
              </div>

              {/* Ícone casa */}
              <div style={{
                position: 'absolute', top: '200px', right: '8px',
                width: '52px', height: '52px', borderRadius: '14px',
                backgroundColor: '#1A3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              }}>
                <Home size={22} color="#10B981" strokeWidth={1.5} />
              </div>

              {/* Card Distribuição */}
              <div style={{
                position: 'absolute', bottom: 0, left: '16px', right: 0,
                borderRadius: '16px', padding: '14px',
                backgroundColor: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>Distribuição</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Mini pie SVG */}
                  <svg width="52" height="52" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="20" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="79 47" strokeDashoffset="0"/>
                    <circle cx="26" cy="26" r="20" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="25 101" strokeDashoffset="-79"/>
                    <circle cx="26" cy="26" r="20" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="13 113" strokeDashoffset="-104"/>
                    <circle cx="26" cy="26" r="20" fill="none" stroke="#E2E8F0" strokeWidth="12" strokeDasharray="9 117" strokeDashoffset="-117"/>
                    <circle cx="26" cy="26" r="14" fill="#fff"/>
                  </svg>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {[
                      { cor: '#3B82F6', label: 'Investimentos', pct: '65%' },
                      { cor: '#10B981', label: 'Imóveis', pct: '20%' },
                      { cor: '#F59E0B', label: 'Caixa', pct: '10%' },
                      { cor: '#E2E8F0', label: 'Outros', pct: '5%' },
                    ].map(i => (
                      <div key={i.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: i.cor, flexShrink: 0 }} />
                          <span style={{ fontSize: '9px', color: '#64748B' }}>{i.label}</span>
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: '#0F172A' }}>{i.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ícone pessoas */}
              <div style={{
                position: 'absolute', bottom: '8px', left: '-12px',
                width: '48px', height: '48px', borderRadius: '14px',
                backgroundColor: '#1A3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
              }}>
                <Users size={20} color="#10B981" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
            {[
              { Icon: Users,      val: '1.2K+',  label: 'Famílias ativas' },
              { Icon: TrendingUp, val: 'R$12M+', label: 'Patrimônio gerenciado' },
              { Icon: Target,     val: '98%',    label: 'Metas concluídas' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.Icon size={15} color="#10B981" strokeWidth={1.75} />
                </div>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{s.val}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LADO DIREITO ── */}
      <div style={{
        flex: 1, backgroundColor: '#fff',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Nav topo */}
        <div className="hidden lg:flex" style={{
          alignItems: 'center', justifyContent: 'flex-end',
          padding: '20px 40px', gap: '32px',
          borderBottom: '1px solid #F1F5F9',
        }}>
          {['Sobre o Finify', 'Recursos', 'Preços'].map(item => (
            <a key={item} href="#" style={{ fontSize: '14px', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>{item}</a>
          ))}
          <a href="/cadastro" style={{
            padding: '8px 20px', borderRadius: '8px',
            backgroundColor: '#0D2B1F', color: '#fff',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          }}>Entrar</a>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>

            {/* Logo mobile */}
            <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white"/>
                  <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5"/>
                  <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5"/>
                  <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white"/>
                </svg>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#0D2B1F' }}>Finify</span>
            </div>

            {/* Ícone cadeado */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                backgroundColor: '#F0FDF4', border: '1px solid #D1FAE5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={22} color="#0F766E" strokeWidth={1.75} />
              </div>
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '6px' }}>
              Acesse sua conta
            </h2>
            <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '32px' }}>
              Patrimônio e planejamento ao alcance da família
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  E-mail
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  style={{
                    width: '100%', height: '48px', padding: '0 16px',
                    borderRadius: '10px', border: '1px solid #E5E7EB',
                    fontSize: '15px', color: '#111827', outline: 'none',
                    backgroundColor: '#fff', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0F766E'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Senha */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                    placeholder="Sua senha" required
                    style={{
                      width: '100%', height: '48px', padding: '0 48px 0 16px',
                      borderRadius: '10px', border: '1px solid #E5E7EB',
                      fontSize: '15px', color: '#111827', outline: 'none',
                      backgroundColor: '#fff', boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#0F766E'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {showSenha ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {/* Esqueceu */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px' }}>
                <button type="button" onClick={handleEsqueceuSenha} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 500, color: '#0F766E',
                }}>
                  Esqueci minha senha
                </button>
              </div>

              {/* Erro */}
              {erro && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#DC2626' }}>
                  {erro}
                </div>
              )}

              {/* Botão acessar */}
              <button type="submit" disabled={loading} style={{
                width: '100%', height: '52px', borderRadius: '10px', border: 'none',
                backgroundColor: '#0D2B1F',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                <Lock size={15} strokeWidth={2} />
                {loading ? 'Acessando...' : 'Acessar plataforma'}
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
                <span style={{ fontSize: '13px', color: '#9CA3AF' }}>ou</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
              </div>

              {/* Botão criar conta */}
              <a href="/cadastro" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                height: '52px', borderRadius: '10px', border: '1px solid #E5E7EB',
                backgroundColor: '#fff', color: '#0F172A',
                fontSize: '15px', fontWeight: 600, textDecoration: 'none',
              }}>
                <RefreshCcw size={15} color="#0F766E" strokeWidth={2} />
                Criar conta gratuita
              </a>
            </form>

            {/* Trust badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginTop: '32px' }}>
              {[
                { Icon: Shield,     label: 'Seus dados',    sub: 'sempre protegidos' },
                { Icon: RefreshCw,  label: 'Sincronização', sub: 'automática' },
                { Icon: Smartphone, label: 'Acesso em',     sub: 'qualquer lugar' },
              ].map(({ Icon, label, sub }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    backgroundColor: '#F0FDF4', border: '1px solid #D1FAE5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={13} color="#0F766E" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#374151', lineHeight: 1.2 }}>{label}</p>
                    <p style={{ fontSize: '10px', color: '#9CA3AF', lineHeight: 1.2 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
