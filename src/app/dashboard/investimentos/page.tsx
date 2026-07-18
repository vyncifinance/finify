'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useOcultarValores, fmtOculto } from '@/hooks/useOcultarValores'
import {
  TrendingUp, TrendingDown, Plus, X, Trash2, BarChart2, Calendar, Pencil
} from 'lucide-react'
import {
  AreaChart, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
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

// IPCA (Bacen SGS 433) só vem como variação mensal — distribuímos aproximadamente pelos ~21 dias
// úteis do mês pra poder comparar no mesmo formato diário do CDI. É uma aproximação, o índice
// oficial só fecha uma vez por mês.
async function buscarTaxaIPCADiaria(): Promise<number> {
  try {
    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json')
    const json = await res.json()
    if (json && json[0]?.valor) {
      const mensal = Number(json[0].valor) / 100
      return Math.pow(1 + mensal, 1 / 21) - 1
    }
  } catch {}
  return 0.00016 // fallback aproximado (~4% a.a.) se a API do Bacen estiver indisponível
}

const INDEXADORES = [
  { id: 'cdi',      label: 'CDI',       cor: '#94A3B8', ticker: null },
  { id: 'ipca',     label: 'IPCA',      cor: '#8B5CF6', ticker: null },
  { id: 'ibov',     label: 'Ibovespa',  cor: '#3B82F6', ticker: '^BVSP' },
  { id: 'ifix',     label: 'IFIX (via XFIX11)',    cor: '#EC4899', ticker: 'XFIX11' },
  { id: 'sp500',    label: 'S&P 500 (via IVVB11)', cor: '#059669', ticker: 'IVVB11' },
]

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
  const [isMobile, setIsMobile]     = useState(true)
  const [taxaCDIDiaria, setTaxaCDIDiaria] = useState(0)
  const [taxaIPCADiaria, setTaxaIPCADiaria] = useState(0)
  const [taxasIndices, setTaxasIndices] = useState<Record<string, number>>({})
  const [indicesIndisponiveis, setIndicesIndisponiveis] = useState<Set<string>>(new Set())
  const [indexadoresAtivos, setIndexadoresAtivos] = useState<string[]>(['cdi'])

  // Posições individuais (Fase 1: Ação, FII, Renda Fixa CDI com % customizável, Tesouro)
  const [posicoes, setPosicoes]                     = useState<any[]>([])
  const [aportesPorPosicao, setAportesPorPosicao]   = useState<Record<string, any[]>>({})
  const [aportesModalOpen, setAportesModalOpen]     = useState(false)
  const [posicaoAportes, setPosicaoAportes]         = useState<any>(null)
  const [novoAporteValor, setNovoAporteValor]       = useState('')
  const [novoAporteData, setNovoAporteData]         = useState(() => new Date().toISOString().split('T')[0])
  const [salvandoAporte, setSalvandoAporte]         = useState(false)
  const [editandoAporteId, setEditandoAporteId]     = useState<string | null>(null)
  const [valorEditAporte, setValorEditAporte]       = useState('')
  const [confirmDeleteAporteId, setConfirmDeleteAporteId] = useState<string | null>(null)
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
  const [precoUnitario, setPrecoUnitario]            = useState('')
  const [sugestoesTicker, setSugestoesTicker]         = useState<any[]>([])
  const [erroTicker, setErroTicker]                   = useState('')
  const [buscandoTicker, setBuscandoTicker]           = useState(false)
  const [dropdownTickerAberto, setDropdownTickerAberto] = useState(false)
  const [salvandoPosicao, setSalvandoPosicao]       = useState(false)
  const [deletandoPosicao, setDeletandoPosicao]     = useState(false)
  const [confirmDeletePosicao, setConfirmDeletePosicao] = useState(false)

  // Fase 2: cotações ao vivo (Ação/FII)
  const [cotacoes, setCotacoes] = useState<Record<string, number>>({})
  const [carregandoCotacoes, setCarregandoCotacoes] = useState(false)

  // Fase 3: proventos/dividendos


  // Proventos automáticos (sugestão via brapi.dev, com confirmação manual)
  const [sugestoesOpen, setSugestoesOpen]         = useState(false)
  const [posicaoSugestoes, setPosicaoSugestoes]   = useState<any>(null)
  const [sugestoesProventos, setSugestoesProventos] = useState<any[]>([])
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false)
  const [confirmandoSugestaoIdx, setConfirmandoSugestaoIdx] = useState<number | null>(null)

  const ocultar  = useOcultarValores()
  const supabase = createClient()

  useEffect(() => { buscarTaxaCDIDiaria().then(setTaxaCDIDiaria) }, [])
  useEffect(() => { buscarTaxaIPCADiaria().then(setTaxaIPCADiaria) }, [])

  // Autocompletar de ticker: espera 350ms sem digitar antes de buscar, pra não disparar
  // uma chamada a cada letra.
  useEffect(() => {
    if (!(tipoPosicao === 'acao' || tipoPosicao === 'fii') || ticker.trim().length < 2) {
      setSugestoesTicker([])
      return
    }
    setBuscandoTicker(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tickers?search=${encodeURIComponent(ticker.trim())}&tipo=${tipoPosicao}`)
        const data = await res.json()
        setSugestoesTicker(data.resultados || [])
        setErroTicker(data.error || '')
      } catch {
        setSugestoesTicker([])
        setErroTicker('Falha de conexão')
      }
      setBuscandoTicker(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [ticker, tipoPosicao])

  useEffect(() => {
    INDEXADORES.filter(idx => idx.ticker).forEach(idx => {
      fetch(`/api/indice-taxa?ticker=${encodeURIComponent(idx.ticker!)}`)
        .then(r => r.json())
        .then(data => {
          if (typeof data.taxaDiaria === 'number') {
            setTaxasIndices(prev => ({ ...prev, [idx.id]: data.taxaDiaria }))
          } else {
            setIndicesIndisponiveis(prev => new Set(prev).add(idx.id))
          }
        })
        .catch(() => setIndicesIndisponiveis(prev => new Set(prev).add(idx.id)))
    })
  }, [])

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
      await carregarPosicoes(profile.familia_id)
    }
    setLoading(false)
  }

  async function carregarPosicoes(fid: string) {
    const { data } = await supabase.from('posicoes_investimento').select('*')
      .eq('familia_id', fid).order('created_at', { ascending: false })
    if (data) {
      setPosicoes(data)
      const idsRF = data.filter((p: any) => p.tipo === 'renda_fixa_cdi').map((p: any) => p.id)
      if (idsRF.length > 0) carregarAportes(idsRF)
    }
  }

  async function carregarAportes(posicaoIds: string[]) {
    const { data } = await supabase.from('aportes_posicao').select('*')
      .in('posicao_id', posicaoIds).order('data_aporte', { ascending: false })
    if (data) {
      const agrupado: Record<string, any[]> = {}
      data.forEach((a: any) => {
        if (!agrupado[a.posicao_id]) agrupado[a.posicao_id] = []
        agrupado[a.posicao_id].push(a)
      })
      setAportesPorPosicao(agrupado)
    }
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
    setPrecoUnitario('')
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
    setPrecoUnitario(p.quantidade ? (Number(p.valor_investido) / Number(p.quantidade)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
    setConfirmDeletePosicao(false)
    setModalPosicaoOpen(true)
  }

  async function handleSalvarPosicao() {
    const ehVar = ehVariavel(tipoPosicao)
    const quantidadeNum = ehVar ? parseFloat((quantidade || '0').replace(',', '.')) : 0
    const precoUnitarioNum = ehVar ? parseFloat((precoUnitario || '0').replace(/\./g, '').replace(',', '.')) : 0
    const nomeFinal = ehVar ? ticker.trim().toUpperCase() : nomePosicao.trim()

    if (!nomeFinal) return
    if (ehVar && (!ticker.trim() || !quantidadeNum || !precoUnitarioNum)) return
    if (!ehVar && !valorInvestido) return

    setSalvandoPosicao(true)
    const valorInvestidoNum = ehVar ? quantidadeNum * precoUnitarioNum : parseFloat(valorInvestido.replace(/\./g, '').replace(',', '.'))
    const ehCDI = tipoPosicao === 'renda_fixa_cdi'
    const payload = {
      familia_id: familiaId, user_id: userId,
      nome: nomeFinal, tipo: tipoPosicao,
      valor_investido: valorInvestidoNum,
      data_aplicacao: dataAplicacao,
      percentual_cdi: ehCDI ? parseFloat((percentualCDI || '100').replace(',', '.')) : null,
      valor_atual: ehCDI ? null : (valorAtualManual ? parseFloat(valorAtualManual.replace(/\./g, '').replace(',', '.')) : valorInvestidoNum),
      ticker: ehVar && ticker.trim() ? ticker.trim().toUpperCase() : null,
      quantidade: ehVar ? quantidadeNum : null,
    }

    if (editandoPosicao) {
      const { error } = await supabase.from('posicoes_investimento').update(payload).eq('id', editandoPosicao.id)
      if (!error) { setModalPosicaoOpen(false); await carregarPosicoes(familiaId) }
    } else {
      const { data: novaPosicao, error } = await supabase.from('posicoes_investimento').insert(payload).select().single()
      if (!error && novaPosicao) {
        if (ehCDI) {
          await supabase.from('aportes_posicao').insert({
            posicao_id: novaPosicao.id, valor: valorInvestidoNum, data_aporte: dataAplicacao,
            observacao: 'Aporte inicial',
          })
        }
        setModalPosicaoOpen(false)
        await carregarPosicoes(familiaId)
      }
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

  function abrirAportes(p: any) {
    setPosicaoAportes(p)
    setNovoAporteValor('')
    setNovoAporteData(new Date().toISOString().split('T')[0])
    setEditandoAporteId(null)
    setConfirmDeleteAporteId(null)
    setAportesModalOpen(true)
  }

  async function handleNovoAporte() {
    if (!posicaoAportes || !novoAporteValor) return
    setSalvandoAporte(true)
    const valor = parseFloat(novoAporteValor.replace(/\./g, '').replace(',', '.'))
    const { error } = await supabase.from('aportes_posicao').insert({
      posicao_id: posicaoAportes.id, valor, data_aporte: novoAporteData,
    })
    if (!error) {
      setNovoAporteValor('')
      await carregarAportes([posicaoAportes.id])
    }
    setSalvandoAporte(false)
  }

  function iniciarEdicaoAporte(a: any) {
    setEditandoAporteId(a.id)
    setValorEditAporte(Number(a.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    setConfirmDeleteAporteId(null)
  }

  async function salvarEdicaoAporte(a: any) {
    if (!valorEditAporte) return
    const novoValor = parseFloat(valorEditAporte.replace(/\./g, '').replace(',', '.'))
    if (isNaN(novoValor) || novoValor <= 0) return
    setSalvandoAporte(true)
    const { error } = await supabase.from('aportes_posicao').update({ valor: novoValor }).eq('id', a.id)
    if (!error) await carregarAportes([a.posicao_id])
    setEditandoAporteId(null)
    setSalvandoAporte(false)
  }

  async function deletarAporte(a: any) {
    if (confirmDeleteAporteId !== a.id) { setConfirmDeleteAporteId(a.id); return }
    const { error } = await supabase.from('aportes_posicao').delete().eq('id', a.id)
    if (!error) await carregarAportes([a.posicao_id])
    setConfirmDeleteAporteId(null)
  }

  async function buscarSugestoesProventos(p: any) {
    if (!p.ticker) return
    setPosicaoSugestoes(p)
    setSugestoesOpen(true)
    setBuscandoSugestoes(true)
    setSugestoesProventos([])
    try {
      const res = await fetch(`/api/proventos?ticker=${encodeURIComponent(p.ticker)}`)
      const data = await res.json()
      const jaProcessados: any[] = p.proventos_processados || []
      const dataAplicacao = p.data_aplicacao
      const novos = (data.proventos || []).filter((prov: any) =>
        prov.dataPagamento >= dataAplicacao && // só proventos pagos depois que você já tinha o ativo
        !jaProcessados.some((jp: any) => jp.data === prov.dataPagamento && Math.abs(jp.valorPorAcao - prov.valorPorAcao) < 0.001)
      )
      setSugestoesProventos(novos)
    } catch {
      setSugestoesProventos([])
    }
    setBuscandoSugestoes(false)
  }

  async function confirmarSugestaoProvento(sugestao: any, idx: number) {
    if (!posicaoSugestoes) return
    setConfirmandoSugestaoIdx(idx)
    const valorTotal = sugestao.valorPorAcao * Number(posicaoSugestoes.quantidade || 0)
    const novoTotalProventos = Number(posicaoSugestoes.proventos_recebidos || 0) + valorTotal
    const processadosAtuais: any[] = posicaoSugestoes.proventos_processados || []
    const novosProcessados = [...processadosAtuais, { data: sugestao.dataPagamento, valorPorAcao: sugestao.valorPorAcao }]

    const { error } = await supabase.from('posicoes_investimento').update({
      proventos_recebidos: novoTotalProventos,
      proventos_processados: novosProcessados,
    }).eq('id', posicaoSugestoes.id)

    if (!error) {
      const posicaoAtualizada = { ...posicaoSugestoes, proventos_recebidos: novoTotalProventos, proventos_processados: novosProcessados }
      setPosicaoSugestoes(posicaoAtualizada)
      setPosicoes(prev => prev.map(p => p.id === posicaoSugestoes.id ? posicaoAtualizada : p))
      setSugestoesProventos(prev => prev.filter((_, i) => i !== idx))
    }
    setConfirmandoSugestaoIdx(null)
  }



  // Valor de uma posição numa data de referência (padrão: hoje). Renda Fixa CDI soma cada
  // aporte separadamente — cada um rende juros compostos só pelo tempo que ele de fato está
  // investido, não desde a data do primeiro aporte. Ação/FII com ticker+quantidade usam a
  // cotação ao vivo (Fase 2, via brapi.dev) só pra "hoje".
  // Compara só o dia, não o horário exato — um aporte lançado "hoje de manhã" não pode ser
  // tratado como "no futuro" só porque a data fixa em T12:00:00 ainda não chegou no relógio.
  function dataLocalISO(d: Date): string {
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  function valorPosicaoEm(p: any, dataRef: Date = new Date()): number {
    const hojeRef = dataLocalISO(dataRef)
    if (p.tipo === 'renda_fixa_cdi') {
      const taxaAjustada = taxaCDIDiaria * (Number(p.percentual_cdi || 100) / 100)
      const aportes = aportesPorPosicao[p.id]
      if (aportes && aportes.length > 0) {
        return aportes.reduce((total: number, ap: any) => {
          if (ap.data_aporte > hojeRef) return total
          const dataAp = new Date(ap.data_aporte + 'T12:00:00')
          const dias = diasUteisEntre(dataAp, dataRef)
          return total + Number(ap.valor) * Math.pow(1 + taxaAjustada, dias)
        }, 0)
      }
      // Fallback (aportes ainda não carregados, ou posição sem nenhum registrado): valor único antigo
      if (p.data_aplicacao > hojeRef) return 0
      const dataAp = new Date(p.data_aplicacao + 'T12:00:00')
      const dias = diasUteisEntre(dataAp, dataRef)
      return Number(p.valor_investido) * Math.pow(1 + taxaAjustada, dias)
    }
    if (p.data_aplicacao > hojeRef) return 0 // posição ainda não existia nessa data
    const dataAp = new Date(p.data_aplicacao + 'T12:00:00')
    const ehHoje = dataRef.toDateString() === new Date().toDateString()
    if (ehHoje && (p.tipo === 'acao' || p.tipo === 'fii') && p.ticker && p.quantidade && cotacoes[p.ticker] != null) {
      return cotacoes[p.ticker] * Number(p.quantidade)
    }
    return p.valor_atual != null ? Number(p.valor_atual) : Number(p.valor_investido)
  }
  const valorAtualPosicao = (p: any) => valorPosicaoEm(p)

  // Rendimento acumulado só deste mês, por posição. Se um aporte entrou no meio do mês, conta
  // só o rendimento dele desde a própria data — nunca o valor aportado como se fosse "ganho".
  function rendimentoMesPosicao(p: any): number | null {
    if (p.tipo !== 'renda_fixa_cdi') return null
    const valorAtual = valorAtualPosicao(p)
    const taxaAjustada = taxaCDIDiaria * (Number(p.percentual_cdi || 100) / 100)
    const diasUteisMes = 21 // aproximação padrão de dias úteis por mês
    return valorAtual * (Math.pow(1 + taxaAjustada, diasUteisMes) - 1)
  }


  const TIPO_LABEL: Record<string, string> = {
    acao: 'Ação', fii: 'FII', renda_fixa_cdi: 'Renda Fixa (CDI)', tesouro: 'Tesouro Direto',
  }
  function ehRendaFixa(tipo: string) { return tipo === 'renda_fixa_cdi' || tipo === 'tesouro' }
  function ehVariavel(tipo: string) { return tipo === 'acao' || tipo === 'fii' }

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

  const TAXAS_INDEXADOR: Record<string, number> = { cdi: taxaCDIDiaria, ipca: taxaIPCADiaria, ...taxasIndices }

  // Evolução mensal reconstruída a partir das posições (últimos 6 meses + hoje), com uma
  // coluna por indexador selecionado — quanto valeriam os mesmos aportes se tivessem ido
  // 100% pra aquele indexador, em vez da alocação real.
  const hojeRef = new Date()
  const mesesEvolucao: any[] = []
  for (let i = 5; i >= 0; i--) {
    const refDate = new Date(hojeRef.getFullYear(), hojeRef.getMonth() - i + 1, 0) // último dia do mês
    const dataCalc = refDate > hojeRef ? hojeRef : refDate
    const rf  = posicoesRF.reduce((s, p) => s + valorPosicaoEm(p, dataCalc), 0)
    const vr  = posicoesVar.reduce((s, p) => s + valorPosicaoEm(p, dataCalc), 0)
    const linha: any = { mes: `${MESES[dataCalc.getMonth()].substring(0, 3)} ${dataCalc.getFullYear()}`, total: rf + vr, rf, variavel: vr, var: 0 }
    for (const idx of INDEXADORES) {
      const taxa = TAXAS_INDEXADOR[idx.id] || 0
      linha[idx.id] = posicoes.reduce((s, p) => {
        if (p.data_aplicacao > dataLocalISO(dataCalc)) return s
        const dataAp = new Date(p.data_aplicacao + 'T12:00:00')
        const dias = diasUteisEntre(dataAp, dataCalc)
        return s + Number(p.valor_investido) * Math.pow(1 + taxa, dias)
      }, 0)
    }
    mesesEvolucao.push(linha)
  }
  for (let i = 1; i < mesesEvolucao.length; i++) {
    const prev = mesesEvolucao[i - 1].total
    mesesEvolucao[i].var = prev > 0 ? ((mesesEvolucao[i].total - prev) / prev) * 100 : 0
  }
  const varMesAtualR   = mesesEvolucao.length > 1 ? mesesEvolucao[5].total - mesesEvolucao[4].total : 0
  const varMesAtualPct = mesesEvolucao.length > 1 && mesesEvolucao[4].total > 0 ? (varMesAtualR / mesesEvolucao[4].total) * 100 : 0

  function toggleIndexador(id: string) {
    setIndexadoresAtivos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

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
            const rendimentoDiario = p.tipo === 'renda_fixa_cdi'
              ? valorAtual * (taxaCDIDiaria * (Number(p.percentual_cdi || 100) / 100))
              : null
            const rendimentoMes = rendimentoMesPosicao(p)
            return (
              <div key={p.id} style={{
                display: 'flex', flexDirection: 'column',
                padding: '14px 20px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                {ehVariavel(p.tipo) && p.ticker && (
                  <button onClick={() => buscarSugestoesProventos(p)} title="Ver proventos automaticamente" style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    backgroundColor: '#EFF6FF', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Calendar size={13} color="#3B82F6" strokeWidth={2} />
                  </button>
                )}
                {p.tipo === 'renda_fixa_cdi' && (
                  <button onClick={() => abrirAportes(p)} title="Ver aportes" style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    backgroundColor: '#D1FAE5', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plus size={13} color="#145A45" strokeWidth={2} />
                  </button>
                )}
              </div>
              {p.tipo === 'renda_fixa_cdi' && aportesPorPosicao[p.id] && (
                <p style={{ fontSize: '10.5px', color: '#94A3B8', margin: '6px 0 0 46px' }}>
                  {aportesPorPosicao[p.id].length} {aportesPorPosicao[p.id].length === 1 ? 'aporte' : 'aportes'} · <button onClick={() => abrirAportes(p)} style={{ background: 'none', border: 'none', color: '#145A45', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '10.5px' }}>ver histórico</button>
                </p>
              )}
              {rendimentoDiario != null && (
                <p style={{ fontSize: '10.5px', color: '#94A3B8', margin: '6px 0 0 46px' }}>
                  Rende ≈ {fmtOculto(rendimentoDiario, ocultar)} por dia útil
                  {rendimentoMes != null && ` e ≈ ${fmtOculto(rendimentoMes, ocultar)} por mês`}, na taxa de hoje
                </p>
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

        {(tipoPosicao === 'acao' || tipoPosicao === 'fii') ? (
          <>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Ticker (código na bolsa)</p>
            <div style={{ position: 'relative' }}>
              <input type="text" value={ticker}
                onChange={e => { setTicker(e.target.value.toUpperCase()); setDropdownTickerAberto(true) }}
                onFocus={() => setDropdownTickerAberto(true)}
                onBlur={() => setTimeout(() => setDropdownTickerAberto(false), 150)}
                placeholder="Digite pra buscar: PETR4, HGLG11..."
                style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', fontWeight: 600, color: '#0F172A', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAFAFA', textTransform: 'uppercase' }}
              />
              {dropdownTickerAberto && ticker.trim().length >= 2 && (
                <div style={{ position: 'absolute', top: '50px', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 10, maxHeight: '220px', overflowY: 'auto' }}>
                  {buscandoTicker ? (
                    <p style={{ padding: '12px 14px', fontSize: '12.5px', color: '#94A3B8', margin: 0 }}>Buscando...</p>
                  ) : sugestoesTicker.length === 0 ? (
                    <p style={{ padding: '12px 14px', fontSize: '12.5px', color: erroTicker ? '#DC2626' : '#94A3B8', margin: 0 }}>
                      {erroTicker ? `Erro na busca: ${erroTicker}` : 'Nenhum ativo encontrado com esse código.'}
                    </p>
                  ) : (
                    sugestoesTicker.map((s: any) => (
                      <button key={s.ticker} type="button"
                        onMouseDown={() => { setTicker(s.ticker); setDropdownTickerAberto(false) }}
                        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{s.ticker}</span>
                        {s.nome && <span style={{ fontSize: '11px', color: '#94A3B8' }}>{s.nome}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', marginBottom: '16px' }}>O ticker também é usado como nome da posição na lista.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
              <div>
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Quantidade</p>
                <input type="text" inputMode="decimal" value={quantidade} onChange={e => setQuantidade(e.target.value.replace(/[^\d,]/g, ''))}
                  placeholder="Ex: 10"
                  style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAFAFA' }}
                />
              </div>
              <div>
                <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Preço pago (un.)</p>
                <input
                  type="text" inputMode="numeric" value={precoUnitario}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    const num = parseInt(digits || '0', 10)
                    setPrecoUnitario(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                  }}
                  placeholder="0,00"
                  style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', backgroundColor: '#FAFAFA' }}
                />
              </div>
            </div>
            {quantidade && precoUnitario && (
              <p style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '16px' }}>
                Total investido: <strong style={{ color: '#0F172A' }}>{fmt(parseFloat(quantidade.replace(',', '.') || '0') * parseFloat(precoUnitario.replace(/\./g, '').replace(',', '.') || '0'))}</strong>
              </p>
            )}

            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Data da compra</p>
            <input type="date" value={dataAplicacao} onChange={e => setDataAplicacao(e.target.value)}
              style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
            />
          </>
        ) : (
          <>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Nome</p>
            <input type="text" value={nomePosicao} onChange={e => setNomePosicao(e.target.value)}
              placeholder={tipoPosicao === 'renda_fixa_cdi' ? 'Ex: CDB Banco XP' : 'Ex: Tesouro Selic 2029'}
              style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
            />

            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Valor investido (R$)</p>
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

            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Data de aplicação</p>
            <input type="date" value={dataAplicacao} onChange={e => setDataAplicacao(e.target.value)}
              style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px', backgroundColor: '#FAFAFA' }}
            />
          </>
        )}

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
        {(() => {
          const ehVarForm = ehVariavel(tipoPosicao)
          const invalido = ehVarForm
            ? (!ticker.trim() || !quantidade || !precoUnitario)
            : (!nomePosicao.trim() || !valorInvestido)
          return (
            <button onClick={handleSalvarPosicao} disabled={salvandoPosicao || invalido} style={{
              width: '100%', height: '50px', borderRadius: '13px', border: 'none',
              background: salvandoPosicao || invalido ? '#94A3B8' : 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: salvandoPosicao || invalido ? 'not-allowed' : 'pointer',
              boxShadow: salvandoPosicao || invalido ? 'none' : '0 4px 14px rgba(11,59,46,0.3)',
            }}>
              {salvandoPosicao ? 'Salvando...' : editandoPosicao ? 'Salvar alterações' : 'Adicionar posição'}
            </button>
          )
        })()}
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
            { label: 'Rendimento total', val: posicoes.length === 0 ? '—' : fmtShort(rendimentoTotal), cor: rendimentoTotal >= 0 ? '#10B981' : '#EF4444', bg: rendimentoTotal >= 0 ? '#ECFDF5' : '#FEF2F2', sub: posicoes.length === 0 ? 'Sem posições' : fmtPct(rendimentoTotalPct) },
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
              val: loading ? '...' : posicoes.length === 0 ? '—' : fmtOculto(Math.abs(rendimentoTotal), ocultar),
              sub: posicoes.length === 0 ? 'Sem posições ainda' : fmtPct(rendimentoTotalPct),
              cor: rendimentoTotal >= 0 ? '#10B981' : '#EF4444',
              bg: rendimentoTotal >= 0 ? '#ECFDF5' : '#FEF2F2',
              Icon: rendimentoTotal >= 0 ? TrendingUp : TrendingDown,
            },
            {
              label: 'Variação do mês',
              val: loading ? '...' : posicoes.length === 0 ? '—' : fmtOculto(Math.abs(varMesAtualR), ocultar),
              sub: posicoes.length === 0 ? 'Sem histórico ainda' : fmtPct(varMesAtualPct),
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
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Evolução da carteira</h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>Compare com os principais indexadores do mercado</p>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {INDEXADORES.map(idx => {
                const ativo = indexadoresAtivos.includes(idx.id)
                const indisponivel = indicesIndisponiveis.has(idx.id)
                return (
                  <button key={idx.id} type="button" disabled={indisponivel} onClick={() => toggleIndexador(idx.id)}
                    title={indisponivel ? 'Indisponível no momento' : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px',
                      fontSize: '12px', fontWeight: 600, cursor: indisponivel ? 'not-allowed' : 'pointer',
                      opacity: indisponivel ? 0.45 : 1,
                      border: `1.5px solid ${ativo ? idx.cor : '#E5E7EB'}`,
                      backgroundColor: ativo ? idx.cor + '18' : '#fff',
                      color: ativo ? idx.cor : '#94A3B8',
                    }}>
                    <span style={{ width: '8px', height: '2px', backgroundColor: ativo ? idx.cor : '#CBD5E1' }} />
                    {idx.label}{indisponivel ? ' (indisponível)' : ''}
                  </button>
                )
              })}
            </div>

            {posicoes.length > 0 && indexadoresAtivos.length > 0 && (
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {indexadoresAtivos.filter(id => !indicesIndisponiveis.has(id)).map(id => {
                  const idx = INDEXADORES.find(i => i.id === id)!
                  const ultimo = mesesEvolucao.length ? mesesEvolucao[mesesEvolucao.length - 1][id] : 0
                  const diff = totalGeral - ultimo
                  return (
                    <span key={id} style={{ fontSize: '11.5px', fontWeight: 600, color: diff >= 0 ? '#10B981' : '#EF4444' }}>
                      {diff >= 0 ? '+' : ''}{fmtShort(diff)} vs. {idx.label}
                    </span>
                  )
                })}
              </div>
            )}

            {posicoes.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={mesesEvolucao}>
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
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="total" name="Carteira real" stroke="#2FB36A" strokeWidth={2.5} fill="url(#invGrad)" dot={{ fill: '#fff', stroke: '#2FB36A', strokeWidth: 2, r: 4 }} activeDot={{ fill: '#2FB36A', r: 6, strokeWidth: 0 }} />
                  {INDEXADORES.filter(idx => indexadoresAtivos.includes(idx.id) && !indicesIndisponiveis.has(idx.id)).map(idx => (
                    <Line key={idx.id} type="monotone" dataKey={idx.id} name={idx.label} stroke={idx.cor} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  ))}
                </ComposedChart>
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
      </div>



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

      {/* Modal Sugestões de Proventos (automático via brapi.dev) */}
      {sugestoesOpen && posicaoSugestoes && (
        <div onClick={e => { if (e.target === e.currentTarget) setSugestoesOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: isMobile ? '100%' : '440px', backgroundColor: '#fff', borderRadius: isMobile ? '28px 28px 0 0' : '20px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Proventos encontrados</h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>{posicaoSugestoes.nome} · {posicaoSugestoes.ticker}</p>
              </div>
              <button onClick={() => setSugestoesOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div style={{ padding: '12px 20px 20px', overflowY: 'auto', flex: 1 }}>
              {buscandoSugestoes ? (
                <p style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>Buscando...</p>
              ) : sugestoesProventos.length === 0 ? (
                <p style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>Nenhum provento encontrado desde que você tem essa posição.</p>
              ) : (
                <>
                  {/* Card destaque: último rendimento */}
                  {(() => {
                    const ultimo = sugestoesProventos[0]
                    const cotacaoAtual = posicaoSugestoes.ticker ? cotacoes[posicaoSugestoes.ticker] : null
                    const rendPct = cotacaoAtual ? (ultimo.valorPorAcao / cotacaoAtual) * 100 : null
                    return (
                      <div style={{ background: 'linear-gradient(135deg, #0D3F31 0%, #145A45 100%)', borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <Calendar size={13} color="rgba(255,255,255,0.7)" strokeWidth={1.75} />
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Último rendimento</span>
                        </div>
                        <p style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
                          {fmt(ultimo.valorPorAcao * Number(posicaoSugestoes.quantidade || 0))}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                          <div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>Rendimento</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{rendPct != null ? `${rendPct.toFixed(4)}%` : '—'}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>Cotação atual</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{cotacaoAtual ? fmt(cotacaoAtual) : '—'}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>Data base</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{ultimo.dataBase ? new Date(ultimo.dataBase + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>Data pagamento</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{new Date(ultimo.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '10px', marginBottom: 0 }}>
                          "Rendimento" usa a cotação de hoje como referência (não a cotação exata da data base) — estimativa.
                        </p>
                      </div>
                    )
                  })()}

                  <p style={{ fontSize: '11.5px', color: '#94A3B8', marginBottom: '10px' }}>
                    Histórico completo — fica aqui pra você conferir quando quiser, só soma no seu total se clicar "Adicionar".
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sugestoesProventos.map((s, idx) => {
                      const valorTotal = s.valorPorAcao * Number(posicaoSugestoes.quantidade || 0)
                      return (
                        <div key={`${s.dataPagamento}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{new Date(s.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')} · {s.label}</p>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{fmt(valorTotal)}</p>
                            <p style={{ fontSize: '10.5px', color: '#94A3B8', margin: 0 }}>{fmt(s.valorPorAcao)}/ação × {posicaoSugestoes.quantidade}</p>
                          </div>
                          <button onClick={() => confirmarSugestaoProvento(s, idx)} disabled={confirmandoSugestaoIdx === idx} style={{
                            padding: '0 12px', height: '28px', borderRadius: '8px', border: 'none',
                            backgroundColor: '#145A45', color: '#fff', fontSize: '11px', fontWeight: 600,
                            cursor: confirmandoSugestaoIdx === idx ? 'not-allowed' : 'pointer', flexShrink: 0,
                          }}>
                            {confirmandoSugestaoIdx === idx ? '...' : 'Adicionar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Aportes (histórico por posição de Renda Fixa) */}
      {aportesModalOpen && posicaoAportes && (
        <div onClick={e => { if (e.target === e.currentTarget) setAportesModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: isMobile ? '100%' : '440px', backgroundColor: '#fff', borderRadius: isMobile ? '28px 28px 0 0' : '20px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Aportes</h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>{posicaoAportes.nome}</p>
              </div>
              <button onClick={() => setAportesModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Novo aporte</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" inputMode="numeric" value={novoAporteValor} placeholder="0,00"
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    const num = parseInt(digits || '0', 10)
                    setNovoAporteValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                  }}
                  style={{ flex: 1, height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '13px', color: '#0F172A', outline: 'none', backgroundColor: '#FAFAFA' }}
                />
                <input type="date" value={novoAporteData} onChange={e => setNovoAporteData(e.target.value)}
                  style={{ width: '140px', height: '42px', padding: '0 10px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '13px', color: '#0F172A', outline: 'none', backgroundColor: '#FAFAFA' }}
                />
              </div>
              <button onClick={handleNovoAporte} disabled={salvandoAporte || !novoAporteValor} style={{
                width: '100%', height: '38px', marginTop: '8px', borderRadius: '10px', border: 'none',
                background: salvandoAporte || !novoAporteValor ? '#94A3B8' : '#145A45', color: '#fff',
                fontSize: '12.5px', fontWeight: 600, cursor: salvandoAporte || !novoAporteValor ? 'not-allowed' : 'pointer',
              }}>
                {salvandoAporte ? 'Salvando...' : '+ Adicionar aporte'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 20px' }}>
              {(aportesPorPosicao[posicaoAportes.id] || []).length === 0 ? (
                <p style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>Nenhum aporte ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(aportesPorPosicao[posicaoAportes.id] || []).map((a: any) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{new Date(a.data_aporte + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        {editandoAporteId === a.id ? (
                          <input type="text" inputMode="numeric" autoFocus value={valorEditAporte}
                            onChange={e => {
                              const digits = e.target.value.replace(/\D/g, '')
                              const num = parseInt(digits || '0', 10)
                              setValorEditAporte(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                            }}
                            style={{ width: '100%', marginTop: '2px', height: '30px', padding: '0 8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', outline: 'none' }}
                          />
                        ) : (
                          <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{fmt(Number(a.valor))}</p>
                        )}
                      </div>
                      {editandoAporteId === a.id ? (
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => salvarEdicaoAporte(a)} style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', backgroundColor: '#145A45', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                          <button onClick={() => setEditandoAporteId(null)} style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => iniciarEdicaoAporte(a)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', backgroundColor: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Pencil size={12} color="#64748B" strokeWidth={1.75} />
                          </button>
                          <button onClick={() => deletarAporte(a)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', backgroundColor: confirmDeleteAporteId === a.id ? '#EF4444' : '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={12} color={confirmDeleteAporteId === a.id ? '#fff' : '#DC2626'} strokeWidth={1.75} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
