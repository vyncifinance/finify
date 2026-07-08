'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Shield, Home, Send, TrendingUp, Activity } from 'lucide-react'

const C = {
  primary: '#32C36C',
  darkest: '#05281F',
  dark:    '#0C342A',
  white:   '#FFFFFF',
  mist:    '#F7F8FA',
}

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
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  function validarCampos(): boolean {
    if (!nome.trim())              { setErro('Digite seu nome.'); return false }
    if (!email.trim())             { setErro('Digite seu e-mail.'); return false }
    if (senha.length < 6)          { setErro('A senha deve ter pelo menos 6 caracteres.'); return false }
    if (modo === 'criar' && senha !== confirmar) { setErro('As senhas não coincidem.'); return false }
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

  const Logo = ({ size = 30, textSize = 17 }: { size?: number; textSize?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${C.dark} 0%, ${C.primary} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(50,195,108,0.35)', flexShrink: 0,
      }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id="lf2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#B8F2CE" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#6FE3A0" stopOpacity="0.65"/>
            </linearGradient>
          </defs>
          <path d="M4 16 L4 7 C4 5.3 5.3 4 7 4 L16 4 L16 7 L7 7 C6.4 7 6 7.4 6 8 L6 11 L13 11 L13 14 L6 14 L6 16 Z" fill="url(#lf2)" opacity="0.5"/>
          <path d="M5 15.5 L5 6.5 C5 5 6.2 4 7.5 4 L17 4 L17 7 L7.5 7 C7 7 7 7.8 7 8 L7 11 L14 11 L14 14 L7 14 L7 15.5 Z" fill="url(#lf2)" opacity="0.95"/>
        </svg>
      </div>
      <span style={{ fontSize: textSize, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1 }}>Finify</span>
    </div>
  )

  const inputStyle = {
    width: '100%', height: '37px', padding: '0 12px',
    borderRadius: '10px', border: '1.5px solid #E8EAED',
    fontSize: '12.5px', color: '#111827', outline: 'none',
    backgroundColor: C.mist, boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  function onFocusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = C.primary
    e.target.style.boxShadow = `0 0 0 3px rgba(50,195,108,0.12)`
    e.target.style.backgroundColor = '#fff'
  }
  function onBlurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = '#E8EAED'
    e.target.style.boxShadow = 'none'
    e.target.style.backgroundColor = C.mist
  }

  const passos = [
    { Icon: Home,       titulo: 'Criar família',            texto: 'Você cadastra a família e recebe um código único.' },
    { Icon: Send,       titulo: 'Convidar familiares',       texto: 'Compartilhe o código com quem vai participar.' },
    { Icon: TrendingUp, titulo: 'Patrimônio compartilhado',  texto: 'Todos veem o mesmo painel, em tempo real.' },
    { Icon: Activity,   titulo: 'Acompanhamento contínuo',   texto: 'Metas, dízimo e evolução, sempre atualizados.' },
  ]

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: `linear-gradient(150deg, ${C.darkest} 0%, ${C.dark} 65%, #0E3B2F 100%)`,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Glows discretos */}
      <div style={{ position: 'absolute', top: '-160px', right: '-100px', width: '640px', height: '640px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,195,108,0.10) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-180px', left: '5%', width: '560px', height: '560px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(50,195,108,0.09) 0%, transparent 68%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <div className="hidden lg:flex" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '16px 44px', position: 'relative', zIndex: 3 }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {['Sobre o Finify', 'Recursos', 'Preços'].map(item => (
            <a key={item} href="#" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{item}</a>
          ))}
          <a href="/" style={{
            padding: '10px 22px', borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)',
            color: '#fff', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none',
          }}>
            Entrar
          </a>
        </div>
      </div>

      <div className="lg:hidden" style={{ padding: '24px', position: 'relative', zIndex: 3 }}>
        <Logo />
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2, padding: '20px 48px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px', maxWidth: '1360px', margin: '0 auto', width: '100%' }}>

          {/* ── NARRATIVA + FLUXO ── */}
          <div className="hidden lg:block" style={{ width: '42%', flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '5px 14px', borderRadius: '999px', marginBottom: '22px',
              backgroundColor: 'rgba(50,195,108,0.12)', border: '1px solid rgba(50,195,108,0.25)',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: C.primary }} />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#7EDDA8', letterSpacing: '0.03em' }}>
                Planejamento Patrimonial Familiar
              </span>
            </div>

            <h1 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: '18px', color: '#fff' }}>
              Comece sua jornada<br />financeira <span style={{ color: C.primary }}>juntos.</span>
            </h1>

            <p style={{ fontSize: '14.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '32px', maxWidth: '380px' }}>
              Crie um espaço onde toda a família poderá acompanhar patrimônio, investimentos e evolução financeira em um único lugar.
            </p>

            {/* Fluxo vertical — linhas + círculos, sem cards */}
            <div style={{ position: 'relative', paddingLeft: '4px' }}>
              {passos.map((p, i) => (
                <div key={p.titulo} style={{ display: 'flex', gap: '18px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      backgroundColor: 'rgba(50,195,108,0.1)', border: `1.5px solid rgba(50,195,108,0.35)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <p.Icon size={14} color={C.primary} strokeWidth={1.75} />
                    </div>
                    {i < passos.length - 1 && (
                      <div style={{ width: '1px', flex: 1, minHeight: '34px', background: 'linear-gradient(180deg, rgba(50,195,108,0.35) 0%, rgba(50,195,108,0.08) 100%)', margin: '2px 0' }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: i < passos.length - 1 ? '20px' : '0' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '3px', paddingTop: '6px' }}>{p.titulo}</p>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, maxWidth: '280px' }}>{p.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CARD DE CADASTRO ── */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxWidth: '400px',
              backgroundColor: '#fff', borderRadius: '20px',
              padding: '24px 28px 20px',
              boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
            }}>
              <div className="lg:hidden" style={{ marginBottom: '18px' }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: C.darkest }}>Finify</span>
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.darkest, letterSpacing: '-0.4px', marginBottom: '3px' }}>
                Criar conta
              </h2>
              <p style={{ fontSize: '11.5px', color: '#8A93A0', marginBottom: '14px' }}>
                Preencha seus dados para começar
              </p>

              {/* Segmented control premium — indicador deslizante */}
              <div style={{ position: 'relative', display: 'flex', borderRadius: '11px', padding: '3px', marginBottom: '14px', backgroundColor: C.mist }}>
                <div style={{
                  position: 'absolute', top: '4px', bottom: '4px', left: '4px',
                  width: 'calc(50% - 4px)', borderRadius: '9px',
                  backgroundColor: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                  transform: modo === 'entrar' ? 'translateX(100%)' : 'translateX(0)',
                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
                {([['criar', 'Criar nova família'], ['entrar', 'Entrar por convite']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => { setModo(val); setErro('') }}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                      backgroundColor: 'transparent', position: 'relative', zIndex: 1,
                      color: modo === val ? C.darkest : '#9AA2AD',
                      border: 'none', cursor: 'pointer', transition: 'color 0.2s',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Seu nome</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Como você se chama?" required
                    style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required
                    style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres" required
                      style={{ ...inputStyle, paddingRight: '38px' }} onFocus={onFocusInput} onBlur={onBlurInput} />
                    <button type="button" onClick={() => setShowSenha(!showSenha)} style={{
                      position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9AA2AD', display: 'flex',
                    }}>
                      {showSenha ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                {/* Modo: criar família → confirmar senha + nome da família */}
                {modo === 'criar' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Confirmar senha</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showConfirmar ? 'text' : 'password'} value={confirmar} onChange={e => setConfirmar(e.target.value)}
                          placeholder="Repita a senha" required
                          style={{ ...inputStyle, paddingRight: '38px' }} onFocus={onFocusInput} onBlur={onBlurInput} />
                        <button type="button" onClick={() => setShowConfirmar(!showConfirmar)} style={{
                          position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: '#9AA2AD', display: 'flex',
                        }}>
                          {showConfirmar ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Nome da família</label>
                      <input type="text" value={nomeFamilia} onChange={e => setNomeFamilia(e.target.value)}
                        placeholder="Ex: Família Aguiar" required
                        style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput} />
                      <p style={{ fontSize: '9.5px', color: '#9CA3AF', marginTop: '2px' }}>
                        Um código de convite será gerado para você compartilhar.
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#5B6472', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '3px' }}>Código da família</label>
                    <input type="text" value={codigoConvite} onChange={e => setCodigoConvite(e.target.value)}
                      placeholder="Ex: AGU-4821" required
                      style={{ ...inputStyle, textAlign: 'center', fontWeight: 700, fontSize: '13px', letterSpacing: '2px' }}
                      onFocus={onFocusInput} onBlur={onBlurInput} />
                    <p style={{ fontSize: '9.5px', color: '#9CA3AF', marginTop: '2px' }}>
                      Peça o código para quem criou a família no Finify.
                    </p>
                  </div>
                )}

                {erro && (
                  <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '9px 13px', fontSize: '12.5px', color: '#DC2626' }}>
                    {erro}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', height: '40px', borderRadius: '11px', border: 'none',
                  background: loading ? '#9CA3AF' : `linear-gradient(135deg, ${C.darkest} 0%, ${C.dark} 100%)`,
                  color: '#fff', fontSize: '13px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : `0 4px 16px rgba(5,40,31,0.3)`,
                  transition: 'all 0.2s', marginTop: '2px',
                }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
                >
                  {loading ? 'Criando conta...' : modo === 'criar' ? 'Criar conta' : 'Entrar na família'}
                  {!loading && <ArrowRight size={15} strokeWidth={2.5} />}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#EEF0F3' }} />
                <span style={{ fontSize: '11.5px', color: '#9AA2AD', fontWeight: 500 }}>ou</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#EEF0F3' }} />
              </div>

              <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#6B7280' }}>
                Já tem uma conta?{' '}
                <a href="/" style={{ fontWeight: 600, color: C.dark, textDecoration: 'none' }}>Fazer login</a>
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${C.mist}` }}>
                <Shield size={11} color="#B0B6BF" strokeWidth={1.75} />
                <span style={{ fontSize: '10.5px', color: '#B0B6BF', fontWeight: 500 }}>
                  Criptografia bancária <span style={{ margin: '0 4px' }}>•</span> LGPD <span style={{ margin: '0 4px' }}>•</span> Dados protegidos
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
