'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Play, Shield, Star } from 'lucide-react'

const C = {
  primary:  '#32C36C',
  darkest:  '#05281F',
  dark:     '#0C342A',
  white:    '#FFFFFF',
  mist:     '#F7F8FA',
}

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

  const Logo = ({ size = 30, textSize = 17, dark = false }: { size?: number; textSize?: number; dark?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${C.dark} 0%, ${C.primary} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 2px 8px rgba(50,195,108,0.35)`, flexShrink: 0,
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id="lf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#B8F2CE" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#6FE3A0" stopOpacity="0.65"/>
            </linearGradient>
          </defs>
          <path d="M4 16 L4 7 C4 5.3 5.3 4 7 4 L16 4 L16 7 L7 7 C6.4 7 6 7.4 6 8 L6 11 L13 11 L13 14 L6 14 L6 16 Z" fill="url(#lf)" opacity="0.5"/>
          <path d="M5 15.5 L5 6.5 C5 5 6.2 4 7.5 4 L17 4 L17 7 L7.5 7 C7 7 7 7.8 7 8 L7 11 L14 11 L14 14 L7 14 L7 15.5 Z" fill="url(#lf)" opacity="0.95"/>
        </svg>
      </div>
      <span style={{ fontSize: textSize, fontWeight: 700, color: dark ? C.darkest : '#fff', letterSpacing: '-0.4px', lineHeight: 1 }}>Finify</span>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(150deg, ${C.darkest} 0%, ${C.dark} 65%, #0E3B2F 100%)`,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Glows discretos */}
      <div style={{ position: 'absolute', top: '-160px', right: '-100px', width: '640px', height: '640px', borderRadius: '50%', background: `radial-gradient(circle, rgba(50,195,108,0.10) 0%, transparent 65%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-180px', left: '10%', width: '560px', height: '560px', borderRadius: '50%', background: `radial-gradient(circle, rgba(50,195,108,0.09) 0%, transparent 68%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', right: '32%', width: '380px', height: '380px', borderRadius: '50%', background: `radial-gradient(circle, rgba(111,227,160,0.10) 0%, transparent 68%)`, pointerEvents: 'none' }} />

      {/* Nav */}
      <div className="hidden lg:flex" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '24px 48px', position: 'relative', zIndex: 3 }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {['Sobre o Finify', 'Recursos', 'Preços'].map(item => (
            <a key={item} href="#" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{item}</a>
          ))}
          <a href="/cadastro" style={{
            padding: '10px 22px', borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
            color: '#fff', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none',
          }}>
            Criar conta
          </a>
        </div>
      </div>

      {/* Logo mobile */}
      <div className="lg:hidden" style={{ padding: '24px', position: 'relative', zIndex: 3 }}>
        <Logo />
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2, padding: '20px 48px 48px' }}>
        <div className="w-full" style={{ display: 'flex', alignItems: 'center', gap: '40px', maxWidth: '1360px', margin: '0 auto', width: '100%' }}>

          {/* ── NARRATIVA ── */}
          <div className="hidden lg:block" style={{ flexShrink: 0, width: '40%' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '5px 14px', borderRadius: '999px', marginBottom: '24px',
              backgroundColor: 'rgba(50,195,108,0.12)', border: '1px solid rgba(50,195,108,0.25)',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: C.primary }} />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#7EDDA8', letterSpacing: '0.03em' }}>
                Gestão Patrimonial Familiar
              </span>
            </div>

            <h1 style={{ fontSize: '46px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: '20px', color: '#fff' }}>
              Prosperidade<br /><span style={{ color: C.primary }}>para famílias.</span>
            </h1>

            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '36px', maxWidth: '380px' }}>
              Organize seu patrimônio. Acompanhe seus objetivos.<br />Construa um futuro financeiro sólido.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '56px' }}>
              <a href="/cadastro" style={{
                padding: '14px 24px', borderRadius: '12px',
                backgroundColor: C.primary, color: C.darkest,
                fontSize: '14.5px', fontWeight: 700, textDecoration: 'none',
                transition: 'all 0.15s', boxShadow: '0 8px 24px rgba(50,195,108,0.25)',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)' }}
              >
                Criar conta gratuita
              </a>
              <a href="#" style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '14px 22px', borderRadius: '12px',
                backgroundColor: 'transparent', color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                fontSize: '14.5px', fontWeight: 600, textDecoration: 'none',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.4)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.18)' }}
              >
                <Play size={12} fill="currentColor" strokeWidth={0} />
                Ver demonstração
              </a>
            </div>

            {/* Prova social discreta */}
            <div>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
                {[0,1,2,3,4].map(i => <Star key={i} size={14} fill={C.primary} color={C.primary} />)}
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                Mais de <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>1.200 famílias</span> utilizam a plataforma.
              </p>
            </div>
          </div>

          {/* ── MOCKUP + CARD (profundidade) ── */}
          <div className="hidden lg:block" style={{ flex: 1, position: 'relative', height: '480px' }}>

            {/* Dashboard mockup — atrás do card */}
            <div style={{
              position: 'absolute', top: '50%', left: '0', transform: 'translateY(-50%)',
              width: '460px', borderRadius: '22px', padding: '32px',
              backgroundColor: 'rgba(255,255,255,0.065)',
              border: '1px solid rgba(255,255,255,0.1)',
              zIndex: 1,
              boxShadow: '0 40px 80px rgba(0,0,0,0.25)',
            }}>
              <p style={{ fontSize: '11.5px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Patrimônio Total
              </p>
              <p style={{ fontSize: '34px', fontWeight: 700, color: '#fff', letterSpacing: '-1px', marginBottom: '28px' }}>
                R$ 12.450.000
              </p>

              <svg width="100%" height="88" viewBox="0 0 396 88" preserveAspectRatio="none" style={{ marginBottom: '32px' }}>
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,70 C40,64 80,50 120,40 C160,30 190,58 240,36 C290,14 320,26 396,6 L396,88 L0,88 Z" fill="url(#lineGrad)" />
                <path d="M0,70 C40,64 80,50 120,40 C160,30 190,58 240,36 C290,14 320,26 396,6" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
                {[[120,40],[240,36],[396,6]].map(([x,y], i) => (
                  <circle key={i} cx={x} cy={y} r="3.5" fill={C.darkest} stroke={C.primary} strokeWidth="2" />
                ))}
              </svg>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '22px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Distribuição do patrimônio</span>
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke={C.primary} strokeWidth="7" strokeDasharray="65 100" strokeLinecap="round" transform="rotate(-90 20 20)" />
                </svg>
              </div>
            </div>

            {/* ── CARD DE LOGIN — flutua sobre o mockup ── */}
            <div style={{
              position: 'absolute', top: '50%', right: '0', transform: 'translateY(-50%)',
              width: '392px', zIndex: 2,
              backgroundColor: '#fff', borderRadius: '22px',
              padding: '36px 36px 30px',
              boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
            }}>
              <h2 style={{ fontSize: '21px', fontWeight: 700, color: C.darkest, letterSpacing: '-0.4px', marginBottom: '4px' }}>
                Acesse sua conta
              </h2>
              <p style={{ fontSize: '12.5px', color: '#8A93A0', marginBottom: '24px' }}>
                Patrimônio e planejamento ao alcance da família
              </p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    E-mail
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com" required
                    style={{
                      width: '100%', height: '44px', padding: '0 14px',
                      borderRadius: '11px', border: '1.5px solid #E8EAED',
                      fontSize: '13.5px', color: '#111827', outline: 'none',
                      backgroundColor: C.mist, boxSizing: 'border-box',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px rgba(50,195,108,0.12)`; e.target.style.backgroundColor = '#fff' }}
                    onBlur={e => { e.target.style.borderColor = '#E8EAED'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = C.mist }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Senha
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                      placeholder="Sua senha" required
                      style={{
                        width: '100%', height: '44px', padding: '0 42px 0 14px',
                        borderRadius: '11px', border: '1.5px solid #E8EAED',
                        fontSize: '13.5px', color: '#111827', outline: 'none',
                        backgroundColor: C.mist, boxSizing: 'border-box',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                      onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px rgba(50,195,108,0.12)`; e.target.style.backgroundColor = '#fff' }}
                      onBlur={e => { e.target.style.borderColor = '#E8EAED'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = C.mist }}
                    />
                    <button type="button" onClick={() => setShowSenha(!showSenha)} style={{
                      position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9AA2AD', display: 'flex', padding: 0,
                    }}>
                      {showSenha ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
                  <button type="button" onClick={handleEsqueceuSenha} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '12.5px', fontWeight: 500, color: C.dark,
                  }}>
                    Esqueci minha senha
                  </button>
                </div>

                {erro && (
                  <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '9px 13px', fontSize: '12.5px', color: '#DC2626' }}>
                    {erro}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', height: '46px', borderRadius: '12px', border: 'none',
                    background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${C.darkest} 0%, ${C.dark} 100%)`,
                    color: '#fff', fontSize: '14px', fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: loading ? 'none' : `0 4px 16px rgba(5,40,31,0.3)`,
                    transition: 'all 0.2s', marginTop: '2px',
                  }}
                  onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
                >
                  {loading ? 'Acessando...' : 'Acessar plataforma'}
                  {!loading && <ArrowRight size={15} strokeWidth={2.5} />}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#EEF0F3' }} />
                  <span style={{ fontSize: '11.5px', color: '#9AA2AD', fontWeight: 500 }}>ou</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#EEF0F3' }} />
                </div>

                <a href="/cadastro" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  height: '44px', borderRadius: '11px',
                  border: '1.5px solid #E8EAED', backgroundColor: '#fff', color: C.darkest,
                  fontSize: '13.5px', fontWeight: 600, textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = C.primary; (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#F0FDF6' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E8EAED'; (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#fff' }}
                >
                  Criar conta gratuita
                </a>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${C.mist}` }}>
                <Shield size={11} color="#B0B6BF" strokeWidth={1.75} />
                <span style={{ fontSize: '10.5px', color: '#B0B6BF', fontWeight: 500 }}>
                  Criptografia bancária <span style={{ margin: '0 4px' }}>•</span> LGPD <span style={{ margin: '0 4px' }}>•</span> Dados protegidos
                </span>
              </div>
            </div>
          </div>

          {/* ── CARD MOBILE (sem mockup) ── */}
          <div className="flex lg:hidden" style={{ width: '100%', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxWidth: '400px',
              backgroundColor: '#fff', borderRadius: '20px',
              padding: '28px 24px 22px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.darkest, letterSpacing: '-0.4px', marginBottom: '4px' }}>
                Acesse sua conta
              </h2>
              <p style={{ fontSize: '12.5px', color: '#8A93A0', marginBottom: '20px' }}>
                Patrimônio e planejamento ao alcance da família
              </p>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required
                    style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '11px', border: '1.5px solid #E8EAED', fontSize: '14px', color: '#111827', outline: 'none', backgroundColor: C.mist, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" required
                      style={{ width: '100%', height: '46px', padding: '0 42px 0 14px', borderRadius: '11px', border: '1.5px solid #E8EAED', fontSize: '14px', color: '#111827', outline: 'none', backgroundColor: C.mist, boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowSenha(!showSenha)} style={{ position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9AA2AD', display: 'flex' }}>
                      {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-4px' }}>
                  <button type="button" onClick={handleEsqueceuSenha} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 500, color: C.dark }}>Esqueci minha senha</button>
                </div>
                {erro && <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '9px 13px', fontSize: '12.5px', color: '#DC2626' }}>{erro}</div>}
                <button type="submit" disabled={loading} style={{ width: '100%', height: '48px', borderRadius: '12px', border: 'none', background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${C.darkest} 0%, ${C.dark} 100%)`, color: '#fff', fontSize: '14.5px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {loading ? 'Acessando...' : 'Acessar plataforma'}
                </button>
                <a href="/cadastro" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '46px', borderRadius: '11px', border: '1.5px solid #E8EAED', backgroundColor: '#fff', color: C.darkest, fontSize: '13.5px', fontWeight: 600, textDecoration: 'none' }}>
                  Criar conta gratuita
                </a>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
