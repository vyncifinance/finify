'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight,
  Plus, Wallet, X
} from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATEGORIAS = ['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Compras','Outros']

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function formatDiaLabel(dataStr: string) {
  const hoje   = new Date()
  const ontem  = new Date(); ontem.setDate(hoje.getDate() - 1)
  const data   = new Date(dataStr + 'T12:00:00')

  const f = (d: Date) => d.toISOString().split('T')[0]
  if (f(data) === f(hoje))  return 'Hoje'
  if (f(data) === f(ontem)) return 'Ontem'

  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  return `${dias[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`
}

export default function MovimentosPage() {
  const [loading, setLoading]     = useState(true)
  const [familiaId, setFamiliaId] = useState('')
  const [familiaNome, setFamiliaNome] = useState('')
  const [userId, setUserId]       = useState('')
  const [membroAtual, setMembroAtual] = useState('')
  const [mesRef, setMesRef]       = useState(new Date())
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [filtro, setFiltro]       = useState<'todos'|'receita'|'despesa'>('todos')
  const [filtroMembro, setFiltroMembro] = useState('todos')
  const [membros, setMembros]     = useState<string[]>([])
  const [membrosFamilia, setMembrosFamilia] = useState<string[]>([])

  // Modal novo lançamento
  const [modalOpen, setModalOpen] = useState(false)
  const [tipo, setTipo]           = useState<'despesa'|'receita'>('despesa')
  const [valor, setValor]         = useState('')
  const [categoria, setCategoria] = useState('Alimentação')
  const [membroForm, setMembroForm] = useState('')
  const [data, setData]           = useState(new Date().toISOString().split('T')[0])
  const [salvando, setSalvando]   = useState(false)

  const supabase = createClient()

  useEffect(() => { init() }, [mesRef])

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
      setMembroForm(profile.nome || '')

      const { data: membrosData } = await supabase
        .from('profiles').select('nome').eq('familia_id', profile.familia_id)
      if (membrosData) {
        setMembrosFamilia(membrosData.map((m: any) => m.nome).filter(Boolean))
      }

      await carregarLancamentos(profile.familia_id, profile.nome, (profile.familias as any)?.nome)
    }
    setLoading(false)
  }

  async function carregarLancamentos(fid: string, nomeUsuario?: string, nomeFamilia?: string) {
    const ini = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1).toISOString().split('T')[0]
    const fim = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: lanc } = await supabase.from('lancamentos').select('*')
      .eq('familia_id', fid).gte('data', ini).lte('data', fim)
      .order('data', { ascending: false }).order('hora', { ascending: false })

    if (lanc) {
      setLancamentos(lanc)
      const setMembros2 = new Set<string>()
      lanc.forEach((l: any) => { if (l.membro) setMembros2.add(l.membro) })
      if (nomeUsuario) setMembros2.add(nomeUsuario)
      if (nomeFamilia) setMembros2.add(`Família ${nomeFamilia}`)
      setMembros(Array.from(setMembros2))
    }
  }

  function mudarMes(delta: number) {
    const novo = new Date(mesRef.getFullYear(), mesRef.getMonth() + delta, 1)
    setMesRef(novo)
  }

  async function abrirModal() {
    setTipo('despesa'); setValor(''); setCategoria('Alimentação')
    setData(new Date().toISOString().split('T')[0]); setMembroForm(membroAtual)
    setModalOpen(true)
  }

  async function handleSalvar() {
    if (!valor) return
    setSalvando(true)
    const agora = new Date()
    const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
    const { error } = await supabase.from('lancamentos').insert({
      familia_id: familiaId,
      user_id: userId,
      tipo,
      valor: parseFloat(valor.replace(',', '.')),
      categoria,
      membro: membroForm,
      data,
      hora,
    })
    setSalvando(false)
    if (!error) {
      setModalOpen(false)
      await carregarLancamentos(familiaId)
    }
  }

  // Filtros
  const filtrados = lancamentos.filter(l => {
    if (filtro !== 'todos' && l.tipo !== filtro) return false
    if (filtroMembro !== 'todos' && l.membro !== filtroMembro) return false
    return true
  })

  // Agrupar por dia
  const grupos: Record<string, any[]> = {}
  filtrados.forEach(l => {
    if (!grupos[l.data]) grupos[l.data] = []
    grupos[l.data].push(l)
  })
  const diasOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  // Indicadores
  const totalRec = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
  const totalDes = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
  const resultado = totalRec - totalDes
  const mesLabel = `${MESES[mesRef.getMonth()]} ${mesRef.getFullYear()}`

  return (
    <div className="p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            Fluxo Patrimonial
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Acompanhe receitas e despesas da família{familiaNome ? ` ${familiaNome}` : ''}
          </p>
        </div>
        <button onClick={abrirModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#0F766E', boxShadow: '0 4px 12px rgba(15,118,110,0.3)' }}>
          <Plus size={16} strokeWidth={2.5} /> Novo lançamento
        </button>
      </div>

      {/* SELETOR DE MÊS */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => mudarMes(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:bg-gray-50"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: '#0F172A' }}>
          {mesLabel}
        </span>
        <button onClick={() => mudarMes(1)}
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:bg-gray-50"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* INDICADORES */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#ECFDF5' }}>
            <ArrowDownLeft size={19} color="#10B981" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Receitas</p>
          <p className="text-2xl font-semibold" style={{ color: '#10B981', letterSpacing: '-0.5px' }}>
            {loading ? '...' : fmt(totalRec)}
          </p>
        </div>
        <div className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FEF2F2' }}>
            <ArrowUpRight size={19} color="#EF4444" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Despesas</p>
          <p className="text-2xl font-semibold" style={{ color: '#EF4444', letterSpacing: '-0.5px' }}>
            {loading ? '...' : fmt(totalDes)}
          </p>
        </div>
        <div className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FFFBEB' }}>
            <Wallet size={19} color="#F59E0B" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Resultado do mês</p>
          <p className="text-2xl font-semibold" style={{ color: '#F59E0B', letterSpacing: '-0.5px' }}>
            {loading ? '...' : fmt(resultado)}
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'receita', label: 'Receitas' },
            { key: 'despesa', label: 'Despesas' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as any)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filtro === f.key ? '#fff' : 'transparent',
                color: filtro === f.key ? '#0F172A' : '#64748B',
                boxShadow: filtro === f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
          <button onClick={() => setFiltroMembro('todos')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: filtroMembro === 'todos' ? '#fff' : 'transparent',
              color: filtroMembro === 'todos' ? '#0F172A' : '#64748B',
              boxShadow: filtroMembro === 'todos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            Todos os membros
          </button>
          {membros.map(m => (
            <button key={m} onClick={() => setFiltroMembro(m)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: filtroMembro === m ? '#fff' : 'transparent',
                color: filtroMembro === m ? '#0F172A' : '#64748B',
                boxShadow: filtroMembro === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA AGRUPADA POR DIA */}
      <div className="rounded-[20px] border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        {loading ? (
          <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
        ) : diasOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Wallet size={32} color="#E2E8F0" strokeWidth={1} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum lançamento neste período.</p>
            <button onClick={abrirModal} className="text-sm font-semibold hover:underline" style={{ color: '#0F766E' }}>
              Registrar primeiro lançamento →
            </button>
          </div>
        ) : diasOrdenados.map(dia => {
          const itens = grupos[dia]
          const totalDia = itens.reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
          return (
            <div key={dia}>
              <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#F8FAFC' }}>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
                  {formatDiaLabel(dia)}
                </span>
                <span className="text-xs font-semibold" style={{ color: totalDia >= 0 ? '#10B981' : '#EF4444' }}>
                  {totalDia >= 0 ? '+' : '-'} {fmt(Math.abs(totalDia))}
                </span>
              </div>
              {itens.map((l: any) => (
                <div key={l.id} className="flex items-center gap-3 px-6 py-3.5 border-t" style={{ borderColor: '#F1F5F9' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2' }}>
                    {l.tipo === 'receita'
                      ? <ArrowDownLeft size={15} color="#10B981" strokeWidth={1.75} />
                      : <ArrowUpRight  size={15} color="#EF4444" strokeWidth={1.75} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{l.categoria}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{l.membro} · {l.hora}</p>
                  </div>
                  <p className="font-semibold text-sm flex-shrink-0"
                    style={{ color: l.tipo === 'receita' ? '#10B981' : '#EF4444' }}>
                    {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
                  </p>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* MODAL NOVO LANÇAMENTO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div className="w-full max-w-md rounded-[20px] p-6" style={{ backgroundColor: '#fff' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>Novo lançamento</h2>
              <button onClick={() => setModalOpen(false)} style={{ color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Quem está lançando */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Quem está lançando</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(membrosFamilia.length ? membrosFamilia : [membroAtual]).map(m => (
                <button key={m} onClick={() => setMembroForm(m)}
                  className="py-2.5 rounded-lg text-xs font-medium border transition-all truncate"
                  style={{
                    borderColor: membroForm === m ? '#0F766E' : '#E2E8F0',
                    backgroundColor: membroForm === m ? '#F0FDF4' : '#fff',
                    color: membroForm === m ? '#0F766E' : '#64748B',
                  }}>
                  {m}
                </button>
              ))}
            </div>
            {familiaNome && (
              <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>
                Lançamento será registrado para a família <span className="font-semibold" style={{ color: '#64748B' }}>{familiaNome}</span>
              </p>
            )}

            {/* Tipo */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'despesa', label: 'Despesa', cor: '#EF4444' },
                { key: 'receita', label: 'Receita', cor: '#10B981' },
              ].map(t => (
                <button key={t.key} onClick={() => setTipo(t.key as any)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: tipo === t.key ? t.cor : '#E2E8F0',
                    backgroundColor: tipo === t.key ? t.cor + '12' : '#fff',
                    color: tipo === t.key ? t.cor : '#64748B',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Valor */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Valor</label>
            <input type="text" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00"
              className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            {/* Categoria */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Categoria</label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {CATEGORIAS.map(c => (
                <button key={c} onClick={() => setCategoria(c)}
                  className="py-2 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    borderColor: categoria === c ? '#0F766E' : '#E2E8F0',
                    backgroundColor: categoria === c ? '#F0FDF4' : '#fff',
                    color: categoria === c ? '#0F766E' : '#64748B',
                  }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Data */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full px-4 h-12 rounded-xl border text-sm mb-5 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            <button onClick={handleSalvar} disabled={salvando || !valor}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-opacity"
              style={{ backgroundColor: '#0F766E', opacity: (salvando || !valor) ? 0.6 : 1 }}>
              {salvando ? 'Salvando...' : 'Registrar lançamento'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
