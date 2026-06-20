'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  User, Users, Mail, LogOut, Lock, Save, Check, Copy, CheckCheck
} from 'lucide-react'

export default function PerfilPage() {
  const [loading, setLoading]         = useState(true)
  const [userId, setUserId]           = useState('')
  const [email, setEmail]             = useState('')
  const [nome, setNome]               = useState('')
  const [familiaId, setFamiliaId]     = useState('')
  const [familiaNome, setFamiliaNome] = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')
  const [membros, setMembros]         = useState<any[]>([])

  // Salvar nome
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [nomeSalvo, setNomeSalvo]       = useState(false)

  // Trocar senha
  const [novaSenha, setNovaSenha]         = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaMsg, setSenhaMsg]           = useState('')

  // Copiar código
  const [copiado, setCopiado] = useState(false)

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setLoading(false); return }

    setUserId(session.user.id)
    setEmail(session.user.email || '')

    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, familia_id, familias(nome, codigo_convite)')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setNome(profile.nome || '')
      setFamiliaId(profile.familia_id)
      setFamiliaNome((profile.familias as any)?.nome || '')
      setCodigoConvite((profile.familias as any)?.codigo_convite || '')

      const { data: membrosData } = await supabase
        .from('profiles').select('id, nome').eq('familia_id', profile.familia_id)
      if (membrosData) setMembros(membrosData)
    }
    setLoading(false)
  }

  async function handleSalvarNome() {
    if (!nome.trim()) return
    setSalvandoNome(true)
    setNomeSalvo(false)
    const { error } = await supabase.from('profiles')
      .update({ nome: nome.trim() })
      .eq('id', userId)
    setSalvandoNome(false)
    if (!error) {
      setNomeSalvo(true)
      setMembros(prev => prev.map(m => m.id === userId ? { ...m, nome: nome.trim() } : m))
      setTimeout(() => setNomeSalvo(false), 2000)
    }
  }

  async function handleTrocarSenha() {
    setSenhaMsg('')
    if (!novaSenha || novaSenha.length < 6) { setSenhaMsg('A senha deve ter no mínimo 6 caracteres.'); return }
    if (novaSenha !== confirmaSenha)         { setSenhaMsg('As senhas não coincidem.'); return }
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) {
      setSenhaMsg('Erro ao atualizar senha. Tente novamente.')
    } else {
      setSenhaMsg('Senha atualizada com sucesso!')
      setNovaSenha(''); setConfirmaSenha('')
    }
  }

  async function handleCopiarCodigo() {
    if (!codigoConvite) return
    await navigator.clipboard.writeText(codigoConvite)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const iniciais = nome
    ? nome.trim().split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
          Perfil
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Gerencie seus dados e os membros da família{familiaNome ? ` ${familiaNome}` : ''}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
      ) : (
        <div className="grid grid-cols-3 gap-5">

          {/* COLUNA ESQUERDA */}
          <div className="col-span-2 flex flex-col gap-5">

            {/* CARD DADOS PESSOAIS */}
            <div className="rounded-[20px] border p-6"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                  style={{ backgroundColor: '#0F766E18', color: '#0F766E' }}>
                  {iniciais}
                </div>
                <div>
                  <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>{nome || 'Sem nome'}</h2>
                  <p className="text-sm" style={{ color: '#64748B' }}>{email}</p>
                </div>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
                Nome completo
              </label>
              <div className="flex gap-2 mb-1">
                <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                  className="flex-1 px-4 h-12 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                <button onClick={handleSalvarNome} disabled={salvandoNome || !nome.trim()}
                  className="flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white transition-opacity"
                  style={{ backgroundColor: '#0F766E', opacity: (salvandoNome || !nome.trim()) ? 0.6 : 1 }}>
                  {nomeSalvo ? <Check size={16} /> : <Save size={16} />}
                  {salvandoNome ? 'Salvando...' : nomeSalvo ? 'Salvo' : 'Salvar'}
                </button>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 mt-5" style={{ color: '#64748B' }}>
                E-mail
              </label>
              <div className="flex items-center gap-2 px-4 h-12 rounded-xl border text-sm"
                style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', color: '#94A3B8' }}>
                <Mail size={15} />
                {email}
              </div>
            </div>

            {/* CARD TROCAR SENHA */}
            <div className="rounded-[20px] border p-6"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Lock size={18} color="#0F172A" strokeWidth={1.75} />
                <h2 className="font-semibold" style={{ color: '#0F172A' }}>Alterar senha</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
                    Nova senha
                  </label>
                  <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 h-12 rounded-xl border text-sm outline-none"
                    style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>
                    Confirmar senha
                  </label>
                  <input type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full px-4 h-12 rounded-xl border text-sm outline-none"
                    style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                </div>
              </div>

              {senhaMsg && (
                <p className="text-sm mb-3" style={{ color: senhaMsg.includes('sucesso') ? '#10B981' : '#EF4444' }}>
                  {senhaMsg}
                </p>
              )}

              <button onClick={handleTrocarSenha} disabled={salvandoSenha || !novaSenha || !confirmaSenha}
                className="px-5 h-12 rounded-xl text-sm font-semibold text-white transition-opacity"
                style={{ backgroundColor: '#0F766E', opacity: (salvandoSenha || !novaSenha || !confirmaSenha) ? 0.6 : 1 }}>
                {salvandoSenha ? 'Atualizando...' : 'Atualizar senha'}
              </button>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="flex flex-col gap-5">

            {/* CARD CÓDIGO DE CONVITE */}
            <div className="rounded-[20px] border p-6"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Users size={18} color="#0F172A" strokeWidth={1.75} />
                <h2 className="font-semibold" style={{ color: '#0F172A' }}>Código de convite</h2>
              </div>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>
                Compartilhe com familiares para entrarem no Finify.
              </p>

              {codigoConvite ? (
                <>
                  {/* Código destacado */}
                  <div className="rounded-2xl p-4 mb-3 text-center"
                    style={{ backgroundColor: '#F0FDF4', border: '1.5px dashed #10B981' }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#10B981' }}>
                      Código da família {familiaNome}
                    </p>
                    <p className="text-3xl font-bold tracking-[6px]" style={{ color: '#0F172A' }}>
                      {codigoConvite}
                    </p>
                  </div>

                  {/* Botão copiar */}
                  <button onClick={handleCopiarCodigo}
                    className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: copiado ? '#ECFDF5' : '#0F766E',
                      color: copiado ? '#10B981' : '#fff',
                    }}>
                    {copiado ? <CheckCheck size={16} /> : <Copy size={16} />}
                    {copiado ? 'Copiado!' : 'Copiar código'}
                  </button>

                  <p className="text-xs text-center mt-3" style={{ color: '#94A3B8' }}>
                    O familiar usa este código na tela de cadastro em "Entrar com código".
                  </p>
                </>
              ) : (
                <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#FEF2F2' }}>
                  <p className="text-sm" style={{ color: '#DC2626' }}>
                    Código não encontrado. Contate o suporte.
                  </p>
                </div>
              )}
            </div>

            {/* CARD MEMBROS DA FAMÍLIA */}
            <div className="rounded-[20px] border p-6"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Users size={18} color="#0F172A" strokeWidth={1.75} />
                <h2 className="font-semibold" style={{ color: '#0F172A' }}>Família {familiaNome}</h2>
              </div>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>
                {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
              </p>

              <div className="flex flex-col gap-3">
                {membros.map((m: any) => {
                  const inic = (m.nome || '?').trim().split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#0F766E18', color: '#0F766E' }}>
                        {inic}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>
                          {m.nome}{m.id === userId ? ' (você)' : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CARD SAIR */}
            <div className="rounded-[20px] border p-6"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="flex items-center gap-2 mb-2">
                <User size={18} color="#0F172A" strokeWidth={1.75} />
                <h2 className="font-semibold" style={{ color: '#0F172A' }}>Conta</h2>
              </div>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>
                Encerrar sua sessão neste dispositivo.
              </p>
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                <LogOut size={16} strokeWidth={2} />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
