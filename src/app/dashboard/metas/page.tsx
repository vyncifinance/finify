'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Home, BookOpen, Shield, TrendingUp, Send, Heart, Star, Target,
  Plus, X, Calendar, ArrowUp, CheckCircle2
} from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const ICONES = [
  { nome: 'home',        label: 'Casa',        Icon: Home },
  { nome: 'book',        label: 'Educação',    Icon: BookOpen },
  { nome: 'shield',      label: 'Reserva',     Icon: Shield },
  { nome: 'trending-up', label: 'Investimento',Icon: TrendingUp },
  { nome: 'send',        label: 'Viagem',      Icon: Send },
  { nome: 'heart',       label: 'Saúde',       Icon: Heart },
  { nome: 'star',        label: 'Sonho',       Icon: Star },
  { nome: 'target',      label: 'Meta',        Icon: Target },
]

const CORES = [
  '#0F766E', '#C7A15A', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#EF4444', '#64748B',
]

function getIcon(nome: string) {
  return (ICONES.find(i => i.nome === nome) || ICONES[ICONES.length - 1]).Icon
}

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
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

export default function MetasPage() {
  const [loading, setLoading]     = useState(true)
  const [familiaId, setFamiliaId] = useState('')
  const [familiaNome, setFamiliaNome] = useState('')
  const [userId, setUserId]       = useState('')
  const [membroAtual, setMembroAtual] = useState('')
  const [metas, setMetas]         = useState<any[]>([])

  // Modal nova meta
  const [modalOpen, setModalOpen] = useState(false)
  const [nome, setNome]           = useState('')
  const [valorAlvo, setValorAlvo] = useState('')
  const [prazo, setPrazo]         = useState('')
  const [icone, setIcone]         = useState('target')
  const [cor, setCor]             = useState('#0F766E')
  const [salvando, setSalvando]   = useState(false)

  // Modal aporte
  const [aporteOpen, setAporteOpen]   = useState(false)
  const [metaSelecionada, setMetaSelecionada] = useState<any>(null)
  const [valorAporte, setValorAporte] = useState('')
  const [salvandoAporte, setSalvandoAporte] = useState(false)

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

  function abrirModal() {
    setNome(''); setValorAlvo(''); setPrazo(''); setIcone('target'); setCor('#0F766E')
    setModalOpen(true)
  }

  async function handleSalvarMeta() {
    if (!nome.trim() || !valorAlvo) return
    setSalvando(true)
    const { error } = await supabase.from('metas').insert({
      familia_id: familiaId,
      user_id: userId,
      nome: nome.trim(),
      valor_alvo: parseFloat(valorAlvo.replace(',', '.')),
      valor_atual: 0,
      prazo: prazo || null,
      icone,
      cor,
    })
    setSalvando(false)
    if (!error) {
      setModalOpen(false)
      await carregarMetas(familiaId)
    }
  }

  function abrirAporte(meta: any) {
    setMetaSelecionada(meta)
    setValorAporte('')
    setAporteOpen(true)
  }

  async function handleAporte() {
    if (!valorAporte || !metaSelecionada) return
    setSalvandoAporte(true)
    const valor = parseFloat(valorAporte.replace(',', '.'))
    const novoValorAtual = Number(metaSelecionada.valor_atual) + valor

    const { error } = await supabase.from('metas')
      .update({ valor_atual: novoValorAtual })
      .eq('id', metaSelecionada.id)

    if (!error) {
      const agora = new Date()
      const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
      await supabase.from('lancamentos').insert({
        familia_id: familiaId,
        user_id: userId,
        tipo: 'despesa',
        valor,
        categoria: 'Investimento',
        membro: membroAtual,
        data: agora.toISOString().split('T')[0],
        hora,
        meta_id: metaSelecionada.id,
        descricao: `Aporte para meta: ${metaSelecionada.nome}`,
      })
      setAporteOpen(false)
      await carregarMetas(familiaId)
    }
    setSalvandoAporte(false)
  }

  // Indicadores gerais
  const totalMetas      = metas.length
  const metasConcluidas = metas.filter(m => Number(m.valor_atual) >= Number(m.valor_alvo)).length
  const totalGuardado   = metas.reduce((s, m) => s + Number(m.valor_atual), 0)
  const totalAlvo       = metas.reduce((s, m) => s + Number(m.valor_alvo), 0)

  return (
    <div className="p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            Metas da Família
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Acompanhe os sonhos e conquistas{familiaNome ? ` da família ${familiaNome}` : ''}
          </p>
        </div>
        <button onClick={abrirModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#0F766E', boxShadow: '0 4px 12px rgba(15,118,110,0.3)' }}>
          <Plus size={16} strokeWidth={2.5} /> Nova meta
        </button>
      </div>

      {/* INDICADORES */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#EFF6FF' }}>
            <Target size={19} color="#3B82F6" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Metas Criadas</p>
          <p className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            {loading ? '...' : totalMetas}
          </p>
        </div>
        <div className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#ECFDF5' }}>
            <CheckCircle2 size={19} color="#10B981" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Metas Concluídas</p>
          <p className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            {loading ? '...' : metasConcluidas}
          </p>
        </div>
        <div className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FFFBEB' }}>
            <ArrowUp size={19} color="#C7A15A" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Total Guardado</p>
          <p className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            {loading ? '...' : `${fmt(totalGuardado)} de ${fmt(totalAlvo)}`}
          </p>
        </div>
      </div>

      {/* LISTA DE METAS */}
      {loading ? (
        <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
      ) : metas.length === 0 ? (
        <div className="rounded-[20px] border flex flex-col items-center justify-center py-16 gap-3"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
          <Target size={32} color="#E2E8F0" strokeWidth={1} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma meta criada ainda.</p>
          <button onClick={abrirModal} className="text-sm font-semibold hover:underline" style={{ color: '#0F766E' }}>
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
            const cor        = m.cor || '#0F766E'

            return (
              <div key={m.id} className="rounded-[20px] border p-6"
                style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cor + '18' }}>
                    <Icon size={19} color={cor} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{m.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {fmt(Number(m.valor_atual))} de {fmt(Number(m.valor_alvo))}
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg flex-shrink-0" style={{ backgroundColor: cor + '18' }}>
                    <span className="text-sm font-bold" style={{ color: cor }}>{pct}%</span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ backgroundColor: '#F1F5F9' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cor }} />
                </div>

                {/* Rodapé */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  {concluida ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} color="#10B981" strokeWidth={2} />
                      <span className="text-xs font-semibold" style={{ color: '#10B981' }}>Concluída</span>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: '#64748B' }}>
                      Falta {fmt(faltaValor)}
                    </span>
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
                  <button onClick={() => abrirAporte(m)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
                    style={{ backgroundColor: cor + '12', color: cor }}>
                    + Adicionar valor
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL NOVA META */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div className="w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>Nova meta</h2>
              <button onClick={() => setModalOpen(false)} style={{ color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Nome */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Nome da meta</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Casa própria"
              className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            {/* Valor alvo */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Valor alvo (R$)</label>
            <input type="text" value={valorAlvo} onChange={e => setValorAlvo(e.target.value)} placeholder="0,00"
              className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            {/* Prazo */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Prazo (opcional)</label>
            <input type="month" value={prazo ? prazo.substring(0, 7) : ''} onChange={e => setPrazo(e.target.value ? `${e.target.value}-01` : '')}
              className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            {/* Ícone */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Ícone</label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {ICONES.map(ic => (
                <button key={ic.nome} onClick={() => setIcone(ic.nome)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all"
                  style={{
                    borderColor: icone === ic.nome ? cor : '#E2E8F0',
                    backgroundColor: icone === ic.nome ? cor + '12' : '#fff',
                    borderWidth: icone === ic.nome ? 2 : 1,
                  }}>
                  <ic.Icon size={18} color={icone === ic.nome ? cor : '#64748B'} strokeWidth={1.75} />
                  <span className="text-[10px]" style={{ color: icone === ic.nome ? cor : '#94A3B8' }}>{ic.label}</span>
                </button>
              ))}
            </div>

            {/* Cor */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Cor</label>
            <div className="flex gap-2.5 flex-wrap mb-5">
              {CORES.map(c => (
                <button key={c} onClick={() => setCor(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: c, border: cor === c ? '3px solid #fff' : 'none', boxShadow: cor === c ? `0 0 0 2px ${c}` : 'none' }}>
                  {cor === c && <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />}
                </button>
              ))}
            </div>

            <button onClick={handleSalvarMeta} disabled={salvando || !nome.trim() || !valorAlvo}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-opacity"
              style={{ backgroundColor: '#0F766E', opacity: (salvando || !nome.trim() || !valorAlvo) ? 0.6 : 1 }}>
              {salvando ? 'Salvando...' : 'Criar meta'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL APORTE */}
      {aporteOpen && metaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div className="w-full max-w-sm rounded-[20px] p-6" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>Adicionar valor</h2>
              <button onClick={() => setAporteOpen(false)} style={{ color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: '#64748B' }}>
              Meta: <span className="font-semibold" style={{ color: '#0F172A' }}>{metaSelecionada.nome}</span>
            </p>

            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Valor (R$)</label>
            <input type="text" value={valorAporte} onChange={e => setValorAporte(e.target.value)} placeholder="0,00" autoFocus
              className="w-full px-4 h-12 rounded-xl border text-sm mb-2 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />
            <p className="text-xs mb-5" style={{ color: '#94A3B8' }}>
              Esse valor também será registrado como uma despesa (categoria Investimento) no fluxo patrimonial.
            </p>

            <button onClick={handleAporte} disabled={salvandoAporte || !valorAporte}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-opacity"
              style={{ backgroundColor: metaSelecionada.cor || '#0F766E', opacity: (salvandoAporte || !valorAporte) ? 0.6 : 1 }}>
              {salvandoAporte ? 'Salvando...' : 'Confirmar aporte'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
