'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  User, Users, Mail, LogOut, Lock, Save, Check, Copy, CheckCheck, Church, ChevronRight,
  Building2, Plus, X, Trash2, Pencil, Wallet
} from 'lucide-react'

function formatCNPJ(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 14)
  let out = digits
  if (digits.length > 2) out = digits.replace(/^(\d{2})(\d)/, '$1.$2')
  if (digits.length > 5) out = out.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  if (digits.length > 8) out = out.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
  if (digits.length > 12) out = out.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
  return out
}

export default function PerfilPage() {
  const [loading, setLoading]             = useState(true)
  const [userId, setUserId]               = useState('')
  const [familiaId, setFamiliaId]         = useState('')
  const [email, setEmail]                 = useState('')
  const [nome, setNome]                   = useState('')
  const [familiaNome, setFamiliaNome]     = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')
  const [membros, setMembros]             = useState<any[]>([])
  const [dizimista, setDizimista]         = useState(true)
  const [salvandoDizimista, setSalvandoDizimista] = useState(false)
  const [saldoInicial, setSaldoInicial]           = useState('')
  const [saldoInicialData, setSaldoInicialData]   = useState('')
  const [salvandoSaldoInicial, setSalvandoSaldoInicial] = useState(false)
  const [saldoInicialSalvo, setSaldoInicialSalvo] = useState(false)
  const [salvandoNome, setSalvandoNome]   = useState(false)
  const [nomeSalvo, setNomeSalvo]         = useState(false)
  const [novaSenha, setNovaSenha]         = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [senhaMsg, setSenhaMsg]           = useState('')
  const [copiado, setCopiado]             = useState(false)

  // Empresas (CNPJ)
  const [empresas, setEmpresas]             = useState<any[]>([])
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false)
  const [editandoEmpresa, setEditandoEmpresa]   = useState<any>(null)
  const [nomeEmpresa, setNomeEmpresa]       = useState('')
  const [cnpjEmpresa, setCnpjEmpresa]       = useState('')
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false)
  const [erroEmpresa, setErroEmpresa]       = useState('')
  const [confirmDeleteEmpresa, setConfirmDeleteEmpresa] = useState(false)
  const [deletandoEmpresa, setDeletandoEmpresa] = useState(false)

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
      .from('profiles').select('nome, familia_id, familias(nome, codigo_convite, dizimista, saldo_inicial, saldo_inicial_data)')
      .eq('id', session.user.id).single()
    if (profile) {
      setNome(profile.nome || '')
      setFamiliaId(profile.familia_id)
      setFamiliaNome((profile.familias as any)?.nome || '')
      setCodigoConvite((profile.familias as any)?.codigo_convite || '')
      setDizimista((profile.familias as any)?.dizimista !== false)
      const saldoInicialAtual = (profile.familias as any)?.saldo_inicial
      setSaldoInicial(saldoInicialAtual ? Number(saldoInicialAtual).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
      setSaldoInicialData((profile.familias as any)?.saldo_inicial_data || '')
      const res = await fetch('/api/membros')
      const json = await res.json()
      if (json.membros) setMembros(json.membros)

      const { data: empresasData } = await supabase.from('empresas')
        .select('*').eq('familia_id', profile.familia_id).order('created_at', { ascending: true })
      if (empresasData) setEmpresas(empresasData)
    }
    setLoading(false)
  }

  function abrirEmpresaModalNovo() {
    setEditandoEmpresa(null); setNomeEmpresa(''); setCnpjEmpresa('')
    setErroEmpresa(''); setConfirmDeleteEmpresa(false); setEmpresaModalOpen(true)
  }

  function abrirEmpresaModalEditar(emp: any) {
    setEditandoEmpresa(emp); setNomeEmpresa(emp.nome); setCnpjEmpresa(emp.cnpj || '')
    setErroEmpresa(''); setConfirmDeleteEmpresa(false); setEmpresaModalOpen(true)
  }

  async function handleSalvarEmpresa() {
    if (!nomeEmpresa.trim()) { setErroEmpresa('Digite o nome da empresa.'); return }
    setSalvandoEmpresa(true); setErroEmpresa('')
    if (editandoEmpresa) {
      const { error } = await supabase.from('empresas')
        .update({ nome: nomeEmpresa.trim(), cnpj: cnpjEmpresa.trim() || null })
        .eq('id', editandoEmpresa.id)
      setSalvandoEmpresa(false)
      if (!error) { setEmpresaModalOpen(false); await init() }
      else setErroEmpresa(error.message || 'Não foi possível salvar.')
    } else {
      const { error } = await supabase.from('empresas')
        .insert({ familia_id: familiaId, nome: nomeEmpresa.trim(), cnpj: cnpjEmpresa.trim() || null })
      setSalvandoEmpresa(false)
      if (!error) { setEmpresaModalOpen(false); await init() }
      else setErroEmpresa(error.message || 'Não foi possível salvar.')
    }
  }

  async function handleDeletarEmpresa() {
    if (!editandoEmpresa) return
    if (!confirmDeleteEmpresa) { setConfirmDeleteEmpresa(true); return }
    setDeletandoEmpresa(true)
    const { error } = await supabase.from('empresas').delete().eq('id', editandoEmpresa.id)
    setDeletandoEmpresa(false)
    if (!error) {
      setEmpresas(prev => prev.filter(e => e.id !== editandoEmpresa.id))
      setEmpresaModalOpen(false)
    } else {
      setErroEmpresa(error.message || 'Não foi possível deletar.')
    }
  }

  async function handleSalvarNome() {
    if (!nome.trim()) return
    setSalvandoNome(true); setNomeSalvo(false)
    const { error } = await supabase.from('profiles').update({ nome: nome.trim() }).eq('id', userId)
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
    if (novaSenha !== confirmaSenha) { setSenhaMsg('As senhas não coincidem.'); return }
    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)
    if (error) setSenhaMsg('Erro ao atualizar senha.')
    else { setSenhaMsg('Senha atualizada com sucesso!'); setNovaSenha(''); setConfirmaSenha('') }
  }

  async function handleToggleDizimista(valor: boolean) {
    setDizimista(valor); setSalvandoDizimista(true)
    await supabase.from('familias').update({ dizimista: valor }).eq('id', familiaId)
    setSalvandoDizimista(false)
  }

  async function handleSalvarSaldoInicial() {
    if (!saldoInicialData) return
    setSalvandoSaldoInicial(true); setSaldoInicialSalvo(false)
    const valorNum = saldoInicial ? parseFloat(saldoInicial.replace(/\./g, '').replace(',', '.')) : 0
    const { error } = await supabase.from('familias')
      .update({ saldo_inicial: valorNum, saldo_inicial_data: saldoInicialData })
      .eq('id', familiaId)
    setSalvandoSaldoInicial(false)
    if (!error) { setSaldoInicialSalvo(true); setTimeout(() => setSaldoInicialSalvo(false), 2000) }
  }

  function maskSaldoInicial(raw: string) {
    const digits = raw.replace(/\D/g, '')
    const num = parseInt(digits || '0', 10)
    setSaldoInicial(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
  }

  async function handleCopiarCodigo() {
    if (!codigoConvite) return
    await navigator.clipboard.writeText(codigoConvite)
    setCopiado(true); setTimeout(() => setCopiado(false), 2500)
  }

  async function handleLogout() {
    await supabase.auth.signOut(); router.push('/')
  }

  const iniciais = nome ? nome.trim().split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() : '?'

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden min-h-screen" style={{ backgroundColor: '#F8FAFC', paddingBottom: '100px' }}>

        {/* Header verde com avatar */}
        <div style={{ background: 'linear-gradient(135deg, #05281F 0%, #0C342A 55%, #0E3B2F 100%)', padding: '24px 20px 48px' }}>
          <h1 className="text-lg font-semibold text-white mb-1">Perfil</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {familiaNome ? `Família ${familiaNome}` : 'Gerencie seus dados'}
          </p>
        </div>

        {/* Avatar flutuando */}
        <div className="px-4 -mt-8 mb-4">
          <div className="rounded-2xl border p-4 flex items-center gap-4"
            style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: '#145A4518', color: '#145A45' }}>
              {iniciais}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ color: '#0F172A' }}>{nome || 'Sem nome'}</p>
              <p className="text-sm truncate" style={{ color: '#64748B' }}>{email}</p>
            </div>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-3">

          {/* Dados pessoais mobile */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#64748B' }}>Nome completo</p>
            <div className="flex gap-2">
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                className="flex-1 px-4 h-11 rounded-xl border text-sm outline-none"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
              <button onClick={handleSalvarNome} disabled={salvandoNome || !nome.trim()}
                className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: '#145A45', opacity: (salvandoNome || !nome.trim()) ? 0.6 : 1 }}>
                {nomeSalvo ? <Check size={15} /> : <Save size={15} />}
                {nomeSalvo ? 'Salvo' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Código de convite mobile */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} color="#0F172A" strokeWidth={1.75} />
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Código de convite</p>
            </div>
            {codigoConvite ? (
              <>
                <div className="rounded-xl p-3 mb-3 text-center"
                  style={{ backgroundColor: '#F0FDF4', border: '1.5px dashed #10B981' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#10B981' }}>
                    Família {familiaNome}
                  </p>
                  <p className="text-2xl font-bold tracking-[4px]" style={{ color: '#0F172A' }}>{codigoConvite}</p>
                </div>
                <button onClick={handleCopiarCodigo}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: copiado ? '#ECFDF5' : '#145A45', color: copiado ? '#10B981' : '#fff' }}>
                  {copiado ? <CheckCheck size={15} /> : <Copy size={15} />}
                  {copiado ? 'Copiado!' : 'Copiar código'}
                </button>
              </>
            ) : (
              <p className="text-sm text-center py-2" style={{ color: '#DC2626' }}>Código não encontrado.</p>
            )}
          </div>

          {/* Membros mobile */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={16} color="#0F172A" strokeWidth={1.75} />
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Família {familiaNome}</p>
              </div>
              <span className="text-xs" style={{ color: '#94A3B8' }}>
                {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {membros.map((m: any) => {
                const inic = (m.nome || '?').trim().split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: '#145A4518', color: '#145A45' }}>
                      {inic}
                    </div>
                    <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
                      {m.nome}{m.id === userId ? ' (você)' : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dizimista mobile */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: dizimista ? '#D1FAE5' : '#E2E8F0' }}>
                  <Church size={16} color={dizimista ? '#059669' : '#94A3B8'} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Somos dizimistas</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {dizimista ? 'Card de dízimo ativo' : 'Dízimo desabilitado'}
                  </p>
                </div>
              </div>
              <button onClick={() => handleToggleDizimista(!dizimista)} disabled={salvandoDizimista}
                className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                style={{ backgroundColor: dizimista ? '#10B981' : '#E2E8F0', opacity: salvandoDizimista ? 0.6 : 1 }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: dizimista ? '26px' : '2px' }} />
              </button>
            </div>
          </div>

          {/* Saldo inicial mobile */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} color="#0F172A" strokeWidth={1.75} />
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Saldo inicial</p>
            </div>
            <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>
              Quanto vocês já tinham na conta antes de começar a lançar no Finify. Use a data de referência exata desse valor — nunca "hoje" se já existirem lançamentos anteriores.
            </p>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Valor (R$)</label>
            <input type="text" inputMode="numeric" value={saldoInicial} onChange={e => maskSaldoInicial(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 h-11 rounded-xl border text-sm outline-none mb-3"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Data de referência</label>
            <input type="date" value={saldoInicialData} onChange={e => setSaldoInicialData(e.target.value)}
              className="w-full px-4 h-11 rounded-xl border text-sm outline-none mb-3"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
            <button onClick={handleSalvarSaldoInicial} disabled={salvandoSaldoInicial || !saldoInicialData}
              className="w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#145A45', opacity: (salvandoSaldoInicial || !saldoInicialData) ? 0.6 : 1 }}>
              {saldoInicialSalvo ? <Check size={15} /> : <Save size={15} />}
              {salvandoSaldoInicial ? 'Salvando...' : saldoInicialSalvo ? 'Salvo' : 'Salvar'}
            </button>
          </div>

          {/* Empresas / CNPJ mobile */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} color="#0F172A" strokeWidth={1.75} />
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Minhas empresas</p>
              </div>
              <button onClick={abrirEmpresaModalNovo} className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Plus size={13} strokeWidth={2.5} /> CNPJ
              </button>
            </div>
            {empresas.length === 0 ? (
              <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhuma empresa cadastrada. Adicione um CNPJ para lançar movimentações separadas da sua conta pessoal.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {empresas.map((emp: any) => (
                  <button key={emp.id} onClick={() => abrirEmpresaModalEditar(emp)}
                    className="flex items-center gap-3 w-full text-left" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#145A4518' }}>
                      <Building2 size={14} color="#145A45" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{emp.nome}</p>
                      {emp.cnpj && <p className="text-xs" style={{ color: '#94A3B8' }}>{emp.cnpj}</p>}
                    </div>
                    <Pencil size={13} color="#94A3B8" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alterar senha mobile */}
          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center gap-2 mb-3">
              <Lock size={16} color="#0F172A" strokeWidth={1.75} />
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Alterar senha</p>
            </div>
            <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              placeholder="Nova senha (mínimo 6 caracteres)"
              className="w-full px-4 h-11 rounded-xl border text-sm outline-none mb-2"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
            <input type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)}
              placeholder="Confirmar senha"
              className="w-full px-4 h-11 rounded-xl border text-sm outline-none mb-3"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
            {senhaMsg && (
              <p className="text-xs mb-3" style={{ color: senhaMsg.includes('sucesso') ? '#10B981' : '#EF4444' }}>{senhaMsg}</p>
            )}
            <button onClick={handleTrocarSenha} disabled={salvandoSenha || !novaSenha || !confirmaSenha}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#145A45', opacity: (salvandoSenha || !novaSenha || !confirmaSenha) ? 0.6 : 1 }}>
              {salvandoSenha ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </div>

          {/* Sair mobile */}
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl text-sm font-semibold"
            style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            <LogOut size={16} strokeWidth={2} /> Sair da conta
          </button>
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>Perfil</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Gerencie seus dados e os membros da família{familiaNome ? ` ${familiaNome}` : ''}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 flex flex-col gap-5">

              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                    style={{ backgroundColor: '#145A4518', color: '#145A45' }}>{iniciais}</div>
                  <div>
                    <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>{nome || 'Sem nome'}</h2>
                    <p className="text-sm" style={{ color: '#64748B' }}>{email}</p>
                  </div>
                </div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Nome completo</label>
                <div className="flex gap-2 mb-1">
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                    className="flex-1 px-4 h-12 rounded-xl border text-sm outline-none"
                    style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                  <button onClick={handleSalvarNome} disabled={salvandoNome || !nome.trim()}
                    className="flex items-center gap-2 px-5 rounded-xl text-sm font-semibold text-white transition-opacity"
                    style={{ backgroundColor: '#145A45', opacity: (salvandoNome || !nome.trim()) ? 0.6 : 1 }}>
                    {nomeSalvo ? <Check size={16} /> : <Save size={16} />}
                    {salvandoNome ? 'Salvando...' : nomeSalvo ? 'Salvo' : 'Salvar'}
                  </button>
                </div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 mt-5" style={{ color: '#64748B' }}>E-mail</label>
                <div className="flex items-center gap-2 px-4 h-12 rounded-xl border text-sm"
                  style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', color: '#94A3B8' }}>
                  <Mail size={15} /> {email}
                </div>
              </div>

              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={18} color="#0F172A" strokeWidth={1.75} />
                  <h2 className="font-semibold" style={{ color: '#0F172A' }}>Alterar senha</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Nova senha</label>
                    <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 h-12 rounded-xl border text-sm outline-none" style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Confirmar senha</label>
                    <input type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} placeholder="Repita a senha"
                      className="w-full px-4 h-12 rounded-xl border text-sm outline-none" style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                  </div>
                </div>
                {senhaMsg && <p className="text-sm mb-3" style={{ color: senhaMsg.includes('sucesso') ? '#10B981' : '#EF4444' }}>{senhaMsg}</p>}
                <button onClick={handleTrocarSenha} disabled={salvandoSenha || !novaSenha || !confirmaSenha}
                  className="px-5 h-12 rounded-xl text-sm font-semibold text-white transition-opacity"
                  style={{ backgroundColor: '#145A45', opacity: (salvandoSenha || !novaSenha || !confirmaSenha) ? 0.6 : 1 }}>
                  {salvandoSenha ? 'Atualizando...' : 'Atualizar senha'}
                </button>
              </div>

              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Church size={18} color="#0F172A" strokeWidth={1.75} />
                  <h2 className="font-semibold" style={{ color: '#0F172A' }}>Configurações da família</h2>
                </div>
                <p className="text-sm mb-5" style={{ color: '#64748B' }}>Preferências que se aplicam a todos os membros.</p>
                <div className="flex items-center justify-between p-4 rounded-xl"
                  style={{ backgroundColor: dizimista ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${dizimista ? '#D1FAE5' : '#E2E8F0'}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: dizimista ? '#D1FAE5' : '#E2E8F0' }}>
                      <Church size={17} color={dizimista ? '#059669' : '#94A3B8'} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Somos dizimistas</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {dizimista ? 'O card de dízimo aparece no dashboard e nas receitas' : 'Card de dízimo oculto — funcionalidade desabilitada'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleToggleDizimista(!dizimista)} disabled={salvandoDizimista}
                    className="relative w-12 h-6 rounded-full transition-all flex-shrink-0 ml-4"
                    style={{ backgroundColor: dizimista ? '#10B981' : '#E2E8F0', opacity: salvandoDizimista ? 0.6 : 1 }}>
                    <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                      style={{ left: dizimista ? '26px' : '2px' }} />
                  </button>
                </div>
              </div>

              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={18} color="#0F172A" strokeWidth={1.75} />
                  <h2 className="font-semibold" style={{ color: '#0F172A' }}>Saldo inicial</h2>
                </div>
                <p className="text-sm mb-5" style={{ color: '#64748B' }}>
                  Quanto vocês já tinham na conta antes de começar a lançar no Finify. Use a data de referência exata desse valor — nunca "hoje" se já existirem lançamentos anteriores a essa data no sistema, senão duplica valores já contados.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Valor (R$)</label>
                    <input type="text" inputMode="numeric" value={saldoInicial} onChange={e => maskSaldoInicial(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 h-12 rounded-xl border text-sm outline-none" style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Data de referência</label>
                    <input type="date" value={saldoInicialData} onChange={e => setSaldoInicialData(e.target.value)}
                      className="w-full px-4 h-12 rounded-xl border text-sm outline-none" style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
                  </div>
                </div>
                <button onClick={handleSalvarSaldoInicial} disabled={salvandoSaldoInicial || !saldoInicialData}
                  className="flex items-center gap-2 px-5 h-12 rounded-xl text-sm font-semibold text-white transition-opacity"
                  style={{ backgroundColor: '#145A45', opacity: (salvandoSaldoInicial || !saldoInicialData) ? 0.6 : 1 }}>
                  {saldoInicialSalvo ? <Check size={16} /> : <Save size={16} />}
                  {salvandoSaldoInicial ? 'Salvando...' : saldoInicialSalvo ? 'Salvo' : 'Salvar'}
                </button>
              </div>

              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} color="#0F172A" strokeWidth={1.75} />
                    <h2 className="font-semibold" style={{ color: '#0F172A' }}>Minhas empresas</h2>
                  </div>
                  <button onClick={abrirEmpresaModalNovo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ color: '#145A45', backgroundColor: '#F0FDF4', border: 'none', cursor: 'pointer' }}>
                    <Plus size={13} strokeWidth={2.5} /> Adicionar CNPJ
                  </button>
                </div>
                <p className="text-sm mb-4" style={{ color: '#64748B' }}>Cadastre um CNPJ para lançar movimentações da empresa separadas da sua conta pessoal.</p>
                {empresas.length === 0 ? (
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#F8FAFC' }}>
                    <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma empresa cadastrada ainda.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {empresas.map((emp: any) => (
                      <button key={emp.id} onClick={() => abrirEmpresaModalEditar(emp)}
                        className="flex items-center gap-3 w-full text-left p-3 rounded-xl transition-colors hover:bg-gray-50"
                        style={{ border: '1px solid #E2E8F0', background: 'none', cursor: 'pointer' }}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#145A4518' }}>
                          <Building2 size={16} color="#145A45" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{emp.nome}</p>
                          {emp.cnpj && <p className="text-xs" style={{ color: '#94A3B8' }}>{emp.cnpj}</p>}
                        </div>
                        <Pencil size={14} color="#94A3B8" strokeWidth={1.75} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={18} color="#0F172A" strokeWidth={1.75} />
                  <h2 className="font-semibold" style={{ color: '#0F172A' }}>Código de convite</h2>
                </div>
                <p className="text-sm mb-4" style={{ color: '#64748B' }}>Compartilhe com familiares para entrarem no Finify.</p>
                {codigoConvite ? (
                  <>
                    <div className="rounded-2xl p-4 mb-3 text-center" style={{ backgroundColor: '#F0FDF4', border: '1.5px dashed #10B981' }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#10B981' }}>Código da família {familiaNome}</p>
                      <p className="text-3xl font-bold tracking-[6px]" style={{ color: '#0F172A' }}>{codigoConvite}</p>
                    </div>
                    <button onClick={handleCopiarCodigo}
                      className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all"
                      style={{ backgroundColor: copiado ? '#ECFDF5' : '#145A45', color: copiado ? '#10B981' : '#fff' }}>
                      {copiado ? <CheckCheck size={16} /> : <Copy size={16} />}
                      {copiado ? 'Copiado!' : 'Copiar código'}
                    </button>
                    <p className="text-xs text-center mt-3" style={{ color: '#94A3B8' }}>O familiar usa este código na tela de cadastro.</p>
                  </>
                ) : (
                  <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#FEF2F2' }}>
                    <p className="text-sm" style={{ color: '#DC2626' }}>Código não encontrado.</p>
                  </div>
                )}
              </div>

              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Users size={18} color="#0F172A" strokeWidth={1.75} />
                  <h2 className="font-semibold" style={{ color: '#0F172A' }}>Família {familiaNome}</h2>
                </div>
                <p className="text-sm mb-4" style={{ color: '#64748B' }}>{membros.length} {membros.length === 1 ? 'membro' : 'membros'}</p>
                <div className="flex flex-col gap-3">
                  {membros.map((m: any) => {
                    const inic = (m.nome || '?').trim().split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: '#145A4518', color: '#145A45' }}>{inic}</div>
                        <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>
                          {m.nome}{m.id === userId ? ' (você)' : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} color="#0F172A" strokeWidth={1.75} />
                  <h2 className="font-semibold" style={{ color: '#0F172A' }}>Conta</h2>
                </div>
                <p className="text-sm mb-4" style={{ color: '#64748B' }}>Encerrar sua sessão neste dispositivo.</p>
                <button onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                  <LogOut size={16} strokeWidth={2} /> Sair da conta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Empresa (CNPJ) */}
      {empresaModalOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setEmpresaModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#fff', borderRadius: '20px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                {editandoEmpresa ? 'Editar empresa' : 'Nova empresa'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editandoEmpresa && (
                  <button onClick={handleDeletarEmpresa} disabled={deletandoEmpresa}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: confirmDeleteEmpresa ? '#EF4444' : '#FEF2F2', color: confirmDeleteEmpresa ? '#fff' : '#DC2626' }}>
                    <Trash2 size={13} strokeWidth={2} />
                    {deletandoEmpresa ? 'Deletando...' : confirmDeleteEmpresa ? 'Confirmar' : 'Deletar'}
                  </button>
                )}
                <button onClick={() => setEmpresaModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Nome da empresa</label>
            <input type="text" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)}
              placeholder="Ex: Studio Aline ME"
              className="w-full px-4 h-12 rounded-xl border text-sm outline-none mb-4"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>CNPJ (opcional)</label>
            <input type="text" value={cnpjEmpresa} onChange={e => setCnpjEmpresa(formatCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00" maxLength={18}
              className="w-full px-4 h-12 rounded-xl border text-sm outline-none mb-2"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            {erroEmpresa && (
              <p style={{ fontSize: '12.5px', color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '8px 12px', marginTop: '8px' }}>
                {erroEmpresa}
              </p>
            )}

            <button onClick={handleSalvarEmpresa} disabled={salvandoEmpresa || !nomeEmpresa.trim()}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white mt-4"
              style={{ backgroundColor: '#145A45', opacity: (salvandoEmpresa || !nomeEmpresa.trim()) ? 0.6 : 1, border: 'none', cursor: 'pointer' }}>
              {salvandoEmpresa ? 'Salvando...' : editandoEmpresa ? 'Salvar alterações' : 'Adicionar empresa'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
