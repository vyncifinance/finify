'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useOcultarValores, fmtOculto, fmtShortOculto } from '@/hooks/useOcultarValores'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, PiggyBank, Target,
  ArrowRight, ArrowUp, CheckCircle2, AlertCircle, Bell,
  Home, BookOpen, Shield, TrendingUp, Send, Heart, Star, Church,
  ChevronRight, ChevronDown, Wallet, Building2, Sparkles, UtensilsCrossed, Car,
  Smile, ShoppingBag, CreditCard, MoreHorizontal, Briefcase,
  Pill, Gift, GraduationCap, Smartphone, Shirt, Wrench, ClipboardList, PawPrint,
  Users, Check, Plus
} from 'lucide-react'

const ICONES_CAT: Record<string, any> = {
  'Alimentação': UtensilsCrossed,
  'Moradia': Home,
  'Transporte': Car,
  'Lazer': Smile,
  'Saúde': Heart,
  'Educação': BookOpen,
  'Compras': ShoppingBag,
  'Cartão de Crédito': CreditCard,
  'Dízimo': Church,
  'Farmácia': Pill,
  'Presente': Gift,
  'Estética': Sparkles,
  'Estudos': GraduationCap,
  'Eletrônicos': Smartphone,
  'Vestuário': Shirt,
  'Consertos': Wrench,
  'Serviços': ClipboardList,
  'Pet': PawPrint,
  'Investimentos': TrendingUp,
  'Outros': MoreHorizontal,
  'Salário': Briefcase,
  'Investimento': TrendingUp,
}
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const agora = new Date()

