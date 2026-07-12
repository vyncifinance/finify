'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useOcultarValores, fmtOculto } from '@/hooks/useOcultarValores'
import {
  TrendingUp, TrendingDown, Plus, X, Pencil, Trash2,
  ArrowUpRight, ArrowDownRight, Minus, BarChart2, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtShort(val: number) {
  const abs = Math.abs(val)
  if (abs >= 1000000) return `R$ ${(val / 1000000).toFixed(2)}M`
  if (abs >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return fmt(val)
}
function fmtPct(val: number) {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
}
function fmtMes(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${MESES[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`
}
function fmtMesLong(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// Taxa diária do CDI (Sistema Gerenciador de Séries Temporais do Bacen, série 12).
// Usada só como estimativa em tempo real — não altera o saldo salvo no banco.
async function buscarTaxaCDIDiaria(): Promise<number> {
  try {
    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json')
    const json = await res.json()
    if (json && json[0]?.valor) return Number(json[0].valor) / 100
  } catch {}
  return 0.00039 // fallback aproximado (~10% a.a.) se a API do Bacen estiver indisponível
}

// O CDI só "roda" em dia útil — sábado, domingo (e feriado, não coberto aqui ainda) não rendem.
// Contar por dias corridos infla a estimativa; isso conta só segunda a sexta entre as duas datas.
function diasUteisEntre(inicio: Date, fim: Date): number {
  let count = 0
  const d = new Date(inicio)
  d.setHours(0, 0, 0, 0)
  const limite = new Date(fim)
  limite.setHours(0, 0, 0, 0)
  while (d < limite) {
    d.setDate(d.getDate() + 1)
    const diaSemana = d.getDay() // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) count++
  }
  return count
}

export default function InvestimentosPage() {
  const [loading, setLoading]       = useState(true)
  const [familiaId, setFamiliaId]   = useState('')
  const [userId, setUserId]         = useState('')
  const [registros, setRegistros]   = useState<any[]>([])
  const [modalOpen, setModalOpen]   = useState(false)
  const [editando, setEditando]     = useState<any>(null)
  const [mes, setMes]               = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [saldo, setSaldo]           = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [deletando, setDeletando]   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isMobile, setIsMobile]     = useState(true)
  const [taxaCDIDiaria, setTaxaCDIDiaria] = useState(0)

  // Posições individuais (Fase 1: Ação, FII, Renda Fixa CDI com % customizável, Tesouro)
  const [posicoes, setPosicoes]                     = useState<any[]>([])
  const [modalPosicaoOpen, setModalPosicaoOpen]     = useState(false)
  const [editandoPosicao, setEditandoPosicao]       = useState<any>(null)
  const [nomePosicao, setNomePosicao]               = useState('')
  const [tipoPosicao, setTipoPosicao]               = useState<'acao' | 'fii' | 'renda_fixa_cdi' | 'tesouro'>('renda_fixa_cdi')
  const [valorInvestido, setValorInvestido]         = useState('')
  const [percentualCDI, setPercentualCDI]           = useState('100')
  const [dataAplicacao, setDataAplicacao]           = useState(() => new Date().toISOString().split('T')[0])
  const [valorAtualManual, setValorAtualManual]     = useState('')
  const [ticker, setTicker]                         = useState('')
  const [quantidade, setQuantidade]                 = useState('')
  const [salvandoPosicao, setSalvandoPosicao]       = useState(false)
  const [deletandoPosicao, setDeletandoPosicao]     = useState(false)
  const [confirmDeletePosicao, setConfirmDeletePosicao] = useState(false)

  // Fase 2: cotações ao vivo (Ação/FII)
  const [cotacoes, setCotacoes] = useState<Record<string, number>>({})
  const [carregandoCotacoes, setCarregandoCotacoes] = useState(false)

  // Fase 3: proventos/dividendos
  const [proventoOpen, setProventoOpen]           = useState(false)
  const [posicaoProvento, setPosicaoProvento]     = useState<any>(null)
  const [valorProvento, setValorProvento]         = useState('')
  const [salvandoProvento, setSalvandoProvento]   = useState(false)

  const ocultar  = useOcultarValores()
  const supabase = createClient()

  useEffect(() => { buscarTaxaCDIDiaria().then(setTaxaCDIDiaria) }, [])

  useEffect(() => {
    const tickers = Array.from(new Set(
      posicoes.filter(p => (p.tipo === 'acao' || p.tipo === 'fii') && p.ticker).map(p => p.ticker)
    ))
    if (tickers.length > 0) buscarCotacoes(tickers)
  }, [posicoes])

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024)
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    setUserId(session.user.id)
    const { data: profile } = await supabase
      .from('profiles').select('familia_id')
      .eq('id', session.user.id).single()
    if (profile) {
      setFamiliaId(profile.familia_id)
      await carregar(profile.familia_id)
      await carregarPosicoes(profile.familia_id)
    }
    setLoading(false)
  }

  async function carregarPosicoes(fid: string) {
    const { data } = await supabase.from('posicoes_investimento').select('*')
      .eq('familia_id', fid).order('created_at', { ascending: false })
    if (data) setPosicoes(data)
  }

  async function buscarCotacoes(tickers: string[]) {
    if (tickers.length === 0) return
    setCarregandoCotacoes(true)
    try {
      const res = await fetch(`/api/cotacoes?tickers=${encodeURIComponent(tickers.join(','))}`)
      const data = await res.json()
      if (data.cotacoes) setCotacoes(prev => ({ ...prev, ...data.cotacoes }))
    } catch {
      // Falha silenciosa — as posições caem no fallback de valor manual
    }
    setCarregandoCotacoes(false)
  }

  async function carregar(fid: string) {
    const { data } = await supabase
      .from('investimentos').select('*')
      .eq('familia_id', fid)
      .order('mes', { ascending: true })
    if (data) setRegistros(data)
  }

  function abrirNovo() {
    setEditando(null)
    const d = new Date()
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setSaldo('')
    setObservacao('')
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function abrirEditar(r: any) {
    setEditando(r)
    setMes(r.mes.substring(0, 7))
    setSaldo(Number(r.saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    setObservacao(r.observacao || '')
    setConfirmDelete(false)
    setModalOpen(true)
  }

  async function handleSalvar() {
    if (!saldo) return
    setSalvando(true)
    const saldoNum = parseFloat(saldo.replace(/\./g, '').replace(',', '.'))
    const mesDate = `${mes}-01`

    if (editando) {
      const { error } = await supabase.from('investimentos').update({
        mes: mesDate, saldo: saldoNum, observacao: observacao || null,
      }).eq('id', editando.id)
      if (!error) { setModalOpen(false); await carregar(familiaId) }
    } else {
      const { error } = await supabase.from('investimentos').insert({
        familia_id: familiaId, user_id: userId,
        mes: mesDate, saldo: saldoNum, observacao: observacao || null,
      })
      if (!error) { setModalOpen(false); await carregar(familiaId) }
    }
    setSalvando(false)
  }

  async function handleDeletar() {
    if (!editando) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('investimentos').delete().eq('id', editando.id)
    setDeletando(false)
    if (!error) {
      setRegistros(prev => prev.filter(r => r.id !== editando.id))
      setModalOpen(false)
    }
  }

  function abrirNovaPosicao() {
    setEditandoPosicao(null)
    setNomePosicao('')
    setTipoPosicao('renda_fixa_cdi')
    setValorInvestido('')
    setPercentualCDI('100')
    setDataAplicacao(new Date().toISOString().split('T')[0])
    setValorAtualManual('')
    setTicker('')
    setQuantidade('')
    setConfirmDeletePosicao(false)
    setModalPosicaoOpen(true)
  }

  function abrirEditarPosicao(p: any) {
    setEditandoPosicao(p)
    setNomePosicao(p.nome)
    setTipoPosicao(p.tipo)
    setValorInvestido(Number(p.valor_investido).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    setPercentualCDI(p.percentual_cdi != null ? String(p.percentual_cdi) : '100')
    setDataAplicacao(p.data_aplicacao)
    setValorAtualManual(p.valor_atual != null ? Number(p.valor_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
    setTicker(p.ticker || '')
    setQuantidade(p.quantidade != null ? String(p.quantidade) : '')
    setConfirmDeletePosicao(false)
    setModalPosicaoOpen(true)
  }

  async function handleSalvarPosicao() {
    if (!nomePosicao.trim() || !valorInvestido) return
    setSalvandoPosicao(true)
    const valorInvestidoNum = parseFloat(valorInvestido.replace(/\./g, '').replace(',', '.'))
    const ehCDI = tipoPosicao === 'renda_fixa_cdi'
    const ehVar = ehVariavel(tipoPosicao)
    const payload = {
      familia_id: familiaId, user_id: userId,
      nome: nomePosicao.trim(), tipo: tipoPosicao,
      valor_investido: valorInvestidoNum,
      data_aplicacao: dataAplicacao,
      percentual_cdi: ehCDI ? parseFloat((percentualCDI || '100').replace(',', '.')) : null,
      valor_atual: ehCDI ? null : (valorAtualManual ? parseFloat(valorAtualManual.replace(/\./g, '').replace(',', '.')) : valorInvestidoNum),
      ticker: ehVar && ticker.trim() ? ticker.trim().toUpperCase() : null,
      quantidade: ehVar && quantidade ? parseFloat(quantidade.replace(',', '.')) : null,
    }

    if (editandoPosicao) {
      const { error } = await supabase.from('posicoes_investimento').update(payload).eq('id', editandoPosicao.id)
      if (!error) { setModalPosicaoOpen(false); await carregarPosicoes(familiaId) }
    } else {
      const { error } = await supabase.from('posicoes_investimento').insert(payload)
      if (!error) { setModalPosicaoOpen(false); await carregarPosicoes(familiaId) }
    }
    setSalvandoPosicao(false)
  }

  async function handleDeletarPosicao() {
    if (!editandoPosicao) return
    if (!confirmDeletePosicao) { setConfirmDeletePosicao(true); return }
    setDeletandoPosicao(true)
    const { error } = await supabase.from('posicoes_investimento').delete().eq('id', editandoPosicao.id)
    setDeletandoPosicao(false)
    if (!error) {
      setPosicoes(prev => prev.filter(p => p.id !== editandoPosicao.id))
      setModalPosicaoOpen(false)
    }
  }

  function abrirProvento(p: any) {
    setPosicaoProvento(p)
    setValorProvento('')
    setProventoOpen(true)
  }

  async function handleSalvarProvento() {
    if (!valorProvento || !posicaoProvento) return
    setSalvandoProvento(true)
    const valor = parseFloat(valorProvento.replace(/\./g, '').replace(',', '.'))
    const novoTotal = Number(posicaoProvento.proventos_recebidos || 0) + valor
    const { error } = await supabase.from('posicoes_investimento')
      .update({ proventos_recebidos: novoTotal }).eq('id', posicaoProvento.id)
    if (!error) {
      setPosicoes(prev => prev.map(p => p.id === posicaoProvento.id ? { ...p, proventos_recebidos: novoTotal } : p))
      setProventoOpen(false)
    }
    setSalvandoProvento(false)
  }

  // Valor de uma posição numa data de referência (padrão: hoje). CDI é calculado com juros
  // compostos a X% do CDI em dias úteis; Ação/FII com ticker+quantidade usam a cotação ao vivo
  // (Fase 2, via brapi.dev) só pra "hoje" — pra datas passadas (gráfico histórico) ainda cai no
  // valor manual, já que não buscamos série histórica de preço.
  function valorPosicaoEm(p: any, dataRef: Date = new Date()): number {
    const dataAp = new Date(p.data_aplicacao + 'T12:00:00')
    if (dataAp > dataRef) return 0 // posição ainda não existia nessa data
    if (p.tipo === 'renda_fixa_cdi') {
      const dias = diasUteisEntre(dataAp, dataRef)
      const taxaAjustada = taxaCDIDiaria * (Number(p.percentual_cdi || 100) / 100)
      return Number(p.valor_investido) * Math.pow(1 + taxaAjustada, dias)
    }
    const ehHoje = dataRef.toDateString() === new Date().toDateString()
    if (ehHoje && (p.tipo === 'acao' || p.tipo === 'fii') && p.ticker && p.quantidade && cotacoes[p.ticker] != null) {
      return cotacoes[p.ticker] * Number(p.quantidade)
    }
    return p.valor_atual != null ? Number(p.valor_atual) : Number(p.valor_investido)
  }
  const valorAtualPosicao = (p: any) => valorPosicaoEm(p)

  const TIPO_LABEL: Record<string, string> = {
    acao: 'Ação', fii: 'FII', renda_fixa_cdi: 'Renda Fixa (CDI)', tesouro: 'Tesouro Direto',
  }
  function ehRendaFixa(tipo: string) { return tipo === 'renda_fixa_cdi' || tipo === 'tesouro' }
  function ehVariavel(tipo: string) { return tipo === 'acao' || tipo === 'fii' }

  // Cálculos — registro manual antigo, mantido só pro histórico legado (não alimenta mais os KPIs do topo)
  const ordenados = [...registros].sort((a, b) => a.mes.localeCompare(b.mes))

  // Posições — fonte única de verdade da carteira
  const posicoesRF  = posicoes.filter(p => ehRendaFixa(p.tipo))
  const posicoesVar = posicoes.filter(p => ehVariavel(p.tipo))

  const totalRF  = posicoesRF.reduce((s, p) => s + valorPosicaoEm(p), 0)
  const totalVar = posicoesVar.reduce((s, p) => s + valorPosicaoEm(p), 0)
  const totalGeral = totalRF + totalVar

  const investidoRF  = posicoesRF.reduce((s, p) => s + Number(p.valor_investido), 0)
  const investidoVar = posicoesVar.reduce((s, p) => s + Number(p.valor_investido), 0)
  const investidoTotal = investidoRF + investidoVar

  const totalProventos = posicoes.reduce((s, p) => s + Number(p.proventos_recebidos || 0), 0)

  const rendimentoTotal = (totalGeral - investidoTotal) + totalProventos
  const rendimentoTotalPct = investidoTotal > 0 ? (rendimentoTotal / investidoTotal) * 100 : 0

  const pctRF  = totalGeral > 0 ? (totalRF / totalGeral) * 100 : 0
  const pctVar = totalGeral > 0 ? (totalVar / totalGeral) * 100 : 0

  // Evolução mensal reconstruída a partir das posições (últimos 6 meses + hoje)
  const hojeRef = new Date()
  const mesesEvolucao: { mes: string; total: number; rf: number; variavel: number; var: number; cdi100: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const refDate = new Date(hojeRef.getFullYear(), hojeRef.getMonth() - i + 1, 0) // último dia do mês
    const dataCalc = refDate > hojeRef ? hojeRef : refDate
    const rf  = posicoesRF.reduce((s, p) => s + valorPosicaoEm(p, dataCalc), 0)
    const vr  = posicoesVar.reduce((s, p) => s + valorPosicaoEm(p, dataCalc), 0)
    // Benchmark: quanto valeriam os mesmos aportes se tivessem ido 100% pro CDI, em vez da alocação real
    const cdi100 = posicoes.reduce((s, p) => {
      const dataAp = new Date(p.data_aplicacao + 'T12:00:00')
      if (dataAp > dataCalc) return s
      const dias = diasUteisEntre(dataAp, dataCalc)
      return s + Number(p.valor_investido) * Math.pow(1 + taxaCDIDiaria, dias)
    }, 0)
    mesesEvolucao.push({ mes: `${MESES[dataCalc.getMonth()].substring(0, 3)} ${dataCalc.getFullYear()}`, total: rf + vr, rf, variavel: vr, var: 0, cdi100 })
  }
  for (let i = 1; i < mesesEvolucao.length; i++) {
    const prev = mesesEvolucao[i - 1].total
    mesesEvolucao[i].var = prev > 0 ? ((mesesEvolucao[i].total - prev) / prev) * 100 : 0
  }
  const varMesAtualR   = mesesEvolucao.length > 1 ? mesesEvolucao[5].total - mesesEvolucao[4].total : 0
  const varMesAtualPct = mesesEvolucao.length > 1 && mesesEvolucao[4].total > 0 ? (varMesAtualR / mesesEvolucao[4].total) * 100 : 0
  const vsCDI = mesesEvolucao.length ? totalGeral - mesesEvolucao[mesesEvolucao.length - 1].cdi100 : 0

  // Modal content
  const modalContent = (
    <>
      {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          {editando ? 'Editar registro' : 'Novo registro'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editando && (
            <button onClick={handleDeletar} disabled={deletando} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2',
              color: confirmDelete ? '#fff' : '#DC2626',
            }}>
              <Trash2 size={12} strokeWidth={2} />
              {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
            </button>
          )}
          <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 8px' }}>
        {/* Mês */}
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Mês de referência</p>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)}
          style={{ width: '100%', height: '48px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
          onFocus={e => { e.target.style.borderColor = '#2FB36A'; e.target.style.boxShadow = '0 0 0 3px rgba(47,179,106,0.12)' }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
        />

        {/* Saldo */}
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Saldo total da carteira (R$)</p>
        <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E5E7EB', borderRadius: '14px', padding: '8px 16px', marginBottom: '16px', textAlign: 'center' }}>
          <input
            type="text" inputMode="numeric" value={saldo}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '')
              const num = parseInt(digits || '0', 10)
              setSaldo(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
            }}
            placeholder="0,00"
            style={{ width: '100%', textAlign: 'center', fontSize: '32px', fontWeight: 700, border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#145A45' }}
          />
        </div>

        {/* Observação */}
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Observação (opcional)</p>
        <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
          placeholder="Ex: Tesouro Direto, CDB, Ações..."
          rows={2}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '13px', color: '#0F172A', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', backgroundColor: '#FAFAFA' }}
          onFocus={e => { e.target.style.borderColor = '#2FB36A'; e.target.style.boxShadow = '0 0 0 3px rgba(47,179,106,0.12)' }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
        />

        {confirmDelete && (
          <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginTop: '8px' }}>
            Toque em "Confirmar" para deletar permanentemente.
          </p>
        )}
      </div>

      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
        <button onClick={handleSalvar} disabled={salvando || !saldo} style={{
          width: '100%', height: '50px', borderRadius: '13px', border: 'none',
          background: salvando || !saldo ? '#94A3B8' : 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
          color: '#fff', fontSize: '15px', fontWeight: 600,
          cursor: salvando || !saldo ? 'not-allowed' : 'pointer',
          boxShadow: salvando || !saldo ? 'none' : '0 4px 14px rgba(11,59,46,0.3)',
        }}>
          {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Registrar saldo'}
        </button>
      </div>
    </>
  )

  const TIPO_ICON: Record<string, any> = { acao: TrendingUp, fii: BarChart2, renda_fixa_cdi: Calendar, tesouro: BarChart2 }

  // Lista de posições, reaproveitada pra Renda Fixa e pra Variável
  function renderPosicoesList(lista: any[], titulo: string, subtitulo: string, vazio: string) {
    return (
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #ECEFF3', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: lista.length ? '1px solid #F1F5F9' : 'none' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.2px' }}>{titulo}</h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>{subtitulo}</p>
        </div>

        {lista.length === 0 ? (
          <div style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#94A3B8' }}>{vazio}</p>
          </div>
        ) : (
          lista.map((p, i) => {
            const valorAtual = valorAtualPosicao(p)
            const proventos = Number(p.proventos_recebidos || 0)
            const rendimento = (valorAtual - Number(p.valor_investido)) + proventos
            const rendPct = Number(p.valor_investido) > 0 ? (rendimento / Number(p.valor_investido)) * 100 : 0
            const Icon = TIPO_ICON[p.tipo] || BarChart2
            const temCotacao = (p.tipo === 'acao' || p.tipo === 'fii') && p.ticker && cotacoes[p.ticker] != null
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 20px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none',
              }}>
                <button onClick={() => abrirEditarPosicao(p)} style={{
                  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
                }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={15} color="#145A45" strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nome}</p>
                    <p style={{ fontSize: '11px', color: '#94A3B8', margin: '1px 0 0' }}>
                      {TIPO_LABEL[p.tipo]}
                      {p.tipo === 'renda_fixa_cdi' ? ` · ${p.percentual_cdi}% do CDI` : ''}
                      {p.ticker ? ` · ${p.ticker}${temCotacao ? ` · ${fmt(cotacoes[p.ticker])}` : ''}` : ''}
                      {proventos > 0 ? ` · ${fmtShort(proventos)} em proventos` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{fmtOculto(valorAtual, ocultar)}</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: rendimento >= 0 ? '#10B981' : '#EF4444', margin: 0 }}>
                      {fmtPct(rendPct)}
                    </p>
                  </div>
                </button>
                {ehVariavel(p.tipo) && (
                  <button onClick={() => abrirProvento(p)} title="Registrar provento/dividendo" style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    backgroundColor: '#FAEEDA', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plus size={13} color="#BA7517" strokeWidth={2} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    )
  }

  const posicoesRFSection = renderPosicoesList(
    posicoesRF, 'Renda Fixa', posicoesRF.length ? `Total: ${fmtOculto(totalRF, ocultar)}` : 'CDI e Tesouro Direto',
    'Nenhuma posição de renda fixa ainda.'
  )
  const posicoesVarSection = renderPosicoesList(
    posicoesVar, 'Investimentos Variáveis', posicoesVar.length ? `Total: ${fmtOculto(totalVar, ocultar)}` : 'Ações e Fundos Imobiliários (FIIs)',
    'Nenhuma posição de renda variável ainda.'
  )

  // Card de proporção Renda Fixa vs. Variável
  const splitCard = totalGeral > 0 && (
    <div style={{ backgroundColor: '#fff', borderRadius: '18px', border: '1px solid #ECEFF3', padding: '18px 20px' }}>
      <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', marginBottom: '10px' }}>Composição da carteira</p>
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ width: `${pctRF}%`, backgroundColor: '#145A45' }} />
        <div style={{ width: `${pctVar}%`, backgroundColor: '#F59E0B' }} />
      </div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#145A45' }} />
          <span style={{ fontSize: '12px', color: '#64748B' }}>Renda Fixa · {pctRF.toFixed(0)}% · {fmtOculto(totalRF, ocultar)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F59E0B' }} />
          <span style={{ fontSize: '12px', color: '#64748B' }}>Variável · {pctVar.toFixed(0)}% · {fmtOculto(totalVar, ocultar)}</span>
        </div>
      </div>
    </div>
  )

  // Modal de posição — compartilhado entre mobile e desktop
  const modalPosicaoContent = (
    <>
      {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          {editandoPosicao ? 'Editar posição' : 'Nova posição'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editandoPosicao && (
            <button onClick={handleDeletarPosicao} disabled={deletandoPosicao} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              backgroundColor: confirmDeletePosicao ? '#EF4444' : '#FEF2F2',
              color: confirmDeletePosicao ? '#fff' : '#DC2626',
            }}>
              <Trash2 size={12} strokeWidth={2} />
              {deletandoPosicao ? 'Deletando...' : confirmDeletePosicao ? 'Confirmar' : 'Deletar'}
            </button>
          )}
          <button onClick={() => setModalPosicaoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 8px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Nome</p>
        <input type="text" value={nomePosicao} onChange={e => setNomePosicao(e.target.value)}
          placeholder="Ex: CDB Banco X, PETR4, HGLG11..."
          style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
        />

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Tipo</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '16px' }}>
          {(['renda_fixa_cdi', 'acao', 'fii', 'tesouro'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTipoPosicao(t)}
              style={{
                padding: '10px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${tipoPosicao === t ? '#145A45' : '#E5E7EB'}`,
                backgroundColor: tipoPosicao === t ? '#F0FDF4' : '#fff',
                color: tipoPosicao === t ? '#145A45' : '#64748B',
              }}>
              {TIPO_LABEL[t]}
            </button>
          ))}
        </div>

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
          {tipoPosicao === 'renda_fixa_cdi' ? 'Valor investido (R$)' : 'Valor investido / de compra (R$)'}
        </p>
        <input
          type="text" inputMode="numeric" value={valorInvestido}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            const num = parseInt(digits || '0', 10)
            setValorInvestido(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
          }}
          placeholder="0,00"
          style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
        />

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Data de aplicação / compra</p>
        <input type="date" value={dataAplicacao} onChange={e => setDataAplicacao(e.target.value)}
          style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
        />

        {tipoPosicao === 'renda_fixa_cdi' ? (
          <>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Percentual do CDI</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <input type="text" inputMode="numeric" value={percentualCDI}
                onChange={e => setPercentualCDI(e.target.value.replace(/\D/g, ''))}
                style={{ width: '90px', height: '46px', textAlign: 'center', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '16px', fontWeight: 700, color: '#145A45', outline: 'none', backgroundColor: '#FAFAFA' }}
              />
              <span style={{ fontSize: '13px', color: '#64748B' }}>% do CDI (ex: 130 para 130% do CDI)</span>
            </div>
            <p style={{ fontSize: '11.5px', color: '#94A3B8', marginBottom: '16px' }}>
              O valor atual é calculado automaticamente, com juros compostos por dia útil, a partir do CDI real do Bacen. Estimativa bruta — não considera IR.
            </p>
          </>
        ) : (tipoPosicao === 'acao' || tipoPosicao === 'fii') ? (
          <>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Ticker (código na bolsa)</p>
            <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="Ex: PETR4, HGLG11"
              style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA', textTransform: 'uppercase' }}
            />

            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Quantidade (ações/cotas)</p>
            <input type="text" inputMode="decimal" value={quantidade} onChange={e => setQuantidade(e.target.value.replace(/[^\d,]/g, ''))}
              placeholder="Ex: 100"
              style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', backgroundColor: '#FAFAFA' }}
            />

            {ticker.trim() && cotacoes[ticker.trim().toUpperCase()] != null ? (
              <p style={{ fontSize: '11.5px', color: '#10B981', marginBottom: '4px' }}>
                Cotação encontrada: {fmt(cotacoes[ticker.trim().toUpperCase()])} — o valor atual é calculado automaticamente, não precisa digitar.
              </p>
            ) : (
              <>
                {ticker.trim() && !carregandoCotacoes && (
                  <p style={{ fontSize: '11.5px', color: '#94A3B8', marginBottom: '8px' }}>
                    Cotação ainda não encontrada pra "{ticker.trim().toUpperCase()}" — salve a posição pra buscar, ou confirme se o ticker está certo.
                  </p>
                )}
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Valor atual (R$) — usado enquanto não há cotação</p>
                <input
                  type="text" inputMode="numeric" value={valorAtualManual}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    const num = parseInt(digits || '0', 10)
                    setValorAtualManual(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                  }}
                  placeholder="0,00"
                  style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
                />
              </>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Valor atual (R$)</p>
            <input
              type="text" inputMode="numeric" value={valorAtualManual}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '')
                const num = parseInt(digits || '0', 10)
                setValorAtualManual(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
              }}
              placeholder="0,00"
              style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', backgroundColor: '#FAFAFA' }}
            />
            <p style={{ fontSize: '11.5px', color: '#94A3B8', marginBottom: '16px' }}>
              Cotação automática do Tesouro Direto ainda não está disponível — atualize aqui manualmente por enquanto.
            </p>
          </>
        )}

        {confirmDeletePosicao && (
          <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginTop: '4px' }}>
            Toque em "Confirmar" para deletar permanentemente.
          </p>
        )}
      </div>

      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
        <button onClick={handleSalvarPosicao} disabled={salvandoPosicao || !nomePosicao.trim() || !valorInvestido} style={{
          width: '100%', height: '50px', borderRadius: '13px', border: 'none',
          background: salvandoPosicao || !nomePosicao.trim() || !valorInvestido ? '#94A3B8' : 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
          color: '#fff', fontSize: '15px', fontWeight: 600,
          cursor: salvandoPosicao || !nomePosicao.trim() || !valorInvestido ? 'not-allowed' : 'pointer',
          boxShadow: salvandoPosicao || !nomePosicao.trim() || !valorInvestido ? 'none' : '0 4px 14px rgba(11,59,46,0.3)',
        }}>
          {salvandoPosicao ? 'Salvando...' : editandoPosicao ? 'Salvar alterações' : 'Adicionar posição'}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '100px' }}>
        <div style={{ background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', padding: '24px 20px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Investimentos</h1>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Renda fixa e variável</p>
            </div>
            <button onClick={abrirNovaPosicao} style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <Plus size={18} color="#fff" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* KPIs mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', padding: '0 16px', marginTop: '-24px', marginBottom: '16px' }}>
          {[
            { label: 'Total da carteira', val: fmtShort(totalGeral), cor: '#145A45', bg: '#F0FDF4', sub: `${posicoes.length} ${posicoes.length === 1 ? 'posição' : 'posições'}` },
            { label: 'Rendimento total', val: rendimentoTotal !== 0 ? fmtShort(rendimentoTotal) : '—', cor: rendimentoTotal >= 0 ? '#10B981' : '#EF4444', bg: rendimentoTotal >= 0 ? '#ECFDF5' : '#FEF2F2', sub: rendimentoTotal !== 0 ? fmtPct(rendimentoTotalPct) : 'Sem posições' },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <TrendingUp size={13} color={c.cor} strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: '10px', fontWeight: 500, color: '#64748B', marginBottom: '2px' }}>{c.label}</p>
              <p style={{ fontSize: '15px', fontWeight: 700, color: c.cor, letterSpacing: '-0.3px' }}>{loading ? '...' : c.val}</p>
              <p style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Split Renda Fixa x Variável mobile */}
        {splitCard && <div style={{ margin: '0 16px 16px' }}>{splitCard}</div>}

        {/* Posições mobile */}
        <div style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posicoesRFSection}
          {posicoesVarSection}
        </div>

        {/* Gráfico mobile */}
        <div style={{ margin: '0 16px 16px', backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>Evolução da carteira</p>
          <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '12px' }}>Reconstruída a partir das posições — renda variável usa o último valor informado</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={mesesEvolucao}>
              <defs>
                <linearGradient id="invGradM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FB36A" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#2FB36A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
              <Area type="monotone" dataKey="total" stroke="#2FB36A" strokeWidth={2} fill="url(#invGradM)" dot={{ fill: '#fff', stroke: '#2FB36A', strokeWidth: 2, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lista mobile — registro manual legado, opcional */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Registro manual (opcional)</p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: '1px 0 0' }}>Não alimenta mais os números acima</p>
            </div>
            <button onClick={abrirNovo} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Plus size={14} />
            </button>
          </div>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '32px 0', fontSize: '14px', color: '#94A3B8' }}>Carregando...</p>
          ) : ordenados.length === 0 ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>Nenhum registro manual ainda.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              {[...ordenados].reverse().map((r, i) => {
                const prev   = ordenados[ordenados.indexOf(r) - 1]
                const varR   = prev ? Number(r.saldo) - Number(prev.saldo) : null
                const varPct = prev && Number(prev.saldo) > 0 ? ((Number(r.saldo) - Number(prev.saldo)) / Number(prev.saldo)) * 100 : null
                const subiu  = varR !== null && varR >= 0

                return (
                  <button key={r.id} onClick={() => abrirEditar(r)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none',
                    background: 'none', border: i > 0 ? '1px solid #F1F5F9' : 'none',
                    borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                      backgroundColor: varR === null ? '#F0FDF4' : subiu ? '#ECFDF5' : '#FEF2F2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {varR === null
                        ? <BarChart2 size={15} color="#145A45" strokeWidth={1.75} />
                        : subiu
                          ? <ArrowUpRight size={15} color="#10B981" strokeWidth={2} />
                          : <ArrowDownRight size={15} color="#EF4444" strokeWidth={2} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{fmtMesLong(r.mes)}</p>
                      {r.observacao && <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacao}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{fmtShort(Number(r.saldo))}</p>
                      {varR !== null && (
                        <p style={{ fontSize: '11px', fontWeight: 600, color: subiu ? '#10B981' : '#EF4444', margin: 0 }}>
                          {subiu ? '+' : ''}{fmtPct(varPct!)}
                        </p>
                      )}
                    </div>
                    <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Pencil size={11} color="#64748B" strokeWidth={1.75} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button onClick={abrirNovaPosicao} style={{
          position: 'fixed', bottom: '80px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(11,59,46,0.4)', zIndex: 40,
        }}>
          <Plus size={24} color="#fff" strokeWidth={2} />
        </button>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>Investimentos</h1>
            <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Renda fixa e variável, tudo num só lugar</p>
          </div>
          <button onClick={abrirNovaPosicao} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
            color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(11,59,46,0.3)',
          }}>
            <Plus size={16} strokeWidth={2.5} /> Nova posição
          </button>
        </div>

        {/* KPIs desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            {
              label: 'Total da carteira',
              val: loading ? '...' : totalGeral > 0 ? fmtOculto(totalGeral, ocultar) : '—',
              sub: `${posicoes.length} ${posicoes.length === 1 ? 'posição' : 'posições'}`,
              cor: '#145A45', bg: '#F0FDF4',
              Icon: BarChart2,
            },
            {
              label: 'Rendimento total',
              val: loading ? '...' : rendimentoTotal !== 0 ? fmtOculto(Math.abs(rendimentoTotal), ocultar) : '—',
              sub: rendimentoTotal !== 0 ? fmtPct(rendimentoTotalPct) : 'Sem posições ainda',
              cor: rendimentoTotal >= 0 ? '#10B981' : '#EF4444',
              bg: rendimentoTotal >= 0 ? '#ECFDF5' : '#FEF2F2',
              Icon: rendimentoTotal >= 0 ? TrendingUp : TrendingDown,
            },
            {
              label: 'Variação do mês',
              val: loading ? '...' : varMesAtualR !== 0 ? fmtOculto(Math.abs(varMesAtualR), ocultar) : '—',
              sub: varMesAtualR !== 0 ? fmtPct(varMesAtualPct) : 'Sem histórico ainda',
              cor: varMesAtualR >= 0 ? '#10B981' : '#EF4444',
              bg: varMesAtualR >= 0 ? '#ECFDF5' : '#FEF2F2',
              Icon: varMesAtualR >= 0 ? TrendingUp : TrendingDown,
            },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #ECEFF3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <c.Icon size={19} color={c.cor} strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>{c.label}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px', marginBottom: '4px' }}>{c.val}</p>
              <p style={{ fontSize: '12px', color: c.cor, fontWeight: 600 }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Split Renda Fixa x Variável desktop */}
        {splitCard && <div style={{ marginBottom: '24px' }}>{splitCard}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {posicoesRFSection}
          {posicoesVarSection}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Gráfico */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #ECEFF3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>Evolução da carteira</h2>
              {posicoes.length > 0 && (
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: vsCDI >= 0 ? '#10B981' : '#EF4444' }}>
                  {vsCDI >= 0 ? '+' : ''}{fmtShort(vsCDI)} vs. 100% CDI
                </span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>Linha tracejada: quanto valeria se tudo fosse 100% CDI, pra comparar</p>
            {posicoes.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={mesesEvolucao}>
                  <defs>
                    <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2FB36A" stopOpacity={0.18}/>
                      <stop offset="100%" stopColor="#2FB36A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} labelStyle={{ color: '#0F172A', fontWeight: 600 }} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                  <Area type="monotone" dataKey="total" name="Carteira real" stroke="#2FB36A" strokeWidth={2.5} fill="url(#invGrad)" dot={{ fill: '#fff', stroke: '#2FB36A', strokeWidth: 2, r: 4 }} activeDot={{ fill: '#2FB36A', r: 6, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="cdi100" name="100% do CDI" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <BarChart2 size={28} color="#E2E8F0" strokeWidth={1} />
                <p style={{ fontSize: '13px', color: '#94A3B8' }}>Cadastre uma posição para ver o gráfico.</p>
              </div>
            )}
          </div>

          {/* Variação mensal */}
          <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #ECEFF3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '4px', letterSpacing: '-0.3px' }}>Variação mensal</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>Rentabilidade por período</p>
            {posicoes.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={mesesEvolucao.slice(1)}>
                  <defs>
                    <linearGradient id="varGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} labelStyle={{ color: '#0F172A', fontWeight: 600 }} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                  <Area type="monotone" dataKey="var" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#varGrad)" dot={{ fill: '#fff', stroke: '#8B5CF6', strokeWidth: 2, r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <TrendingUp size={28} color="#E2E8F0" strokeWidth={1} />
                <p style={{ fontSize: '13px', color: '#94A3B8' }}>Cadastre uma posição para ver a variação.</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabela desktop — registro manual legado, opcional */}
        <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #ECEFF3', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.3px', margin: 0 }}>Registro manual (opcional)</h2>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>Anotação livre de saldo total por mês — não alimenta mais os números acima, que agora vêm das posições</p>
            </div>
            <button onClick={abrirNovo} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#fff', color: '#64748B', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
              <Plus size={13} /> Registrar saldo
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '48px', fontSize: '14px', color: '#94A3B8' }}>Carregando...</p>
          ) : ordenados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', gap: '12px' }}>
              <BarChart2 size={32} color="#E2E8F0" strokeWidth={1} />
              <p style={{ fontSize: '14px', color: '#94A3B8' }}>Nenhum registro manual ainda.</p>
            </div>
          ) : (
            <>
              {/* Header tabela */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 40px', gap: '0', padding: '10px 24px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                {['Mês', 'Saldo total', 'Variação R$', 'Variação %', 'Observação', ''].map(h => (
                  <p key={h} style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{h}</p>
                ))}
              </div>
              {[...ordenados].reverse().map((r, i) => {
                const prev   = ordenados[ordenados.indexOf(r) - 1]
                const varR   = prev ? Number(r.saldo) - Number(prev.saldo) : null
                const varPct = prev && Number(prev.saldo) > 0 ? ((Number(r.saldo) - Number(prev.saldo)) / Number(prev.saldo)) * 100 : null
                const subiu  = varR !== null && varR >= 0

                return (
                  <div key={r.id} style={{
                    display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 1fr 40px',
                    gap: '0', padding: '14px 24px', alignItems: 'center',
                    borderTop: i > 0 ? '1px solid #F1F5F9' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                        backgroundColor: varR === null ? '#F0FDF4' : subiu ? '#ECFDF5' : '#FEF2F2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {varR === null
                          ? <BarChart2 size={13} color="#145A45" strokeWidth={1.75} />
                          : subiu
                            ? <ArrowUpRight size={13} color="#10B981" strokeWidth={2} />
                            : <ArrowDownRight size={13} color="#EF4444" strokeWidth={2} />
                        }
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{fmtMesLong(r.mes)}</p>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{fmtOculto(Number(r.saldo), ocultar)}</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: varR === null ? '#94A3B8' : subiu ? '#10B981' : '#EF4444', margin: 0 }}>
                      {varR === null ? '—' : `${subiu ? '+' : ''}${fmt(varR)}`}
                    </p>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: varPct === null ? '#94A3B8' : subiu ? '#10B981' : '#EF4444', margin: 0 }}>
                      {varPct === null ? '—' : fmtPct(varPct)}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.observacao || '—'}
                    </p>
                    <button onClick={() => abrirEditar(r)} style={{
                      width: '28px', height: '28px', borderRadius: '7px', backgroundColor: '#F1F5F9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: 'pointer',
                    }}>
                      <Pencil size={12} color="#64748B" strokeWidth={1.75} />
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Modal Mobile */}
      {modalOpen && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(80vh - 65px)', marginBottom: '65px' }}>
            {modalContent}
          </div>
        </div>
      )}

      {/* Modal Desktop */}
      {modalOpen && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '480px', backgroundColor: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', margin: 'auto' }}>
            {modalContent}
          </div>
        </div>
      )}

      {/* Modal Posição Mobile */}
      {modalPosicaoOpen && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalPosicaoOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(85vh - 65px)', marginBottom: '65px' }}>
            {modalPosicaoContent}
          </div>
        </div>
      )}

      {/* Modal Posição Desktop */}
      {modalPosicaoOpen && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalPosicaoOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '480px', backgroundColor: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', margin: 'auto' }}>
            {modalPosicaoContent}
          </div>
        </div>
      )}

      {/* Modal Provento (Fase 3) */}
      {proventoOpen && posicaoProvento && (
        <div onClick={e => { if (e.target === e.currentTarget) setProventoOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: isMobile ? '100%' : '380px', backgroundColor: '#fff', borderRadius: isMobile ? '28px 28px 0 0' : '20px', padding: '24px' }}>
            {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '-8px auto 16px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Registrar provento</h2>
              <button onClick={() => setProventoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>{posicaoProvento.nome}</p>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Valor recebido (R$)</p>
            <input type="text" inputMode="numeric" value={valorProvento} autoFocus
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '')
                const num = parseInt(digits || '0', 10)
                setValorProvento(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
              }}
              placeholder="0,00"
              style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', backgroundColor: '#FAFAFA' }}
            />
            <p style={{ fontSize: '11.5px', color: '#94A3B8', marginBottom: '18px' }}>
              Soma ao total de proventos já recebidos nessa posição ({fmtShort(Number(posicaoProvento.proventos_recebidos || 0))} até agora). Não gera lançamento em Movimentos.
            </p>
            <button onClick={handleSalvarProvento} disabled={salvandoProvento || !valorProvento} style={{
              width: '100%', height: '48px', borderRadius: '13px', border: 'none',
              background: salvandoProvento || !valorProvento ? '#94A3B8' : 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
              color: '#fff', fontSize: '14px', fontWeight: 600, cursor: salvandoProvento || !valorProvento ? 'not-allowed' : 'pointer',
            }}>
              {salvandoProvento ? 'Salvando...' : 'Registrar provento'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
