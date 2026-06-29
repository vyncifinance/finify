'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Shield, RefreshCw, Smartphone, Users, TrendingUp, Target } from 'lucide-react'

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
        width: '52%', backgroundColor: '#0A2E22', flexDirection: 'column',
        justifyContent: 'space-between', padding: '40px 56px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Orbs de fundo */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '100px', right: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(199,161,90,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F766E 0%, #10B981 100%)',
            boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 5C4 4.44772 4.44772 4 5 4H17C17.5523 4 18 4.44772 18 5V8C18 8.55228 17.5523 9 17 9H5C4.44772 9 4 8.55228 4 8V5Z" fill="white" fillOpacity="0.9"/>
              <path d="M4 12C4 11.4477 4.44772 11 5 11H11C11.5523 11 12 11.4477 12 12V18C12 18.5523 11.5523 19 11 19H5C4.44772 19 4 18.5523 4 18V12Z" fill="white" fillOpacity="0.6"/>
              <circle cx="16" cy="15" r="3" fill="#C7A15A"/>
            </svg>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>finify</span>
        </div>

        {/* Hero */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '999px', marginBottom: '28px',
            backgroundColor: 'rgba(199,161,90,0.12)', border: '1px solid rgba(199,161,90,0.25)'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#C7A15A' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#C7A15A', letterSpacing: '0.05em' }}>GESTÃO PATRIMONIAL FAMILIAR</span>
          </div>

          <h1 style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1.05, marginBottom: '20px', letterSpacing: '-2px' }}>
            <span style={{ color: '#fff' }}>Prosperidade</span><br />
            <span style={{ color: '#10B981' }}>para famílias.</span>
          </h1>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '380px' }}>
            Organize seu patrimônio, acompanhe seus objetivos e construa um futuro financeiro sólido.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
            {[
              { Icon: TrendingUp, title: 'Visão completa', desc: 'Tenha todos os seus bens, investimentos e dívidas em um só lugar.' },
              { Icon: Target,     title: 'Planejamento inteligente', desc: 'Defina metas, acompanhe seu progresso e tome decisões melhores.' },
              { Icon: Users,      title: 'Para toda a família', desc: 'Compartilhe informações e alinhe objetivos com quem importa.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={16} color="#10B981" strokeWidth={1.75} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{title}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mockup dashboard flutuante */}
          <div style={{
            borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(8px)',
            padding: '16px',
            marginBottom: '40px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Visão Geral · Junho 2026</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c }} />)}
              </div>
            </div>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>Patrimônio total</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: '12px' }}>R$ 12.450.000,00</p>
            {/* Mini gráfico SVG */}
            <svg width="100%" height="48" viewBox="0 0 300 48" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0,38 C30,35 60,28 90,22 C120,16 150,30 180,20 C210,10 240,15 270,8 L300,5 L300,48 L0,48 Z" fill="url(#chartGrad)"/>
              <path d="M0,38 C30,35 60,28 90,22 C120,16 150,30 180,20 C210,10 240,15 270,8 L300,5" fill="none" stroke="#10B981" strokeWidth="2"/>
            </svg>
            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginTop: '12px' }}>
              {[
                { label: 'Receitas', val: 'R$8.2k', cor: '#10B981' },
                { label: 'Despesas', val: 'R$5.1k', cor: '#EF4444' },
                { label: 'Economia', val: 'R$3.1k', cor: '#F59E0B' },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{s.label}</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: s.cor }}>{s.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', position: 'relative', zIndex: 1 }}>
          {[
            { val: '1.2k+', label: 'Famílias ativas' },
            { val: 'R$12M+', label: 'Patrimônio gerenciado' },
            { val: '98%', label: 'Metas concluídas' },
          ].map(s => (
            <div key={s.label} style={{
              borderRadius: '14px', padding: '16px',
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', marginBottom: '4px' }}>{s.val}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── LADO DIREITO ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F8F9FA', padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Logo mobile */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #0F766E 0%, #10B981 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H17C17.5523 4 18 4.44772 18 5V8C18 8.55228 17.5523 9 17 9H5C4.44772 9 4 8.55228 4 8V5Z" fill="white" fillOpacity="0.9"/>
                <path d="M4 12C4 11.4477 4.44772 11 5 11H11C11.5523 11 12 11.4477 12 12V18C12 18.5523 11.5523 19 11 19H5C4.44772 19 4 18.5523 4 18V12Z" fill="white" fillOpacity="0.6"/>
                <circle cx="16" cy="15" r="3" fill="#C7A15A"/>
              </svg>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#0A2E22', letterSpacing: '-0.5px' }}>finify</span>
          </div>

          {/* Card de login */}
          <div style={{
            backgroundColor: '#fff', borderRadius: '24px', padding: '40px 36px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
            border: '1px solid #E5E7EB',
          }}>
            {/* Ícone topo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                backgroundColor: '#F0FDF4', border: '1px solid #D1FAE5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={24} color="#0F766E" strokeWidth={1.75} />
              </div>
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', textAlign: 'center', letterSpacing: '-0.5px', marginBottom: '6px' }}>
              Acesse sua conta
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', marginBottom: '28px' }}>
              Patrimônio e planejamento ao alcance da família
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  E-mail
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  style={{
                    width: '100%', height: '48px', padding: '0 16px',
                    borderRadius: '12px', border: '1.5px solid #E5E7EB',
                    fontSize: '14px', color: '#111827', outline: 'none',
                    backgroundColor: '#F9FAFB', boxSizing: 'border-box', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#0F766E'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              {/* Senha */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                    placeholder="Sua senha" required
                    style={{
                      width: '100%', height: '48px', padding: '0 48px 0 16px',
                      borderRadius: '12px', border: '1.5px solid #E5E7EB',
                      fontSize: '14px', color: '#111827', outline: 'none',
                      backgroundColor: '#F9FAFB', boxSizing: 'border-box', transition: 'border-color 0.15s',
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
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleEsqueceuSenha} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, color: '#0F766E',
                }}>
                  Esqueci minha senha
                </button>
              </div>

              {/* Erro */}
              {erro && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#DC2626' }}>
                  {erro}
                </div>
              )}

              {/* Botão principal */}
              <button type="submit" disabled={loading} style={{
                width: '100%', height: '50px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #0A2E22 0%, #0F766E 100%)',
                color: '#fff', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 14px rgba(15,118,110,0.35)',
                transition: 'opacity 0.15s',
              }}>
                <Lock size={16} strokeWidth={2} />
                {loading ? 'Acessando...' : 'Acessar plataforma'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#E5E7EB' }} />
            </div>

            {/* Botão criar conta */}
            <a href="/cadastro" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              height: '50px', borderRadius: '12px', border: '1.5px solid #E5E7EB',
              backgroundColor: '#fff', color: '#0F172A', fontSize: '15px', fontWeight: 600,
              textDecoration: 'none', transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0F766E'; (e.currentTarget as HTMLElement).style.backgroundColor = '#F0FDF4' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLElement).style.backgroundColor = '#fff' }}
            >
              <Users size={16} color="#0F766E" strokeWidth={2} />
              Criar conta gratuita
            </a>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginTop: '20px' }}>
            {[
              { Icon: Shield,      label: 'Seus dados', sub: 'sempre protegidos' },
              { Icon: RefreshCw,   label: 'Sincronização', sub: 'automática' },
              { Icon: Smartphone,  label: 'Acesso em', sub: 'qualquer lugar' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
  )
}
