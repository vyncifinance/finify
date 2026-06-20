'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CadastroPage() {
  const [step, setStep]           = useState<1 | 2>(1)
  const [nome, setNome]           = useState('')
  const [email, setEmail]         = useState('')
  const [senha, setSenha]         = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [nomeFamilia, setNomeFamilia] = useState('')
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  function avancar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) { setErro('Digite seu nome.'); return }
    if (!email.trim()) { setErro('Digite seu e-mail.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    setStep(2)
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nomeFamilia.trim()) { setErro('Digite o nome da sua família.'); return }
    setLoading(true)

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      })

      if (authError) { setErro(authError.message); setLoading(false); return }
      if (!authData.user) { setErro('Erro ao criar conta.'); setLoading(false); return }

      // 2. Criar família
      const { data: familia, error: familiaError } = await supabase
        .from('familias')
        .insert({ nome: nomeFamilia.trim() })
        .select('id')
        .single()

      if (familiaError) { setErro('Erro ao criar família.'); setLoading(false); return }

      // 3. Criar perfil vinculando usuário à família
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          nome: nome.trim(),
          email,
          familia_id: familia.id,
        })

      if (profileError) { setErro('Erro ao salvar perfil.'); setLoading(false); return }

      router.push('/dashboard')
    } catch {
      setErro('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* LADO ESQUERDO — Hero verde */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: '#0E3B2E' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: 'rgba(199,161,90,0.15)', borderColor: 'rgba(199,161,90,0.3)' }}
          >
            <span className="text-lg font-bold" style={{ color: '#C7A15A' }}>F</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">finify</span>
        </div>

        {/* Conteúdo central */}
        <div>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
            style={{ backgroundColor: 'rgba(199,161,90,0.12)', borderColor: 'rgba(199,161,90,0.25)' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#C7A15A' }} />
            <span className="text-xs font-semibold" style={{ color: '#C7A15A' }}>Gestão Patrimonial Familiar</span>
          </div>

          <h1
            className="text-5xl font-bold text-white leading-tight mb-6"
            style={{ letterSpacing: '-2px' }}
          >
            Comece sua<br />jornada juntos.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Crie a conta da sua família e comece<br />
            a organizar o patrimônio de forma<br />
            simples e segura.
          </p>
        </div>

        {/* Steps visuais */}
        <div className="flex flex-col gap-4">
          {[
            { n: '1', label: 'Crie sua conta', desc: 'Nome, e-mail e senha' },
            { n: '2', label: 'Nomeie sua família', desc: 'Para identificar o grupo' },
            { n: '3', label: 'Comece a organizar', desc: 'Dashboard pronto para usar' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  backgroundColor: step > i ? '#C7A15A' : 'rgba(199,161,90,0.15)',
                  color: step > i ? '#fff' : '#C7A15A',
                  border: '1px solid rgba(199,161,90,0.3)',
                }}
              >
                {item.n}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LADO DIREITO — Formulário */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16"
        style={{ backgroundColor: '#F8F9FA' }}
      >
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: 'rgba(14,59,46,0.1)', borderColor: 'rgba(14,59,46,0.2)' }}
            >
              <span className="text-lg font-bold" style={{ color: '#0E3B2E' }}>F</span>
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#0E3B2E' }}>finify</span>
          </div>

          {/* Indicador de step mobile */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            {[1, 2].map(n => (
              <div
                key={n}
                className="h-1 flex-1 rounded-full transition-all"
                style={{ backgroundColor: step >= n ? '#0E3B2E' : '#E5E7EB' }}
              />
            ))}
          </div>

          {step === 1 ? (
            <>
              <h2
                className="text-3xl font-bold mb-2"
                style={{ color: '#111827', letterSpacing: '-0.5px' }}
              >
                Criar conta
              </h2>
              <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
                Preencha seus dados para começar
              </p>

              <form onSubmit={avancar} className="flex flex-col gap-5">

                {/* Nome */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                    SEU NOME
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Como você se chama?"
                    required
                    className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                    style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#111827', height: '52px' }}
                    onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                    E-MAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                    style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#111827', height: '52px' }}
                    onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                    SENHA
                  </label>
                  <div className="relative">
                    <input
                      type={showSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                      style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#111827', height: '52px' }}
                      onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: '#6B7280' }}
                    >
                      {showSenha ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                    CONFIRMAR SENHA
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmar ? 'text' : 'password'}
                      value={confirmar}
                      onChange={e => setConfirmar(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                      style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#111827', height: '52px' }}
                      onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmar(!showConfirmar)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: '#6B7280' }}
                    >
                      {showConfirmar ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Erro */}
                {erro && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                    {erro}
                  </div>
                )}

                {/* Botão avançar */}
                <button
                  type="submit"
                  className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90 mt-2"
                  style={{ backgroundColor: '#0E3B2E', boxShadow: '0 6px 20px rgba(14,59,46,0.3)' }}
                >
                  Continuar →
                </button>
              </form>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep(1); setErro('') }}
                className="flex items-center gap-2 text-sm font-semibold mb-6 hover:opacity-70 transition-opacity"
                style={{ color: '#6B7280' }}
              >
                ← Voltar
              </button>

              <h2
                className="text-3xl font-bold mb-2"
                style={{ color: '#111827', letterSpacing: '-0.5px' }}
              >
                Sua família
              </h2>
              <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
                Como você quer identificar a sua família?
              </p>

              <form onSubmit={handleCadastro} className="flex flex-col gap-5">

                {/* Nome da família */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                    NOME DA FAMÍLIA
                  </label>
                  <input
                    type="text"
                    value={nomeFamilia}
                    onChange={e => setNomeFamilia(e.target.value)}
                    placeholder="Ex: Família Silva"
                    required
                    autoFocus
                    className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                    style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#111827', height: '52px' }}
                    onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                    Outros membros da família verão este nome ao se conectar.
                  </p>
                </div>

                {/* Preview da conta */}
                <div
                  className="rounded-2xl p-4 border"
                  style={{ backgroundColor: '#fff', borderColor: '#E5E7EB' }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>RESUMO DA CONTA</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#6B7280' }}>Nome</span>
                      <span className="font-semibold" style={{ color: '#111827' }}>{nome || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#6B7280' }}>E-mail</span>
                      <span className="font-semibold" style={{ color: '#111827' }}>{email || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#6B7280' }}>Família</span>
                      <span className="font-semibold" style={{ color: '#0E3B2E' }}>{nomeFamilia || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Erro */}
                {erro && (
                  <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                    {erro}
                  </div>
                )}

                {/* Botão criar */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90 mt-2"
                  style={{
                    backgroundColor: '#0E3B2E',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 6px 20px rgba(14,59,46,0.3)',
                  }}
                >
                  {loading ? 'Criando conta...' : 'Criar conta →'}
                </button>
              </form>
            </>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>ou</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
          </div>

          {/* Link login */}
          <p className="text-center text-sm" style={{ color: '#6B7280' }}>
            Já tem uma conta?{' '}
            <a href="/" className="font-bold hover:underline" style={{ color: '#0E3B2E' }}>
              Fazer login
            </a>
          </p>

          <p className="text-center text-xs mt-8" style={{ color: '#D1D5DB' }}>
            Seus dados são protegidos com criptografia de nível bancário.
          </p>

        </div>
      </div>
    </div>
  )
}
