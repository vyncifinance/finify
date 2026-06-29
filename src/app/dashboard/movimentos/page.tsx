'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight,
  Plus, Wallet, X, UtensilsCrossed, Home, Car, Smile,
  Heart, BookOpen, ShoppingBag, Church, MoreHorizontal,
  Briefcase, TrendingUp, Laptop, DollarSign, Trash2, Pencil
} from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATEGORIAS_DESPESA = ['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Compras','Dízimo','Outros']
const CATEGORIAS_RECEITA = ['Salário','Renda Extra','Freelance','Investimento','Outros']

const ICONES_CAT: Record<string, any> = {
  'Alimentação': UtensilsCrossed, 'Moradia': Home, 'Transporte': Car, 'Lazer': Smile,
  'Saúde': Heart, 'Educação': BookOpen, 'Compras': ShoppingBag, 'Dízimo': Church, 'Outros': MoreHorizontal,
  'Salário': Briefcase, 'Renda Extra': DollarSign, 'Freelance': Laptop, 'Investimento': TrendingUp,
}

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
  const router       = useRouter()
  const familiaIdRef = useRef('')

  const [loading, setLoading]           = useState(true)
  const [familiaId, setFamiliaId]       = useState('')
  const [familiaNome, setFamiliaNome]   = useState('')
  const [userId, setUserId]             = useState('')
  const [membroAtual, setMembroAtual]   = useState('')
  const [mesRef, setMesRef]             = useState(new Date())
  const [lancamentos, setLancamentos]   = useState<any[]>([])
  const [filtro, setFiltro]             = useState<'todos'|'receita'|'despesa'>('todos')
  const [filtroMembro, setFiltroMembro] = useState('todos')
  const [membros, setMembros]           = useState<string[]>([])
  const [membrosFamilia, setMembrosFamilia] = useState<string[]>([])

  const [modalOpen, setModalOpen]         = useState(false)
  const [editando, setEditando]           = useState<any>(null)
  const [tipo, setTipo]                   = useState<'despesa'|'receita'>('despesa')
  const [valor, setValor]                 = useState('')
  const [categoria, setCategoria]         = useState('Alimentação')
  const [membroForm, setMembroForm]       = useState('')
  const [dataLanc, setDataLanc]           = useState(new Date().toISOString().split('T')[0])
  const [dizimar, setDizimar]             = useState(true)
  const [salvando, setSalvando]           = useState(false)
  const [deletando, setDeletando]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const supabase = createClient()

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (familiaIdRef.current) carregarLancamentos(familiaIdRef.current)
  }, [mesRef])

  useEffect(() => {
    const handler = () => {
      if (!document.hidden && familiaIdRef.current) {
        carregarLancamentos(familiaIdRef.current)
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  async function init() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    setUserId(session.user.id)
    const { data: profile } = await supabase
      .from('profiles').select('nome, familia_id, familias(nome)')
      .eq('id', session.user.id).single()
    if (profile) {
      const fid = profile.familia_id
      setMembroAtual(profile.nome || '')
      setFamiliaId(fid)
      familiaIdRef.current = fid
      setFamiliaNome((profile.familias as any)?.nome || '')
      setMembroForm(profile.nome || '')
      const { data: membrosData } = await supabase
        .from('profiles').select('nome').eq('familia_id', fid)
      if (membrosData) setMembrosFamilia(membrosData.map((m: any) => m.nome).filter(Boolean))
      await carregarLancamentos(fid, profile.nome, (profile.familias as any)?.nome)
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
      const s = new Set<string>()
      lanc.forEach((l: any) => { if (l.membro) s.add(l.membro) })
      if (nomeUsuario) s.add(nomeUsuario)
      if (nomeFamilia) s.add(`Família ${nomeFamilia}`)
      setMembros(Array.from(s))
    }
  }

  function mudarMes(delta: number) {
    setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + delta, 1))
  }

  function abrirModalNovo() {
    setEditando(null)
    setTipo('despesa'); setValor(''); setCategoria('Alimentação')
    setDataLanc(new Date().toISOString().split('T')[0])
    setMembroForm(membroAtual); setDizimar(true); setConfirmDelete(false)
    setModalOpen(true)
  }

  function abrirModalEditar(l: any) {
    setEditando(l); setTipo(l.tipo)
    const vf = Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setValor(vf); setCategoria(l.categoria); setDataLanc(l.data)
    setMembroForm(l.membro); setDizimar(l.dizimar !== false); setConfirmDelete(false)
    setModalOpen(true)
  }

  function handleTipo(t: 'despesa' | 'receita') {
    setTipo(t)
    setCategoria(t === 'despesa' ? 'Alimentação' : 'Salário')
    setDizimar(t === 'receita')
  }

  async function handleSalvar() {
    if (!valor) return
    setSalvando(true)
    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) { setSalvando(false); return }
    const fid  = familiaIdRef.current
    const agora = new Date()
    const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

    if (editando) {
      const { error } = await supabase.from('lancamentos').update({
        tipo, valor: valorNum, categoria, membro: membroForm, data: dataLanc,
        dizimar: tipo === 'receita' ? dizimar : false,
      }).eq('id', editando.id)
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid) }
    } else {
      const { error } = await supabase.from('lancamentos').insert({
        familia_id: fid, user_id: userId, tipo, valor: valorNum,
        categoria, membro: membroForm, data: dataLanc, hora,
        dizimar: tipo === 'receita' ? dizimar : false,
      })
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid) }
    }
  }

  async function handleDeletar() {
    if (!editando) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('lancamentos').delete().eq('id', editando.id)
    setDeletando(false)
    if (!error) {
      setLancamentos(prev => prev.filter((l: any) => l.id !== editando.id))
      setModalOpen(false)
    }
  }

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
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '100px' }}>

        <div style={{ backgroundColor: '#0E3B2E', padding: '20px 20px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Fluxo Patrimonial</h1>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{mesLabel}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => mudarMes(-1)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={16} color="#fff" />
              </button>
              <button onClick={() => mudarMes(1)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={16} color="#fff" />
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', padding: '0 16px', marginTop: '-20px', marginBottom: '16px' }}>
          {[
            { label: 'Receitas',  val: totalRec,  cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
            { label: 'Despesas',  val: totalDes,  cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight  },
            { label: 'Resultado', val: resultado, cor: resultado >= 0 ? '#10B981' : '#EF4444', bg: resultado >= 0 ? '#ECFDF5' : '#FEF2F2', Icon: Wallet },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <c.Icon size={14} color={c.cor} strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>{c.label}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: c.cor, lineHeight: 1.2 }}>
                {loading ? '...' : `R$ ${Math.abs(c.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px', overflowX: 'auto' }}>
          {[{ key: 'todos', label: 'Todos' }, { key: 'receita', label: 'Receitas' }, { key: 'despesa', label: 'Despesas' }].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as any)}
              style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${filtro === f.key ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: filtro === f.key ? '#0E3B2E' : '#fff', color: filtro === f.key ? '#fff' : '#64748B', cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
          {membros.map(m => (
            <button key={m} onClick={() => setFiltroMembro(filtroMembro === m ? 'todos' : m)}
              style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${filtroMembro === m ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: filtroMembro === m ? '#0E3B2E' : '#fff', color: filtroMembro === m ? '#fff' : '#64748B', cursor: 'pointer' }}>
              {m.split(' ')[0]}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '64px 0', fontSize: '14px', color: '#94A3B8' }}>Carregando...</p>
          ) : diasOrdenados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: '12px' }}>
              <Wallet size={32} color="#E2E8F0" strokeWidth={1} />
              <p style={{ fontSize: '14px', color: '#94A3B8' }}>Nenhum lançamento neste período.</p>
            </div>
          ) : diasOrdenados.map(dia => {
            const itens    = grupos[dia]
            const totalDia = itens.reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
            return (
              <div key={dia} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{formatDiaLabel(dia)}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: totalDia >= 0 ? '#10B981' : '#EF4444' }}>
                    {totalDia >= 0 ? '+' : '-'} {fmt(Math.abs(totalDia))}
                  </span>
                </div>
                <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden' }}>
                  {itens.map((l: any, i: number) => {
                    const Icon = ICONES_CAT[l.categoria] || (l.tipo === 'receita' ? ArrowDownLeft : ArrowUpRight)
                    return (
                      <button key={l.id} onClick={() => abrirModalEditar(l)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', backgroundColor: 'transparent', border: i > 0 ? '1px solid #F1F5F9' : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.categoria}</p>
                          <p style={{ fontSize: '12px', color: '#94A3B8' }}>{l.membro?.split(' ')[0]} · {l.hora}</p>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: l.tipo === 'receita' ? '#10B981' : '#EF4444', flexShrink: 0 }}>
                          {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
                        </p>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Pencil size={12} color="#64748B" strokeWidth={1.75} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={abrirModalNovo}
          style={{ position: 'fixed', bottom: '80px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#0E3B2E', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(14,59,46,0.4)', zIndex: 40 }}>
          <Plus size={24} color="#fff" strokeWidth={2} />
        </button>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>Fluxo Patrimonial</h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>Acompanhe receitas e despesas{familiaNome ? ` da família ${familiaNome}` : ''}</p>
          </div>
          <button onClick={abrirModalNovo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#0F766E', boxShadow: '0 4px 12px rgba(15,118,110,0.3)' }}>
            <Plus size={16} strokeWidth={2.5} /> Novo lançamento
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={() => mudarMes(-1)} className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: '#0F172A' }}>{mesLabel}</span>
          <button onClick={() => mudarMes(1)} className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          {[
            { label: 'Receitas', val: totalRec, cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
            { label: 'Despesas', val: totalDes, cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight },
            { label: 'Resultado do mês', val: resultado, cor: '#F59E0B', bg: '#FFFBEB', Icon: Wallet },
          ].map(c => (
            <div key={c.label} className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: c.bg }}>
                <c.Icon size={19} color={c.cor} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>{c.label}</p>
              <p className="text-2xl font-semibold" style={{ color: c.cor, letterSpacing: '-0.5px' }}>{loading ? '...' : fmt(c.val)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
            {[{ key: 'todos', label: 'Todos' }, { key: 'receita', label: 'Receitas' }, { key: 'despesa', label: 'Despesas' }].map(f => (
              <button key={f.key} onClick={() => setFiltro(f.key as any)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: filtro === f.key ? '#fff' : 'transparent', color: filtro === f.key ? '#0F172A' : '#64748B', boxShadow: filtro === f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
            <button onClick={() => setFiltroMembro('todos')}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: filtroMembro === 'todos' ? '#fff' : 'transparent', color: filtroMembro === 'todos' ? '#0F172A' : '#64748B', boxShadow: filtroMembro === 'todos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              Todos os membros
            </button>
            {membros.map(m => (
              <button key={m} onClick={() => setFiltroMembro(m)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: filtroMembro === m ? '#fff' : 'transparent', color: filtroMembro === m ? '#0F172A' : '#64748B', boxShadow: filtroMembro === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {loading ? (
            <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
          ) : diasOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Wallet size={32} color="#E2E8F0" strokeWidth={1} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum lançamento neste período.</p>
              <button onClick={abrirModalNovo} className="text-sm font-semibold hover:underline" style={{ color: '#0F766E' }}>Registrar primeiro lançamento →</button>
            </div>
          ) : diasOrdenados.map(dia => {
            const itens    = grupos[dia]
            const totalDia = itens.reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
            return (
              <div key={dia}>
                <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#F8FAFC' }}>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>{formatDiaLabel(dia)}</span>
                  <span className="text-xs font-semibold" style={{ color: totalDia >= 0 ? '#10B981' : '#EF4444' }}>
                    {totalDia >= 0 ? '+' : '-'} {fmt(Math.abs(totalDia))}
                  </span>
                </div>
                {itens.map((l: any) => {
                  const Icon = ICONES_CAT[l.categoria] || (l.tipo === 'receita' ? ArrowDownLeft : ArrowUpRight)
                  return (
                    <button key={l.id} onClick={() => abrirModalEditar(l)}
                      className="w-full flex items-center gap-3 px-6 py-3.5 border-t text-left hover:bg-gray-50"
                      style={{ borderColor: '#F1F5F9' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2' }}>
                        <Icon size={15} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{l.categoria}</p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>{l.membro} · {l.hora}</p>
                      </div>
                      <p className="font-semibold text-sm flex-shrink-0" style={{ color: l.tipo === 'receita' ? '#10B981' : '#EF4444' }}>
                        {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
                      </p>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#F1F5F9' }}>
                        <Pencil size={12} color="#64748B" strokeWidth={1.75} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MODAL — inline style puro, sem Tailwind ── */}
      {/* Modal Mobile */}
      {modalOpen && (
        <div className="lg:hidden"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>

            {/* Drag handle */}
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>
                {editando ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editando && (
                  <button onClick={handleDeletar} disabled={deletando}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2', color: confirmDelete ? '#fff' : '#DC2626' }}>
                    <Trash2 size={13} strokeWidth={2} />
                    {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
                  </button>
                )}
                <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Scroll area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 4px' }}>

              {/* Tipo */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {[{ key: 'despesa', label: 'Despesa', cor: '#EF4444' }, { key: 'receita', label: 'Receita', cor: '#10B981' }].map(t => (
                  <button key={t.key} onClick={() => handleTipo(t.key as any)}
                    style={{ flex: 1, padding: '8px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === t.key ? t.cor : '#E2E8F0'}`, backgroundColor: tipo === t.key ? t.cor + '12' : '#fff', color: tipo === t.key ? t.cor : '#64748B' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Valor */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px 16px', marginBottom: '10px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Valor</p>
                <input
                  type="text" inputMode="numeric" value={valor}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    const num = parseInt(digits || '0', 10)
                    const formatted = (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    setValor(digits === '' ? '' : formatted)
                  }}
                  placeholder="0,00"
                  style={{ width: '100%', textAlign: 'center', fontSize: '26px', fontWeight: 700, border: 'none', outline: 'none', backgroundColor: 'transparent', color: tipo === 'despesa' ? '#EF4444' : '#10B981' }}
                />
              </div>

              {/* Membro */}
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Quem está lançando</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '10px' }}>
                {(membrosFamilia.length ? membrosFamilia : [membroAtual]).map(m => (
                  <button key={m} onClick={() => setMembroForm(m)}
                    style={{ padding: '8px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${membroForm === m ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: membroForm === m ? '#F0FDF4' : '#fff', color: membroForm === m ? '#0E3B2E' : '#64748B' }}>
                    {m.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Categoria */}
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Categoria</p>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', paddingBottom: '4px' }}>
                {categorias.map(c => {
                  const Icon = ICONES_CAT[c] || MoreHorizontal
                  return (
                    <button key={c} onClick={() => setCategoria(c)}
                      style={{ padding: '8px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${categoria === c ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: categoria === c ? '#F0FDF4' : '#fff', color: categoria === c ? '#0E3B2E' : '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, minWidth: '60px' }}>
                      <Icon size={14} strokeWidth={1.75} color={categoria === c ? '#0E3B2E' : '#94A3B8'} />
                      {c}
                    </button>
                  )
                })}
              </div>

              {/* Data + Dízimo em linha */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <input type="date" value={dataLanc} onChange={e => setDataLanc(e.target.value)}
                  style={{ flex: 1, padding: '9px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
                {tipo === 'receita' && (
                  <button onClick={() => setDizimar(!dizimar)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '12px', border: `1px solid ${dizimar ? '#D1FAE5' : '#E2E8F0'}`, backgroundColor: dizimar ? '#F0FDF4' : '#F8FAFC', cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: dizimar ? '#10B981' : '#E2E8F0', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '2px', left: dizimar ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: dizimar ? '#059669' : '#94A3B8', whiteSpace: 'nowrap' }}>Dízimo</span>
                  </button>
                )}
              </div>

              {confirmDelete && (
                <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginBottom: '8px' }}>
                  Toque em "Confirmar" para deletar permanentemente.
                </p>
              )}
            </div>

            {/* Botão fixo no rodapé */}
            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0, position: 'sticky', bottom: 0 }}>
              <button onClick={handleSalvar} disabled={salvando || !valor}
                style={{ width: '100%', height: '48px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 600, color: '#fff', cursor: salvando || !valor ? 'not-allowed' : 'pointer', backgroundColor: '#0E3B2E', opacity: salvando || !valor ? 0.6 : 1 }}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Registrar lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Desktop */}
      {modalOpen && (
        <div className="hidden lg:flex"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          {/* Desktop: modal centralizado */}
          <div style={{ width: '520px', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A' }}>
                {editando ? 'Editar lançamento' : 'Novo lançamento'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editando && (
                  <button onClick={handleDeletar} disabled={deletando}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2', color: confirmDelete ? '#fff' : '#DC2626' }}>
                    <Trash2 size={13} strokeWidth={2} />
                    {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
                  </button>
                )}
                <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[{ key: 'despesa', label: 'Despesa', cor: '#EF4444' }, { key: 'receita', label: 'Receita', cor: '#10B981' }].map(t => (
                  <button key={t.key} onClick={() => handleTipo(t.key as any)}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === t.key ? t.cor : '#E2E8F0'}`, backgroundColor: tipo === t.key ? t.cor + '12' : '#fff', color: tipo === t.key ? t.cor : '#64748B' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '4px' }}>Valor</p>
                <input type="text" inputMode="numeric" value={valor}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    const num = parseInt(digits || '0', 10)
                    setValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                  }}
                  placeholder="0,00"
                  style={{ width: '100%', textAlign: 'center', fontSize: '32px', fontWeight: 700, border: 'none', outline: 'none', backgroundColor: 'transparent', color: tipo === 'despesa' ? '#EF4444' : '#10B981' }} />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>Quem está lançando</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '16px' }}>
                {(membrosFamilia.length ? membrosFamilia : [membroAtual]).map(m => (
                  <button key={m} onClick={() => setMembroForm(m)}
                    style={{ padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${membroForm === m ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: membroForm === m ? '#F0FDF4' : '#fff', color: membroForm === m ? '#0E3B2E' : '#64748B' }}>
                    {m.split(' ')[0]}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>Categoria</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '16px' }}>
                {categorias.map(c => {
                  const Icon = ICONES_CAT[c] || MoreHorizontal
                  return (
                    <button key={c} onClick={() => setCategoria(c)}
                      style={{ padding: '10px 4px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${categoria === c ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: categoria === c ? '#F0FDF4' : '#fff', color: categoria === c ? '#0E3B2E' : '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <Icon size={15} strokeWidth={1.75} color={categoria === c ? '#0E3B2E' : '#94A3B8'} />
                      {c}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                <input type="date" value={dataLanc} onChange={e => setDataLanc(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none' }} />
                {tipo === 'receita' && (
                  <button onClick={() => setDizimar(!dizimar)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', borderRadius: '12px', border: `1px solid ${dizimar ? '#D1FAE5' : '#E2E8F0'}`, backgroundColor: dizimar ? '#F0FDF4' : '#F8FAFC', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: dizimar ? '#10B981' : '#E2E8F0' }}>
                      <div style={{ position: 'absolute', top: '2px', left: dizimar ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: dizimar ? '#059669' : '#94A3B8' }}>Dízimo</span>
                  </button>
                )}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
              <button onClick={handleSalvar} disabled={salvando || !valor}
                style={{ width: '100%', height: '52px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: 600, color: '#fff', cursor: salvando || !valor ? 'not-allowed' : 'pointer', backgroundColor: '#0E3B2E', opacity: salvando || !valor ? 0.6 : 1 }}>
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Registrar lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
