'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft, Church, Target, Shield, Home, BookOpen, TrendingUp, Send, Heart, Star,
  Calendar, CheckCircle2, AlertCircle, ClipboardList, AlertTriangle, Circle,
  Plus, ChevronDown, Pencil, Stethoscope, FileText
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { calcularAcompanhamento } from '@/lib/acompanhamento'
import IndicadorAcompanhamento from '@/components/IndicadorAcompanhamento'
import IndicadorSaudeFinanceira from '@/components/IndicadorSaudeFinanceira'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const ICONES_META: Record<string, any> = {
  home: Home, book: BookOpen, shield: Shield, 'trending-up': TrendingUp,
  send: Send, heart: Heart, star: Star, target: Target,
}

const STATUS_COR: Record<string, { cor: string; bg: string }> = {
  ativo:     { cor: '#059669', bg: '#D1FAE5' },
  pausado:   { cor: '#D97706', bg: '#FEF3C7' },
  encerrado: { cor: '#6B7280', bg: '#F1F5F9' },
  graduado:  { cor: '#2FB36A', bg: '#F0FDF4' },
}

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtShort(val: number) {
  const abs = Math.abs(val)
  if (abs >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return fmt(val)
}
function formatPrazo(prazo: string | null) {
  if (!prazo) return null
  const d = new Date(prazo + 'T12:00:00')
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export default function ConsultorClienteDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const consultoriaId = params.id as string

  const [loading, setLoading]         = useState(true)
  const [consultoria, setConsultoria] = useState<any>(null)
  const [familiaId, setFamiliaId]     = useState('')
  const [evolucao, setEvolucao]       = useState<any[]>([])
  const [metas, setMetas]             = useState<any[]>([])
  const [dizimoMeses, setDizimoMeses] = useState<any[]>([])
  const [diagnostico, setDiagnostico] = useState<any>(null)
  const [diagnosticos, setDiagnosticos] = useState<any[]>([])
  const [planosAcao, setPlanosAcao]   = useState<any[]>([])
  const [sessoes, setSessoes]         = useState<any[]>([])
  const [itemExpandido, setItemExpandido] = useState<string | null>(null)
  const [percentualComprometido, setPercentualComprometido] = useState<number | null>(null)

  const supabase = createClient()

  useEffect(() => { carregar() }, [consultoriaId])

  // Mesma regra do dashboard da família: compra no cartão vira despesa na hora
  // (regime de competência); o consolidado "Pagamento de fatura" é descartado
  // pra não contar o valor em dobro.
  function contarComoDespesaFactory(idsCartoes: Set<string>) {
    return (l: any) => {
      if (l.categoria === 'Cartão de Crédito' && !idsCartoes.has(l.conta_id)) return false
      return true
    }
  }

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
    setFamiliaId(fid)

    const { data: contasData } = await supabase.from('contas').select('id, tipo').eq('familia_id', fid)
    const idsCartoes = new Set((contasData || []).filter((c: any) => c.tipo === 'cartao_credito').map((c: any) => c.id))
    const contarComoDespesa = contarComoDespesaFactory(idsCartoes)

    const agora = new Date()

    // Evolução receita x despesa — últimos 6 meses, mesmo cálculo do dashboard da família
    const evo = []
    for (let i = 5; i >= 0; i--) {
      const d2 = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const ini = new Date(d2.getFullYear(), d2.getMonth(), 1).toISOString().split('T')[0]
      const fim = new Date(d2.getFullYear(), d2.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data: mesBruto } = await supabase.from('lancamentos').select('tipo, valor, categoria, conta_id')
        .eq('familia_id', fid).is('empresa_id', null).gte('data', ini).lte('data', fim)
      const mes = (mesBruto || []).filter(contarComoDespesa)
      const r = mes.filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const d = mes.filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + Number(l.valor), 0)
      evo.push({ mes: MESES[d2.getMonth()].substring(0, 3), valor: r - d })
    }
    setEvolucao(evo)

    // Status do dízimo — últimos 3 meses, mesmo cálculo do dashboard da família:
    // base = receitas com dizimar=true × 10% · pago = despesas categoria Dízimo
    const dizimos = []
    for (let i = 2; i >= 0; i--) {
      const d2 = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const ini = new Date(d2.getFullYear(), d2.getMonth(), 1).toISOString().split('T')[0]
      const fim = new Date(d2.getFullYear(), d2.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data: mesBruto } = await supabase.from('lancamentos').select('tipo, valor, categoria, dizimar')
        .eq('familia_id', fid).is('empresa_id', null).gte('data', ini).lte('data', fim)
      const mes = mesBruto || []
      const base = mes.filter((l: any) => l.tipo === 'receita' && l.dizimar !== false).reduce((s: number, l: any) => s + Number(l.valor), 0)
      const pago = mes.filter((l: any) => l.tipo === 'despesa' && l.categoria === 'Dízimo').reduce((s: number, l: any) => s + Number(l.valor), 0)
      const alvo = base * 0.1
      dizimos.push({
        mes: `${MESES[d2.getMonth()]} ${d2.getFullYear()}`,
        base, alvo, pago,
        emDia: alvo === 0 || pago >= alvo,
      })
    }
    setDizimoMeses(dizimos)

    // Metas ativas da família — somente leitura
    const { data: metasData } = await supabase.from('metas').select('*')
      .eq('familia_id', fid).order('automatica', { ascending: false }).order('created_at', { ascending: false })
    setMetas(metasData || [])

    // Diagnósticos da consultoria (mais recente primeiro, pra resumo; lista completa pra timeline)
    const { data: diagsData } = await supabase.from('diagnosticos').select('*')
      .eq('consultoria_id', consultoriaId).order('created_at', { ascending: false })
    setDiagnosticos(diagsData || [])
    setDiagnostico(diagsData?.[0] || null)

    // Plano de ação da consultoria
    const { data: planosData } = await supabase.from('planos_acao').select('*')
      .eq('consultoria_id', consultoriaId).order('created_at', { ascending: true })
    setPlanosAcao(planosData || [])

    // Sessões da consultoria
    const { data: sessoesData } = await supabase.from('sessoes').select('*')
      .eq('consultoria_id', consultoriaId).order('data_sessao', { ascending: true })
    setSessoes(sessoesData || [])

    // Saúde financeira — % da receita do mês comprometido com despesas (view saude_financeira_familia)
    const { data: saudeData } = await supabase.from('saude_financeira_familia')
      .select('percentual_comprometido').eq('familia_id', fid).maybeSingle()
    setPercentualComprometido(saudeData?.percentual_comprometido ?? null)

    setLoading(false)
  }

  async function toggleAcaoConcluida(acao: any) {
    const novoStatus = acao.status === 'concluida' ? 'pendente' : 'concluida'
    setPlanosAcao(prev => prev.map(p => p.id === acao.id ? { ...p, status: novoStatus } : p))
    await supabase.from('planos_acao').update({ status: novoStatus }).eq('id', acao.id)
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
  const statusCor   = STATUS_COR[consultoria.status] || { cor: '#6B7280', bg: '#F1F5F9' }
  const mesAtualDizimo = dizimoMeses[dizimoMeses.length - 1]
  const dizimoEmDiaGeral = dizimoMeses.every(d => d.emDia)

  const sessoesRealizadas = sessoes.filter(s => s.status === 'realizada')
  const ultimaSessaoRealizada = sessoesRealizadas.length > 0
    ? sessoesRealizadas[sessoesRealizadas.length - 1].data_sessao
    : null
  const acompanhamento = calcularAcompanhamento({
    ultimaSessaoRealizada,
    totalAcoes: planosAcao.length,
    acoesConcluidas: planosAcao.filter(p => p.status === 'concluida').length,
  })

  // Jornada: diagnósticos + sessões, ordem cronológica
  const jornada = [
    ...diagnosticos.map((d: any) => ({ tipo: 'diagnostico' as const, data: d.created_at.split('T')[0], item: d })),
    ...sessoes.map((s: any) => ({ tipo: 'sessao' as const, data: s.data_sessao, item: s })),
  ].sort((a, b) => a.data.localeCompare(b.data))

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">

        <button onClick={() => router.push('/consultor/clientes')}
          className="flex items-center gap-1.5 text-sm font-medium mb-5"
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={15} strokeWidth={2} /> Clientes
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold"
            style={{ background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', color: '#fff' }}>
            {nomeFamilia[0]?.toUpperCase() || 'F'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold truncate" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
              {nomeFamilia}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                style={{ border: '1.5px solid #E5E7EB', color: '#64748B', backgroundColor: 'transparent' }}>
                {consultoria.plano}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                style={{ color: statusCor.cor, backgroundColor: statusCor.bg }}>
                {consultoria.status}
              </span>
              <span className="text-xs" style={{ color: '#94A3B8' }}>
                Desde {formatPrazo(consultoria.data_inicio)}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}/sessoes/nova`)}
              className="btn-soft flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#fff', color: '#145A45', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
              <Plus size={15} strokeWidth={2} /> Nova sessão
            </button>
            <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}/diagnostico`)}
              className="btn-soft flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: '#F0FDF4', color: '#145A45', border: '1px solid #D1FAE5', cursor: 'pointer' }}>
              <ClipboardList size={15} strokeWidth={2} /> Novo diagnóstico
            </button>
            <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}/relatorio`)}
              className="btn-cta flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', boxShadow: '0 4px 16px rgba(11,59,46,0.3)', border: 'none', cursor: 'pointer' }}>
              <FileText size={15} strokeWidth={2} /> Gerar relatório
            </button>
          </div>
        </div>

        <div className="sm:hidden flex flex-col gap-2 mb-6">
          <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}/sessoes/nova`)}
            className="btn-soft w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#fff', color: '#145A45', border: '1px solid #E5E7EB', cursor: 'pointer' }}>
            <Plus size={15} strokeWidth={2} /> Nova sessão
          </button>
          <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}/diagnostico`)}
            className="btn-soft w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: '#F0FDF4', color: '#145A45', border: '1px solid #D1FAE5', cursor: 'pointer' }}>
            <ClipboardList size={15} strokeWidth={2} /> Novo diagnóstico
          </button>
          <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}/relatorio`)}
            className="btn-cta w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', boxShadow: '0 4px 16px rgba(11,59,46,0.3)', border: 'none', cursor: 'pointer' }}>
            <FileText size={15} strokeWidth={2} /> Gerar relatório
          </button>
        </div>

        {/* Acompanhamento (jornada com o consultor) + Saúde financeira (independentes um do outro) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-3xl p-5 lg:p-6"
            style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>Acompanhamento</p>
            <IndicadorAcompanhamento resultado={acompanhamento} />
            <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
              {acompanhamento.diasDesdeUltimaSessao === null
                ? 'Nenhuma sessão realizada ainda'
                : `Última sessão há ${acompanhamento.diasDesdeUltimaSessao} dia(s)`}
              {' · '}{acompanhamento.pctAcoesConcluidas}% das ações concluídas
            </p>
          </div>
          <div className="rounded-3xl p-5 lg:p-6"
            style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>Saúde Financeira</p>
            <IndicadorSaudeFinanceira percentual={percentualComprometido} />
          </div>
        </div>

        {/* Gráfico de evolução */}
        <div className="rounded-3xl p-5 lg:p-6 mb-6"
          style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#0F172A' }}>Resultado Mensal</p>
          <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>Receitas − despesas · últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={evolucao}>
              <defs>
                <linearGradient id="evoConsultor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FB36A" stopOpacity={0.25}/>
                  <stop offset="100%" stopColor="#2FB36A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickFormatter={(v) => fmtShort(Number(v))} width={56} />
              <Tooltip formatter={(v: any) => fmt(Number(v))}
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(15,23,42,0.06)', backgroundColor: '#fff', padding: '8px 12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)' }}
                itemStyle={{ color: '#0B1F18', fontSize: '13px', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="valor" stroke="#2FB36A" strokeWidth={2} fill="url(#evoConsultor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status do dízimo */}
          <div className="rounded-3xl p-5 lg:p-6"
            style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                  <Church size={15} color="#145A45" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Status do Dízimo</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{ backgroundColor: dizimoEmDiaGeral ? '#D1FAE5' : '#FEF3C7', color: dizimoEmDiaGeral ? '#059669' : '#D97706' }}>
                {dizimoEmDiaGeral ? <CheckCircle2 size={12} strokeWidth={2.5} /> : <AlertCircle size={12} strokeWidth={2.5} />}
                {dizimoEmDiaGeral ? 'Em dia' : 'Atrasado'}
              </span>
            </div>
            {mesAtualDizimo && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-xl font-bold" style={{ color: '#0F172A' }}>{fmt(mesAtualDizimo.alvo)}</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>10% de {fmtShort(mesAtualDizimo.base)}</p>
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              {dizimoMeses.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs" style={{ color: '#64748B' }}>
                  <span className="capitalize">{d.mes}</span>
                  <div className="flex items-center gap-1.5">
                    <span>{fmt(d.pago)} de {fmt(d.alvo)}</span>
                    {d.emDia
                      ? <CheckCircle2 size={13} color="#10B981" strokeWidth={2} />
                      : <AlertCircle size={13} color="#EF4444" strokeWidth={2} />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metas ativas */}
          <div className="rounded-3xl overflow-hidden"
            style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
              <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Metas Ativas</p>
              <span className="text-xs" style={{ color: '#94A3B8' }}>{metas.length}</span>
            </div>
            {metas.length === 0 ? (
              <div className="p-8 text-center">
                <Target size={24} color="#E2E8F0" strokeWidth={1.5} className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma meta criada.</p>
              </div>
            ) : metas.map((m: any) => {
              const pct  = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
              const Icon = ICONES_META[m.icone] || Target
              const cor  = m.cor || '#145A45'
              return (
                <div key={m.id} className="p-5 border-t" style={{ borderColor: '#F1F5F9' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cor + '18' }}>
                      <Icon size={16} color={cor} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{m.nome}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>{fmt(Number(m.valor_atual))} de {fmt(Number(m.valor_alvo))}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: cor }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
                  </div>
                  {m.prazo && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Calendar size={11} color="#94A3B8" strokeWidth={1.75} />
                      <span className="text-xs" style={{ color: '#94A3B8' }}>{formatPrazo(m.prazo)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {(diagnostico || planosAcao.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pontos de atenção do último diagnóstico */}
            {diagnostico && (
              <div className="rounded-3xl p-5 lg:p-6"
                style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFFBEB' }}>
                    <AlertTriangle size={15} color="#B7791F" strokeWidth={1.75} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Pontos de Atenção</p>
                </div>
                {(!diagnostico.pontos_atencao || diagnostico.pontos_atencao.length === 0) ? (
                  <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum ponto de atenção registrado.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {diagnostico.pontos_atencao.map((p: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <Circle size={6} color="#B7791F" fill="#B7791F" className="flex-shrink-0 mt-1.5" />
                        <p className="text-sm" style={{ color: '#334155' }}>{p}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Checklist do plano de ação */}
            <div className="rounded-3xl overflow-hidden"
              style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
              <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Plano de Ação</p>
                <span className="text-xs" style={{ color: '#94A3B8' }}>
                  {planosAcao.filter(p => p.status === 'concluida').length}/{planosAcao.length}
                </span>
              </div>
              {planosAcao.length === 0 ? (
                <div className="p-8 text-center">
                  <ClipboardList size={24} color="#E2E8F0" strokeWidth={1.5} className="mx-auto mb-2" />
                  <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma ação cadastrada.</p>
                </div>
              ) : planosAcao.map((a: any) => {
                const concluida = a.status === 'concluida'
                return (
                  <button key={a.id} onClick={() => toggleAcaoConcluida(a)}
                    className="w-full flex items-center gap-3 px-5 lg:px-6 py-3.5 border-t text-left transition-all"
                    style={{ borderColor: '#F1F5F9', background: 'none', cursor: 'pointer' }}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: concluida ? '#145A45' : '#fff', border: `1.5px solid ${concluida ? '#145A45' : '#CBD5E1'}` }}>
                      {concluida && <CheckCircle2 size={13} color="#fff" strokeWidth={2.5} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: concluida ? '#94A3B8' : '#0F172A', textDecoration: concluida ? 'line-through' : 'none' }}>
                        {a.descricao}
                      </p>
                      {a.prazo && (
                        <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                          Prazo: {formatPrazo(a.prazo)}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Timeline da jornada */}
        {jornada.length > 0 && (
          <div className="rounded-3xl p-5 lg:p-6 mt-6"
            style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
            <p className="text-sm font-semibold mb-5" style={{ color: '#0F172A' }}>Jornada</p>
            <div className="flex flex-col">
              {jornada.map((entrada, i) => {
                const isSessao = entrada.tipo === 'sessao'
                const s = isSessao ? entrada.item : null
                const d = !isSessao ? entrada.item : null
                const preenchido = isSessao ? s.status === 'realizada' : true
                const expandido = itemExpandido === entrada.item.id
                const ehUltimo = i === jornada.length - 1
                return (
                  <div key={entrada.item.id} className="flex gap-4">
                    {/* Linha e ponto */}
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: '16px' }}>
                      <div className="rounded-full flex-shrink-0"
                        style={{
                          width: '11px', height: '11px', marginTop: '4px',
                          backgroundColor: preenchido ? '#145A45' : '#fff',
                          border: `2px solid ${preenchido ? '#145A45' : '#CBD5E1'}`,
                        }} />
                      {!ehUltimo && <div style={{ width: '2px', flex: 1, backgroundColor: '#F1F5F9', marginTop: '2px' }} />}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 pb-5">
                      <button
                        onClick={() => isSessao && setItemExpandido(expandido ? null : entrada.item.id)}
                        className="w-full flex items-center gap-2 text-left"
                        style={{ background: 'none', border: 'none', cursor: isSessao ? 'pointer' : 'default', padding: 0 }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: isSessao ? '#F0FDF4' : '#FFFBEB' }}>
                          {isSessao
                            ? <Calendar size={13} color="#145A45" strokeWidth={1.75} />
                            : <Stethoscope size={13} color="#B7791F" strokeWidth={1.75} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
                            {isSessao ? `Sessão de ${s.tipo}` : 'Diagnóstico registrado'}
                          </p>
                          <p className="text-xs" style={{ color: '#94A3B8' }}>
                            {formatPrazo(entrada.data)} {isSessao && `· ${s.status === 'realizada' ? 'Realizada' : 'Agendada'}`}
                          </p>
                        </div>
                        {isSessao && (
                          <ChevronDown size={15} color="#94A3B8" strokeWidth={2}
                            style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
                        )}
                      </button>

                      {isSessao && expandido && (
                        <div className="mt-3 ml-9 p-4 rounded-2xl" style={{ backgroundColor: '#F8FAFC' }}>
                          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Resumo</p>
                          <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: s.resumo ? '#334155' : '#94A3B8' }}>
                            {s.resumo || 'Nenhum resumo registrado.'}
                          </p>
                          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#64748B' }}>Próximos passos</p>
                          <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: s.proximos_passos ? '#334155' : '#94A3B8' }}>
                            {s.proximos_passos || 'Nenhum próximo passo registrado.'}
                          </p>
                          <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}/sessoes/${s.id}`)}
                            className="flex items-center gap-1.5 text-xs font-semibold"
                            style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Pencil size={12} strokeWidth={2} /> Editar sessão
                          </button>
                        </div>
                      )}

                      {!isSessao && d.pontos_atencao?.length > 0 && (
                        <p className="text-xs mt-1 ml-9" style={{ color: '#94A3B8' }}>
                          {d.pontos_atencao.length} ponto(s) de atenção registrado(s)
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
