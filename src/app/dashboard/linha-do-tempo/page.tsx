'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useOcultarValores, fmtOculto, fmtShortOculto } from '@/hooks/useOcultarValores'
import { createClient } from '@/lib/supabase'
import {
  Info, Bell, ChevronLeft, ChevronRight, ChevronDown, Settings2,
  Star, Car, Home, Trophy, Shield, Target, TrendingUp, Sparkles,
  ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet, ArrowRight, CheckCircle2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const ICONES_META: Record<string, any> = {
  home: Home, shield: Shield, 'trending-up': TrendingUp, star: Star, target: Target, car: Car,
}

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function mesesEntre(hoje: Date, alvo: Date) {
  const diff = (alvo.getFullYear() - hoje.getFullYear()) * 12 + (alvo.getMonth() - hoje.getMonth())
  return diff > 0 ? diff : 0
}

function ehCategoriaAlocacao(cat: string) {
  // Aportes em metas e investimentos: dinheiro que muda de lugar, não é consumido — mesma regra do Dashboard.
  return cat === 'Investimento' || cat === 'Investimentos'
}

// Taxa diária do CDI (Bacen, série 12) — mesma estimativa usada na tela Investimentos
async function buscarTaxaCDIDiaria(): Promise<number> {
  try {
    const res = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json')
    const json = await res.json()
    if (json && json[0]?.valor) return Number(json[0].valor) / 100
  } catch {}
  return 0.00039
}

// Mesma lógica de dias úteis usada na tela Investimentos — CDI não roda em fim de semana.
function diasUteisEntre(inicio: Date, fim: Date): number {
  let count = 0
  const d = new Date(inicio)
  d.setHours(0, 0, 0, 0)
  const limite = new Date(fim)
  limite.setHours(0, 0, 0, 0)
  while (d < limite) {
    d.setDate(d.getDate() + 1)
    const diaSemana = d.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) count++
  }
  return count
}

