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

const CATEGORIAS_DESPESA = ['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Compras','Dízimo','Outros']
const CATEGORIAS_RECEITA = ['Salário','Renda Extra','Freelance','Investimento','Outros']

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function formatDiaLabel(dataStr: string) {
  const hoje  = new Date()
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
  const data  = new Date(dataStr + 'T12:00:00')
  const f = (d: Date) => d.toISOString().split('T')[0]
  if (f(data) === f(hoje))  return 'Hoje'
  if (f(data) === f(ontem)) return 'Ontem'
  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  return `${dias[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`
}

export default function MovimentosPage() {
  const [loading, setLoading]         = useState(true)
  const [familiaId, setFamiliaId]     = useState('')
  const [familiaNome, setFamiliaNome] = useState('')
  const [userId, setUserId]           = useState('')
  const [membroAtual, setMembroAtual] = useState('')
  const [mesRef, setMesRef]           = useState(new Date())
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [filtro, setFiltro]           = useState<'todos'|'receita'|'despesa'>('todos')
  const [filtroMembro, setFiltroMembro] = useState('todos')
  const [membros, setMembros]           = useState<string[]>([])
  const [membrosFamilia, setMembrosFamilia] = useState<string[]>([])

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [tipo, setTipo]           = useState<'despesa'|'receita'>('despesa')
  const [valor, setValor]         = useState('')
  const [categoria, setCategoria] = useState('Alimentação')
  const [membroForm, setMembroForm] = useState('')
  const [data, setData]           = useState(new Date().toISOString().split('T')[0])
  const [dizimar, setDizimar]     = useState(true)   // ← NOVO
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
    setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + delta, 1))
  }

  function abrirModal() {
    setTipo('despesa'); setValor(''); setCategoria('Alimentação')
    setData(new Date().toISOString().split('T')[0])
    setMembroForm(membroAtual); setDizimar(true)
    setModalOpen(true)
  }

  // Quando muda o tipo, reset categoria e dizimar padrão
  function handleTipo(t: 'despesa' | 'receita') {
    setTipo(t)
    setCategoria(t === 'despesa' ? 'Alimentação' : 'Salário')
    setDizimar(t === 'receita') // receitas dizimam por padrão, despesas não
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
      dizimar: tipo === 'receita' ? dizimar : false, // despesas nunca dizimam
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

  const grupos: Record<string, any[]> = {}
  filtrados.forEach(l => {
    if (!grupos[l.data]) grupos[l.data] = []
    grupos[l.data].push(l)
  })
  const diasOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  const totalRec = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
  const totalDes = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
  const resultado = totalRec - totalDes
  const mesLabel  = `${MESES[mesRef.getMonth()]} ${mesRef.getFullYear()}`

  const categorias = tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA

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

      {/* SELETOR MÊS */}
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
        {[
          { label: 'Receitas',        val: totalRec,  cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
          { label: 'Despesas',        val: totalDes,  cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight },
          { label: 'Resultado do mês',val: resultado, cor: '#F59E0B', bg: '#FFFBEB', Icon: Wallet },
        ].map(c => (
          <div key={c.label} className="rounded-[20px] p-6 border"
            style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: c.bg }}>
              <c.Icon size={19} color={c.cor} strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>{c.label}</p>
            <p className="text-2xl font-semibold" style={{ color: c.cor, letterSpacing: '-0.5px' }}>
              {loading ? '...' : fmt(c.val)}
            </p>
          </div>
        ))}
      </div>

      {/* FILTROS */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
          {[{ key: 'todos', label: 'Todos' }, { key: 'receita', label: 'Receitas' }, { key: 'despesa', label: 'Despesas' }].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as any)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: filtro === f.key ? '#fff' : 'transparent', color: filtro === f.key ? '#0F172A' : '#64748B', boxShadow: filtro === f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
          <button onClick={() => setFiltroMembro('todos')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: filtroMembro === 'todos' ? '#fff' : 'transparent', color: filtroMembro === 'todos' ? '#0F172A' : '#64748B', boxShadow: filtroMembro === 'todos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
            Todos os membros
          </button>
          {membros.map(m => (
            <button key={m} onClick={() => setFiltroMembro(m)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: filtroMembro === m ? '#fff' : 'transparent', color: filtroMembro === m ? '#0F172A' : '#64748B', boxShadow: filtroMembro === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA */}
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
                  {/* Badge dízimo */}
                  {l.tipo === 'receita' && l.dizimar === false && (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#F1F5F9', color: '#94A3B8' }}>
                      Sem dízimo
                    </span>
                  )}
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

      {/* MODAL */}
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
                  style={{ borderColor: membroForm === m ? '#0F766E' : '#E2E8F0', backgroundColor: membroForm === m ? '#F0FDF4' : '#fff', color: membroForm === m ? '#0F766E' : '#64748B' }}>
                  {m}
                </button>
              ))}
            </div>

            {/* Tipo */}
            <div className="flex gap-2 mb-4">
              {[{ key: 'despesa', label: 'Despesa', cor: '#EF4444' }, { key: 'receita', label: 'Receita', cor: '#10B981' }].map(t => (
                <button key={t.key} onClick={() => handleTipo(t.key as any)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{ borderColor: tipo === t.key ? t.cor : '#E2E8F0', backgroundColor: tipo === t.key ? t.cor + '12' : '#fff', color: tipo === t.key ? t.cor : '#64748B' }}>
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
            <div className="grid grid-cols-3 gap-2 mb-4">
              {categorias.map(c => (
                <button key={c} onClick={() => setCategoria(c)}
                  className="py-2 rounded-lg text-xs font-medium border transition-all"
                  style={{ borderColor: categoria === c ? '#0F766E' : '#E2E8F0', backgroundColor: categoria === c ? '#F0FDF4' : '#fff', color: categoria === c ? '#0F766E' : '#64748B' }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Data */}
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

            {/* TOGGLE DÍZIMO — só aparece para receitas */}
            {tipo === 'receita' && (
              <div className="flex items-center justify-between p-4 rounded-xl mb-4"
                style={{ backgroundColor: dizimar ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${dizimar ? '#D1FAE5' : '#E2E8F0'}` }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Contabilizar dízimo?</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {dizimar ? 'Esta receita conta para o dízimo (10%)' : 'Devolução, reembolso ou transferência'}
                  </p>
                </div>
                <button
                  onClick={() => setDizimar(!dizimar)}
                  className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                  style={{ backgroundColor: dizimar ? '#10B981' : '#E2E8F0' }}>
                  <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: dizimar ? '26px' : '2px' }} />
                </button>
              </div>
            )}

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
