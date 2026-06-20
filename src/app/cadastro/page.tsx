'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const [nomeFamilia, setNomeFamilia] = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

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
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      })
      if (authError) { setErro(authError.message); return }
      if (!authData.user) { setErro('Erro ao criar conta.'); return }

      let familiaId: string

      if (modo === 'criar') {
        // 2a. Criar nova família com código de convite gerado
        const codigo = gerarCodigo(nomeFamilia)
        const { data: familia, error: familiaError } = await supabase
          .from('familias')
          .insert({ nome: nomeFamilia.trim(), codigo_convite: codigo })
          .select('id')
          .single()
        if (familiaError) { setErro('Erro ao criar família.'); return }
        familiaId = familia.id

      } else {
        // 2b. Buscar família pelo código de convite
        const { data: familia, error: familiaError } = await supabase
          .from('familias')
          .select('id')
          .eq('codigo_convite', codigoConvite.trim().toUpperCase())
          .single()
        if (familiaError || !familia) {
          setErro('Código de convite inválido. Verifique com o administrador da família.')
          return
        }
        familiaId = familia.id
      }

      // 3. Criar perfil vinculando usuário à família
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: authData.user.id, nome: nome.trim(), email, familia_id: familiaId })
      if (profileError) { setErro('Erro ao salvar perfil.'); return }

      router.push('/dashboard')
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: '#fff',
    borderColor: '#E5E7EB',
    color: '#111827',
    height: '52px',
  }

  return (
    <div className="min-h-screen flex">

      {/* LADO ESQUERDO */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ backgroundColor: '#0E3B2E' }}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: 'rgba(199,161,90,0.15)', borderColor: 'rgba(199,161,90,0.3)' }}>
            <span className="text-lg font-bold" style={{ color: '#C7A15A' }}>F</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">finify</span>
        </div>

        {/* Hero */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
            style={{ backgroundColor: 'rgba(199,161,90,0.12)', borderColor: 'rgba(199,161,90,0.25)' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#C7A15A' }} />
            <span className="text-xs font-semibold" style={{ color: '#C7A15A' }}>Gestão Patrimonial Familiar</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: '-2px' }}>
            Comece sua<br />jornada juntos.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Crie a conta da sua família ou entre<br />
            com um código de convite para<br />
            organizar juntos.
          </p>
        </div>

        {/* Info convite */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#C7A15A' }}>
            Como funciona o convite?
          </p>
          <div className="flex flex-col gap-3">
            {[
              { n: '1', txt: 'Quem cria a família recebe um código único (ex: AGU-4821)' },
              { n: '2', txt: 'Compartilhe o código com os membros da família' },
              { n: '3', txt: 'Eles se cadastram usando esse código e entram automaticamente' },
            ].map(item => (
              <div key={item.n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: 'rgba(199,161,90,0.2)', color: '#C7A15A' }}>
                  {item.n}
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.txt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: 'rgba(14,59,46,0.1)', borderColor: 'rgba(14,59,46,0.2)' }}>
              <span className="text-lg font-bold" style={{ color: '#0E3B2E' }}>F</span>
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#0E3B2E' }}>finify</span>
          </div>

          <h2 className="text-3xl font-bold mb-2" style={{ color: '#111827', letterSpacing: '-0.5px' }}>
            Criar conta
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            Preencha seus dados para começar
          </p>

          {/* Toggle criar / entrar */}
          <div className="flex rounded-2xl p-1 mb-6" style={{ backgroundColor: '#E5E7EB' }}>
            {([['criar', 'Criar família'], ['entrar', 'Entrar com código']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => { setModo(val); setErro('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: modo === val ? '#fff' : 'transparent',
                  color: modo === val ? '#0E3B2E' : '#6B7280',
                  boxShadow: modo === val ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleCadastro} className="flex flex-col gap-4">

            {/* Nome */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>SEU NOME</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Como você se chama?" required
                className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>E-MAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>SENHA</label>
              <div className="relative">
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required
                  className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>CONFIRMAR SENHA</label>
              <div className="relative">
                <input type={showConfirmar ? 'text' : 'password'} value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repita a senha" required
                  className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                <button type="button" onClick={() => setShowConfirmar(!showConfirmar)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>
                  {showConfirmar ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Campo dinâmico */}
            {modo === 'criar' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>NOME DA FAMÍLIA</label>
                <input type="text" value={nomeFamilia} onChange={e => setNomeFamilia(e.target.value)}
                  placeholder="Ex: Família Aguiar" required
                  className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  Um código de convite será gerado para você compartilhar com a família.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>CÓDIGO DE CONVITE</label>
                <input type="text" value={codigoConvite} onChange={e => setCodigoConvite(e.target.value)}
                  placeholder="Ex: AGU-4821" required
                  className="w-full px-4 rounded-2xl border text-sm outline-none transition-all text-center font-bold tracking-widest"
                  style={{ ...inputStyle, fontSize: '18px', letterSpacing: '4px' }}
                  onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  Peça o código para quem criou a família no Finify.
                </p>
              </div>
            )}

            {/* Erro */}
            {erro && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                {erro}
              </div>
            )}

            {/* Botão */}
            <button type="submit" disabled={loading}
              className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center transition-opacity hover:opacity-90 mt-2"
              style={{ backgroundColor: '#0E3B2E', opacity: loading ? 0.7 : 1, boxShadow: '0 6px 20px rgba(14,59,46,0.3)' }}>
              {loading ? 'Criando conta...' : modo === 'criar' ? 'Criar conta →' : 'Entrar na família →'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>ou</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
          </div>

          <p className="text-center text-sm" style={{ color: '#6B7280' }}>
            Já tem uma conta?{' '}
            <a href="/" className="font-bold hover:underline" style={{ color: '#0E3B2E' }}>Fazer login</a>
          </p>

          <p className="text-center text-xs mt-8" style={{ color: '#D1D5DB' }}>
            Seus dados são protegidos com criptografia de nível bancário.
          </p>
        </div>
      </div>
    </div>
  )
}
