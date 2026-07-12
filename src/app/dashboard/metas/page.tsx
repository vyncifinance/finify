'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useOcultarValores, fmtOculto } from '@/hooks/useOcultarValores'
import {
  Home, BookOpen, Shield, TrendingUp, Send, Heart, Star, Target,
  Plus, X, Calendar, ArrowUp, CheckCircle2, Pencil, Trash2
} from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const ICONES = [
  { nome: 'home',        label: 'Casa',         Icon: Home },
  { nome: 'book',        label: 'Educação',     Icon: BookOpen },
  { nome: 'shield',      label: 'Reserva',      Icon: Shield },
  { nome: 'trending-up', label: 'Investimento', Icon: TrendingUp },
  { nome: 'send',        label: 'Viagem',       Icon: Send },
  { nome: 'heart',       label: 'Saúde',        Icon: Heart },
  { nome: 'star',        label: 'Sonho',        Icon: Star },
  { nome: 'target',      label: 'Meta',         Icon: Target },
]

const CORES = [
  '#145A45', '#C7A15A', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#EF4444', '#64748B',
]

function getIcon(nome: string) {
  return (ICONES.find(i => i.nome === nome) || ICONES[ICONES.length - 1]).Icon
}

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtShort(val: number) {
  if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return fmt(val)
}
function formatPrazo(prazo: string | null) {
  if (!prazo) return null
  const d = new Date(prazo + 'T12:00:00')
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}
function calcMesesRestantes(prazo: string | null) {
  if (!prazo) return null
  const hoje = new Date()
  const fim  = new Date(prazo + 'T12:00:00')
  const diff = (fim.getFullYear() - hoje.getFullYear()) * 12 + (fim.getMonth() - hoje.getMonth())
  return diff > 0 ? diff : 0
}
// Máscara de valor em real: digita só números, vírgula/ponto de milhar entram sozinhos.
// Mesmo padrão já usado certo na tela de Movimentos.
function maskValor(raw: string, setter: (v: string) => void) {
  const digits = raw.replace(/\D/g, '')
  const num = parseInt(digits || '0', 10)
  setter(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
}
function parseValorMasked(v: string) {
  return parseFloat(v.replace(/\./g, '').replace(',', '.'))
}

export default function MetasPage() {
  const [loading, setLoading]         = useState(true)
  const [familiaId, setFamiliaId]     = useState('')
  const [familiaNome, setFamiliaNome] = useState('')
  const [userId, setUserId]           = useState('')
  const [membroAtual, setMembroAtual] = useState('')
  const [metas, setMetas]             = useState<any[]>([])

  const [modalOpen, setModalOpen]         = useState(false)
  const [editandoMeta, setEditandoMeta]   = useState<any>(null)
  const [nome, setNome]                   = useState('')
  const [valorAlvo, setValorAlvo]         = useState('')
  const [prazo, setPrazo]                 = useState('')
  const [icone, setIcone]                 = useState('target')
  const [cor, setCor]                     = useState('#145A45')
  const [salvando, setSalvando]           = useState(false)
  const [deletando, setDeletando]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [aporteOpen, setAporteOpen]           = useState(false)
  const [metaSelecionada, setMetaSelecionada] = useState<any>(null)
  const [valorAporte, setValorAporte]         = useState('')
  const [salvandoAporte, setSalvandoAporte]   = useState(false)

  const [historicoOpen, setHistoricoOpen]     = useState(false)
  const [metaHistorico, setMetaHistorico]     = useState<any>(null)
  const [aportes, setAportes]                 = useState<any[]>([])
  const [carregandoAportes, setCarregandoAportes] = useState(false)
  const [editandoAporteId, setEditandoAporteId]   = useState<string | null>(null)
  const [valorEditAporte, setValorEditAporte]     = useState('')
  const [salvandoEdicaoAporte, setSalvandoEdicaoAporte] = useState(false)
  const [confirmDeleteAporteId, setConfirmDeleteAporteId] = useState<string | null>(null)
  const [deletandoAporteId, setDeletandoAporteId] = useState<string | null>(null)

  const ocultar  = useOcultarValores()
  const supabase = createClient()

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    setUserId(session.user.id)
    const { data: profile } = await supabase
      .from('profiles').select('nome, familia_id, familias(nome)')
      .eq('id', session.user.id).single()
    if (profile) {
      setMembroAtual(profile.nome || '')
      setFamiliaId(profile.familia_id)
      setFamiliaNome((profile.familias as any)?.nome || '')
      await carregarMetas(profile.familia_id)
    }
    setLoading(false)
  }

  async function carregarMetas(fid: string) {
    const { data } = await supabase.from('metas').select('*')
      .eq('familia_id', fid).order('created_at', { ascending: false })
    if (data) setMetas(data)
  }

  function abrirModalNova() {
    setEditandoMeta(null)
    setNome(''); setValorAlvo(''); setPrazo(''); setIcone('target'); setCor('#145A45')
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function abrirModalEditar(m: any) {
    if (m.automatica) return
    setEditandoMeta(m)
    setNome(m.nome)
    setValorAlvo(Number(m.valor_alvo).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    setPrazo(m.prazo ? m.prazo.substring(0, 7) : '')
    setIcone(m.icone || 'target')
    setCor(m.cor || '#145A45')
    setConfirmDelete(false)
    setModalOpen(true)
  }

  async function handleSalvarMeta() {
    if (!nome.trim() || !valorAlvo) return
    setSalvando(true)
    if (editandoMeta) {
      const { error } = await supabase.from('metas').update({
        nome: nome.trim(),
        valor_alvo: parseValorMasked(valorAlvo),
        prazo: prazo ? `${prazo}-01` : null,
        icone, cor,
      }).eq('id', editandoMeta.id)
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarMetas(familiaId) }
    } else {
      const { error } = await supabase.from('metas').insert({
        familia_id: familiaId, user_id: userId,
        nome: nome.trim(),
        valor_alvo: parseValorMasked(valorAlvo),
        valor_atual: 0,
        prazo: prazo ? `${prazo}-01` : null,
        icone, cor,
      })
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarMetas(familiaId) }
    }
  }

  async function handleDeletarMeta() {
    if (!editandoMeta || editandoMeta.automatica) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('metas').delete().eq('id', editandoMeta.id)
    setDeletando(false)
    if (!error) {
      setMetas(prev => prev.filter((m: any) => m.id !== editandoMeta.id))
      setModalOpen(false)
    }
  }

  function abrirAporte(m: any) {
    setMetaSelecionada(m); setValorAporte(''); setAporteOpen(true)
  }

  async function handleAporte() {
    if (!valorAporte || !metaSelecionada) return
    setSalvandoAporte(true)
    const valor = parseValorMasked(valorAporte)

    if (metaSelecionada.automatica) {
      // Meta automática: o aporte vira/soma um registro de Caixa em Patrimônio, não um lançamento de despesa
      const NOME_BEM_RESERVA = 'Reserva de Emergência (aportes)'
      const { data: bemExistente } = await supabase.from('bens').select('id, valor')
        .eq('familia_id', familiaId).eq('tipo', 'caixa').eq('nome', NOME_BEM_RESERVA).maybeSingle()

      if (bemExistente) {
        await supabase.from('bens').update({ valor: Number(bemExistente.valor) + valor }).eq('id', bemExistente.id)
      } else {
        await supabase.from('bens').insert({
          familia_id: familiaId, user_id: userId, nome: NOME_BEM_RESERVA,
          tipo: 'caixa', valor, eh_divida: false,
        })
      }

      const novoValorAtual = Number(metaSelecionada.valor_atual) + valor
      const { error } = await supabase.from('metas').update({ valor_atual: novoValorAtual }).eq('id', metaSelecionada.id)
      if (!error) { setAporteOpen(false); await carregarMetas(familiaId) }
      setSalvandoAporte(false)
      return
    }

    const novoValorAtual = Number(metaSelecionada.valor_atual) + valor
    const { error } = await supabase.from('metas').update({ valor_atual: novoValorAtual }).eq('id', metaSelecionada.id)
    if (!error) {
      const agora = new Date()
      const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
      await supabase.from('lancamentos').insert({
        familia_id: familiaId, user_id: userId, tipo: 'despesa', valor,
        categoria: 'Investimento', membro: membroAtual,
        data: agora.toISOString().split('T')[0], hora,
        descricao: `Aporte para meta: ${metaSelecionada.nome}`,
        meta_id: metaSelecionada.id,
      })
      setAporteOpen(false); await carregarMetas(familiaId)
    }
    setSalvandoAporte(false)
  }

  async function abrirHistorico(m: any) {
    setMetaHistorico(m)
    setHistoricoOpen(true)
    setCarregandoAportes(true)
    setEditandoAporteId(null)
    setConfirmDeleteAporteId(null)
    const { data } = await supabase.from('lancamentos').select('*')
      .eq('meta_id', m.id).order('data', { ascending: false }).order('hora', { ascending: false })
    setAportes(data || [])
    setCarregandoAportes(false)
  }

  function iniciarEdicaoAporte(a: any) {
    setEditandoAporteId(a.id)
    setValorEditAporte(Number(a.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    setConfirmDeleteAporteId(null)
  }

  async function salvarEdicaoAporte(a: any) {
    if (!valorEditAporte || !metaHistorico) return
    const novoValor = parseValorMasked(valorEditAporte)
    if (isNaN(novoValor) || novoValor <= 0) return
    setSalvandoEdicaoAporte(true)
    const delta = novoValor - Number(a.valor)

    const { error } = await supabase.from('lancamentos').update({ valor: novoValor }).eq('id', a.id)
    if (!error) {
      const novoValorAtual = Math.max(Number(metaHistorico.valor_atual) + delta, 0)
      await supabase.from('metas').update({ valor_atual: novoValorAtual }).eq('id', metaHistorico.id)
      setMetaHistorico({ ...metaHistorico, valor_atual: novoValorAtual })
      setAportes(prev => prev.map(x => x.id === a.id ? { ...x, valor: novoValor } : x))
      await carregarMetas(familiaId)
    }
    setEditandoAporteId(null)
    setSalvandoEdicaoAporte(false)
  }

  async function deletarAporte(a: any) {
    if (confirmDeleteAporteId !== a.id) { setConfirmDeleteAporteId(a.id); return }
    if (!metaHistorico) return
    setDeletandoAporteId(a.id)
    const { error } = await supabase.from('lancamentos').delete().eq('id', a.id)
    if (!error) {
      const novoValorAtual = Math.max(Number(metaHistorico.valor_atual) - Number(a.valor), 0)
      await supabase.from('metas').update({ valor_atual: novoValorAtual }).eq('id', metaHistorico.id)
      setMetaHistorico({ ...metaHistorico, valor_atual: novoValorAtual })
      setAportes(prev => prev.filter(x => x.id !== a.id))
      await carregarMetas(familiaId)
    }
    setConfirmDeleteAporteId(null)
    setDeletandoAporteId(null)
  }

  const totalMetas      = metas.length
  const metasConcluidas = metas.filter(m => Number(m.valor_atual) >= Number(m.valor_alvo)).length
  const totalGuardado   = metas.reduce((s, m) => s + Number(m.valor_atual), 0)
  const totalAlvo       = metas.reduce((s, m) => s + Number(m.valor_alvo), 0)

  const kpis = [
    { label: 'Criadas',    val: totalMetas,      cor: '#3B82F6', bg: '#EFF6FF', Icon: Target,      isNum: true },
    { label: 'Concluídas', val: metasConcluidas, cor: '#10B981', bg: '#ECFDF5', Icon: CheckCircle2, isNum: true },
    { label: 'Guardado',   val: totalGuardado,   cor: '#C7A15A', bg: '#FFFBEB', Icon: ArrowUp,      isNum: false },
  ]

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden min-h-screen" style={{ backgroundColor: '#F8FAFC', paddingBottom: '100px' }}>
        <div style={{ background: 'linear-gradient(135deg, #05281F 0%, #0C342A 55%, #0E3B2F 100%)', padding: '24px 20px 48px' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-semibold text-white">Metas da Família</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {familiaNome ? `Família ${familiaNome}` : 'Acompanhe seus sonhos'}
              </p>
            </div>
            <button onClick={abrirModalNova}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer' }}>
              <Plus size={20} color="#fff" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 -mt-6 mb-4">
          {kpis.map(c => (
            <div key={c.label} className="rounded-2xl p-3"
              style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: c.bg }}>
                <c.Icon size={14} color={c.cor} strokeWidth={1.75} />
              </div>
              <p className="text-xs font-medium mb-0.5" style={{ color: '#64748B' }}>{c.label}</p>
              <p className="text-sm font-semibold leading-tight" style={{ color: c.cor }}>
                {loading ? '...' : c.isNum ? c.val : ocultar ? 'R$ •••' : fmtShort(c.val)}
              </p>
            </div>
          ))}
        </div>

        <div className="px-4 flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
          ) : metas.length === 0 ? (
            <div className="rounded-2xl border flex flex-col items-center justify-center py-12 gap-3"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
              <Target size={28} color="#E2E8F0" strokeWidth={1} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma meta criada ainda.</p>
              <button onClick={abrirModalNova} className="text-sm font-semibold" style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
                Criar primeira meta →
              </button>
            </div>
          ) : metas.map(m => {
            const pct        = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
            const mesesRest  = calcMesesRestantes(m.prazo)
            const concluida  = pct >= 100
            const faltaValor = Math.max(Number(m.valor_alvo) - Number(m.valor_atual), 0)
            const Icon       = getIcon(m.icone)
            const corM       = m.cor || '#145A45'
            return (
              <div key={m.id} className="rounded-2xl border p-4"
                style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: corM + '18' }}>
                    <Icon size={17} color={corM} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{m.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {fmtOculto(Number(m.valor_atual), ocultar)} de {fmtOculto(Number(m.valor_alvo), ocultar)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="px-2 py-1 rounded-lg" style={{ backgroundColor: corM + '18' }}>
                      <span className="text-sm font-bold" style={{ color: corM }}>{pct}%</span>
                    </div>
                    {m.automatica ? (
                      <div className="flex items-center gap-1 px-2 h-8 rounded-lg" style={{ backgroundColor: '#F1F5F9' }} title="Gerenciada automaticamente pelo sistema">
                        <Shield size={12} color="#94A3B8" strokeWidth={1.75} />
                      </div>
                    ) : (
                      <button onClick={() => abrirModalEditar(m)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#F1F5F9', border: 'none', cursor: 'pointer' }}>
                        <Pencil size={13} color="#64748B" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#F1F5F9' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: corM }} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  {concluida ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} color="#10B981" strokeWidth={2} />
                      <span className="text-xs font-semibold" style={{ color: '#10B981' }}>Concluída</span>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: '#64748B' }}>Falta {fmtOculto(faltaValor, ocultar)}</span>
                  )}
                  {m.prazo && (
                    <div className="flex items-center gap-1">
                      <Calendar size={11} color="#94A3B8" strokeWidth={1.75} />
                      <span className="text-xs" style={{ color: '#94A3B8' }}>
                        {formatPrazo(m.prazo)}{mesesRest !== null && mesesRest > 0 ? ` · ${mesesRest}m` : ''}
                      </span>
                    </div>
                  )}
                </div>
                {!concluida && (
                  <>
                    <button onClick={() => abrirAporte(m)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold"
                      style={{ backgroundColor: corM + '12', color: corM, border: 'none', cursor: 'pointer' }}>
                      + Adicionar valor
                    </button>
                    {m.automatica && (
                      <p className="text-xs text-center" style={{ color: '#94A3B8', marginTop: '6px' }}>
                        O aporte vira um registro de Caixa em Patrimônio automaticamente
                      </p>
                    )}
                  </>
                )}
                {!m.automatica && Number(m.valor_atual) > 0 && (
                  <button onClick={() => abrirHistorico(m)}
                    className="w-full text-center text-xs font-medium"
                    style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}>
                    Ver aportes
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>Metas da Família</h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              Acompanhe os sonhos e conquistas{familiaNome ? ` da família ${familiaNome}` : ''}
            </p>
          </div>
          <button onClick={abrirModalNova}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#145A45', boxShadow: '0 4px 12px rgba(20,90,69,0.3)', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} strokeWidth={2.5} /> Nova meta
          </button>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          {[
            { label: 'Metas Criadas',    val: totalMetas,      cor: '#3B82F6', bg: '#EFF6FF', Icon: Target,      isNum: true },
            { label: 'Metas Concluídas', val: metasConcluidas, cor: '#10B981', bg: '#ECFDF5', Icon: CheckCircle2, isNum: true },
            { label: 'Total Guardado',   val: totalGuardado,   cor: '#C7A15A', bg: '#FFFBEB', Icon: ArrowUp,      isNum: false },
          ].map(c => (
            <div key={c.label} className="rounded-[20px] p-6 border"
              style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: c.bg }}>
                <c.Icon size={19} color={c.cor} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>{c.label}</p>
              <p className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
                {loading ? '...' : c.isNum ? c.val : ocultar ? 'R$ •••••• de R$ ••••••' : `${fmt(totalGuardado)} de ${fmt(totalAlvo)}`}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
        ) : metas.length === 0 ? (
          <div className="rounded-[20px] border flex flex-col items-center justify-center py-16 gap-3"
            style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <Target size={32} color="#E2E8F0" strokeWidth={1} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma meta criada ainda.</p>
            <button onClick={abrirModalNova} className="text-sm font-semibold hover:underline" style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
              Criar primeira meta →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {metas.map(m => {
              const pct        = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
              const mesesRest  = calcMesesRestantes(m.prazo)
              const concluida  = pct >= 100
              const faltaValor = Math.max(Number(m.valor_alvo) - Number(m.valor_atual), 0)
              const Icon       = getIcon(m.icone)
              const corM       = m.cor || '#145A45'
              return (
                <div key={m.id} className="rounded-[20px] border p-6"
                  style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: corM + '18' }}>
                      <Icon size={19} color={corM} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{m.nome}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {fmtOculto(Number(m.valor_atual), ocultar)} de {fmtOculto(Number(m.valor_alvo), ocultar)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: corM + '18' }}>
                        <span className="text-sm font-bold" style={{ color: corM }}>{pct}%</span>
                      </div>
                      {m.automatica ? (
                        <div className="flex items-center gap-1 px-2 h-8 rounded-lg" style={{ backgroundColor: '#F1F5F9' }} title="Gerenciada automaticamente pelo sistema">
                          <Shield size={12} color="#94A3B8" strokeWidth={1.75} />
                        </div>
                      ) : (
                        <button onClick={() => abrirModalEditar(m)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
                          style={{ backgroundColor: '#F1F5F9', border: 'none', cursor: 'pointer' }}>
                          <Pencil size={13} color="#64748B" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: '#F1F5F9' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: corM }} />
                  </div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    {concluida ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} color="#10B981" strokeWidth={2} />
                        <span className="text-xs font-semibold" style={{ color: '#10B981' }}>Concluída</span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#64748B' }}>Falta {fmtOculto(faltaValor, ocultar)}</span>
                    )}
                    {m.prazo && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} color="#94A3B8" strokeWidth={1.75} />
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          {formatPrazo(m.prazo)}{mesesRest !== null && mesesRest > 0 ? ` · ${mesesRest}m` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  {!concluida && (
                    <>
                      <button onClick={() => abrirAporte(m)}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                        style={{ backgroundColor: corM + '12', color: corM, border: 'none', cursor: 'pointer' }}>
                        + Adicionar valor
                      </button>
                      {m.automatica && (
                        <p className="text-xs text-center" style={{ color: '#94A3B8', marginTop: '6px' }}>
                          O aporte vira um registro de Caixa em Patrimônio automaticamente
                        </p>
                      )}
                    </>
                  )}
                  {!m.automatica && Number(m.valor_atual) > 0 && (
                    <button onClick={() => abrirHistorico(m)}
                      className="w-full text-center text-xs font-medium hover:opacity-80"
                      style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}>
                      Ver aportes
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODAL NOVA/EDITAR META (inline, sem subcomponente) ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="w-full lg:max-w-md rounded-t-[28px] lg:rounded-[20px] overflow-hidden flex flex-col"
            style={{ backgroundColor: '#fff', maxHeight: '90vh' }}>

            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 lg:hidden flex-shrink-0" style={{ backgroundColor: '#E2E8F0' }} />

            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#F1F5F9' }}>
              <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>
                {editandoMeta ? 'Editar meta' : 'Nova meta'}
              </h2>
              <div className="flex items-center gap-2">
                {editandoMeta && (
                  <button onClick={handleDeletarMeta} disabled={deletando}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2', color: confirmDelete ? '#fff' : '#DC2626', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={13} strokeWidth={2} />
                    {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
                  </button>
                )}
                <button onClick={() => setModalOpen(false)} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pt-4 pb-2">
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Nome da meta</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Casa própria"
                className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
              />

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Valor alvo (R$)</label>
              <input
                type="text" inputMode="numeric"
                value={valorAlvo}
                onChange={e => maskValor(e.target.value, setValorAlvo)}
                placeholder="0,00"
                className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
              />

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Prazo (opcional)</label>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '2px' }}>
                {MESES.map((m, i) => {
                  const mm = String(i + 1).padStart(2, '0')
                  const selecionado = prazo !== '' && prazo.slice(5, 7) === mm
                  return (
                    <button key={m} type="button" onClick={() => {
                      const ano = prazo ? prazo.slice(0, 4) : String(new Date().getFullYear())
                      setPrazo(`${ano}-${mm}`)
                    }}
                      style={{
                        padding: '7px 13px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, flexShrink: 0, cursor: 'pointer',
                        border: `1px solid ${selecionado ? '#145A45' : '#E2E8F0'}`,
                        backgroundColor: selecionado ? '#145A45' : '#fff',
                        color: selecionado ? '#fff' : '#64748B',
                      }}>
                      {m.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i).map(a => {
                  const selecionado = prazo !== '' && Number(prazo.slice(0, 4)) === a
                  return (
                    <button key={a} type="button" onClick={() => {
                      const mm = prazo ? prazo.slice(5, 7) : '01'
                      setPrazo(`${a}-${mm}`)
                    }}
                      style={{
                        padding: '7px 13px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                        border: `1px solid ${selecionado ? '#145A45' : '#E2E8F0'}`,
                        backgroundColor: selecionado ? '#145A45' : '#fff',
                        color: selecionado ? '#fff' : '#64748B',
                      }}>
                      {a}
                    </button>
                  )
                })}
              </div>
              {prazo !== '' && (
                <button type="button" onClick={() => setPrazo('')}
                  className="text-xs font-medium mb-4" style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Remover prazo
                </button>
              )}
              {prazo === '' && <div className="mb-4" />}

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Ícone</label>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {ICONES.map(ic => (
                  <button key={ic.nome} onClick={() => setIcone(ic.nome)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all"
                    style={{ borderColor: icone === ic.nome ? cor : '#E2E8F0', backgroundColor: icone === ic.nome ? cor + '12' : '#fff', borderWidth: icone === ic.nome ? 2 : 1, cursor: 'pointer' }}>
                    <ic.Icon size={18} color={icone === ic.nome ? cor : '#64748B'} strokeWidth={1.75} />
                    <span className="text-[10px]" style={{ color: icone === ic.nome ? cor : '#94A3B8' }}>{ic.label}</span>
                  </button>
                ))}
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Cor</label>
              <div className="flex gap-2.5 flex-wrap mb-4">
                {CORES.map(c => (
                  <button key={c} onClick={() => setCor(c)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={{ backgroundColor: c, border: cor === c ? '3px solid #fff' : 'none', boxShadow: cor === c ? `0 0 0 2px ${c}` : 'none', cursor: 'pointer' }}>
                    {cor === c && <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />}
                  </button>
                ))}
              </div>

              {confirmDelete && (
                <p className="text-xs text-center mb-2" style={{ color: '#EF4444' }}>
                  Toque em "Confirmar" para deletar permanentemente.
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: '#F1F5F9', backgroundColor: '#fff' }}>
              <button onClick={handleSalvarMeta} disabled={salvando || !nome.trim() || !valorAlvo}
                className="w-full h-12 rounded-xl text-white font-semibold text-base transition-opacity"
                style={{ backgroundColor: '#145A45', opacity: (salvando || !nome.trim() || !valorAlvo) ? 0.6 : 1, border: 'none', cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : editandoMeta ? 'Salvar alterações' : 'Criar meta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL APORTE (inline) ── */}
      {aporteOpen && metaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setAporteOpen(false) }}>
          <div className="w-full lg:max-w-sm rounded-t-[28px] lg:rounded-[20px] p-6"
            style={{ backgroundColor: '#fff', paddingBottom: '32px' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4 lg:hidden" style={{ backgroundColor: '#E2E8F0' }} />
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>Adicionar valor</h2>
              <button onClick={() => setAporteOpen(false)} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: '#64748B' }}>
              Meta: <span className="font-semibold" style={{ color: '#0F172A' }}>{metaSelecionada.nome}</span>
            </p>
            <div className="rounded-2xl p-4 mb-4 text-center" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>Valor (R$)</p>
              <input
                type="text"
                inputMode="numeric"
                value={valorAporte}
                onChange={e => maskValor(e.target.value, setValorAporte)}
                placeholder="0,00"
                autoFocus
                className="w-full text-center text-4xl font-bold outline-none bg-transparent"
                style={{ color: metaSelecionada.cor || '#145A45' }}
              />
            </div>
            <p className="text-xs mb-5" style={{ color: '#94A3B8' }}>
              Esse valor também será registrado como despesa (Investimento) no fluxo patrimonial.
            </p>
            <button onClick={handleAporte} disabled={salvandoAporte || !valorAporte}
              className="w-full h-14 rounded-xl text-white font-semibold text-base transition-opacity"
              style={{ backgroundColor: metaSelecionada.cor || '#145A45', opacity: (salvandoAporte || !valorAporte) ? 0.6 : 1, border: 'none', cursor: 'pointer' }}>
              {salvandoAporte ? 'Salvando...' : 'Confirmar aporte'}
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL HISTÓRICO DE APORTES (inline) ── */}
      {historicoOpen && metaHistorico && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setHistoricoOpen(false) }}>
          <div className="w-full lg:max-w-md rounded-t-[28px] lg:rounded-[20px] overflow-hidden flex flex-col"
            style={{ backgroundColor: '#fff', maxHeight: '85vh' }}>

            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 lg:hidden flex-shrink-0" style={{ backgroundColor: '#E2E8F0' }} />

            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#F1F5F9' }}>
              <div>
                <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>Aportes</h2>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{metaHistorico.nome}</p>
              </div>
              <button onClick={() => setHistoricoOpen(false)} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {carregandoAportes ? (
                <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>Carregando...</p>
              ) : aportes.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>Nenhum aporte encontrado para essa meta.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {aportes.map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: '#94A3B8' }}>{formatPrazo(a.data.slice(0, 7) + '-01')}</p>
                        {editandoAporteId === a.id ? (
                          <input
                            type="text" inputMode="numeric" autoFocus
                            value={valorEditAporte}
                            onChange={e => maskValor(e.target.value, setValorEditAporte)}
                            className="w-full mt-1 px-2 h-8 rounded-lg border text-sm outline-none"
                            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                          />
                        ) : (
                          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{fmt(Number(a.valor))}</p>
                        )}
                      </div>
                      {editandoAporteId === a.id ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => salvarEdicaoAporte(a)} disabled={salvandoEdicaoAporte}
                            className="px-3 h-8 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: '#145A45', color: '#fff', border: 'none', cursor: 'pointer' }}>
                            {salvandoEdicaoAporte ? '...' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditandoAporteId(null)}
                            className="px-2 h-8 rounded-lg text-xs"
                            style={{ backgroundColor: '#F1F5F9', color: '#64748B', border: 'none', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => iniciarEdicaoAporte(a)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: '#F1F5F9', border: 'none', cursor: 'pointer' }}>
                            <Pencil size={13} color="#64748B" strokeWidth={1.75} />
                          </button>
                          <button onClick={() => deletarAporte(a)} disabled={deletandoAporteId === a.id}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: confirmDeleteAporteId === a.id ? '#EF4444' : '#FEF2F2', border: 'none', cursor: 'pointer' }}>
                            <Trash2 size={13} color={confirmDeleteAporteId === a.id ? '#fff' : '#DC2626'} strokeWidth={1.75} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-center mt-4" style={{ color: '#94A3B8' }}>
                Editar ou deletar um aporte aqui também ajusta o valor guardado da meta e o lançamento correspondente em Movimentos.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
