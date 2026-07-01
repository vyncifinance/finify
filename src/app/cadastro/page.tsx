'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, UserPlus, Shield, RefreshCw, Smartphone,
  Users, BarChart2, Target, Home, FileText, TrendingUp,
  ArrowRight
} from 'lucide-react'

function gerarCodigo(nomeFamilia: string): string {
  const prefixo = nomeFamilia.trim().substring(0, 3).toUpperCase().replace(/\s/g, 'X')
  const numero  = Math.floor(1000 + Math.random() * 9000)
  return `${prefixo}-${numero}`
}

export default function CadastroPage() {
  const [modo, setModo]           = useState<'criar' | 'entrar'>('criar')
  const [nome, setNome]           = useState('')
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [nomeFamilia, setNomeFamilia]     = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState('')
  const [showSenha, setShowSenha]         = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [mounted, setMounted]     = useState(false)
  const [zoom, setZoom]           = useState('0.86')
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function calcZoom() {
      setZoom(window.innerWidth < 1400 ? '0.86' : '0.94')
    }
    calcZoom()
    window.addEventListener('resize', calcZoom)
    return () => window.removeEventListener('resize', calcZoom)
  }, [])

  function validarCampos(): boolean {
    if (!nome.trim())              { setErro('Digite seu nome.'); return false }
    if (!email.trim())             { setErro('Digite seu e-mail.'); return false }
    if (senha.length < 6)          { setErro('A senha deve ter pelo menos 6 caracteres.'); return false }
    if (senha !== confirmar)       { setErro('As senhas não coincidem.'); return false }
    if (modo === 'criar' && !nomeFamilia.trim()) { setErro('Digite o nome da família.'); return false }
    if (modo === 'entrar' && !codigoConvite.trim()) { setErro('Digite o código de convite.'); return false }
    return true
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!validarCampos()) return
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password: senha, options: { data: { nome } },
      })
      if (authError) { setErro(authError.message); return }
      if (!authData.user) { setErro('Erro ao criar conta.'); return }

      let familiaId: string

      if (modo === 'criar') {
        const codigo = gerarCodigo(nomeFamilia)
        const { data: familia, error: familiaError } = await supabase
          .from('familias').insert({ nome: nomeFamilia.trim(), codigo_convite: codigo })
          .select('id').single()
        if (familiaError) { setErro('Erro ao criar família.'); return }
        familiaId = familia.id
      } else {
        const { data: familia, error: familiaError } = await supabase
          .from('familias').select('id')
          .eq('codigo_convite', codigoConvite.trim().toUpperCase()).single()
        if (familiaError || !familia) {
          setErro('Código de convite inválido. Verifique com o administrador da família.')
          return
        }
        familiaId = familia.id
      }

      const { error: profileError } = await supabase
        .from('profiles').upsert({ id: authData.user.id, nome: nome.trim(), email, familia_id: familiaId })
      if (profileError) { setErro('Erro ao salvar perfil.'); return }

      router.push('/dashboard')
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const Logo = ({ size = 38, textSize = 21 }: { size?: number; textSize?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(47,179,106,0.35)', flexShrink: 0,
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
      <span style={{ fontSize: textSize, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1 }}>Finify</span>
    </div>
  )

  const LogoDark = ({ size = 34, textSize = 19 }: { size?: number; textSize?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(47,179,106,0.3)', flexShrink: 0,
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
      <span style={{ fontSize: textSize, fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.4px', lineHeight: 1 }}>Finify</span>
    </div>
  )

  const inputStyle = {
    width: '100%', height: '50px', padding: '0 16px',
    borderRadius: '13px', border: '1.5px solid #E5E7EB',
    fontSize: '14.5px', color: '#111827', outline: 'none',
    backgroundColor: '#FAFAFA', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  function onFocusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = '#2FB36A'
    e.target.style.boxShadow = '0 0 0 3px rgba(47,179,106,0.12)'
    e.target.style.backgroundColor = '#fff'
  }
  function onBlurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
    e.target.style.backgroundColor = '#FAFAFA'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease',
    }}>

      {/* ── LADO ESQUERDO ── */}
      <div className="hidden lg:flex" style={{
        width: '55%',
        background: 'linear-gradient(180deg, #06261F 0%, #0A342A 50%, #0D3F31 100%)',
        flexDirection: 'column', padding: '40px 52px 44px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,179,106,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', left: '-60px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(21,90,69,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, marginBottom: '48px' }}>
          <Logo />
        </div>

        <div style={{ position: 'relative', zIndex: 2, flex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '5px 14px', borderRadius: '999px', marginBottom: '28px',
            backgroundColor: 'rgba(47,179,106,0.12)', border: '1px solid rgba(47,179,106,0.25)',
          }}>
            <UserPlus size={12} color="#58D68D" strokeWidth={2} />
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#58D68D', letterSpacing: '0.03em' }}>
              Comece em poucos minutos
            </span>
          </div>

          <h1 style={{ fontSize: '52px', fontWeight: 800, lineHeight: 1.0, letterSpacing: '-2.5px', marginBottom: '18px' }}>
            <span style={{ color: '#fff', display: 'block' }}>Comece sua</span>
            <span style={{ color: '#2FB36A', display: 'block' }}>jornada juntos.</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, marginBottom: '36px', maxWidth: '380px' }}>
            Crie a conta da sua família ou entre com um código de convite para organizar o patrimônio juntos.
          </p>

          {/* Como funciona o convite */}
          <div style={{
            borderRadius: '18px', padding: '20px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            marginBottom: '36px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#58D68D', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px' }}>
              Como funciona o convite?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { n: '1', txt: 'Quem cria a família recebe um código único (ex: AGU-4821)' },
                { n: '2', txt: 'Compartilhe o código com os membros da família' },
                { n: '3', txt: 'Eles se cadastram usando esse código e entram automaticamente' },
              ].map(item => (
                <div key={item.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0, marginTop: '1px',
                    backgroundColor: 'rgba(47,179,106,0.15)', border: '1px solid rgba(47,179,106,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: '#2FB36A',
                  }}>
                    {item.n}
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{item.txt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mini cards de features */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
            {[
              { Icon: Users,      label: 'Toda a família', sub: 'em um só lugar' },
              { Icon: Target,     label: 'Metas',          sub: 'compartilhadas' },
              { Icon: BarChart2,  label: 'Visão',          sub: 'em tempo real' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
                padding: '16px', borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  backgroundColor: 'rgba(47,179,106,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} color="#2FB36A" strokeWidth={1.75} />
                </div>
                <div>
                  <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>{label}</p>
                  <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LADO DIREITO ── */}
      <div style={{ flex: 1, backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div className="hidden lg:flex" style={{ alignItems: 'center', justifyContent: 'flex-end', padding: '22px 40px', gap: '28px' }}>
          {['Sobre o Finify', 'Recursos', 'Preços'].map(item => (
            <a key={item} href="#" style={{ fontSize: '14px', fontWeight: 500, color: '#374151', textDecoration: 'none' }}>{item}</a>
          ))}
          <a href="/" style={{
            padding: '9px 22px', borderRadius: '9px',
            background: 'linear-gradient(135deg, #07271F 0%, #0F4737 100%)',
            color: '#fff', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
          }}>
            Entrar
          </a>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{
            width: '100%', maxWidth: '460px',
            backgroundColor: '#fff', borderRadius: '28px',
            padding: '44px 44px 36px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)',
            border: '1px solid #ECEFF3',
          }}>
            <div className="lg:hidden" style={{ marginBottom: '24px' }}>
              <LogoDark />
            </div>

            <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.6px', marginBottom: '6px' }}>
              Criar conta
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '22px' }}>
              Preencha seus dados para começar
            </p>

            {/* Toggle criar/entrar */}
            <div style={{ display: 'flex', borderRadius: '13px', padding: '4px', marginBottom: '22px', backgroundColor: '#F7F8FA' }}>
              {([['criar', 'Criar família'], ['entrar', 'Entrar com código']] as const).map(([val, label]) => (
                <button key={val} type="button" onClick={() => { setModo(val); setErro('') }}
                  style={{
                    flex: 1, padding: '9px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 600,
                    backgroundColor: modo === val ? '#fff' : 'transparent',
                    color: modo === val ? '#0B3B2E' : '#6B7280',
                    boxShadow: modo === val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Seu nome
                </label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Como você se chama?" required
                  style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  E-mail
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres" required
                    style={{ ...inputStyle, paddingRight: '46px' }} onFocus={onFocusInput} onBlur={onBlurInput} />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex',
                  }}>
                    {showSenha ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Confirmar senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input type={showConfirmar ? 'text' : 'password'} value={confirmar} onChange={e => setConfirmar(e.target.value)}
                    placeholder="Repita a senha" required
                    style={{ ...inputStyle, paddingRight: '46px' }} onFocus={onFocusInput} onBlur={onBlurInput} />
                  <button type="button" onClick={() => setShowConfirmar(!showConfirmar)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex',
                  }}>
                    {showConfirmar ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {modo === 'criar' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Nome da família
                  </label>
                  <input type="text" value={nomeFamilia} onChange={e => setNomeFamilia(e.target.value)}
                    placeholder="Ex: Família Aguiar" required
                    style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
                  <p style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '6px' }}>
                    Um código de convite será gerado para você compartilhar com a família.
                  </p>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, color: '#374151', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Código de convite
                  </label>
                  <input type="text" value={codigoConvite} onChange={e => setCodigoConvite(e.target.value)}
                    placeholder="Ex: AGU-4821" required
                    style={{ ...inputStyle, textAlign: 'center', fontWeight: 700, fontSize: '17px', letterSpacing: '3px' }}
                    onFocus={onFocusInput} onBlur={onBlurInput} />
                  <p style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '6px' }}>
                    Peça o código para quem criou a família no Finify.
                  </p>
                </div>
              )}

              {erro && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#DC2626' }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', height: '52px', borderRadius: '14px', border: 'none',
                background: loading ? '#6B7280' : 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(11,59,46,0.3)',
                transition: 'all 0.2s', marginTop: '4px',
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(11,59,46,0.45)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(11,59,46,0.3)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
              >
                <ArrowRight size={16} strokeWidth={2.5} />
                {loading ? 'Criando conta...' : modo === 'criar' ? 'Criar conta' : 'Entrar na família'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ECEFF3' }} />
              <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ECEFF3' }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
              Já tem uma conta?{' '}
              <a href="/" style={{ fontWeight: 600, color: '#0F4737', textDecoration: 'none' }}>Fazer login</a>
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #F7F8FA' }}>
              {[
                { Icon: Shield,     label: 'Dados protegidos' },
                { Icon: RefreshCw,  label: 'Sincronização automática' },
                { Icon: Smartphone, label: 'Acesso em qualquer lugar' },
              ].map(({ Icon, label }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textAlign: 'center' }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '9px',
                    backgroundColor: '#F0FDF4', border: '1px solid #D1FAE5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={13} color="#0F4737" strokeWidth={1.75} />
                  </div>
                  <p style={{ fontSize: '9.5px', fontWeight: 600, color: '#9CA3AF', lineHeight: 1.3 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
