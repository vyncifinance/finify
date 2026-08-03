'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  UtensilsCrossed, Home, Car, Smile, Heart, BookOpen, ShoppingBag,
  Church, HandHeart, CreditCard, MoreHorizontal, AlertTriangle, Pencil, X, Trash2,
  Pill, Gift, Sparkles, GraduationCap, Smartphone, Shirt, Wrench, ClipboardList, PawPrint, TrendingUp,
} from 'lucide-react'

const CATEGORIAS_DESPESA = [
  'Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação',
  'Cartão de Crédito', 'Dízimo', 'Doações', 'Farmácia', 'Presente', 'Estética',
  'Estudos', 'Eletrônicos', 'Vestuário', 'Consertos', 'Serviços', 'Pet', 'Investimentos', 'Outros',
]

const ICONES_CAT: Record<string, any> = {
  'Alimentação': UtensilsCrossed, 'Moradia': Home, 'Transporte': Car, 'Lazer': Smile,
  'Saúde': Heart, 'Educação': BookOpen, 'Compras': ShoppingBag, 'Dízimo': Church, 'Doações': HandHeart,
  'Cartão de Crédito': CreditCard, 'Outros': MoreHorizontal,
  'Farmácia': Pill, 'Presente': Gift, 'Estética': Sparkles, 'Estudos': GraduationCap,
  'Eletrônicos': Smartphone, 'Vestuário': Shirt, 'Consertos': Wrench, 'Serviços': ClipboardList,
  'Pet': PawPrint, 'Investimentos': TrendingUp,
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

type Lancamento = { tipo: string; categoria: string; valor: number | string }
type OrcamentoRow = { id: string; categoria: string; valor_limite: number }

export default function OrcamentosSection({
  supabase,
  familiaId,
  mesRef,
  lancamentos,
  isMobile = false,
}: {
  supabase: any
  familiaId: string
  mesRef: Date
  lancamentos: Lancamento[]
  isMobile?: boolean
}) {
  const [orcamentos, setOrcamentos] = useState<OrcamentoRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [edits, setEdits]           = useState<Record<string, string>>({})
  const [salvando, setSalvando]     = useState(false)
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState<string | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const mes = mesRef.getMonth() + 1
  const ano = mesRef.getFullYear()
  const mesLabel = `${MESES[mesRef.getMonth()]} ${ano}`

  useEffect(() => {
    if (familiaId) carregar()
  }, [familiaId, mes, ano])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('orcamentos')
      .select('id, categoria, valor_limite')
      .eq('familia_id', familiaId)
      .eq('mes', mes)
      .eq('ano', ano)
    setOrcamentos(data || [])
    setLoading(false)
  }

  const gastoPorCategoria = useMemo(() => {
    const m: Record<string, number> = {}
    lancamentos.forEach(l => {
      if (l.tipo !== 'despesa') return
      if ((l as any).fatura_paga === false) return // compra no cartão, fatura ainda não paga — não conta como gasto efetivado
      m[l.categoria] = (m[l.categoria] || 0) + Number(l.valor)
    })
    return m
  }, [lancamentos])

  const linhas = orcamentos
    .map(o => {
      const gasto    = gastoPorCategoria[o.categoria] || 0
      const limite   = Number(o.valor_limite)
      const pct      = limite > 0 ? Math.round((gasto / limite) * 100) : 0
      const excedido = gasto > limite
      const alerta   = !excedido && pct >= 80
      return { ...o, gasto, limite, pct, excedido, alerta }
    })
    .sort((a, b) => b.pct - a.pct)

  const excedidos = linhas.filter(l => l.excedido)

  function abrirModal() {
    const base: Record<string, string> = {}
    CATEGORIAS_DESPESA.forEach(c => {
      const existente = orcamentos.find(o => o.categoria === c)
      base[c] = existente
        ? Number(existente.valor_limite).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : ''
    })
    setEdits(base)
    setModalOpen(true)
  }

  async function salvar() {
    setSalvando(true)
    const rows = Object.entries(edits)
      .filter(([, v]) => v && v.trim() !== '')
      .map(([categoria, v]) => ({
        familia_id: familiaId,
        categoria,
        valor_limite: parseFloat(v.replace(/\./g, '').replace(',', '.')),
        mes,
        ano,
      }))
    if (rows.length > 0) {
      await supabase
        .from('orcamentos')
        .upsert(rows, { onConflict: 'familia_id,categoria,mes,ano' })
    }
    // Categoria que já tinha limite e teve o valor apagado no modal — remove de vez
    const idsParaExcluir = orcamentos
      .filter(o => !edits[o.categoria] || edits[o.categoria].trim() === '')
      .map(o => o.id)
    if (idsParaExcluir.length > 0) {
      await supabase.from('orcamentos').delete().in('id', idsParaExcluir)
    }
    setSalvando(false)
    setModalOpen(false)
    carregar()
  }

  async function excluirOrcamento(id: string) {
    if (confirmarExclusaoId !== id) { setConfirmarExclusaoId(id); return }
    setExcluindoId(id)
    await supabase.from('orcamentos').delete().eq('id', id)
    setExcluindoId(null)
    setConfirmarExclusaoId(null)
    carregar()
  }

  function corBarra(l: { excedido: boolean; alerta: boolean }) {
    if (l.excedido) return '#EF4444'
    if (l.alerta) return '#F59E0B'
    return '#10B981'
  }

  const cardPad = isMobile ? '16px' : '20px'

  return (
    <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: isMobile ? '18px' : '20px',
          padding: cardPad,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <h3 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
              Orçamento por categoria
            </h3>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{mesLabel}</p>
          </div>
          <button
            onClick={abrirModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: isMobile ? '8px 10px' : '8px 14px',
              borderRadius: '10px', border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, color: '#0E3B2E',
            }}
          >
            <Pencil size={12} strokeWidth={2} />
            {!isMobile && 'Definir limites'}
          </button>
        </div>

        {/* Alerta de categorias ultrapassadas */}
        {excedidos.length > 0 && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '12px', padding: '10px 12px', margin: '12px 0',
            }}
          >
            <AlertTriangle size={15} color="#DC2626" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontSize: '12px', color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>
              Limite ultrapassado em {excedidos.map(e => e.categoria).join(', ')}.
            </p>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>Carregando...</p>
        ) : linhas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0 4px' }}>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '10px' }}>
              Você ainda não definiu limites de gasto por categoria este mês.
            </p>
            <button
              onClick={abrirModal}
              style={{
                padding: '9px 16px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
                color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Definir orçamentos
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            {linhas.map(l => {
              const Icon = ICONES_CAT[l.categoria] || MoreHorizontal
              const cor = corBarra(l)
              const confirmando = confirmarExclusaoId === l.id
              return (
                <div key={l.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '9px',
                      backgroundColor: cor + '18', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={14} color={cor} strokeWidth={1.75} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', flex: 1 }}>
                      {l.categoria}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: cor }}>
                      {fmt(l.gasto)} <span style={{ color: '#94A3B8', fontWeight: 500 }}>de {fmt(l.limite)}</span>
                    </span>
                    <button
                      onClick={() => excluirOrcamento(l.id)}
                      disabled={excluindoId === l.id}
                      title={confirmando ? 'Confirmar exclusão' : 'Remover limite'}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                        border: 'none', cursor: 'pointer',
                        backgroundColor: confirmando ? '#FEE2E2' : 'transparent',
                      }}
                    >
                      <Trash2 size={13} strokeWidth={1.75} color={confirmando ? '#DC2626' : '#CBD5E1'} />
                    </button>
                  </div>
                  {confirmando && (
                    <p style={{ fontSize: '10.5px', color: '#DC2626', margin: '0 0 6px', textAlign: 'right' }}>
                      Toque na lixeira de novo para confirmar
                    </p>
                  )}
                  <div style={{ height: '6px', backgroundColor: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '6px', borderRadius: '3px', width: `${Math.min(l.pct, 100)}%`, backgroundColor: cor, transition: 'width 0.2s' }} />
                  </div>
                  {(l.excedido || l.alerta) && (
                    <p style={{ fontSize: '10.5px', fontWeight: 600, color: cor, marginTop: '4px', marginBottom: 0 }}>
                      {l.excedido ? `Ultrapassado em ${fmt(l.gasto - l.limite)}` : `${l.pct}% do limite usado`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal — definir limites */}
      {modalOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.5)',
          }}
        >
          <div style={{
            width: isMobile ? '100%' : '440px',
            maxHeight: isMobile ? '85vh' : '90vh',
            backgroundColor: '#fff',
            borderRadius: isMobile ? '28px 28px 0 0' : '20px',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {isMobile && (
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Limites de gasto</h2>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{mesLabel}</p>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {CATEGORIAS_DESPESA.map(c => {
                const Icon = ICONES_CAT[c] || MoreHorizontal
                return (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color="#0E3B2E" strokeWidth={1.75} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', flex: 1 }}>{c}</span>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#FAFAFA', border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '0 10px', width: '120px' }}>
                      <span style={{ fontSize: '12px', color: '#94A3B8', marginRight: '4px' }}>R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={edits[c] || ''}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '')
                          const num = parseInt(digits || '0', 10)
                          setEdits(prev => ({
                            ...prev,
                            [c]: digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                          }))
                        }}
                        style={{ width: '100%', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: 600, color: '#0F172A', padding: '9px 0', textAlign: 'right' }}
                      />
                      {edits[c] && (
                        <button
                          onClick={() => setEdits(prev => ({ ...prev, [c]: '' }))}
                          title="Limpar"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', marginLeft: '4px', padding: 0 }}
                        >
                          <X size={13} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
              <button
                onClick={salvar}
                disabled={salvando}
                style={{
                  width: '100%', height: '48px', borderRadius: '12px', border: 'none',
                  fontSize: '15px', fontWeight: 600, color: '#fff',
                  cursor: salvando ? 'not-allowed' : 'pointer',
                  backgroundColor: '#0E3B2E', opacity: salvando ? 0.6 : 1,
                }}
              >
                {salvando ? 'Salvando...' : 'Salvar limites'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
