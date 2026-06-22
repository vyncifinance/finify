'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
    alert('E-mail de recuperação enviado.')
  }

  return (
    <div className="min-h-screen flex">

      {/* LADO ESQUERDO */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: '#0E3B2E' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ backgroundColor: 'rgba(199,161,90,0.15)', borderColor: 'rgba(199,161,90,0.3)' }}>
            <span className="text-lg font-bold" style={{ color: '#C7A15A' }}>F</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">finify</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8"
            style={{ backgroundColor: 'rgba(199,161,90,0.12)', borderColor: 'rgba(199,161,90,0.25)' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#C7A15A' }} />
            <span className="text-xs font-semibold" style={{ color: '#C7A15A' }}>Gestão Patrimonial Familiar</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6" style={{ letterSpacing: '-2px' }}>
            Prosperidade<br />para famílias.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Organize seu patrimônio, acompanhe<br />
            seus objetivos e construa um futuro<br />
            financeiro sólido.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Famílias ativas', valor: '1.2k+' },
            { label: 'Patrimônio gerenciado', valor: 'R$12M+' },
            { label: 'Metas concluídas', valor: '98%' },
          ].map(item => (
            <div key={item.label} className="rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-2xl font-bold text-white mb-1">{item.valor}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16"
        style={{ backgroundColor: '#F8F9FA' }}>
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: 'rgba(14,59,46,0.1)', borderColor: 'rgba(14,59,46,0.2)' }}>
              <span className="text-lg font-bold" style={{ color: '#0E3B2E' }}>F</span>
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: '#0E3B2E' }}>finify</span>
          </div>

          <h2 className="text-3xl font-bold mb-2" style={{ color: '#111827', letterSpacing: '-0.5px' }}>
            Acesse sua conta
          </h2>
          <p className="text-sm mb-8" style={{ color: '#6B7280' }}>
            Patrimônio e planejamento ao alcance da família
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#111827', height: '52px' }}
                onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Senha</label>
              <div className="relative">
                <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="Sua senha" required
                  className="w-full px-4 rounded-2xl border text-sm outline-none transition-all"
                  style={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#111827', height: '52px' }}
                  onFocus={e => e.target.style.borderColor = '#0E3B2E'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#6B7280' }}>
                  {showSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {erro && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                {erro}
              </div>
            )}

            <button type="button" onClick={handleEsqueceuSenha}
              className="self-end text-sm font-semibold -mt-2 hover:underline" style={{ color: '#0E3B2E' }}>
              Recuperar acesso
            </button>

            <button type="submit" disabled={loading}
              className="w-full h-14 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#0E3B2E', opacity: loading ? 0.7 : 1, boxShadow: '0 6px 20px rgba(14,59,46,0.3)' }}>
              {loading ? 'Acessando...' : 'Acessar plataforma →'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
            <span className="text-xs" style={{ color: '#6B7280' }}>ou</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
          </div>

          <p className="text-center text-sm" style={{ color: '#6B7280' }}>
            Ainda não tem acesso?{' '}
            <a href="/cadastro" className="font-bold hover:underline" style={{ color: '#0E3B2E' }}>Criar conta</a>
          </p>

          <p className="text-center text-xs mt-8" style={{ color: '#D1D5DB' }}>
            Seus dados são protegidos com criptografia de nível bancário.
          </p>
        </div>
      </div>
    </div>
  )
}