export default function LinhaDoTempoPage() {
  const [loading, setLoading] = useState(true)
  const [familiaId, setFamiliaId] = useState('')
  const [nome, setNome] = useState('')
  const [totalRec, setTotalRec] = useState(0)
  const [totalDes, setTotalDes] = useState(0)
  const [totalInv, setTotalInv] = useState(0)
  const [mesInvestimento, setMesInvestimento] = useState<string | null>(null)
  const [metas, setMetas] = useState<any[]>([])
  const [evolucao, setEvolucao] = useState<{ mes: string; valor: number }[]>([])
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const [atualizadoHa, setAtualizadoHa] = useState(0)
  const [taxaCDIDiaria, setTaxaCDIDiaria] = useState(0)

  const ocultar = useOcultarValores()
  const supabase = createClient()
  const trilhaRef = useRef<HTMLDivElement>(null)

  useEffect(() => { buscarTaxaCDIDiaria().then(setTaxaCDIDiaria) }, [])

  const anoAtual = new Date().getFullYear()
  const anos = Array.from({ length: 12 }, (_, i) => anoAtual - 2 + i)

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
      .from('profiles').select('nome, familia_id')
      .eq('id', session.user.id).single()
    if (!profile?.familia_id) { setLoading(false); return }
    setNome(profile.nome || '')
    setFamiliaId(profile.familia_id)

    const inicioMes = new Date(anoAtual, new Date().getMonth(), 1).toISOString().split('T')[0]
    const fimMes    = new Date(anoAtual, new Date().getMonth() + 1, 0).toISOString().split('T')[0]

    const { data: lanc } = await supabase.from('lancamentos').select('*')
      .eq('familia_id', profile.familia_id).is('empresa_id', null)
      .gte('data', inicioMes).lte('data', fimMes)

    if (lanc) {
      const r = lanc.filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const d = lanc.filter((l: any) => l.tipo === 'despesa' && !ehCategoriaAlocacao(l.categoria)).reduce((s: number, l: any) => s + Number(l.valor), 0)
      setTotalRec(r); setTotalDes(d)
    }

    // Saldo real da carteira de investimentos (mesma fonte da tela Investimentos, não soma de lançamentos)
    const { data: invMaisRecente } = await supabase.from('investimentos')
      .select('saldo, mes').eq('familia_id', profile.familia_id)
      .order('mes', { ascending: false }).limit(1).maybeSingle()
    if (invMaisRecente) {
      setTotalInv(Number(invMaisRecente.saldo))
      setMesInvestimento(invMaisRecente.mes)
    } else {
      setTotalInv(0)
    }

    const { data: metasData } = await supabase.from('metas')
      .select('*').eq('familia_id', profile.familia_id).order('prazo', { ascending: true })
    if (metasData) setMetas(metasData)

    // Evolução dos últimos 6 meses (base real de receitas - despesas)
    const evo: { mes: string; valor: number }[] = []
    let acumulado = 0
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, new Date().getMonth() - i, 1)
      const ini = ref.toISOString().split('T')[0]
      const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data: lm } = await supabase.from('lancamentos').select('tipo, valor')
        .eq('familia_id', profile.familia_id).is('empresa_id', null)
        .gte('data', ini).lte('data', fim)
      const saldoMes = (lm || []).reduce((s: number, l: any) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
      acumulado += saldoMes
      evo.push({ mes: MESES[ref.getMonth()].slice(0, 3), valor: Math.max(acumulado, 0) })
    }
    setEvolucao(evo)

    setLoading(false)
    setAtualizadoHa(0)
  }

  // Heurística inicial de projeção: usa a economia média mensal dos últimos 6 meses
  // e aplica crescimento composto até o marco de R$ 1 milhão. Refinar com o simulador
  // de cenários (renda, gastos, rentabilidade) em uma próxima fase.
  const economiaMediaMensal = evolucao.length > 1
    ? Math.max((evolucao[evolucao.length - 1].valor - evolucao[0].valor) / (evolucao.length - 1), 200)
    : 500

  const dataBaseInv = mesInvestimento ? new Date(mesInvestimento + 'T12:00:00') : null
  const diasInv = dataBaseInv ? diasUteisEntre(dataBaseInv, new Date()) : 0
  const totalInvEstimado = dataBaseInv ? totalInv * Math.pow(1 + taxaCDIDiaria, diasInv) : totalInv

  // Patrimônio estimado = acúmulo de fluxo de caixa (receita - despesa dos últimos meses)
  // + carteira de investimentos. Antes só contava o fluxo de caixa, o que fazia esse número
  // parecer bem menor que a realidade pra quem já tem dinheiro investido.
  const acumuloCaixa = evolucao.length ? evolucao[evolucao.length - 1].valor : 0
  const patrimonioAtual = acumuloCaixa + totalInvEstimado

  const metasAbertas = metas.filter(m => Number(m.valor_atual) < Number(m.valor_alvo))
  const hoje = new Date()

  const maiorMeta = metasAbertas.length
    ? metasAbertas.reduce((maior, m) => Number(m.valor_alvo) > Number(maior.valor_alvo) ? m : maior, metasAbertas[0])
    : null
  const valorAlvoProjecao = maiorMeta ? Number(maiorMeta.valor_alvo) : Math.max(patrimonioAtual * 2, 50000)

  const projecao: { ano: number; valor: number }[] = []
  let valorProj = patrimonioAtual
  for (let i = 0; i <= 20; i++) {
    projecao.push({ ano: anoAtual + i, valor: Math.round(valorProj) })
    valorProj = valorProj * 1.006 + economiaMediaMensal * 12 // crescimento anual composto simplificado
  }
  const anoAlvoProjecao = projecao.find(p => p.valor >= valorAlvoProjecao)?.ano || null

  const resumo = [
    { label: 'Receitas',     val: totalRec, cor: '#378ADD', bg: '#EFF6FF', Icon: ArrowDownLeft },
    { label: 'Despesas',     val: totalDes, cor: '#DC2626', bg: '#FEF2F2', Icon: ArrowUpRight },
    { label: 'Economia',     val: totalRec - totalDes, cor: '#BA7517', bg: '#FAEEDA', Icon: PiggyBank },
    { label: 'Carteira de investimentos', val: totalInvEstimado, cor: '#145A45', bg: '#D1FAE5', Icon: Wallet },
  ]

  return (
    <div style={{ backgroundColor: '#F7F9FB', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '20px 24px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.4px', margin: 0 }}>Sua linha do tempo financeira</h1>
              <Info size={15} color="#94A3B8" strokeWidth={1.75} />
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>Navegue pelo seu passado e visualize seu futuro financeiro.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2F8F68' }} />
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>Atualizado {atualizadoHa === 0 ? 'agora' : `há ${atualizadoHa} min`}</span>
            </div>
            <div style={{ padding: '9px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {MESES[hoje.getMonth()]} {anoAtual} <ChevronDown size={14} color="#94A3B8" />
            </div>
            <button style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={16} color="#64748B" strokeWidth={1.75} />
            </button>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
              {nome ? nome[0].toUpperCase() : 'H'}
            </div>
          </div>
        </div>

        {/* Timeline horizontal */}
        <div style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '20px', padding: '20px 24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => trilhaRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
              <ChevronLeft size={18} />
            </button>
            <div ref={trilhaRef} style={{ flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <div style={{ display: 'flex', minWidth: 'max-content', position: 'relative', paddingBottom: '4px' }}>
                {anos.map((ano, i) => {
                  const marcoDoAno = metasAbertas.find(m => m.prazo && new Date(m.prazo + 'T12:00:00').getFullYear() === ano)
                  const passado = ano < anoAtual
                  const atual = ano === anoAtual
                  const Icon = marcoDoAno ? (ICONES_META[marcoDoAno.icone] || Target) : null
                  return (
                    <div key={ano} onClick={() => setAnoSelecionado(ano)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '92px', flexShrink: 0, cursor: 'pointer' }}>
                      <span style={{ fontSize: '13px', fontWeight: atual ? 700 : 500, color: atual ? '#0B1F18' : '#94A3B8', marginBottom: '10px' }}>{ano}</span>
                      <div style={{ width: '100%', height: '2px', backgroundColor: passado || atual ? '#145A45' : '#E2E8F0', position: 'relative' }}>
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                          width: atual ? '16px' : '9px', height: atual ? '16px' : '9px', borderRadius: '50%',
                          backgroundColor: atual ? '#145A45' : (passado ? '#145A45' : '#CBD5E1'),
                          border: atual ? '3px solid #D1FAE5' : 'none',
                        }} />
                      </div>
                      <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
                        {Icon && (
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={13} color="#BA7517" strokeWidth={1.75} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <button onClick={() => trilhaRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', flexShrink: 0 }}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <span style={{ padding: '5px 12px', borderRadius: '999px', backgroundColor: '#D1FAE5', color: '#145A45', fontSize: '12px', fontWeight: 600 }}>
              {MESES[hoje.getMonth()]} {anoSelecionado}
            </span>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(15,23,42,0.06)', backgroundColor: '#fff', color: '#64748B', fontSize: '12.5px', cursor: 'pointer' }}>
              <Settings2 size={14} /> Editar cenário
            </button>
          </div>
        </div>

        {/* 3 cards de contexto */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>

          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '18px', padding: '18px' }}>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 4px' }}>Patrimônio estimado</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#0B1F18', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              {loading ? '...' : fmtOculto(patrimonioAtual, ocultar)}
            </p>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={evolucao}>
                <defs>
                  <linearGradient id="linhaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#145A45" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#145A45" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #E2E8F0' }} />
                <Area type="monotone" dataKey="valor" stroke="#145A45" strokeWidth={2} fill="url(#linhaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '18px', padding: '18px' }}>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 10px' }}>Evento do período</p>
            {(() => {
              const metaConcluida = metas.find(m => Number(m.valor_atual) >= Number(m.valor_alvo))
              const metaMaisProxima = metasAbertas.length
                ? metasAbertas.reduce((maisProx, m) => {
                    const pctM = Number(m.valor_atual) / Number(m.valor_alvo)
                    const pctMaisProx = Number(maisProx.valor_atual) / Number(maisProx.valor_alvo)
                    return pctM > pctMaisProx ? m : maisProx
                  }, metasAbertas[0])
                : null

              if (metaConcluida) {
                const Icon = ICONES_META[metaConcluida.icone] || Trophy
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '13px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={19} color="#145A45" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: 0 }}>{metaConcluida.nome} concluída</p>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Você bateu esse marco da sua jornada.</p>
                    </div>
                  </div>
                )
              }
              if (metaMaisProxima) {
                const Icon = ICONES_META[metaMaisProxima.icone] || Target
                const pct = Math.min(Math.round((Number(metaMaisProxima.valor_atual) / Number(metaMaisProxima.valor_alvo)) * 100), 100)
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '13px', backgroundColor: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={19} color="#BA7517" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: 0 }}>{metaMaisProxima.nome} em {pct}%</p>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Seu marco mais próximo de ser concluído.</p>
                    </div>
                  </div>
                )
              }
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '13px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Target size={19} color="#94A3B8" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: 0 }}>Nenhuma meta criada ainda</p>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Crie sua primeira meta para começar sua jornada.</p>
                  </div>
                </div>
              )
            })()}
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '18px', padding: '18px' }}>
            <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 10px' }}>Resumo do mês</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {resumo.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '7px', backgroundColor: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <r.Icon size={11} color={r.cor} strokeWidth={1.75} />
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748B', flex: 1 }}>{r.label}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0B1F18' }}>{fmtOculto(r.val, ocultar)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Próximos marcos + projeção */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>

          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '18px', padding: '18px' }}>
            <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: '0 0 12px' }}>Próximos marcos da sua jornada</p>
            {metasAbertas.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>Nenhuma meta em aberto ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {metasAbertas.slice(0, 4).map((m: any) => {
                  const Icon = ICONES_META[m.icone] || Target
                  const pct = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
                  const mRest = m.prazo ? mesesEntre(hoje, new Date(m.prazo + 'T12:00:00')) : null
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: (m.cor || '#145A45') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <Icon size={14} color={m.cor || '#145A45'} strokeWidth={1.75} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0B1F18', margin: 0 }}>{m.nome}</p>
                          <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>{mRest !== null ? `Falta ${mRest} meses` : ''}</span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '1px 0 6px' }}>
                          {m.prazo ? `Previsão: ${MESES[new Date(m.prazo + 'T12:00:00').getMonth()]} ${new Date(m.prazo + 'T12:00:00').getFullYear()}` : 'Sem prazo definido'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '5px', borderRadius: '3px', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: m.cor || '#145A45', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0B1F18', minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <a href="/dashboard/metas" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600, color: '#145A45', textDecoration: 'none', marginTop: '14px' }}>
              Ver todos os marcos <ArrowRight size={12} />
            </a>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '18px', padding: '18px' }}>
            <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: '0 0 2px' }}>Projeção de patrimônio</p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#0B1F18', margin: '2px 0 0', letterSpacing: '-0.4px' }}>
              {fmtOculto(valorAlvoProjecao, ocultar)}
            </p>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 12px' }}>
              {maiorMeta
                ? `${maiorMeta.nome}${anoAlvoProjecao ? `, previsto para ${anoAlvoProjecao}` : ''}`
                : `Dobrando seu patrimônio atual, mantendo o ritmo de hoje`}
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={projecao}>
                <defs>
                  <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#145A45" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#145A45" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="ano" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #E2E8F0' }} />
                <Area type="monotone" dataKey="valor" stroke="#145A45" strokeWidth={2} fill="url(#projGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CTA simulador */}
        <div style={{ backgroundColor: '#fff', border: '1px solid rgba(15,23,42,0.06)', borderRadius: '18px', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={18} color="#145A45" strokeWidth={1.75} />
            <div>
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#0B1F18', margin: 0 }}>Simule cenários e veja como pequenas mudanças podem transformar seu futuro.</p>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Ajuste sua renda, gastos e investimentos e veja o impacto no seu patrimônio.</p>
            </div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '11px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <TrendingUp size={15} /> Simular cenários
          </button>
        </div>

      </div>
    </div>
  )
}