const ICONES_META: Record<string, any> = {
  home: Home, book: BookOpen, shield: Shield, 'trending-up': TrendingUp,
  send: Send, heart: Heart, star: Star, target: Target,
}

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtShort(val: number) {
  const abs = Math.abs(val)
  if (abs >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return fmt(val)
}
function ehCategoriaAlocacao(cat: string) {
  // Aportes em metas e investimentos: dinheiro que muda de lugar, não é consumido.
  // Não deve reduzir a Economia do mês nem inflar a média de despesas da Reserva de Emergência.
  return cat === 'Investimento' || cat === 'Investimentos'
}
function getSaudacao() {
  const h = agora.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function DashboardPage() {
  const [nome, setNome]       = useState('')
  const [familia, setFamilia] = useState('')
  const [familiaId, setFamiliaId] = useState('')
  const [userId, setUserId]       = useState('')
  const [loading, setLoading] = useState(true)
  const [totalRec, setTotalRec] = useState(0)
  const [totalDes, setTotalDes] = useState(0)
  const [totalEco, setTotalEco] = useState(0)
  const [cats, setCats]         = useState<any[]>([])
  const [metas, setMetas]       = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [evolucao, setEvolucao]       = useState<any[]>([])
  const [despesasFixas, setDespesasFixas] = useState<any[]>([])
  const [mesesReservaConsiderados, setMesesReservaConsiderados] = useState(0)
  const [dizimista, setDizimista]     = useState(true)
  const [baseDizimo, setBaseDizimo]   = useState(0)
  const [valorDizimo, setValorDizimo] = useState(0)
  const [dizimoPago, setDizimoPago]   = useState(0)
  const [atualizadoHa, setAtualizadoHa] = useState(0)
  const [empresas, setEmpresas]         = useState<any[]>([])
  const [contextoAtivo, setContextoAtivo] = useState<{ tipo: 'pessoal' | 'empresa'; empresaId?: string; nome: string }>({ tipo: 'pessoal', nome: '' })
  const [contextoAberto, setContextoAberto] = useState(false)

  const ocultar  = useOcultarValores()
  const supabase = createClient()

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    const interval = setInterval(() => setAtualizadoHa(prev => prev + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  async function carregar() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase
      .from('profiles').select('nome, familia_id, familias(nome, dizimista)')
      .eq('id', session.user.id).single()
    if (profile) {
      const fid = profile.familia_id
      const nomeFam = (profile.familias as any)?.nome || ''
      setNome(profile.nome || '')
      setFamilia(nomeFam)
      setFamiliaId(fid)
      setUserId(session.user.id)
      setDizimista((profile.familias as any)?.dizimista !== false)

      const { data: empresasData } = await supabase.from('empresas')
        .select('*').eq('familia_id', fid).order('created_at', { ascending: true })
      const listaEmpresas = empresasData || []
      setEmpresas(listaEmpresas)

      let contexto: { tipo: 'pessoal' | 'empresa'; empresaId?: string; nome: string } = { tipo: 'pessoal', nome: nomeFam }
      try {
        const salvo = localStorage.getItem('finify_contexto')
        if (salvo) {
          const parsed = JSON.parse(salvo)
          if (parsed.tipo === 'empresa' && parsed.empresaId) {
            const emp = listaEmpresas.find((e: any) => e.id === parsed.empresaId)
            if (emp) contexto = { tipo: 'empresa', empresaId: emp.id, nome: emp.nome }
          }
        }
      } catch {}
      setContextoAtivo(contexto)

      await carregarDados(fid, session.user.id, contexto)
    }
    setLoading(false)
    setAtualizadoHa(0)
  }

  function trocarContexto(novo: { tipo: 'pessoal' | 'empresa'; empresaId?: string; nome: string }) {
    setContextoAtivo(novo)
    setContextoAberto(false)
    try { localStorage.setItem('finify_contexto', JSON.stringify(novo)) } catch {}
    if (familiaId && userId) carregarDados(familiaId, userId, novo)
  }

  async function carregarDados(fid: string, uid: string, contexto?: { tipo: 'pessoal' | 'empresa'; empresaId?: string }) {
    const ctx = contexto || contextoAtivo
    const ehEmpresa = ctx.tipo === 'empresa' && !!ctx.empresaId
    const ini = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0]
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0]
    let queryLanc = supabase.from('lancamentos').select('*')
      .eq('familia_id', fid).gte('data', ini).lte('data', fim)
    queryLanc = ehEmpresa ? queryLanc.eq('empresa_id', ctx.empresaId) : queryLanc.is('empresa_id', null)
    const { data: lanc } = await queryLanc.order('data', { ascending: false })

    if (lanc) {
      const r = lanc.filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const dBruto = lanc.filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + Number(l.valor), 0)
      setTotalRec(r); setTotalDes(dBruto); setTotalEco(r - dBruto)
      setLancamentos(lanc.slice(0, 5))

      if (!ehEmpresa) {
        const base = lanc.filter((l: any) => l.tipo === 'receita' && l.dizimar !== false).reduce((s: number, l: any) => s + Number(l.valor), 0)
        const pago = lanc.filter((l: any) => l.tipo === 'despesa' && l.categoria === 'Dízimo').reduce((s: number, l: any) => s + Number(l.valor), 0)
        setBaseDizimo(base); setValorDizimo(base * 0.1); setDizimoPago(pago)
      }

      const porCat: any = {}
      lanc.filter((l: any) => l.tipo === 'despesa').forEach((l: any) => {
        porCat[l.categoria] = (porCat[l.categoria] || 0) + Number(l.valor)
      })
      const cores = ['#C0453D','#4A7FA5','#D68C4A','#3D8C7D','#6B4C7A','#E0A76B','#345E7A','#6BAF9C','#8B4A42','#2C6B60','#6FA3C4','#B56B3E']

      const TOP_N = 10
      const entradasSemOutros = Object.entries(porCat).filter(([nome]) => nome !== 'Outros')
      const valorOutrosOriginal = Number(porCat['Outros'] || 0)

      const ordenadasSemOutros = entradasSemOutros
        .sort((a: any, b: any) => Number(b[1]) - Number(a[1])) // maior valor primeiro

      let catsFinal: [string, number][]
      if (ordenadasSemOutros.length <= (valorOutrosOriginal > 0 ? TOP_N - 1 : TOP_N)) {
        catsFinal = [...ordenadasSemOutros, ...(valorOutrosOriginal > 0 ? [['Outros', valorOutrosOriginal]] : [])] as [string, number][]
      } else {
        const limiteTop = TOP_N - 1 // reserva 1 posição pro bucket "Outros"
        const top = ordenadasSemOutros.slice(0, limiteTop)
        const resto = ordenadasSemOutros.slice(limiteTop)
        const somaResto = resto.reduce((s, [, val]) => s + Number(val), 0) + valorOutrosOriginal
        catsFinal = [...top, ['Outros', somaResto]] as [string, number][]
      }
      catsFinal.sort((a, b) => Number(b[1]) - Number(a[1]))

      const catsOrdenadas = catsFinal.map(([nome, val], i) => ({
        nome, val: Number(val), cor: cores[i % cores.length],
        pct: dBruto > 0 ? Math.round((Number(val) / dBruto) * 100) : 0
      }))
      setCats(catsOrdenadas)
    }

    const evo = []
    const despesasPorMes: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d2 = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const i2 = new Date(d2.getFullYear(), d2.getMonth(), 1).toISOString().split('T')[0]
      const f2 = new Date(d2.getFullYear(), d2.getMonth() + 1, 0).toISOString().split('T')[0]
      let queryMes = supabase.from('lancamentos').select('tipo, valor, categoria')
        .eq('familia_id', fid).gte('data', i2).lte('data', f2)
      queryMes = ehEmpresa ? queryMes.eq('empresa_id', ctx.empresaId) : queryMes.is('empresa_id', null)
      const { data: mes } = await queryMes
      const r2 = (mes || []).filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const d2Bruto = (mes || []).filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const d3 = (mes || []).filter((l: any) => l.tipo === 'despesa' && !ehCategoriaAlocacao(l.categoria)).reduce((s: number, l: any) => s + Number(l.valor), 0)
      evo.push({ mes: MESES[d2.getMonth()].substring(0, 3), valor: r2 - d2Bruto })
      despesasPorMes.push(d3)
    }
    setEvolucao(evo)

    // Reserva de Emergência e Metas da Família — conceitos só do contexto pessoal
    if (!ehEmpresa) {
      // Média de despesas dos últimos 6 meses que de fato têm lançamento (evita distorcer com meses "vazios" de antes de você começar a usar o app)
      const despesasComDados = despesasPorMes.filter(d => d > 0)
      const ultimos3ComDados = despesasComDados.slice(-3)
      const media3MesesDespesas = ultimos3ComDados.length > 0 ? ultimos3ComDados.reduce((s, d) => s + d, 0) / ultimos3ComDados.length : 0
      const metaReservaEmergencia = media3MesesDespesas * 6 // amostra de 3 meses, alvo de 6 meses de despesas guardados
      setMesesReservaConsiderados(ultimos3ComDados.length)

      // Caixa cadastrado em Patrimônio — valor atual da reserva de emergência
      const { data: bensCaixaData } = await supabase.from('bens').select('valor, eh_divida')
        .eq('familia_id', fid).eq('tipo', 'caixa')
      const caixaTotal = (bensCaixaData || []).filter((b: any) => !b.eh_divida).reduce((s: number, b: any) => s + Number(b.valor), 0)

      // Meta automática "Reserva de Emergência" — criada pelo sistema, alvo = 6x a média mensal de despesa (6 meses de reserva)
      if (metaReservaEmergencia > 0) {
        const { data: reservaExistente } = await supabase.from('metas').select('id')
          .eq('familia_id', fid).eq('automatica', true).order('created_at', { ascending: true }).limit(1).maybeSingle()
        if (!reservaExistente) {
          const { error: erroInsertReserva } = await supabase.from('metas').insert({
            familia_id: fid, user_id: uid, nome: 'Reserva de Emergência',
            valor_alvo: metaReservaEmergencia, valor_atual: caixaTotal,
            icone: 'shield', cor: '#0B3B2E', automatica: true,
          })
          if (erroInsertReserva) {
            // Provável corrida entre abas/carregamentos simultâneos: alguém já criou nesse meio-tempo.
            // Graças ao índice único no banco, o insert falha em vez de duplicar — só busca a que já existe e atualiza.
            const { data: jaCriada } = await supabase.from('metas').select('id')
              .eq('familia_id', fid).eq('automatica', true).order('created_at', { ascending: true }).limit(1).maybeSingle()
            if (jaCriada) {
              await supabase.from('metas').update({ valor_alvo: metaReservaEmergencia, valor_atual: caixaTotal }).eq('id', jaCriada.id)
            }
          }
        } else {
          await supabase.from('metas').update({
            valor_alvo: metaReservaEmergencia, valor_atual: caixaTotal,
          }).eq('id', reservaExistente.id)
        }
      }

      const { data: metasData } = await supabase.from('metas').select('*')
        .eq('familia_id', fid).order('automatica', { ascending: false }).order('created_at', { ascending: false }).limit(3)
      if (metasData) setMetas(metasData)
    } else {
      setMetas([])
    }

    // Despesas fixas do mês — filtradas pelo contexto ativo, pagas e pendentes, com pendentes/atrasadas priorizadas no topo
    let queryFixas = supabase.from('despesas_fixas').select('*')
      .eq('familia_id', fid).eq('ativo', true)
    queryFixas = ehEmpresa ? queryFixas.eq('empresa_id', ctx.empresaId) : queryFixas.is('empresa_id', null)
    const { data: fixasData } = await queryFixas.order('dia_vencimento', { ascending: true })
    if (fixasData) {
      const fixasDespesa = fixasData.filter((f: any) => f.tipo !== 'receita')
      let queryLancFixos = supabase.from('lancamentos').select('despesa_fixa_id')
        .eq('familia_id', fid).not('despesa_fixa_id', 'is', null).gte('data', ini).lte('data', fim)
      queryLancFixos = ehEmpresa ? queryLancFixos.eq('empresa_id', ctx.empresaId) : queryLancFixos.is('empresa_id', null)
      const { data: lancFixos } = await queryLancFixos
      const pagosIds = new Set((lancFixos || []).map((l: any) => l.despesa_fixa_id))
      const hojeDia = agora.getDate()
      const todas = fixasDespesa
        .map((f: any) => {
          const pago = pagosIds.has(f.id)
          return { ...f, pago, atrasada: !pago && hojeDia > f.dia_vencimento, diasAte: f.dia_vencimento - hojeDia }
        })
        .sort((a: any, b: any) => {
          if (a.pago !== b.pago) return a.pago ? 1 : -1  // pendentes primeiro, pagas por último
          return a.diasAte - b.diasAte
        })
      setDespesasFixas(todas.slice(0, 5))
    } else {
      setDespesasFixas([])
    }
  }


  const mesAtual     = `${MESES[agora.getMonth()]} ${agora.getFullYear()}`
  const pctGasto     = totalRec > 0 ? Math.round((totalDes / totalRec) * 100) : 0
  const pctGuard     = totalRec > 0 ? Math.round((totalEco / totalRec) * 100) : 0
  const semDados     = totalRec === 0 && totalDes === 0
  const primeiroNome = nome.trim().split(' ')[0]

  // Resultado do mês (recebeu - gastou), com comparação ao mês anterior
  const resultadoExibir = totalEco
  const mesAnteriorVal   = evolucao.length > 1 ? evolucao[evolucao.length - 2].valor : totalEco
  const crescimentoValor = totalEco - mesAnteriorVal
  const crescimentoPct   = mesAnteriorVal !== 0 ? (crescimentoValor / Math.abs(mesAnteriorVal)) * 100 : 0
  const dizimoAtivo    = dizimista === true && contextoAtivo.tipo === 'pessoal'
  const dizimoRestante = Math.max(valorDizimo - dizimoPago, 0)
  const dizimoPctPago  = valorDizimo > 0 ? Math.min(Math.round((dizimoPago / valorDizimo) * 100), 100) : 0
  const dizimoQuitado  = dizimoPago >= valorDizimo && valorDizimo > 0

  let score = 0
  if (pctGasto < 80)     score += 35
  if (metas.length > 0)  score += 35
  if (pctGuard >= 10)    score += 30
  score = Math.min(score, 100)

  const scoreLabel = score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 35 ? 'Atenção' : 'Crítico'
  const scoreCor   = score >= 80 ? '#2F8F68' : score >= 60 ? '#F59E0B' : score >= 35 ? '#F97316' : '#EF4444'

  const reservaMeta = metas.find((m: any) => m.automatica)
  const reservaPct  = reservaMeta ? Math.min(Math.round((Number(reservaMeta.valor_atual) / Number(reservaMeta.valor_alvo)) * 100), 100) : 0

  const saude = [
    { label: 'Orçamento Controlado',    ok: pctGasto < 80,    desc: pctGasto < 80 ? `${pctGasto}% comprometido` : 'Gastos elevados' },
    { label: 'Metas em Andamento',      ok: metas.length > 0, desc: metas.length > 0 ? `${metas.length} meta(s) ativa(s)` : 'Nenhuma meta criada' },
    { label: 'Crescimento Patrimonial', ok: totalEco > 0,     desc: totalEco > 0 ? `+${fmtOculto(totalEco, ocultar)} este mês` : 'Sem crescimento' },
    ...(reservaMeta ? [{ label: 'Reserva de Emergência', ok: reservaPct >= 100, desc: `${reservaPct}% completa` }] : []),
  ]

  const kpis = [
    { label: 'Receitas', val: totalRec, cor: '#2F8F68', bg: '#ECFDF5', borderTint: 'rgba(47,143,104,0.15)', Icon: ArrowDownLeft },
    { label: 'Despesas', val: totalDes, cor: '#DC2626', bg: '#FEF2F2', borderTint: 'rgba(220,38,38,0.12)', Icon: ArrowUpRight  },
    { label: contextoAtivo.tipo === 'empresa' ? 'Resultado' : 'Economia', val: totalEco, cor: '#B7791F', bg: '#FFFBEB', borderTint: 'rgba(183,121,31,0.15)', Icon: PiggyBank     },
  ]

  return (
    <>
      {/* ── MOBILE (mantido) ── */}
      <div className="lg:hidden min-h-screen" style={{ backgroundColor: '#F8FAFC', paddingBottom: '32px' }}>
        <div style={{ background: 'linear-gradient(135deg, #05281F 0%, #0C342A 55%, #0E3B2F 100%)', padding: '24px 20px 48px' }}>
          <div className="flex items-center justify-between mb-6">
            <div style={{ position: 'relative', flex: 1 }}>
              <button onClick={() => setContextoAberto(!contextoAberto)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '3px' }}>
                <span className="text-sm font-bold" style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                  {contextoAtivo.nome || familia}
                </span>
                {contextoAtivo.tipo === 'empresa' && (
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#0E3B2E', backgroundColor: '#58D68D', padding: '1px 6px', borderRadius: '999px' }}>PJ</span>
                )}
                <ChevronDown size={13} color="rgba(255,255,255,0.5)" style={{ transform: contextoAberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {getSaudacao()}, {primeiroNome || 'Família'}
              </p>
              <p className="text-2xl font-bold text-white" style={{ letterSpacing: '-1px' }}>
                {loading ? '...' : fmtShortOculto(resultadoExibir, ocultar)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Resultado do mês · {mesAtual}</p>

              {contextoAberto && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '230px', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 12px 32px rgba(0,0,0,0.25)', zIndex: 30, overflow: 'hidden' }}>
                  <button onClick={() => trocarContexto({ tipo: 'pessoal', nome: familia })}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <Users size={15} color="#64748B" strokeWidth={1.75} />
                    <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{familia}</span>
                    {contextoAtivo.tipo === 'pessoal' && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                  </button>
                  {empresas.map((emp: any) => (
                    <button key={emp.id} onClick={() => trocarContexto({ tipo: 'empresa', empresaId: emp.id, nome: emp.nome })}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', borderTop: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}>
                      <Building2 size={15} color="#145A45" strokeWidth={1.75} />
                      <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{emp.nome}</span>
                      {contextoAtivo.tipo === 'empresa' && contextoAtivo.empresaId === emp.id && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                    </button>
                  ))}
                  <a href="/dashboard/perfil"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderTop: '1px solid #F1F5F9', textDecoration: 'none', color: '#145A45', fontSize: '13.5px', fontWeight: 600 }}>
                    <Plus size={15} strokeWidth={2.5} /> Adicionar empresa (CNPJ)
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!semDados && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                  <ArrowUp size={11} color="#6EE7B7" strokeWidth={2.5} />
                  <span className="text-xs font-semibold" style={{ color: '#6EE7B7' }}>{pctGuard}%</span>
                </div>
              )}
              <button className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Bell size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 -mb-6">
            {kpis.map(c => (
              <div key={c.label} className="rounded-2xl p-3"
                style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: c.bg }}>
                  <c.Icon size={14} color={c.cor} strokeWidth={1.75} />
                </div>
                <p className="text-xs font-medium mb-1" style={{ color: '#64748B' }}>{c.label}</p>
                <p className="text-sm font-semibold leading-tight" style={{ color: c.cor }}>
                  {loading ? '...' : fmtShortOculto(c.val, ocultar)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 mt-10 flex flex-col gap-4">
          {dizimoAtivo && (
            <div className="rounded-2xl p-4 border"
              style={{ backgroundColor: '#fff', borderColor: dizimoQuitado ? '#D1FAE5' : '#FEF3C7' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                    <Church size={15} color="#145A45" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Dízimo do mês</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full"
                  style={{ backgroundColor: dizimoQuitado ? '#D1FAE5' : '#FEF3C7', color: dizimoQuitado ? '#059669' : '#D97706' }}>
                  {dizimoQuitado ? 'Pago' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xl font-bold" style={{ color: '#0F172A' }}>{loading ? '...' : fmtOculto(valorDizimo, ocultar)}</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>10% de {loading ? '...' : fmtShort(baseDizimo)}</p>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ backgroundColor: '#F1F5F9' }}>
                <div className="h-full rounded-full" style={{ width: `${dizimoPctPago}%`, backgroundColor: dizimoQuitado ? '#10B981' : '#F59E0B' }} />
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#94A3B8' }}>Pago: {fmtOculto(dizimoPago, ocultar)}</span>
                <span className="text-xs font-semibold" style={{ color: dizimoQuitado ? '#10B981' : '#D97706' }}>
                  {dizimoQuitado ? 'Completo!' : `Falta ${fmtOculto(dizimoRestante, ocultar)}`}
                </span>
              </div>
            </div>
          )}

          {contextoAtivo.tipo === 'pessoal' && (
            <>
              <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Saúde Financeira</p>
                  <span className="text-2xl font-bold" style={{ color: scoreCor }}>
                    {score}<span className="text-xs font-normal text-gray-400">/100</span>
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: '#F1F5F9' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: scoreCor }} />
                </div>
                <div className="flex flex-col gap-2">
                  {saude.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {s.ok
                        ? <CheckCircle2 size={14} color="#10B981" strokeWidth={1.75} className="flex-shrink-0" />
                        : <AlertCircle  size={14} color="#EF4444" strokeWidth={1.75} className="flex-shrink-0" />
                      }
                      <p className="text-xs" style={{ color: '#64748B' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#F1F5F9' }}>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Metas da Família</p>
                  <a href="/dashboard/metas" className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#145A45' }}>
                    Ver todas <ChevronRight size={13} strokeWidth={2} />
                  </a>
                </div>
                {metas.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma meta criada.</p>
                    <a href="/dashboard/metas" className="text-xs font-semibold mt-2 block" style={{ color: '#145A45' }}>Criar meta →</a>
                  </div>
                ) : metas.map((m: any) => {
                  const pct  = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
                  const Icon = ICONES_META[m.icone] || Target
                  const cor  = m.cor || '#145A45'
                  return (
                    <div key={m.id} className="p-4 border-t" style={{ borderColor: '#F1F5F9' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cor + '18' }}>
                          <Icon size={14} color={cor} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{m.nome}</p>
                          <p className="text-xs" style={{ color: '#94A3B8' }}>{fmtOculto(Number(m.valor_atual), ocultar)} de {fmtOculto(Number(m.valor_alvo), ocultar)}</p>
                        </div>
                        <span className="text-sm font-bold" style={{ color: cor }}>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
                      </div>
                      {m.automatica && mesesReservaConsiderados < 3 && (
                        <p style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '5px' }}>
                          Baseado em {mesesReservaConsiderados} {mesesReservaConsiderados === 1 ? 'mês' : 'meses'} de dados — fica mais precisa com o tempo
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Despesas Fixas do Mês — mobile (sempre visível, respeita o contexto) */}
          <div className="rounded-2xl border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#F1F5F9' }}>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Despesas Fixas</p>
              <a href="/dashboard/movimentos" className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#145A45' }}>
                Ver todas <ChevronRight size={13} strokeWidth={2} />
              </a>
            </div>
            {despesasFixas.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma despesa fixa cadastrada.</p>
              </div>
            ) : despesasFixas.map((df: any) => {
              const Icon = ICONES_CAT[df.categoria] || MoreHorizontal
              return (
                <div key={df.id} className="flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor: '#F1F5F9', opacity: df.pago ? 0.55 : 1 }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(20,90,69,0.08)' }}>
                    <Icon size={14} color="#145A45" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{df.nome}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>Vence dia {df.dia_vencimento} · {fmtShort(Number(df.valor))}</p>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px', flexShrink: 0,
                    backgroundColor: df.pago ? 'rgba(47,143,104,0.10)' : df.atrasada ? 'rgba(239,68,68,0.10)' : '#F7F8FA',
                    color: df.pago ? '#2F8F68' : df.atrasada ? '#EF4444' : '#64748B',
                  }}>
                    {df.pago ? 'Pago' : df.atrasada ? 'Atrasada' : 'A pagar'}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>Despesas por Categoria</p>
            <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>Distribuição do mês</p>
            {cats.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>Sem despesas ainda.</p>
            ) : (
              <>
                <div className="flex justify-center mb-5">
                  <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
                    <PieChart width={200} height={200}>
                      <Pie data={cats} cx={100} cy={100} innerRadius={66} outerRadius={94} dataKey="val" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                        {cats.map((c: any, i: number) => <Cell key={i} fill={c.cor} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))}
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(15,23,42,0.06)', backgroundColor: '#fff', padding: '8px 12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
                        itemStyle={{ color: '#0B1F18', fontSize: '13px', fontWeight: 600 }}
                        wrapperStyle={{ zIndex: 20, outline: 'none' }}
                      />
                    </PieChart>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>Total</span>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: '#0B1F18' }}>{ocultar ? '••••' : `R$${(totalDes/1000).toFixed(1)}k`}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {cats.map((c: any) => {
                    const Icon = ICONES_CAT[c.nome] || MoreHorizontal
                    return (
                      <div key={c.nome} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        borderRadius: '12px', padding: '10px', border: '1px solid rgba(15,23,42,0.05)',
                      }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: c.cor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={15} color={c.cor} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0B1F18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: c.cor, flexShrink: 0, marginLeft: '8px' }}>{c.pct}%</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1, height: '5px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#F1F5F9', marginRight: '10px' }}>
                              <div style={{ height: '100%', width: `${c.pct}%`, backgroundColor: c.cor, borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', flexShrink: 0 }}>{fmtShort(Number(c.val))}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {cats.length > 0 && (
                  <div style={{ marginTop: '14px', padding: '9px 12px', borderRadius: '10px', backgroundColor: cats[0].cor + '10', border: `1px solid ${cats[0].cor}25`, display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <ArrowUp size={12} color={cats[0].cor} strokeWidth={2.5} />
                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: 0 }}>
                      <strong style={{ color: '#0B1F18' }}>{cats[0].nome}</strong> representa {cats[0].pct}% do total.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-2xl border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: '#F1F5F9' }}>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Últimos Lançamentos</p>
              <a href="/dashboard/movimentos" className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#145A45' }}>
                Ver todos <ChevronRight size={13} strokeWidth={2} />
              </a>
            </div>
            {lancamentos.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum lançamento ainda.</p>
              </div>
            ) : lancamentos.map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-t" style={{ borderColor: '#F1F5F9' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2' }}>
                  {l.tipo === 'receita'
                    ? <ArrowDownLeft size={14} color="#10B981" strokeWidth={1.75} />
                    : <ArrowUpRight  size={14} color="#EF4444" strokeWidth={1.75} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{l.categoria}</p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>{l.membro?.split(' ')[0]} · {l.hora}</p>
                </div>
                <p className="text-sm font-semibold flex-shrink-0"
                  style={{ color: l.tipo === 'receita' ? '#10B981' : '#EF4444' }}>
                  {l.tipo === 'receita' ? '+' : '-'} {fmtShort(Number(l.valor))}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border p-4" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>Resultado Mensal</p>
            <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>Receitas − despesas · últimos 6 meses</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={evolucao}>
                <defs>
                  <linearGradient id="evoGradMobile" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#145A45" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#145A45" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="valor" stroke="#145A45" strokeWidth={2} fill="url(#evoGradMobile)"
                  dot={{ fill: '#fff', stroke: '#145A45', strokeWidth: 2, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── DESKTOP — REDESIGN PREMIUM ── */}
      <div className="hidden lg:block" style={{ backgroundColor: '#F7F9FB', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 20px 24px' }}>

          {/* Header premium */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', minHeight: '40px' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setContextoAberto(!contextoAberto)}
                style={{ display: 'flex', alignItems: 'baseline', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.5px', margin: 0 }}>{contextoAtivo.nome || familia}</h1>
                  {contextoAtivo.tipo === 'empresa' && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#145A45', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '999px' }}>PJ</span>
                  )}
                  <ChevronDown size={16} color="#94A3B8" style={{ transform: contextoAberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </span>
                <span style={{ fontSize: '13px', color: '#64748B' }}>
                  {getSaudacao()}, {primeiroNome || 'Família'}
                </span>
              </button>

              {contextoAberto && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', width: '260px', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 30, overflow: 'hidden' }}>
                  <button onClick={() => trocarContexto({ tipo: 'pessoal', nome: familia })}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <Users size={15} color="#64748B" strokeWidth={1.75} />
                    <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{familia}</span>
                    {contextoAtivo.tipo === 'pessoal' && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                  </button>
                  {empresas.map((emp: any) => (
                    <button key={emp.id} onClick={() => trocarContexto({ tipo: 'empresa', empresaId: emp.id, nome: emp.nome })}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', borderTop: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}>
                      <Building2 size={15} color="#145A45" strokeWidth={1.75} />
                      <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{emp.nome}</span>
                      {contextoAtivo.tipo === 'empresa' && contextoAtivo.empresaId === emp.id && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                    </button>
                  ))}
                  <a href="/dashboard/perfil"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderTop: '1px solid #F1F5F9', textDecoration: 'none', color: '#145A45', fontSize: '13.5px', fontWeight: 600 }}>
                    <Plus size={15} strokeWidth={2.5} /> Adicionar empresa (CNPJ)
                  </a>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '2px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2F8F68' }} />
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                  Atualizado {atualizadoHa === 0 ? 'agora' : `há ${atualizadoHa} min`}
                </span>
              </div>
              <div style={{
                padding: '10px 18px', borderRadius: '999px', fontSize: '13.5px', fontWeight: 500,
                backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', color: '#0F172A',
                boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
              }}>
                {mesAtual}
              </div>
              <button style={{
                width: '34px', height: '34px', borderRadius: '50%',
                backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', color: '#64748B',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15,23,42,0.03)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
              >
                <Bell size={18} strokeWidth={1.5} />
              </button>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '15px', fontWeight: 600,
                boxShadow: '0 4px 12px rgba(20,90,69,0.25)',
              }}>
                {primeiroNome ? primeiroNome[0].toUpperCase() : 'F'}
              </div>
            </div>
          </div>

          {/* Hero — Resumo Executivo */}
          <div style={{
            borderRadius: '16px', padding: '16px', marginBottom: '10px', position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #05281F 0%, #0C342A 55%, #0E3B2F 100%)',
            boxShadow: '0 20px 60px -16px rgba(6,38,31,0.45)',
          }}>
            <div style={{ position: 'absolute', top: '-100px', right: '-60px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(110,231,183,0.08)', filter: 'blur(50px)' }} />
            <div style={{ position: 'absolute', bottom: '-120px', left: '20%', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(47,143,104,0.12)', filter: 'blur(60px)' }} />

            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '16px', alignItems: 'center' }}>
              {/* Esquerda: número + indicadores do mês */}
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  Resultado do mês
                </p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '14px' }}>
                  {loading ? '...' : fmtOculto(resultadoExibir, ocultar)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {!semDados && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px',
                      backgroundColor: crescimentoPct >= 0 ? 'rgba(110,231,183,0.15)' : 'rgba(239,68,68,0.15)',
                      border: `1px solid ${crescimentoPct >= 0 ? 'rgba(110,231,183,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}>
                      <ArrowUp size={11} color={crescimentoPct >= 0 ? '#6EE7B7' : '#FCA5A5'} strokeWidth={2.5} style={{ transform: crescimentoPct < 0 ? 'rotate(180deg)' : 'none' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: crescimentoPct >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                        {Math.abs(crescimentoPct).toFixed(1)}% vs. mês anterior
                      </span>
                    </div>
                  )}
                  <div style={{ padding: '5px 12px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                      {contextoAtivo.tipo === 'empresa' ? contextoAtivo.nome : (familia ? `Família ${familia}` : '')} · {mesAtual}
                    </span>
                  </div>
                </div>

                {/* Receitas x Despesas do mês */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', width: '76px', flexShrink: 0 }}>Recebeu</span>
                    <div style={{ flex: 1, height: '6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '100%', backgroundColor: '#6EE7B7', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', minWidth: '78px', textAlign: 'right' }}>{fmtOculto(totalRec, ocultar)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', width: '76px', flexShrink: 0 }}>Gastou</span>
                    <div style={{ flex: 1, height: '6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctGasto}%`, backgroundColor: '#FCA5A5', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', minWidth: '78px', textAlign: 'right' }}>{fmtOculto(totalDes, ocultar)}</span>
                  </div>
                </div>
              </div>

              {/* Direita: mini gráfico glass */}
              <div style={{
                borderRadius: '18px', padding: '22px',
                backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <p style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>Resultado · 6 meses</p>
                  <Sparkles size={14} color="rgba(255,255,255,0.3)" strokeWidth={1.75} />
                </div>
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={evolucao}>
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6EE7B7" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#6EE7B7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      formatter={(v: any) => fmt(Number(v))}
                      contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0B3B2E', fontSize: '12px', color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                      labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                      itemStyle={{ color: '#6EE7B7' }}
                    />
                    <Area type="monotone" dataKey="valor" stroke="#6EE7B7" strokeWidth={2.5} fill="url(#heroGrad)"
                      dot={{ fill: '#0B3B2E', stroke: '#6EE7B7', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, fill: '#6EE7B7', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* KPI Cards — identidade própria */}
          <div style={{ display: 'grid', gap: '8px', marginBottom: '10px', gridTemplateColumns: dizimoAtivo ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))' }}>
            {kpis.map(card => (
              <div key={card.label} style={{
                borderRadius: '16px', padding: '18px', backgroundColor: '#fff',
                border: `1px solid ${card.borderTint}`,
                boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
                transition: 'all 0.2s ease', cursor: 'default',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.01)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(15,23,42,0.08)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(15,23,42,0.05)' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <card.Icon size={17} color={card.cor} strokeWidth={1.75} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '6px' }}>{card.label}</p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.3px', marginBottom: '2px' }}>
                  {loading ? '...' : fmtOculto(card.val, ocultar)}
                </p>
                <span style={{ fontSize: '12.5px', fontWeight: 500, color: card.cor }}>Este mês</span>
              </div>
            ))}
            {dizimoAtivo && (
              <div style={{
                borderRadius: '16px', padding: '18px', position: 'relative', backgroundColor: '#fff',
                border: `1px solid ${dizimoQuitado ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)'}`,
                boxShadow: '0 12px 40px rgba(15,23,42,0.05)', transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.01)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)' }}
              >
                <div style={{ position: 'absolute', top: '18px', right: '18px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px',
                    backgroundColor: dizimoQuitado ? '#ECFDF5' : '#FFFBEB',
                    color: dizimoQuitado ? '#2F8F68' : '#B7791F',
                  }}>
                    {dizimoQuitado ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  <Church size={17} color="#145A45" strokeWidth={1.75} />
                </div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '6px' }}>Dízimo do mês</p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.3px', marginBottom: '8px' }}>
                  {loading ? '...' : fmtOculto(valorDizimo, ocultar)}
                </p>
                <div style={{ height: '5px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#F1F5F9', marginBottom: '8px' }}>
                  <div style={{ height: '100%', width: `${dizimoPctPago}%`, backgroundColor: dizimoQuitado ? '#2F8F68' : '#F59E0B', borderRadius: '4px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: dizimoQuitado ? '#2F8F68' : '#B7791F' }}>
                  {dizimoQuitado ? 'Completo!' : `Falta ${fmtOculto(dizimoRestante, ocultar)}`}
                </span>
              </div>
            )}
          </div>

          {/* Metas + Saúde Financeira (pessoal) OU Despesas Fixas + Resultado Mensal (empresa) */}
          {contextoAtivo.tipo === 'pessoal' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '10px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              borderRadius: '20px', padding: '24px', backgroundColor: '#fff',
              border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: metas.length === 0 ? '0' : '16px' }}>
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Metas da Família</h2>
                  <p style={{ fontSize: '12px', color: '#64748B' }}>Progresso dos objetivos</p>
                </div>
                <a href="/dashboard/metas" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#145A45', textDecoration: 'none', flexShrink: 0 }}>
                  Ver todas <ArrowRight size={13} strokeWidth={2} />
                </a>
              </div>
              {metas.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '18px', marginTop: '18px', borderTop: '1px solid #F1F5F9' }}>
                  <Target size={18} color="#E2E8F0" strokeWidth={1.5} />
                  <p style={{ fontSize: '12.5px', color: '#94A3B8', flex: 1 }}>Nenhuma meta criada ainda.</p>
                  <a href="/dashboard/metas" style={{ fontSize: '13px', fontWeight: 600, color: '#145A45', textDecoration: 'none', whiteSpace: 'nowrap' }}>Criar primeira meta →</a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {metas.map((m: any) => {
                    const pct  = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
                    const Icon = ICONES_META[m.icone] || Target
                    const cor  = m.cor || '#145A45'
                    return (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        borderRadius: '12px', padding: '10px', border: '1px solid rgba(15,23,42,0.05)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(15,23,42,0.06)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, backgroundColor: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={17} color={cor} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</p>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: cor, flexShrink: 0, marginLeft: '8px' }}>{pct}%</span>
                          </div>
                          <div style={{ height: '5px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: cor, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                          </div>
                          {m.automatica && mesesReservaConsiderados < 3 && (
                            <p style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '5px' }}>
                              Baseado em {mesesReservaConsiderados} {mesesReservaConsiderados === 1 ? 'mês' : 'meses'} de dados — fica mais precisa com o tempo
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Despesas Fixas do Mês */}
            <div style={{
              borderRadius: '20px', padding: '24px', backgroundColor: '#fff',
              border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: despesasFixas.length === 0 ? '0' : '14px' }}>
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Despesas Fixas do Mês</h2>
                  <p style={{ fontSize: '12px', color: '#64748B' }}>Pagas e pendentes</p>
                </div>
                <a href="/dashboard/movimentos" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#145A45', textDecoration: 'none', flexShrink: 0 }}>
                  Ver todas <ArrowRight size={13} strokeWidth={2} />
                </a>
              </div>
              {despesasFixas.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '18px', marginTop: '18px', borderTop: '1px solid #F1F5F9' }}>
                  <CheckCircle2 size={18} color="#2F8F68" strokeWidth={1.5} />
                  <p style={{ fontSize: '12.5px', color: '#94A3B8', flex: 1 }}>Nenhuma despesa fixa cadastrada.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {despesasFixas.map((df: any) => {
                    const Icon = ICONES_CAT[df.categoria] || MoreHorizontal
                    return (
                      <div key={df.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px', padding: '10px', border: '1px solid rgba(15,23,42,0.05)', opacity: df.pago ? 0.55 : 1 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'rgba(20,90,69,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={16} color="#145A45" strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{df.nome}</p>
                          <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Vence dia {df.dia_vencimento} · {fmtOculto(Number(df.valor), ocultar)}</p>
                        </div>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', flexShrink: 0,
                          backgroundColor: df.pago ? 'rgba(47,143,104,0.10)' : df.atrasada ? 'rgba(239,68,68,0.10)' : '#F7F8FA',
                          border: df.pago ? '1px solid rgba(47,143,104,0.25)' : df.atrasada ? '1px solid rgba(239,68,68,0.25)' : '1px solid #E5E7EB',
                          color: df.pago ? '#2F8F68' : df.atrasada ? '#EF4444' : '#64748B',
                        }}>
                          {df.pago && <CheckCircle2 size={11} strokeWidth={2} />}
                          {df.pago ? 'Pago' : df.atrasada ? 'Atrasada' : 'A pagar'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            </div>

            <div style={{
              borderRadius: '20px', padding: '28px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column',
              border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Saúde Financeira</h2>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>Score geral</p>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', height: '150px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="78%" outerRadius="100%" data={[{ value: score, fill: scoreCor }]} startAngle={90} endAngle={-270}>
                    <RadialBar background={{ fill: '#F1F5F9' }} dataKey="value" cornerRadius={20} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '34px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-1px', lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>de 100</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <span style={{
                  fontSize: '12.5px', fontWeight: 600, padding: '5px 14px', borderRadius: '999px',
                  backgroundColor: scoreCor + '15', color: scoreCor,
                }}>
                  {scoreLabel}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {saude.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {s.ok
                      ? <CheckCircle2 size={16} color="#2F8F68" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '2px' }} />
                      : <AlertCircle  size={16} color="#EF4444" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '2px' }} />
                    }
                    <div>
                      <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#0B1F18' }}>{s.label}</p>
                      <p style={{ fontSize: '12px', color: '#94A3B8' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/dashboard/movimentos" style={{
                marginTop: '20px', textAlign: 'center', fontSize: '13.5px', fontWeight: 600, padding: '11px',
                borderRadius: '13px', backgroundColor: '#F0FDF4', color: '#145A45', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              >
                Ver detalhes
              </a>
            </div>
          </div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {/* Despesas Fixas do Mês (empresa) */}
            <div style={{
              borderRadius: '20px', padding: '24px', backgroundColor: '#fff',
              border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: despesasFixas.length === 0 ? '0' : '14px' }}>
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Despesas Fixas do Mês</h2>
                  <p style={{ fontSize: '12px', color: '#64748B' }}>Pagas e pendentes</p>
                </div>
                <a href="/dashboard/movimentos" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 600, color: '#145A45', textDecoration: 'none', flexShrink: 0 }}>
                  Ver todas <ArrowRight size={13} strokeWidth={2} />
                </a>
              </div>
              {despesasFixas.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '18px', marginTop: '18px', borderTop: '1px solid #F1F5F9' }}>
                  <CheckCircle2 size={18} color="#2F8F68" strokeWidth={1.5} />
                  <p style={{ fontSize: '12.5px', color: '#94A3B8', flex: 1 }}>Nenhuma despesa fixa cadastrada.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {despesasFixas.map((df: any) => {
                    const Icon = ICONES_CAT[df.categoria] || MoreHorizontal
                    return (
                      <div key={df.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px', padding: '10px', border: '1px solid rgba(15,23,42,0.05)', opacity: df.pago ? 0.55 : 1 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, backgroundColor: 'rgba(20,90,69,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={16} color="#145A45" strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{df.nome}</p>
                          <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Vence dia {df.dia_vencimento} · {fmtOculto(Number(df.valor), ocultar)}</p>
                        </div>
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', flexShrink: 0,
                          backgroundColor: df.pago ? 'rgba(47,143,104,0.10)' : df.atrasada ? 'rgba(239,68,68,0.10)' : '#F7F8FA',
                          border: df.pago ? '1px solid rgba(47,143,104,0.25)' : df.atrasada ? '1px solid rgba(239,68,68,0.25)' : '1px solid #E5E7EB',
                          color: df.pago ? '#2F8F68' : df.atrasada ? '#EF4444' : '#64748B',
                        }}>
                          {df.pago && <CheckCircle2 size={11} strokeWidth={2} />}
                          {df.pago ? 'Pago' : df.atrasada ? 'Atrasada' : 'A pagar'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Resultado Mensal (empresa) */}
            <div style={{
              borderRadius: '20px', padding: '24px', backgroundColor: '#fff',
              border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Resultado Mensal</h2>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>Receitas − despesas · últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={evolucao}>
                  <defs>
                    <linearGradient id="evoGradEmpresa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#145A45" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#145A45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="valor" stroke="#145A45" strokeWidth={2} fill="url(#evoGradEmpresa)"
                    dot={{ fill: '#fff', stroke: '#145A45', strokeWidth: 2, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}
          <div style={{
            borderRadius: '20px', padding: '28px', backgroundColor: '#fff', marginBottom: '10px',
            border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
          }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Despesas por Categoria</h2>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '20px' }}>Distribuição do mês</p>
            {cats.length === 0 ? (
              <p style={{ fontSize: '13.5px', textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>Sem despesas ainda.</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <div style={{ position: 'relative', width: '230px', height: '230px', flexShrink: 0 }}>
                    <PieChart width={230} height={230}>
                      <Pie data={cats} cx={115} cy={115} innerRadius={76} outerRadius={108} dataKey="val" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                        {cats.map((c: any, i: number) => <Cell key={i} fill={c.cor} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))}
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(15,23,42,0.06)', backgroundColor: '#fff', padding: '8px 12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
                        itemStyle={{ color: '#0B1F18', fontSize: '13px', fontWeight: 600 }}
                        wrapperStyle={{ zIndex: 20, outline: 'none' }}
                      />
                    </PieChart>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '12.5px', color: '#94A3B8' }}>Total</span>
                      <span style={{ fontSize: '19px', fontWeight: 700, color: '#0B1F18' }}>{ocultar ? '••••' : `R$${(totalDes/1000).toFixed(1)}k`}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {cats.map((c: any) => {
                    const Icon = ICONES_CAT[c.nome] || MoreHorizontal
                    return (
                      <div key={c.nome} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        borderRadius: '12px', padding: '10px', border: '1px solid rgba(15,23,42,0.05)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(15,23,42,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = c.cor + '30' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.05)' }}
                      >
                        <div style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: c.cor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={c.cor} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0B1F18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: c.cor, flexShrink: 0, marginLeft: '8px' }}>{c.pct}%</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1, height: '5px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#F1F5F9', marginRight: '10px' }}>
                              <div style={{ height: '100%', width: `${c.pct}%`, backgroundColor: c.cor, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', flexShrink: 0 }}>{fmtOculto(c.val, ocultar)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {cats.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '9px 12px', borderRadius: '10px', backgroundColor: cats[0].cor + '10', border: `1px solid ${cats[0].cor}25`, display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <ArrowUp size={12} color={cats[0].cor} strokeWidth={2.5} />
                    <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                      <strong style={{ color: '#0B1F18' }}>{cats[0].nome}</strong> representa {cats[0].pct}% do total.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{
            borderRadius: '20px', overflow: 'hidden', backgroundColor: '#fff',
            border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0B1F18', letterSpacing: '-0.3px' }}>Últimos Lançamentos</h2>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>Atividade recente</p>
              </div>
              <a href="/dashboard/movimentos" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13.5px', fontWeight: 600, color: '#145A45', textDecoration: 'none' }}>
                Ver todos <ArrowRight size={13} strokeWidth={2} />
              </a>
            </div>
            {lancamentos.length === 0 ? (
              <p style={{ fontSize: '13.5px', textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>Nenhum lançamento ainda.</p>
            ) : lancamentos.map((l: any) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 16px',
                borderTop: '1px solid rgba(15,23,42,0.04)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFBFC'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
              >
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {l.tipo === 'receita'
                    ? <ArrowDownLeft size={16} color="#2F8F68" strokeWidth={1.75} />
                    : <ArrowUpRight  size={16} color="#DC2626" strokeWidth={1.75} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#0B1F18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.categoria}</p>
                  <p style={{ fontSize: '12.5px', color: '#94A3B8' }}>{l.membro} · {l.hora}</p>
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, flexShrink: 0, color: l.tipo === 'receita' ? '#2F8F68' : '#DC2626' }}>
                  {l.tipo === 'receita' ? '+' : '-'} {fmtOculto(Number(l.valor), ocultar)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
