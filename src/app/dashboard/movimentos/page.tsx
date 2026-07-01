'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight,
  Plus, Wallet, X, UtensilsCrossed, Home, Car, Smile,
  Heart, BookOpen, ShoppingBag, Church, MoreHorizontal,
  Briefcase, TrendingUp, Laptop, DollarSign, Trash2, Pencil,
  CreditCard, AlignLeft, Target, ChevronDown
} from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATEGORIAS_DESPESA = ['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Compras','Cartão de Crédito','Dízimo','Outros']
const CATEGORIAS_RECEITA = ['Salário','Renda Extra','Freelance','Investimento','Outros']

const ICONES_CAT: Record<string, any> = {
  'Alimentação': UtensilsCrossed, 'Moradia': Home, 'Transporte': Car, 'Lazer': Smile,
  'Saúde': Heart, 'Educação': BookOpen, 'Compras': ShoppingBag, 'Dízimo': Church,
  'Cartão de Crédito': CreditCard, 'Outros': MoreHorizontal,
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
  const [metas, setMetas]               = useState<any[]>([])

  const [modalOpen, setModalOpen]         = useState(false)
  const [editando, setEditando]           = useState<any>(null)
  const [tipo, setTipo]                   = useState<'despesa'|'receita'>('despesa')
  const [valor, setValor]                 = useState('')
  const [categoria, setCategoria]         = useState('Alimentação')
  const [membroForm, setMembroForm]       = useState('')
  const [dataLanc, setDataLanc]           = useState(new Date().toISOString().split('T')[0])
  const [dizimar, setDizimar]             = useState(true)
  const [observacao, setObservacao]       = useState('')
  const [parcelado, setParcelado]         = useState(false)
  const [numParcelas, setNumParcelas]     = useState('2')
  const [diaParcela, setDiaParcela]       = useState('1')
  const [salvando, setSalvando]           = useState(false)
  const [deletando, setDeletando]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isMobile, setIsMobile]           = useState(true)

  // Alocação para meta
  const [alocarMeta, setAlocarMeta]     = useState(false)
  const [metaId, setMetaId]             = useState('')
  const [metaPct, setMetaPct]           = useState(10)

  const supabase = createClient()

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024)
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { init() }, [])
  useEffect(() => {
    if (familiaIdRef.current) carregarLancamentos(familiaIdRef.current)
  }, [mesRef])
  useEffect(() => {
    const handler = () => {
      if (!document.hidden && familiaIdRef.current) carregarLancamentos(familiaIdRef.current)
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
      const { data: metasData } = await supabase
        .from('metas').select('id, nome, valor_atual, valor_alvo, cor')
        .eq('familia_id', fid).order('created_at', { ascending: false })
      if (metasData) setMetas(metasData)
      await carregarLancamentos(fid, profile.nome, (profile.familias as any)?.nome)
    }
    setLoading(false)
  }

  async function carregarLancamentos(fid: string, nomeUsuario?: string, nomeFamilia?: string) {
    if (!fid) return
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
    setMembroForm(membroAtual); setDizimar(true)
    setObservacao(''); setParcelado(false); setNumParcelas('2'); setDiaParcela('1')
    setAlocarMeta(false); setMetaId(''); setMetaPct(10)
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function abrirModalEditar(l: any) {
    setEditando(l); setTipo(l.tipo)
    const vf = Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setValor(vf); setCategoria(l.categoria); setDataLanc(l.data)
    setMembroForm(l.membro); setDizimar(l.dizimar !== false)
    setObservacao(l.descricao || '')
    setParcelado(false); setNumParcelas('2'); setDiaParcela('1')
    setAlocarMeta(false); setMetaId(l.meta_id || ''); setMetaPct(l.meta_pct || 10)
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function handleTipo(t: 'despesa' | 'receita') {
    setTipo(t)
    setCategoria(t === 'despesa' ? 'Alimentação' : 'Salário')
    setDizimar(t === 'receita')
    setParcelado(false)
    setAlocarMeta(false)
  }

  const valorNum = () => parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0
  const valorMeta = () => Math.round((valorNum() * metaPct) / 100 * 100) / 100

  async function handleSalvar() {
    if (!valor) return
    setSalvando(true)
    const vNum = valorNum()
    if (isNaN(vNum) || vNum <= 0) { setSalvando(false); return }
    const fid   = familiaIdRef.current
    const agora = new Date()
    const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

    if (editando) {
      const { error } = await supabase.from('lancamentos').update({
        tipo, valor: vNum, categoria, membro: membroForm, data: dataLanc,
        dizimar: tipo === 'receita' ? dizimar : false,
        descricao: observacao || null,
        meta_id: null, meta_pct: null,
      }).eq('id', editando.id)
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid) }
    } else if (parcelado && tipo === 'despesa') {
      const n = parseInt(numParcelas) || 2
      const dia = parseInt(diaParcela) || 1
      const valorParcela = vNum / n
      const dataBase = new Date(dataLanc + 'T12:00:00')
      const inserts = []
      for (let i = 0; i < n; i++) {
        const d = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dia)
        inserts.push({
          familia_id: fid, user_id: userId, tipo: 'despesa',
          valor: Math.round(valorParcela * 100) / 100,
          categoria, membro: membroForm, data: d.toISOString().split('T')[0], hora,
          dizimar: false,
          descricao: `${observacao ? observacao + ' ' : ''}Parcela ${i + 1}/${n}`,
          meta_id: null, meta_pct: null,
        })
      }
      const { error } = await supabase.from('lancamentos').insert(inserts)
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid) }
    } else {
      // Alocação para meta
      const metaIdFinal  = tipo === 'receita' && alocarMeta && metaId ? metaId : null
      const metaPctFinal = tipo === 'receita' && alocarMeta && metaId ? metaPct : null

      const { error } = await supabase.from('lancamentos').insert({
        familia_id: fid, user_id: userId, tipo, valor: vNum,
        categoria, membro: membroForm, data: dataLanc, hora,
        dizimar: tipo === 'receita' ? dizimar : false,
        descricao: observacao || null,
        meta_id: metaIdFinal,
        meta_pct: metaPctFinal,
      })

      // Atualiza valor_atual da meta
      if (!error && metaIdFinal) {
        const meta = metas.find(m => m.id === metaIdFinal)
        if (meta) {
          const novoValor = Number(meta.valor_atual) + valorMeta()
          await supabase.from('metas').update({ valor_atual: novoValor }).eq('id', metaIdFinal)
          setMetas(prev => prev.map(m => m.id === metaIdFinal ? { ...m, valor_atual: novoValor } : m))
        }
      }

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
  const temMetas   = metas.length > 0

  const metaSelecionada = metas.find(m => m.id === metaId)

  const modalContent = (isMob: boolean) => (
    <>
      {isMob && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 8px' }}>

        {/* Tipo */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {[{ key: 'despesa', label: 'Despesa', cor: '#EF4444' }, { key: 'receita', label: 'Receita', cor: '#10B981' }].map(t => (
            <button key={t.key} onClick={() => handleTipo(t.key as any)}
              style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === t.key ? t.cor : '#E2E8F0'}`, backgroundColor: tipo === t.key ? t.cor + '12' : '#fff', color: tipo === t.key ? t.cor : '#64748B' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '6px 16px', marginBottom: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Valor</p>
          <input
            type="text" inputMode="numeric" value={valor}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '')
              const num = parseInt(digits || '0', 10)
              setValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
            }}
            placeholder="0,00"
            style={{ width: '100%', textAlign: 'center', fontSize: isMob ? '28px' : '32px', fontWeight: 700, border: 'none', outline: 'none', backgroundColor: 'transparent', color: tipo === 'despesa' ? '#EF4444' : '#10B981' }}
          />
        </div>

        {/* Membro */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Quem está lançando</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', marginBottom: '10px' }}>
          {(membrosFamilia.length ? membrosFamilia : [membroAtual]).map(m => (
            <button key={m} onClick={() => setMembroForm(m)}
              style={{ padding: '8px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${membroForm === m ? '#0B3B2E' : '#E2E8F0'}`, backgroundColor: membroForm === m ? '#F0FDF4' : '#fff', color: membroForm === m ? '#0B3B2E' : '#64748B' }}>
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
                style={{ padding: '8px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${categoria === c ? '#0B3B2E' : '#E2E8F0'}`, backgroundColor: categoria === c ? '#F0FDF4' : '#fff', color: categoria === c ? '#0B3B2E' : '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, minWidth: '64px' }}>
                <Icon size={14} strokeWidth={1.75} color={categoria === c ? '#0B3B2E' : '#94A3B8'} />
                {c}
              </button>
            )
          })}
        </div>

        {/* Data + Dízimo */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
          <input type="date" value={dataLanc} onChange={e => setDataLanc(e.target.value)}
            style={{ flex: 1, padding: '9px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
          {tipo === 'receita' && (
            <button onClick={() => setDizimar(!dizimar)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '12px', border: `1px solid ${dizimar ? '#D1FAE5' : '#E2E8F0'}`, backgroundColor: dizimar ? '#F0FDF4' : '#F8FAFC', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: dizimar ? '#10B981' : '#E2E8F0' }}>
                <div style={{ position: 'absolute', top: '2px', left: dizimar ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: dizimar ? '#059669' : '#94A3B8', whiteSpace: 'nowrap' }}>Dízimo</span>
            </button>
          )}
        </div>

        {/* Parcelado — só despesa e novo lançamento */}
        {tipo === 'despesa' && !editando && (
          <div style={{ marginBottom: '10px' }}>
            <button onClick={() => setParcelado(!parcelado)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${parcelado ? '#3B82F6' : '#E2E8F0'}`, backgroundColor: parcelado ? '#EFF6FF' : '#F8FAFC', cursor: 'pointer', marginBottom: parcelado ? '8px' : '0' }}>
              <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: parcelado ? '#3B82F6' : '#E2E8F0', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '2px', left: parcelado ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: parcelado ? '#1D4ED8' : '#0F172A', margin: 0 }}>Compra parcelada</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Divide o valor em parcelas mensais</p>
              </div>
            </button>
            {parcelado && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px 14px', backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#1D4ED8', marginBottom: '4px' }}>Nº de parcelas</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setNumParcelas(String(Math.max(2, parseInt(numParcelas) - 1)))}
                      style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #BFDBFE', backgroundColor: '#fff', cursor: 'pointer', fontSize: '16px', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#1D4ED8', minWidth: '24px', textAlign: 'center' }}>{numParcelas}x</span>
                    <button onClick={() => setNumParcelas(String(Math.min(48, parseInt(numParcelas) + 1)))}
                      style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #BFDBFE', backgroundColor: '#fff', cursor: 'pointer', fontSize: '16px', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#1D4ED8', marginBottom: '4px' }}>Dia de vencimento</p>
                  <input type="number" min="1" max="31" value={diaParcela} onChange={e => setDiaParcela(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #BFDBFE', fontSize: '16px', fontWeight: 700, color: '#1D4ED8', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }} />
                </div>
                {valor && (
                  <div style={{ gridColumn: '1 / -1', padding: '8px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #BFDBFE', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                      {numParcelas}x de <strong style={{ color: '#1D4ED8' }}>
                        {fmt(parseFloat(valor.replace(/\./g, '').replace(',', '.')) / parseInt(numParcelas))}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ALOCAÇÃO PARA META — só receita, novo lançamento, com metas disponíveis ── */}
        {tipo === 'receita' && !editando && temMetas && (
          <div style={{ marginBottom: '10px' }}>
            <button onClick={() => { setAlocarMeta(!alocarMeta); if (!metaId && metas.length > 0) setMetaId(metas[0].id) }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${alocarMeta ? '#8B5CF6' : '#E2E8F0'}`, backgroundColor: alocarMeta ? 'rgba(139,92,246,0.06)' : '#F8FAFC', cursor: 'pointer', marginBottom: alocarMeta ? '8px' : '0' }}>
              <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: alocarMeta ? '#8B5CF6' : '#E2E8F0', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '2px', left: alocarMeta ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: alocarMeta ? '#6D28D9' : '#0F172A', margin: 0 }}>Alocar parte para uma meta</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Destina uma % desta receita para a meta</p>
              </div>
            </button>

            {alocarMeta && (
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(139,92,246,0.05)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                {/* Seletor de meta */}
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Meta</p>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <select value={metaId} onChange={e => setMetaId(e.target.value)}
                    style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: '10px', border: '1.5px solid rgba(139,92,246,0.3)', fontSize: '13.5px', color: '#0F172A', outline: 'none', backgroundColor: '#fff', appearance: 'none', cursor: 'pointer' }}>
                    {metas.map(m => {
                      const pct = Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100)
                      return <option key={m.id} value={m.id}>{m.nome} · {pct}%</option>
                    })}
                  </select>
                  <ChevronDown size={15} color="#8B5CF6" strokeWidth={2} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                {/* Stepper de percentual */}
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Percentual</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <button onClick={() => setMetaPct(Math.max(1, metaPct - 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid rgba(139,92,246,0.3)', backgroundColor: '#fff', cursor: 'pointer', fontSize: '18px', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>−</button>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#6D28D9', minWidth: '48px', textAlign: 'center' }}>{metaPct}%</span>
                  <button onClick={() => setMetaPct(Math.min(100, metaPct + 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid rgba(139,92,246,0.3)', backgroundColor: '#fff', cursor: 'pointer', fontSize: '18px', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>+</button>
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
                    {[5, 10, 15, 20].map(p => (
                      <button key={p} onClick={() => setMetaPct(p)}
                        style={{ padding: '4px 8px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, border: `1px solid ${metaPct === p ? '#8B5CF6' : 'rgba(139,92,246,0.2)'}`, backgroundColor: metaPct === p ? '#8B5CF6' : 'transparent', color: metaPct === p ? '#fff' : '#8B5CF6', cursor: 'pointer' }}>
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview do valor */}
                {valor && metaSelecionada && (
                  <div style={{ padding: '8px 12px', backgroundColor: '#fff', borderRadius: '9px', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={13} color="#8B5CF6" strokeWidth={2} />
                      <span style={{ fontSize: '12px', color: '#64748B' }}>{metaSelecionada.nome}</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#6D28D9' }}>+{fmt(valorMeta())}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Observação */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Observação (opcional)</p>
        <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
          placeholder="Ex: Geladeira Samsung, comprada no Extra..."
          rows={2}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }} />

        {confirmDelete && (
          <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginBottom: '4px' }}>
            Toque em "Confirmar" para deletar permanentemente.
          </p>
        )}
      </div>

      {/* Botão fixo */}
      <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
        <button onClick={handleSalvar} disabled={salvando || !valor}
          style={{ width: '100%', height: '48px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 600, color: '#fff', cursor: salvando || !valor ? 'not-allowed' : 'pointer', backgroundColor: '#0B3B2E', opacity: salvando || !valor ? 0.6 : 1 }}>
          {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : parcelado ? `Criar ${numParcelas} parcelas` : 'Registrar lançamento'}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '100px' }}>
        <div style={{ backgroundColor: '#0B3B2E', padding: '20px 20px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>Fluxo Patrimonial</h1>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{mesLabel}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => mudarMes(-1)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={16} color="#fff" />
              </button>
              <button onClick={() => mudarMes(1)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
              style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${filtro === f.key ? '#0B3B2E' : '#E2E8F0'}`, backgroundColor: filtro === f.key ? '#0B3B2E' : '#fff', color: filtro === f.key ? '#fff' : '#64748B', cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
          {membros.map(m => (
            <button key={m} onClick={() => setFiltroMembro(filtroMembro === m ? 'todos' : m)}
              style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${filtroMembro === m ? '#0B3B2E' : '#E2E8F0'}`, backgroundColor: filtroMembro === m ? '#0B3B2E' : '#fff', color: filtroMembro === m ? '#fff' : '#64748B', cursor: 'pointer' }}>
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
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', backgroundColor: 'transparent', border: i > 0 ? '1px solid #F1F5F9' : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{l.categoria}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{l.membro?.split(' ')[0]} · {l.hora}</p>
                            {l.descricao && <AlignLeft size={10} color="#94A3B8" strokeWidth={1.75} />}
                            {l.meta_id && <Target size={10} color="#8B5CF6" strokeWidth={2} />}
                          </div>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: l.tipo === 'receita' ? '#10B981' : '#EF4444', flexShrink: 0, margin: 0 }}>
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
          style={{ position: 'fixed', bottom: '80px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#0B3B2E', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(14,59,46,0.4)', zIndex: 40 }}>
          <Plus size={24} color="#fff" strokeWidth={2} />
        </button>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC', zoom: '0.82' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>Fluxo Patrimonial</h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>Acompanhe receitas e despesas{familiaNome ? ` da família ${familiaNome}` : ''}</p>
          </div>
          <button onClick={abrirModalNovo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#145A45', boxShadow: '0 4px 12px rgba(20,90,69,0.3)', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} strokeWidth={2.5} /> Novo lançamento
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={() => mudarMes(-1)} className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: '#E2E8F0', color: '#64748B', backgroundColor: '#fff', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: '#0F172A' }}>{mesLabel}</span>
          <button onClick={() => mudarMes(1)} className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: '#E2E8F0', color: '#64748B', backgroundColor: '#fff', cursor: 'pointer' }}>
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
                style={{ backgroundColor: filtro === f.key ? '#fff' : 'transparent', color: filtro === f.key ? '#0F172A' : '#64748B', boxShadow: filtro === f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
            <button onClick={() => setFiltroMembro('todos')}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: filtroMembro === 'todos' ? '#fff' : 'transparent', color: filtroMembro === 'todos' ? '#0F172A' : '#64748B', boxShadow: filtroMembro === 'todos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
              Todos os membros
            </button>
            {membros.map(m => (
              <button key={m} onClick={() => setFiltroMembro(m)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: filtroMembro === m ? '#fff' : 'transparent', color: filtroMembro === m ? '#0F172A' : '#64748B', boxShadow: filtroMembro === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
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
              <button onClick={abrirModalNovo} className="text-sm font-semibold hover:underline" style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>Registrar primeiro lançamento →</button>
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
                      style={{ borderColor: '#F1F5F9', background: 'none', cursor: 'pointer' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2' }}>
                        <Icon size={15} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{l.categoria}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs" style={{ color: '#94A3B8' }}>{l.membro} · {l.hora}</p>
                          {l.descricao && <AlignLeft size={11} color="#94A3B8" strokeWidth={1.75} />}
                          {l.meta_id && <Target size={11} color="#8B5CF6" strokeWidth={2} />}
                          {l.descricao && <p className="text-xs truncate" style={{ color: '#94A3B8', maxWidth: '200px' }}>{l.descricao}</p>}
                        </div>
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

      {/* Modal Mobile */}
      {modalOpen && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(85vh - 65px)', marginBottom: '65px' }}>
            {modalContent(true)}
          </div>
        </div>
      )}

      {/* Modal Desktop */}
      {modalOpen && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '520px', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', margin: 'auto' }}>
            {modalContent(false)}
          </div>
        </div>
      )}
    </>
  )
}
