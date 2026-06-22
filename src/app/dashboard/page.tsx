'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, PiggyBank, Target,
  ArrowRight, ArrowUp, CheckCircle2, AlertCircle, Bell,
  Home, BookOpen, Shield, TrendingUp, Send, Heart, Star, Church
} from 'lucide-react'
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

  const supabase = createClient()

  useEffect(() => { carregar() }, [])

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

      const base = lanc
        .filter((l: any) => l.tipo === 'receita' && l.dizimar !== false)
        .reduce((s: number, l: any) => s + Number(l.valor), 0)
      const pago = lanc
        .filter((l: any) => l.tipo === 'despesa' && l.categoria === 'Dízimo')
        .reduce((s: number, l: any) => s + Number(l.valor), 0)
      setBaseDizimo(base)
      setValorDizimo(base * 0.1)
      setDizimoPago(pago)

      const porCat: any = {}
      lanc.filter((l: any) => l.tipo === 'despesa').forEach((l: any) => {
        porCat[l.categoria] = (porCat[l.categoria] || 0) + Number(l.valor)
      })
      const cores = ['#0F766E','#F59E0B','#8B5CF6','#3B82F6','#EC4899','#EF4444','#10B981','#64748B']
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
  const patrimonioTotal  = evolucao.reduce((s, e) => s + e.valor, 0)
  const patrimonioExibir = patrimonioTotal !== 0 ? patrimonioTotal : totalEco

  const dizimoRestante = Math.max(valorDizimo - dizimoPago, 0)
  const dizimoPctPago  = valorDizimo > 0 ? Math.min(Math.round((dizimoPago / valorDizimo) * 100), 100) : 0
  const dizimoQuitado  = dizimoPago >= valorDizimo && valorDizimo > 0

  let score = 0
  if (totalEco > 0)    score += 30
  if (pctGasto < 80)   score += 25
  if (metas.length > 0) score += 25
  if (pctGuard >= 10)  score += 20
  score = Math.min(score, 100)

  const saude = [
    { label: 'Reserva de Emergência',   ok: totalEco > 0,     desc: totalEco > 0 ? 'Guardando este mês' : 'Sem economia este mês' },
    { label: 'Orçamento Controlado',    ok: pctGasto < 80,    desc: pctGasto < 80 ? `${pctGasto}% comprometido` : 'Gastos elevados' },
    { label: 'Metas em Andamento',      ok: metas.length > 0, desc: metas.length > 0 ? `${metas.length} meta(s) ativa(s)` : 'Nenhuma meta criada' },
    { label: 'Crescimento Patrimonial', ok: totalEco > 0,     desc: totalEco > 0 ? `+${fmt(totalEco)} este mês` : 'Sem crescimento' },
  ]

  const kpis = [
    { label: 'Receitas', val: totalRec, badge: '↑ 8% este mês',  cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
    { label: 'Despesas', val: totalDes, badge: '↑ 5% este mês',  cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight  },
    { label: 'Economia', val: totalEco, badge: '↑ 15% este mês', cor: '#F59E0B', bg: '#FFFBEB', Icon: PiggyBank     },
  ]

  return (
    <div className="p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            {getSaudacao()}, {primeiroNome || 'Família'} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>Aqui está o resumo da sua vida financeira</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full text-sm font-medium border"
            style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#0F172A' }}>
            {mesAtual}
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center border"
            style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#64748B' }}>
            <Bell size={17} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* HERO */}
      <div className="rounded-[20px] p-8 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0B4D3B 0%, #0F766E 100%)', boxShadow: '0 20px 50px -12px rgba(11,77,59,0.4)' }}>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(40px)' }} />
        <div className="absolute -bottom-24 right-40 w-72 h-72 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', filter: 'blur(60px)' }} />
        <div className="relative grid grid-cols-3 gap-8 items-center">
          <div className="col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Patrimônio Familiar</p>
            <p className="text-5xl font-semibold text-white mb-4" style={{ letterSpacing: '-2px' }}>
              {loading ? '...' : fmt(patrimonioExibir)}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {!semDados && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)' }}>
                  <ArrowUp size={12} color="#6EE7B7" strokeWidth={2.5} />
                  <span className="text-xs font-semibold" style={{ color: '#6EE7B7' }}>{pctGuard}% este mês</span>
                </div>
              )}
              <div className="px-3.5 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {familia ? `Família ${familia}` : ''} · {mesAtual}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Evolução · 6 meses</p>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={evolucao}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6EE7B7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6EE7B7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="valor" stroke="#6EE7B7" strokeWidth={2} fill="url(#heroGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* KPI CARDS — 4 fixos, 5º se dizimista */}
      <div className={`grid gap-5 mb-6 ${dizimista ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {kpis.map(card => (
          <div key={card.label} className="rounded-[20px] p-6 border transition-all hover:shadow-lg"
            style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: card.bg }}>
              <card.Icon size={19} color={card.cor} strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>{card.label}</p>
            <p className="text-2xl font-semibold mb-2" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
              {loading ? '...' : fmt(card.val)}
            </p>
            <span className="text-xs font-medium" style={{ color: card.cor }}>{card.badge}</span>
          </div>
        ))}

        {/* CARD METAS — sempre visível */}
        <div className="rounded-[20px] p-6 border transition-all hover:shadow-lg"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#F5F3FF' }}>
            <Target size={19} color="#8B5CF6" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Metas Ativas</p>
          <p className="text-2xl font-semibold mb-2" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            {metas.length} {metas.length === 1 ? 'meta' : 'metas'}
          </p>
          <a href="/dashboard/metas" className="text-xs font-semibold hover:underline" style={{ color: '#8B5CF6' }}>Ver detalhes →</a>
        </div>

        {/* CARD DÍZIMO — só aparece se dizimista */}
        {dizimista && (
          <div className="rounded-[20px] p-6 border transition-all hover:shadow-lg relative overflow-hidden"
            style={{ backgroundColor: '#fff', borderColor: dizimoQuitado ? '#D1FAE5' : '#FEF3C7', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div className="absolute top-4 right-4">
              <span className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ backgroundColor: dizimoQuitado ? '#D1FAE5' : '#FEF3C7', color: dizimoQuitado ? '#059669' : '#D97706' }}>
                {dizimoQuitado ? '✓ Pago' : 'Pendente'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#F0FDF4' }}>
              <Church size={19} color="#0F766E" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>Dízimo do mês</p>
            <p className="text-2xl font-semibold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
              {loading ? '...' : fmt(valorDizimo)}
            </p>
            <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>10% de {loading ? '...' : fmt(baseDizimo)}</p>
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: '#F1F5F9' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${dizimoPctPago}%`, backgroundColor: dizimoQuitado ? '#10B981' : '#F59E0B' }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: '#94A3B8' }}>Pago: {fmt(dizimoPago)}</span>
              <span className="text-xs font-semibold" style={{ color: dizimoQuitado ? '#10B981' : '#D97706' }}>
                {dizimoQuitado ? 'Completo!' : `Falta ${fmt(dizimoRestante)}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO PRINCIPAL */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="col-span-2 rounded-[20px] border p-6"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold" style={{ color: '#0F172A' }}>Evolução Patrimonial</h2>
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Últimos 6 meses</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolucao}>
              <defs>
                <linearGradient id="evoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F766E" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#0F766E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v)} labelStyle={{ color: '#0F172A', fontWeight: 600 }}
                contentStyle={{ borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
              <Area type="monotone" dataKey="valor" stroke="#0F766E" strokeWidth={2.5} fill="url(#evoGrad)"
                dot={{ fill: '#fff', stroke: '#0F766E', strokeWidth: 2, r: 4 }}
                activeDot={{ fill: '#0F766E', r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[20px] border p-6 flex flex-col"
          style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h2 className="font-semibold mb-1" style={{ color: '#0F172A' }}>Saúde Financeira</h2>
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>Score geral</p>
          <div className="relative flex items-center justify-center mb-5" style={{ height: '140px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="75%" outerRadius="100%" data={[{ value: score, fill: '#10B981' }]} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: '#F1F5F9' }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-1px' }}>{score}</span>
              <span className="text-xs" style={{ color: '#94A3B8' }}>de 100</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {saude.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {s.ok
                  ? <CheckCircle2 size={16} color="#10B981" strokeWidth={1.75} className="flex-shrink-0 mt-0.5" />
                  : <AlertCircle  size={16} color="#EF4444" strokeWidth={1.75} className="flex-shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{s.label}</p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <a href="/dashboard/movimentos"
            className="mt-4 text-center text-sm font-semibold py-2.5 rounded-xl transition-colors hover:opacity-90"
            style={{ backgroundColor: '#F0FDF4', color: '#0F766E' }}>
            Ver detalhes
          </a>
        </div>
      </div>

      {/* METAS */}
      <div className="rounded-[20px] border p-6 mb-6"
        style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold" style={{ color: '#0F172A' }}>Metas da Família</h2>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Progresso dos objetivos</p>
          </div>
          <a href="/dashboard/metas" className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: '#0F766E' }}>
            Ver todas <ArrowRight size={13} strokeWidth={2} />
          </a>
        </div>
        {metas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Target size={28} color="#E2E8F0" strokeWidth={1} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma meta criada ainda.</p>
            <a href="/dashboard/metas" className="text-sm font-semibold hover:underline" style={{ color: '#0F766E' }}>Criar primeira meta →</a>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {metas.map((m: any) => {
              const pct  = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
              const Icon = ICONES_META[m.icone] || Target
              const cor  = m.cor || '#0F766E'
              return (
                <div key={m.id} className="rounded-2xl border p-4" style={{ borderColor: '#F1F5F9' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cor + '18' }}>
                      <Icon size={17} color={cor} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{m.nome}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>{fmt(Number(m.valor_atual))} de {fmt(Number(m.valor_alvo))}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: cor }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* INFERIOR */}
      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-[20px] border p-6" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h2 className="font-semibold mb-1" style={{ color: '#0F172A' }}>Despesas por Categoria</h2>
          <p className="text-sm mb-4" style={{ color: '#64748B' }}>Distribuição do mês</p>
          {cats.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: '#94A3B8' }}>Sem despesas ainda.</p>
          ) : (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={cats} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="val" strokeWidth={0} paddingAngle={2}>
                    {cats.map((c, i) => <Cell key={i} fill={c.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-3">
                {cats.map((c: any) => (
                  <div key={c.nome} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor }} />
                      <span className="text-sm font-medium" style={{ color: '#334155' }}>{c.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{fmt(c.val)}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>{c.pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[20px] border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 className="font-semibold" style={{ color: '#0F172A' }}>Últimos Lançamentos</h2>
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Atividade recente</p>
            </div>
            <a href="/dashboard/movimentos" className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: '#0F766E' }}>
              Ver todos <ArrowRight size={13} strokeWidth={2} />
            </a>
          </div>
          {lancamentos.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: '#94A3B8' }}>Nenhum lançamento ainda.</p>
          ) : lancamentos.map((l: any) => (
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
              <p className="font-semibold text-sm flex-shrink-0" style={{ color: l.tipo === 'receita' ? '#10B981' : '#EF4444' }}>
                {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
