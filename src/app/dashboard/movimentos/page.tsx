'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight,
  Plus, Wallet, X, UtensilsCrossed, Home, Car, Smile,
  Heart, BookOpen, ShoppingBag, Church, MoreHorizontal,
  Briefcase, TrendingUp, Laptop, DollarSign, Trash2
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

  // Modal novo/editar
  const [modalOpen, setModalOpen]     = useState(false)
  const [editando, setEditando]       = useState<any>(null) // null = novo, objeto = editar
  const [tipo, setTipo]               = useState<'despesa'|'receita'>('despesa')
  const [valor, setValor]             = useState('')
  const [categoria, setCategoria]     = useState('Alimentação')
  const [membroForm, setMembroForm]   = useState('')
  const [data, setData]               = useState(new Date().toISOString().split('T')[0])
  const [dizimar, setDizimar]         = useState(true)
  const [salvando, setSalvando]       = useState(false)
  const [deletando, setDeletando]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { init() }, [mesRef.getMonth(), mesRef.getFullYear()])
  useEffect(() => {
    const handler = () => { if (familiaId) carregarLancamentos(familiaId) }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [familiaId])

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
      if (membrosData) setMembrosFamilia(membrosData.map((m: any) => m.nome).filter(Boolean))
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
    setData(new Date().toISOString().split('T')[0])
    setMembroForm(membroAtual); setDizimar(true)
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function abrirModalEditar(l: any) {
    setEditando(l)
    setTipo(l.tipo)
    // Formata o valor existente com máscara
    const valorFormatado = Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setValor(valorFormatado)
    setCategoria(l.categoria)
    setData(l.data)
    setMembroForm(l.membro)
    setDizimar(l.dizimar !== false)
    setConfirmDelete(false)
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
    // Converte valor formatado (ex: "1.234,56") para número
    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) { setSalvando(false); return }

    const agora = new Date()
    const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

    if (editando) {
      const { error } = await supabase.from('lancamentos').update({
        tipo, valor: valorNum,
        categoria, membro: membroForm, data,
        dizimar: tipo === 'receita' ? dizimar : false,
      }).eq('id', editando.id)
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(familiaId); router.refresh() }
    } else {
      const { error } = await supabase.from('lancamentos').insert({
        familia_id: familiaId, user_id: userId, tipo,
        valor: valorNum,
        categoria, membro: membroForm, data, hora,
        dizimar: tipo === 'receita' ? dizimar : false,
      })
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(familiaId); router.refresh() }
    }
  }

  async function handleDeletar() {
    if (!editando) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('lancamentos').delete().eq('id', editando.id)
    setDeletando(false)
    if (!error) { const fid = familiaId || editando.familia_id; setModalOpen(false); setLancamentos(prev => prev.filter(l => l.id !== editando.id)) }
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

  // Modal compartilhado
  const ModalLancamento = () => !modalOpen ? null : (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      onTouchMove={e => e.stopPropagation()}
      onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
      <div className="w-full lg:max-w-md rounded-t-[28px] lg:rounded-[20px] overflow-hidden flex flex-col"
        style={{ backgroundColor: '#fff', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>

        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 lg:hidden flex-shrink-0" style={{ backgroundColor: '#E2E8F0' }} />

        {/* Header do modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#F1F5F9' }}>
          <h2 className="font-semibold text-lg" style={{ color: '#0F172A' }}>
            {editando ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          <div className="flex items-center gap-2">
            {editando && (
              <button onClick={handleDeletar} disabled={deletando}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2',
                  color: confirmDelete ? '#fff' : '#DC2626',
                }}>
                <Trash2 size={13} strokeWidth={2} />
                {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
              </button>
            )}
            <button onClick={() => setModalOpen(false)} style={{ color: '#94A3B8' }}>
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Conteúdo scrollável — sem o botão */}
        <div className="overflow-y-auto px-6 pt-4 flex-1"
          onTouchMove={e => e.stopPropagation()}
          style={{ overscrollBehavior: 'contain' }}>

          {/* Tipo */}
          <div className="flex gap-2 mb-5">
            {[{ key: 'despesa', label: 'Despesa', cor: '#EF4444' }, { key: 'receita', label: 'Receita', cor: '#10B981' }].map(t => (
              <button key={t.key} onClick={() => handleTipo(t.key as any)}
                className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 transition-all"
                style={{ borderColor: tipo === t.key ? t.cor : '#E2E8F0', backgroundColor: tipo === t.key ? t.cor + '12' : '#fff', color: tipo === t.key ? t.cor : '#64748B' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Valor com máscara */}
          <div className="rounded-2xl p-4 mb-5 text-center" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>Valor</p>
            <input
              type="text" inputMode="numeric" value={valor}
              onChange={e => {
                // Remove tudo que não é dígito
                const digits = e.target.value.replace(/\D/g, '')
                // Converte para formato R$ 0,00
                const num = parseInt(digits || '0', 10)
                const formatted = (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                setValor(digits === '' ? '' : formatted)
              }}
              placeholder="R$ 0,00"
              autoFocus={!editando}
              className="w-full text-center text-4xl font-bold outline-none bg-transparent"
              style={{ color: tipo === 'despesa' ? '#EF4444' : '#10B981' }}
            />
          </div>

          {/* Quem está lançando */}
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>Quem está lançando</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(membrosFamilia.length ? membrosFamilia : [membroAtual]).map(m => (
              <button key={m} onClick={() => setMembroForm(m)}
                className="py-2.5 rounded-xl text-sm font-medium border transition-all truncate"
                style={{ borderColor: membroForm === m ? '#0E3B2E' : '#E2E8F0', backgroundColor: membroForm === m ? '#F0FDF4' : '#fff', color: membroForm === m ? '#0E3B2E' : '#64748B' }}>
                {m.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Categoria */}
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>Categoria</label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {categorias.map(c => {
              const Icon = ICONES_CAT[c] || MoreHorizontal
              return (
                <button key={c} onClick={() => setCategoria(c)}
                  className="py-3 rounded-xl text-xs font-medium border transition-all flex flex-col items-center gap-1.5"
                  style={{ borderColor: categoria === c ? '#0E3B2E' : '#E2E8F0', backgroundColor: categoria === c ? '#F0FDF4' : '#fff', color: categoria === c ? '#0E3B2E' : '#64748B' }}>
                  <Icon size={16} strokeWidth={1.75} color={categoria === c ? '#0E3B2E' : '#94A3B8'} />
                  <span>{c}</span>
                </button>
              )
            })}
          </div>

          {/* Data */}
          <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)}
            className="w-full px-4 h-12 rounded-xl border text-sm mb-4 outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }} />

          {/* Toggle dízimo */}
          {tipo === 'receita' && (
            <div className="flex items-center justify-between p-4 rounded-xl mb-4"
              style={{ backgroundColor: dizimar ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${dizimar ? '#D1FAE5' : '#E2E8F0'}` }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Contabilizar dízimo?</p>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {dizimar ? '10% será contabilizado' : 'Devolução ou transferência'}
                </p>
              </div>
              <button onClick={() => setDizimar(!dizimar)}
                className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                style={{ backgroundColor: dizimar ? '#10B981' : '#E2E8F0' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: dizimar ? '26px' : '2px' }} />
              </button>
            </div>
          )}

          {confirmDelete && (
            <p className="text-xs text-center mt-3 mb-2" style={{ color: '#EF4444' }}>
              Toque em "Confirmar" novamente para deletar permanentemente.
            </p>
          )}
        </div>

        {/* Botão fixo no rodapé — sempre visível */}
        <div className="px-6 py-4 border-t" style={{ borderColor: '#F1F5F9', backgroundColor: '#fff' }}>
          <button onClick={handleSalvar} disabled={salvando || !valor}
            className="w-full h-14 rounded-xl text-white font-semibold text-base transition-opacity"
            style={{ backgroundColor: '#0E3B2E', opacity: (salvando || !valor) ? 0.6 : 1 }}>
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Registrar lançamento'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden min-h-screen" style={{ backgroundColor: '#F8FAFC', paddingBottom: '100px' }}>

        {/* Header mobile */}
        <div style={{ backgroundColor: '#0E3B2E', padding: '20px 20px 36px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">Fluxo Patrimonial</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{mesLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => mudarMes(-1)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <ChevronLeft size={16} color="#fff" />
              </button>
              <button onClick={() => mudarMes(1)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <ChevronRight size={16} color="#fff" />
              </button>
            </div>
          </div>
        </div>

        {/* Cards resumo mobile */}
        <div className="grid grid-cols-3 gap-2 px-4 -mt-5 mb-4">
          {[
            { label: 'Receitas',  val: totalRec,  cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
            { label: 'Despesas',  val: totalDes,  cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight  },
            { label: 'Resultado', val: resultado, cor: resultado >= 0 ? '#10B981' : '#EF4444', bg: resultado >= 0 ? '#ECFDF5' : '#FEF2F2', Icon: Wallet },
          ].map(c => (
            <div key={c.label} className="rounded-2xl p-3"
              style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: c.bg }}>
                <c.Icon size={14} color={c.cor} strokeWidth={1.75} />
              </div>
              <p className="text-xs font-medium mb-1" style={{ color: '#64748B' }}>{c.label}</p>
              <p className="text-sm font-semibold leading-tight" style={{ color: c.cor }}>
                {loading ? '...' : `R$ ${Math.abs(c.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        {/* Filtros mobile */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[{ key: 'todos', label: 'Todos' }, { key: 'receita', label: 'Receitas' }, { key: 'despesa', label: 'Despesas' }].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key as any)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: filtro === f.key ? '#0E3B2E' : '#fff', color: filtro === f.key ? '#fff' : '#64748B', border: `1px solid ${filtro === f.key ? '#0E3B2E' : '#E2E8F0'}` }}>
              {f.label}
            </button>
          ))}
          {membros.map(m => (
            <button key={m} onClick={() => setFiltroMembro(filtroMembro === m ? 'todos' : m)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: filtroMembro === m ? '#0E3B2E' : '#fff', color: filtroMembro === m ? '#fff' : '#64748B', border: `1px solid ${filtroMembro === m ? '#0E3B2E' : '#E2E8F0'}` }}>
              {m.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Lista mobile */}
        <div className="px-4 mt-2">
          {loading ? (
            <p className="text-center py-16 text-sm" style={{ color: '#94A3B8' }}>Carregando...</p>
          ) : diasOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Wallet size={32} color="#E2E8F0" strokeWidth={1} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum lançamento neste período.</p>
            </div>
          ) : diasOrdenados.map(dia => {
            const itens    = grupos[dia]
            const totalDia = itens.reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
            return (
              <div key={dia} className="mb-4">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                    {formatDiaLabel(dia)}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: totalDia >= 0 ? '#10B981' : '#EF4444' }}>
                    {totalDia >= 0 ? '+' : '-'} {fmt(Math.abs(totalDia))}
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0' }}>
                  {itens.map((l: any, i: number) => {
                    const Icon = ICONES_CAT[l.categoria] || (l.tipo === 'receita' ? ArrowDownLeft : ArrowUpRight)
                    return (
                      <button key={l.id} onClick={() => abrirModalEditar(l)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                        style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2' }}>
                          <Icon size={16} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{l.categoria}</p>
                          <p className="text-xs" style={{ color: '#94A3B8' }}>{l.membro?.split(' ')[0]} · {l.hora}</p>
                        </div>
                        <p className="font-semibold text-sm flex-shrink-0"
                          style={{ color: l.tipo === 'receita' ? '#10B981' : '#EF4444' }}>
                          {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Botão flutuante mobile */}
        <button onClick={abrirModalNovo}
          className="fixed right-6 w-14 h-14 rounded-full flex items-center justify-center text-white z-40"
          style={{ bottom: '80px', backgroundColor: '#0E3B2E', boxShadow: '0 8px 24px rgba(14,59,46,0.4)' }}>
          <Plus size={24} strokeWidth={2} />
        </button>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
              Fluxo Patrimonial
            </h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              Acompanhe receitas e despesas da família{familiaNome ? ` ${familiaNome}` : ''}
            </p>
          </div>
          <button onClick={abrirModalNovo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#0F766E', boxShadow: '0 4px 12px rgba(15,118,110,0.3)' }}>
            <Plus size={16} strokeWidth={2.5} /> Novo lançamento
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={() => mudarMes(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center border"
            style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: '#0F172A' }}>{mesLabel}</span>
          <button onClick={() => mudarMes(1)}
            className="w-9 h-9 rounded-full flex items-center justify-center border"
            style={{ borderColor: '#E2E8F0', color: '#64748B' }}>
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          {[
            { label: 'Receitas',         val: totalRec,  cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
            { label: 'Despesas',         val: totalDes,  cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight  },
            { label: 'Resultado do mês', val: resultado, cor: '#F59E0B', bg: '#FFFBEB', Icon: Wallet        },
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

        <div className="rounded-[20px] border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {loading ? (
            <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
          ) : diasOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Wallet size={32} color="#E2E8F0" strokeWidth={1} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum lançamento neste período.</p>
              <button onClick={abrirModalNovo} className="text-sm font-semibold hover:underline" style={{ color: '#0F766E' }}>
                Registrar primeiro lançamento →
              </button>
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
                      className="w-full flex items-center gap-3 px-6 py-3.5 border-t text-left transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#F1F5F9' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2' }}>
                        <Icon size={15} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{l.categoria}</p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>{l.membro} · {l.hora}</p>
                      </div>
                      {l.tipo === 'receita' && l.dizimar === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#F1F5F9', color: '#94A3B8' }}>Sem dízimo</span>
                      )}
                      <p className="font-semibold text-sm flex-shrink-0"
                        style={{ color: l.tipo === 'receita' ? '#10B981' : '#EF4444' }}>
                        {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
                      </p>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <ModalLancamento />
    </>
  )
}










