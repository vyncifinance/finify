'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { IBM_Plex_Mono, Lora } from 'next/font/google'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Printer, Church, Target, Shield, Home, BookOpen, TrendingUp, Send, Heart, Star,
  CheckCircle2, AlertCircle, Circle, Stethoscope, Calendar
} from 'lucide-react'
import { CORES_ESTADO } from '@/lib/relatorioCores'
import SectionLabel from '@/components/SectionLabel'
import MetricCard from '@/components/MetricCard'
import ProgressBar from '@/components/ProgressBar'
import TimelineTag from '@/components/TimelineTag'

const mono  = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono' })
const voice = Lora({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-voice' })

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const ICONES_META: Record<string, any> = {
  home: Home, book: BookOpen, shield: Shield, 'trending-up': TrendingUp,
  send: Send, heart: Heart, star: Star, target: Target,
}

const CATEGORIA_CORES = ['#145A45', '#2FB36A', '#B45309', '#9F1239', '#0F6E56', '#6B7280', '#0F172A', '#58D68D']

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtShort(val: number) {
  const abs = Math.abs(val)
  if (abs >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return fmt(val)
}
function formatData(dataStr: string) {
  const d = new Date(dataStr + 'T12:00:00')
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatPrazo(prazo: string | null) {
  if (!prazo) return null
  const d = new Date(prazo + 'T12:00:00')
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}
function tipoSessaoLabel(v: string) {
  const labels: Record<string, string> = {
    diagnostico: 'Diagnóstico', organizacao: 'Organização', ajuste: 'Ajuste',
    consolidacao: 'Consolidação', mensal: 'Mensal',
  }
  return labels[v] || v
}

export default function RelatorioPage() {
  const params = useParams()
  const router = useRouter()
  const consultoriaId = params.id as string

  const [loading, setLoading]         = useState(true)
  const [consultoria, setConsultoria] = useState<any>(null)
  const [evolucao, setEvolucao]       = useState<{ mes: string; receita: number; despesa: number }[]>([])
  const [categorias, setCategorias]   = useState<{ nome: string; valor: number }[]>([])
  const [metas, setMetas]             = useState<any[]>([])
  const [dizimo, setDizimo]           = useState<{ base: number; alvo: number; pago: number } | null>(null)
  const [percentualComprometido, setPercentualComprometido] = useState<number | null>(null)
  const [jornada, setJornada]         = useState<any[]>([])
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [planosAcao, setPlanosAcao]   = useState<any[]>([])
  const [proximoPasso, setProximoPasso] = useState('')

  const supabase = createClient()

  useEffect(() => { carregar() }, [consultoriaId])

  async function carregar() {
    setLoading(true)

    const { data: consultoriaData } = await supabase
      .from('consultorias')
      .select('id, plano, status, data_inicio, familia_id, familias(nome)')
      .eq('id', consultoriaId)
      .single()

    if (!consultoriaData) { setLoading(false); return }
    setConsultoria(consultoriaData)
    const fid = consultoriaData.familia_id

    const { data: contasData } = await supabase.from('contas').select('id, tipo').eq('familia_id', fid)
    const idsCartoes = new Set((contasData || []).filter((c: any) => c.tipo === 'cartao_credito').map((c: any) => c.id))
    const contarComoDespesa = (l: any) => {
      if (l.categoria === 'Cartão de Crédito' && !idsCartoes.has(l.conta_id)) return false
      return true
    }

    const agora = new Date()

    // Evolução receita/despesa — últimos 6 meses, mesmo cálculo do dashboard/consultor
    const evo: { mes: string; receita: number; despesa: number }[] = []
    let lancMesAtual: any[] = []
    for (let i = 5; i >= 0; i--) {
      const d2 = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const ini = new Date(d2.getFullYear(), d2.getMonth(), 1).toISOString().split('T')[0]
      const fim = new Date(d2.getFullYear(), d2.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data: mesBruto } = await supabase.from('lancamentos').select('tipo, valor, categoria, conta_id, dizimar')
        .eq('familia_id', fid).is('empresa_id', null).gte('data', ini).lte('data', fim)
      const mes = (mesBruto || []).filter(contarComoDespesa)
      const r = mes.filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const d = mes.filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + Number(l.valor), 0)
      evo.push({ mes: MESES[d2.getMonth()].substring(0, 3), receita: r, despesa: d })
      if (i === 0) lancMesAtual = mes
    }
    setEvolucao(evo)

    // Categorias de despesa do mês atual
    const porCat: Record<string, number> = {}
    lancMesAtual.filter((l: any) => l.tipo === 'despesa').forEach((l: any) => {
      porCat[l.categoria] = (porCat[l.categoria] || 0) + Number(l.valor)
    })
    setCategorias(Object.entries(porCat).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 8))

    // Dízimo do mês atual — mesma fórmula das Fases 3/5
    const base = lancMesAtual.filter((l: any) => l.tipo === 'receita' && l.dizimar !== false).reduce((s: number, l: any) => s + Number(l.valor), 0)
    const pago = lancMesAtual.filter((l: any) => l.tipo === 'despesa' && l.categoria === 'Dízimo').reduce((s: number, l: any) => s + Number(l.valor), 0)
    setDizimo({ base, alvo: base * 0.1, pago })

    // Metas ativas
    const { data: metasData } = await supabase.from('metas').select('*')
      .eq('familia_id', fid).order('automatica', { ascending: false }).order('created_at', { ascending: false })
    setMetas(metasData || [])

    // Saúde financeira (view da Fase 6)
    const { data: saudeData } = await supabase.from('saude_financeira_familia')
      .select('percentual_comprometido').eq('familia_id', fid).maybeSingle()
    setPercentualComprometido(saudeData?.percentual_comprometido ?? null)

    // Diagnósticos + sessões — jornada simplificada (sem indicador de acompanhamento)
    const { data: diagsData } = await supabase.from('diagnosticos').select('*')
      .eq('consultoria_id', consultoriaId).order('created_at', { ascending: false })
    setDiagnostico(diagsData?.[0] || null)

    const { data: sessoesData } = await supabase.from('sessoes').select('*')
      .eq('consultoria_id', consultoriaId).order('data_sessao', { ascending: true })

    const marcos = [
      ...(diagsData || []).map((d: any) => ({ tipo: 'diagnostico' as const, data: d.created_at.split('T')[0], item: d })),
      ...(sessoesData || []).filter((s: any) => s.status === 'realizada').map((s: any) => ({ tipo: 'sessao' as const, data: s.data_sessao, item: s })),
    ].sort((a, b) => a.data.localeCompare(b.data))
    setJornada(marcos)

    // Plano de ação
    const { data: planosData } = await supabase.from('planos_acao').select('*')
      .eq('consultoria_id', consultoriaId).order('created_at', { ascending: true })
    setPlanosAcao(planosData || [])

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Carregando...</p>
      </div>
    )
  }

  if (!consultoria) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Consultoria não encontrada.</p>
        <button onClick={() => router.push('/consultor/clientes')} className="text-sm font-semibold" style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
          Voltar para Clientes
        </button>
      </div>
    )
  }

  const nomeFamilia = consultoria.familias?.nome || 'Família'
  const mesAtual = evolucao[evolucao.length - 1]
  const mesAnterior = evolucao[evolucao.length - 2]
  const saldoAtual = mesAtual ? mesAtual.receita - mesAtual.despesa : 0
  const saldoAnterior = mesAnterior ? mesAnterior.receita - mesAnterior.despesa : 0
  const variacaoSaldo = saldoAnterior !== 0 ? ((saldoAtual - saldoAnterior) / Math.abs(saldoAnterior)) * 100 : (saldoAtual > 0 ? 100 : 0)

  const totalDespesaCategorias = categorias.reduce((s, c) => s + c.valor, 0)

  const dizimoQuitado = dizimo ? dizimo.pago >= dizimo.alvo && dizimo.alvo > 0 : false
  const dizimoPctPago = dizimo && dizimo.alvo > 0 ? Math.min(Math.round((dizimo.pago / dizimo.alvo) * 100), 100) : 0

  const saudeCor = percentualComprometido === null
    ? CORES_ESTADO.neutro
    : percentualComprometido > 90 ? CORES_ESTADO.negativo
    : percentualComprometido >= 70 ? CORES_ESTADO.atencao
    : CORES_ESTADO.neutro

  return (
    <div className={`${mono.variable} ${voice.variable} min-h-screen`} style={{ backgroundColor: '#F1F5F9' }}>
      {/* Barra de ações (some na impressão) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-5 lg:px-10 py-4"
        style={{ backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}`)}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={15} strokeWidth={2} /> {nomeFamilia}
        </button>
        <button onClick={() => window.print()}
          className="btn-cta flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', boxShadow: '0 4px 16px rgba(11,59,46,0.3)', border: 'none', cursor: 'pointer' }}>
          <Printer size={15} strokeWidth={2} /> Imprimir / Exportar PDF
        </button>
      </div>

      {/* Documento */}
      <div className="mx-auto" style={{ maxWidth: '760px', padding: '32px 20px 64px' }}>
        <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>

          {/* Cabeçalho */}
          <div style={{ background: 'linear-gradient(180deg, #06261F 0%, #0A342A 50%, #0D3F31 100%)', padding: '40px 40px 32px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px',
              backgroundColor: 'rgba(47,179,106,0.14)', border: '1px solid rgba(47,179,106,0.28)', marginBottom: '20px',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#58D68D' }}>
                Relatório de consultoria
              </span>
            </div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#fff', letterSpacing: '-0.6px', marginBottom: '8px' }}>
              {nomeFamilia}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
              Plano {consultoria.plano} · {new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div style={{ padding: '40px' }}>

            {/* Resumo do mês */}
            <SectionLabel>Resumo do mês</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-4 mb-10">
              <MetricCard label="Receita" valor={fmtShort(mesAtual?.receita || 0)}
                sparkline={evolucao.map(e => e.receita)} cor="#0F172A" />
              <MetricCard label="Despesa" valor={fmtShort(mesAtual?.despesa || 0)}
                sparkline={evolucao.map(e => e.despesa)} cor="#0F172A" />
              <MetricCard label="Saldo" valor={fmtShort(saldoAtual)}
                sparkline={evolucao.map(e => e.receita - e.despesa)}
                cor={saldoAtual >= 0 ? CORES_ESTADO.positivo : CORES_ESTADO.negativo} />
              <MetricCard label="Vs. mês anterior" valor={`${variacaoSaldo >= 0 ? '+' : ''}${variacaoSaldo.toFixed(0)}%`}
                tendencia={variacaoSaldo >= 0 ? 'up' : 'down'}
                cor={variacaoSaldo >= 0 ? CORES_ESTADO.positivo : CORES_ESTADO.negativo} />
            </div>

            {/* Renda comprometida */}
            <SectionLabel>Renda comprometida</SectionLabel>
            <div className="mt-4 mb-10">
              <div className="flex items-end justify-between mb-2">
                <p style={{ fontSize: '26px', fontWeight: 700, color: saudeCor, letterSpacing: '-0.4px' }}>
                  {percentualComprometido !== null ? `${percentualComprometido}%` : '—'}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8' }}>da receita do mês em despesas</p>
              </div>
              <ProgressBar pct={percentualComprometido || 0} cor={saudeCor} altura={6} />
            </div>

            {/* Categorias de gasto */}
            {categorias.length > 0 && (
              <>
                <SectionLabel>Onde o dinheiro foi</SectionLabel>
                <div className="flex flex-col gap-3 mt-4 mb-10">
                  {categorias.map((c, i) => {
                    const pct = totalDespesaCategorias > 0 ? Math.round((c.valor / totalDespesaCategorias) * 100) : 0
                    return (
                      <div key={c.nome}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{c.nome}</span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>{fmtShort(c.valor)} · {pct}%</span>
                        </div>
                        <ProgressBar pct={pct} cor={CATEGORIA_CORES[i % CATEGORIA_CORES.length]} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Metas ativas */}
            {metas.length > 0 && (
              <>
                <SectionLabel>Metas ativas</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 mb-10">
                  {metas.map((m: any) => {
                    const pct  = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
                    const Icon = ICONES_META[m.icone] || Target
                    const cor  = m.cor || '#145A45'
                    return (
                      <div key={m.id} className="rounded-2xl p-4" style={{ border: '1px solid #ECEFF3' }}>
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cor + '18' }}>
                            <Icon size={14} color={cor} strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }} className="truncate">{m.nome}</p>
                            <p style={{ fontSize: '11px', color: '#94A3B8' }}>{fmt(Number(m.valor_atual))} de {fmt(Number(m.valor_alvo))}</p>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: cor }}>{pct}%</span>
                        </div>
                        <ProgressBar pct={pct} cor={cor} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Dízimo */}
            {dizimo && (
              <>
                <SectionLabel>Status do dízimo</SectionLabel>
                <div className="mt-4 mb-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Church size={16} color="#145A45" strokeWidth={1.75} />
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{fmt(dizimo.alvo)}</p>
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>10% de {fmtShort(dizimo.base)}</span>
                    </div>
                    <span className="flex items-center gap-1" style={{ fontSize: '12px', fontWeight: 600, color: dizimoQuitado ? CORES_ESTADO.positivo : CORES_ESTADO.atencao }}>
                      {dizimoQuitado ? <CheckCircle2 size={13} strokeWidth={2.5} /> : <AlertCircle size={13} strokeWidth={2.5} />}
                      {dizimoQuitado ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                  <ProgressBar pct={dizimoPctPago} cor={dizimoQuitado ? CORES_ESTADO.positivo : CORES_ESTADO.atencao} />
                </div>
              </>
            )}

            {/* Jornada */}
            {jornada.length > 0 && (
              <>
                <SectionLabel>Sua jornada até aqui</SectionLabel>
                <div className="flex flex-col gap-3 mt-4 mb-10">
                  {jornada.map((entrada, i) => {
                    const isSessao = entrada.tipo === 'sessao'
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <TimelineTag>{formatData(entrada.data)}</TimelineTag>
                        <div className="flex items-center gap-1.5">
                          {isSessao
                            ? <Calendar size={13} color="#94A3B8" strokeWidth={1.75} />
                            : <Stethoscope size={13} color="#94A3B8" strokeWidth={1.75} />
                          }
                          <span style={{ fontSize: '13px', color: '#334155' }}>
                            {isSessao ? `Sessão de ${tipoSessaoLabel(entrada.item.tipo)}` : 'Diagnóstico registrado'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Pontos de atenção */}
            {diagnostico?.pontos_atencao?.length > 0 && (
              <>
                <SectionLabel>Pontos de atenção</SectionLabel>
                <div className="flex flex-col gap-2 mt-4 mb-10">
                  {diagnostico.pontos_atencao.map((p: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <Circle size={6} color="#B45309" fill="#B45309" className="flex-shrink-0 mt-1.5" />
                      <p style={{ fontSize: '13.5px', color: '#334155' }}>{p}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Plano de ação */}
            {planosAcao.length > 0 && (
              <>
                <SectionLabel>Plano de ação</SectionLabel>
                <div className="flex flex-col gap-2.5 mt-4 mb-10">
                  {planosAcao.map((a: any) => {
                    const concluida = a.status === 'concluida'
                    return (
                      <div key={a.id} className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: concluida ? '#145A45' : '#fff', border: `1.5px solid ${concluida ? '#145A45' : '#CBD5E1'}` }}>
                          {concluida && <CheckCircle2 size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <p style={{ fontSize: '13.5px', color: concluida ? '#94A3B8' : '#0F172A', textDecoration: concluida ? 'line-through' : 'none' }}>
                          {a.descricao}
                        </p>
                        {a.prazo && (
                          <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>{formatPrazo(a.prazo)}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Próximo passo recomendado */}
            <SectionLabel>Próximo passo recomendado</SectionLabel>
            <div className="mt-4">
              <textarea
                value={proximoPasso}
                onChange={e => setProximoPasso(e.target.value)}
                placeholder="Escreva aqui a recomendação para essa família antes de gerar o PDF..."
                rows={4}
                className="no-print-border"
                style={{
                  width: '100%', resize: 'vertical', border: 'none', outline: 'none', background: 'none',
                  fontFamily: 'var(--font-voice)', fontStyle: 'italic', fontSize: '17px', lineHeight: 1.6,
                  color: '#0F172A', padding: 0,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          textarea { border: none !important; }
        }
      `}</style>
    </div>
  )
}
