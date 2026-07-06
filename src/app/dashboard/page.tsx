'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useOcultarValores, fmtOculto, fmtShortOculto } from '@/hooks/useOcultarValores'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, PiggyBank, Target,
  ArrowRight, ArrowUp, CheckCircle2, AlertCircle, Bell,
  Home, BookOpen, Shield, TrendingUp, Send, Heart, Star, Church,
  ChevronRight, Wallet, Building2, Sparkles, UtensilsCrossed, Car,
  Smile, ShoppingBag, CreditCard, MoreHorizontal, Briefcase
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
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}
function fmtShort(val: number) {
  const abs = Math.abs(val)
  if (abs >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return fmt(val)
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
  const [loading, setLoading] = useState(true)
  const [totalRec, setTotalRec] = useState(0)
  const [totalDes, setTotalDes] = useState(0)
  const [totalEco, setTotalEco] = useState(0)
  const [cats, setCats]         = useState<any[]>([])
  const [metas, setMetas]       = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [evolucao, setEvolucao]       = useState<any[]>([])
  const [dizimista, setDizimista]     = useState(true)
  const [baseDizimo, setBaseDizimo]   = useState(0)
  const [valorDizimo, setValorDizimo] = useState(0)
  const [dizimoPago, setDizimoPago]   = useState(0)
  const [atualizadoHa, setAtualizadoHa] = useState(0)

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
      setNome(profile.nome || '')
      setFamilia((profile.familias as any)?.nome || '')
      setDizimista((profile.familias as any)?.dizimista !== false)
      await carregarDados(profile.familia_id)
    }
    setLoading(false)
    setAtualizadoHa(0)
  }

  async function carregarDados(fid: string) {
    const ini = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0]
    const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString().split('T')[0]
    const { data: lanc } = await supabase.from('lancamentos').select('*')
      .eq('familia_id', fid).gte('data', ini).lte('data', fim)
      .order('data', { ascending: false })

    if (lanc) {
      const r = lanc.filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const d = lanc.filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + Number(l.valor), 0)
      setTotalRec(r); setTotalDes(d); setTotalEco(r - d)
      setLancamentos(lanc.slice(0, 5))

      const base = lanc.filter((l: any) => l.tipo === 'receita' && l.dizimar !== false).reduce((s: number, l: any) => s + Number(l.valor), 0)
      const pago = lanc.filter((l: any) => l.tipo === 'despesa' && l.categoria === 'Dízimo').reduce((s: number, l: any) => s + Number(l.valor), 0)
      setBaseDizimo(base); setValorDizimo(base * 0.1); setDizimoPago(pago)

      const porCat: any = {}
      lanc.filter((l: any) => l.tipo === 'despesa').forEach((l: any) => {
        porCat[l.categoria] = (porCat[l.categoria] || 0) + Number(l.valor)
      })
      const cores = ['#145A45','#3B82F6','#F59E0B','#8B5CF6','#EF4444','#EC4899','#10B981','#64748B']
      setCats(Object.entries(porCat).map(([nome, val], i) => ({
        nome, val: Number(val), cor: cores[i % cores.length],
        pct: d > 0 ? Math.round((Number(val) / d) * 100) : 0
      })))
    }

    const evo = []
    for (let i = 5; i >= 0; i--) {
      const d2 = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const i2 = new Date(d2.getFullYear(), d2.getMonth(), 1).toISOString().split('T')[0]
      const f2 = new Date(d2.getFullYear(), d2.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data: mes } = await supabase.from('lancamentos').select('tipo, valor')
        .eq('familia_id', fid).gte('data', i2).lte('data', f2)
      const r2 = (mes || []).filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const d3 = (mes || []).filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + Number(l.valor), 0)
      evo.push({ mes: MESES[d2.getMonth()].substring(0, 3), valor: r2 - d3 })
    }
    setEvolucao(evo)

    const { data: metasData } = await supabase.from('metas').select('*')
      .eq('familia_id', fid).order('created_at', { ascending: false }).limit(3)
    if (metasData) setMetas(metasData)
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
  const dizimoAtivo    = dizimista === true

  const mediaEvolucao = evolucao.length > 0 ? evolucao.reduce((s, e) => s + e.valor, 0) / evolucao.length : 0
  const melhorMes = evolucao.length > 0 ? evolucao.reduce((a, b) => b.valor > a.valor ? b : a) : null
  const piorMes   = evolucao.length > 0 ? evolucao.reduce((a, b) => b.valor < a.valor ? b : a) : null
  const dizimoRestante = Math.max(valorDizimo - dizimoPago, 0)
  const dizimoPctPago  = valorDizimo > 0 ? Math.min(Math.round((dizimoPago / valorDizimo) * 100), 100) : 0
  const dizimoQuitado  = dizimoPago >= valorDizimo && valorDizimo > 0

  let score = 0
  if (totalEco > 0)     score += 30
  if (pctGasto < 80)    score += 25
  if (metas.length > 0) score += 25
  if (pctGuard >= 10)   score += 20
  score = Math.min(score, 100)

  const scoreLabel = score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 35 ? 'Atenção' : 'Crítico'
  const scoreCor   = score >= 80 ? '#2F8F68' : score >= 60 ? '#F59E0B' : score >= 35 ? '#F97316' : '#EF4444'

  const saude = [
    { label: 'Reserva de Emergência',   ok: totalEco > 0,     desc: totalEco > 0 ? 'Guardando este mês' : 'Sem economia este mês' },
    { label: 'Orçamento Controlado',    ok: pctGasto < 80,    desc: pctGasto < 80 ? `${pctGasto}% comprometido` : 'Gastos elevados' },
    { label: 'Metas em Andamento',      ok: metas.length > 0, desc: metas.length > 0 ? `${metas.length} meta(s) ativa(s)` : 'Nenhuma meta criada' },
    { label: 'Crescimento Patrimonial', ok: totalEco > 0,     desc: totalEco > 0 ? `+${fmtOculto(totalEco, ocultar)} este mês` : 'Sem crescimento' },
  ]

  const kpis = [
    { label: 'Receitas', val: totalRec, cor: '#2F8F68', bg: '#ECFDF5', borderTint: 'rgba(47,143,104,0.15)', Icon: ArrowDownLeft },
    { label: 'Despesas', val: totalDes, cor: '#DC2626', bg: '#FEF2F2', borderTint: 'rgba(220,38,38,0.12)', Icon: ArrowUpRight  },
    { label: 'Economia', val: totalEco, cor: '#B7791F', bg: '#FFFBEB', borderTint: 'rgba(183,121,31,0.15)', Icon: PiggyBank     },
  ]

  return (
    <>
      {/* ── MOBILE (mantido) ── */}
      <div className="lg:hidden min-h-screen" style={{ backgroundColor: '#F8FAFC', paddingBottom: '32px' }}>
        <div style={{ background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', padding: '24px 20px 48px' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {getSaudacao()}, {primeiroNome || 'Família'}
              </p>
              <p className="text-2xl font-bold text-white" style={{ letterSpacing: '-1px' }}>
                {loading ? '...' : fmtShortOculto(resultadoExibir, ocultar)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Resultado do mês · {mesAtual}</p>
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
                </div>
              )
            })}
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                {getSaudacao()}, {primeiroNome || 'Família'}
              </h1>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
                Veja como seu patrimônio evoluiu hoje.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2F8F68' }} />
                <span style={{ fontSize: '12.5px', color: '#94A3B8' }}>
                  Atualizado {atualizadoHa === 0 ? 'agora' : `há ${atualizadoHa} min`}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            background: 'linear-gradient(135deg, #06261F 0%, #0B3B2E 45%, #0D3F31 100%)',
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
                      {familia ? `Família ${familia}` : ''} · {mesAtual}
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
          <div style={{ display: 'grid', gap: '8px', marginBottom: '10px', gridTemplateColumns: dizimoAtivo ? 'repeat(5, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))' }}>
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
            <div style={{
              borderRadius: '16px', padding: '18px', backgroundColor: '#fff',
              border: '1px solid rgba(139,92,246,0.15)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.01)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)' }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Target size={17} color="#8B5CF6" strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginBottom: '6px' }}>Metas Ativas</p>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.3px', marginBottom: '2px' }}>
                {metas.length} {metas.length === 1 ? 'meta' : 'metas'}
              </p>
              <a href="/dashboard/metas" style={{ fontSize: '12.5px', fontWeight: 500, color: '#8B5CF6', textDecoration: 'none' }}>Ver detalhes →</a>
            </div>
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

          {/* Evolução + Saúde Financeira */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '10px', alignItems: 'start' }}>
            <div style={{
              borderRadius: '20px', padding: '24px', backgroundColor: '#fff',
              border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Resultado Mensal</h2>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>Receitas − despesas · últimos 6 meses</p>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={evolucao}>
                  <defs>
                    <linearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2F8F68" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#2F8F68" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmt(v)} labelStyle={{ color: '#0F172A', fontWeight: 600 }}
                    contentStyle={{ borderRadius: '14px', border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="valor" stroke="#2F8F68" strokeWidth={3} fill="url(#evoGrad)"
                    dot={{ fill: '#fff', stroke: '#2F8F68', strokeWidth: 2, r: 4 }}
                    activeDot={{ fill: '#2F8F68', r: 7, strokeWidth: 0 }}
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #F1F5F9' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Média do período</p>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.3px' }}>
                    {loading ? '...' : fmtOculto(mediaEvolucao, ocultar)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Melhor mês</p>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#2F8F68', letterSpacing: '-0.3px' }}>
                    {loading || !melhorMes ? '...' : `${fmtShortOculto(melhorMes.valor, ocultar)}`}
                  </p>
                  {melhorMes && <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{melhorMes.mes}</p>}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>Pior mês</p>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: piorMes && piorMes.valor < 0 ? '#DC2626' : '#0B1F18', letterSpacing: '-0.3px' }}>
                    {loading || !piorMes ? '...' : `${fmtShortOculto(piorMes.valor, ocultar)}`}
                  </p>
                  {piorMes && <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{piorMes.mes}</p>}
                </div>
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

          {/* Metas */}
          <div style={{
            borderRadius: '20px', padding: metas.length === 0 ? '20px 28px' : '28px', marginBottom: '24px', backgroundColor: '#fff',
            border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: metas.length === 0 ? '0' : '24px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0B1F18', letterSpacing: '-0.3px' }}>Metas da Família</h2>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>Progresso dos objetivos</p>
              </div>
              <a href="/dashboard/metas" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13.5px', fontWeight: 600, color: '#145A45', textDecoration: 'none' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {metas.map((m: any) => {
                  const pct  = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
                  const Icon = ICONES_META[m.icone] || Target
                  const cor  = m.cor || '#145A45'
                  return (
                    <div key={m.id} style={{
                      borderRadius: '10px', padding: '10px', border: '1px solid rgba(15,23,42,0.05)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(15,23,42,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, backgroundColor: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={17} color={cor} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</p>
                          <p style={{ fontSize: '12px', color: '#94A3B8' }}>{fmtOculto(Number(m.valor_atual), ocultar)} de {fmtOculto(Number(m.valor_alvo), ocultar)}</p>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: cor, flexShrink: 0 }}>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: cor, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Categorias + Lançamentos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{
              borderRadius: '20px', padding: '28px', backgroundColor: '#fff',
              border: '1px solid rgba(15,23,42,0.06)', boxShadow: '0 12px 40px rgba(15,23,42,0.05)',
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#0B1F18', marginBottom: '2px', letterSpacing: '-0.2px' }}>Despesas por Categoria</h2>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>Distribuição do mês</p>
              {cats.length === 0 ? (
                <p style={{ fontSize: '13.5px', textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>Sem despesas ainda.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                  <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                    <PieChart width={160} height={160}>
                      <Pie data={cats} cx={80} cy={80} innerRadius={52} outerRadius={75} dataKey="val" strokeWidth={2} stroke="#fff" paddingAngle={2}>
                        {cats.map((c: any, i: number) => <Cell key={i} fill={c.cor} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(15,23,42,0.06)' }} />
                    </PieChart>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>Total</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0B1F18' }}>{ocultar ? '••••' : `R$${(totalDes/1000).toFixed(1)}k`}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {cats.map((c: any) => {
                      const Icon = ICONES_CAT[c.nome] || MoreHorizontal
                      return (
                        <div key={c.nome}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: c.cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={12} color={c.cor} strokeWidth={1.75} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#0B1F18', flex: 1 }}>{c.nome}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#0B1F18' }}>{fmtOculto(c.val, ocultar)}</span>
                            <span style={{ fontSize: '10px', color: '#94A3B8', minWidth: '26px', textAlign: 'right' }}>{c.pct}%</span>
                          </div>
                          <div style={{ marginLeft: '32px', height: '3px', borderRadius: '2px', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${c.pct}%`, backgroundColor: c.cor, borderRadius: '2px' }} />
                          </div>
                        </div>
                      )
                    })}
                    {cats.length > 0 && (
                      <div style={{ marginTop: '4px', padding: '7px 10px', borderRadius: '9px', backgroundColor: cats[0].cor + '10', border: `1px solid ${cats[0].cor}25`, display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <ArrowUp size={11} color={cats[0].cor} strokeWidth={2.5} />
                        <p style={{ fontSize: '10px', color: '#64748B', margin: 0 }}>
                          <strong style={{ color: '#0B1F18' }}>{cats[0].nome}</strong> representa {cats[0].pct}% do total.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
      </div>
    </>
  )
}
