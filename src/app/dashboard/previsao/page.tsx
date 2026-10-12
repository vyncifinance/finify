'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useOcultarValores, fmtOculto } from '@/hooks/useOcultarValores'
import { createClient } from '@/lib/supabase'
import {
  calcularPrevisao, simularGastoExtra,
  type LancamentoPrevisao, type DespesaFixaPrevisao, type ContaPrevisao, type ResultadoPrevisao,
} from '@/lib/previsao'
import {
  CalendarClock, Info, TrendingUp, TrendingDown, Sparkles,
  UtensilsCrossed, Home, Car, Smile, Heart, BookOpen, ShoppingBag, CreditCard,
  Church, HandHeart, MoreHorizontal, Pill, Gift, GraduationCap, Smartphone,
  Shirt, Wrench, ClipboardList, PawPrint, Briefcase, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Mesmo conjunto de categorias/ícones usado no Dashboard e em Movimentos (contexto pessoal).
const ICONES_CAT: Record<string, any> = {
  'Alimentação': UtensilsCrossed, 'Moradia': Home, 'Transporte': Car, 'Lazer': Smile,
  'Saúde': Heart, 'Educação': BookOpen, 'Compras': ShoppingBag, 'Cartão de Crédito': CreditCard,
  'Dízimo': Church, 'Doações': HandHeart, 'Farmácia': Pill, 'Presente': Gift,
  'Estética': Sparkles, 'Estudos': GraduationCap, 'Eletrônicos': Smartphone, 'Vestuário': Shirt,
  'Consertos': Wrench, 'Serviços': ClipboardList, 'Pet': PawPrint, 'Outros': MoreHorizontal,
  'Salário': Briefcase, 'Investimento': TrendingUp, 'Investimentos': TrendingUp,
}

// Tokens oficiais do Finify (CLAUDE.md — seção "Estados").
const COR_POSITIVO = '#10B981'
const COR_ATENCAO  = '#F59E0B'
const COR_NEGATIVO = '#EF4444'

const STATUS_CFG: Record<string, { cor: string; label: string; Icon: any }> = {
  positivo: { cor: COR_POSITIVO, label: 'Tranquilo', Icon: CheckCircle2 },
  atencao:  { cor: COR_ATENCAO,  label: 'Atenção',   Icon: AlertTriangle },
  negativo: { cor: COR_NEGATIVO, label: 'Aperto',    Icon: TrendingDown },
}

function dataLocalISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const HORIZONTE_MAX = 12
const HISTORICO_MESES = 6

export default function PrevisaoPage() {
  const [loading, setLoading] = useState(true)
  const [familiaId, setFamiliaId] = useState('')
  const [lancamentos, setLancamentos] = useState<LancamentoPrevisao[]>([])
  const [despesasFixas, setDespesasFixas] = useState<DespesaFixaPrevisao[]>([])
  const [contas, setContas] = useState<ContaPrevisao[]>([])
  const [horizonte, setHorizonte] = useState<3 | 6 | 12>(6)

  const [simMesChave, setSimMesChave] = useState<string>('')
  const [simDescricao, setSimDescricao] = useState('')
  const [simValor, setSimValor] = useState('')

  const ocultar = useOcultarValores()
  const supabase = createClient()
  const hoje = useMemo(() => new Date(), [])

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setLoading(false); return }
    const { data: profile } = await supabase
      .from('profiles').select('familia_id')
      .eq('id', session.user.id).single()
    if (!profile?.familia_id) { setLoading(false); return }
    const fid = profile.familia_id
    setFamiliaId(fid)

    // Esta tela é só do fluxo pessoal (fixas e lançamentos abaixo já usam empresa_id null),
    // então as contas/cartões também precisam excluir os que pertencem a uma empresa.
    const { data: contasData } = await supabase.from('contas').select('id, tipo')
      .eq('familia_id', fid).is('empresa_id', null)
    setContas(contasData || [])

    const { data: fixasData } = await supabase.from('despesas_fixas').select('*')
      .eq('familia_id', fid).eq('ativo', true).is('empresa_id', null)
    setDespesasFixas(fixasData || [])

    const inicio = dataLocalISO(new Date(hoje.getFullYear(), hoje.getMonth() - HISTORICO_MESES, 1))
    const fim = dataLocalISO(new Date(hoje.getFullYear(), hoje.getMonth() + HORIZONTE_MAX + 1, 0))
    const { data: lancData } = await supabase.from('lancamentos')
      .select('tipo, valor, categoria, data, conta_id, despesa_fixa_id')
      .eq('familia_id', fid).is('empresa_id', null)
      .gte('data', inicio).lte('data', fim)
    setLancamentos(lancData || [])

    setLoading(false)
  }

  const resultado: ResultadoPrevisao = useMemo(() => calcularPrevisao({
    hoje, horizonteMeses: horizonte, mesesHistorico: HISTORICO_MESES,
    lancamentos, despesasFixas, contas,
  }), [hoje, horizonte, lancamentos, despesasFixas, contas])

  // Sugere dezembro como mês padrão do simulador quando ele está dentro do horizonte —
  // é literalmente o caso de uso que deu origem a essa tela ("dá pra gastar com presentes de Natal?").
  useEffect(() => {
    if (!resultado.meses.length) return
    const dezembro = resultado.meses.find(m => m.mes === 11)
    const escolhido = dezembro || resultado.meses[0]
    setSimMesChave(prev => (prev && resultado.meses.some(m => m.chave === prev)) ? prev : escolhido.chave)
  }, [resultado.meses])

  const chartData = resultado.meses.map(m => ({
    chave: m.chave,
    label: `${MESES_ABREV[m.mes]}/${String(m.ano).slice(2)}`,
    saldo: Math.round(m.saldoMes),
    status: m.status,
  }))

  const piorMes = resultado.meses.reduce((pior, m) => (!pior || m.saldoMes < pior.saldoMes) ? m : pior, resultado.meses[0])
  const somaFolga = resultado.meses.reduce((s, m) => s + Math.max(m.saldoMes, 0), 0)

  const mesSimulado = resultado.meses.find(m => m.chave === simMesChave) || null
  const valorSimNum = parseFloat(simValor.replace(/\./g, '').replace(',', '.')) || 0
  const simResultado = mesSimulado ? simularGastoExtra(mesSimulado, valorSimNum) : null

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F7F9FB', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '13px', color: '#94A3B8' }}>Carregando previsão...</p>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#F7F9FB', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarClock size={16} color="#145A45" strokeWidth={1.85} />
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.4px', margin: 0 }}>Previsão financeira</h1>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 0' }}>
              Seu fluxo de caixa projetado — pra decidir com segurança se dá pra gastar mais em algum mês.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '4px' }}>
            {[3, 6, 12].map(n => (
              <button key={n} onClick={() => setHorizonte(n as 3 | 6 | 12)}
                style={{
                  padding: '7px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: 600,
                  backgroundColor: horizonte === n ? '#0E3B2E' : 'transparent',
                  color: horizonte === n ? '#fff' : '#64748B',
                }}
              >
                {n} meses
              </button>
            ))}
          </div>
        </div>

        {resultado.meses.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '13.5px', color: '#64748B' }}>Ainda não há dados suficientes pra projetar seus próximos meses.</p>
          </div>
        ) : (
          <>
            {/* Hero: gráfico de saldo mensal projetado */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '22px 24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 4px' }}>Saldo estimado por mês</p>
                  <p style={{ fontSize: '13px', color: '#334155', margin: 0, maxWidth: '520px', lineHeight: 1.5 }}>
                    {piorMes && piorMes.saldoMes < 0
                      ? <>Atenção: <strong>{MESES[piorMes.mes]} de {piorMes.ano}</strong> deve fechar no vermelho, em <strong style={{ color: COR_NEGATIVO }}>{fmtOculto(piorMes.saldoMes, ocultar)}</strong> se nada mudar.</>
                      : <>Somando os meses de folga do período, você deve conseguir guardar até <strong style={{ color: COR_POSITIVO }}>{fmtOculto(somaFolga, ocultar)}</strong> além do já comprometido.</>
                    }
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '14px', flexShrink: 0 }}>
                  {(['positivo', 'atencao', 'negativo'] as const).map(s => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: STATUS_CFG[s].cor }} />
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>{STATUS_CFG[s].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${v < 0 ? '-' : ''}${(Math.abs(v) / 1000).toFixed(0)}k`} />
                  <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1} />
                  <Tooltip
                    formatter={(v: any) => [fmt(Number(v)), 'Saldo do mês']}
                    labelFormatter={(label: any) => label}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="saldo" radius={[4, 4, 4, 4]} maxBarSize={36}>
                    {chartData.map((d, i) => <Cell key={i} fill={STATUS_CFG[d.status].cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cards por mês */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              {resultado.meses.map(m => {
                const cfg = STATUS_CFG[m.status]
                const pctFixo = m.despesaPrevista > 0 ? ((m.despesaConhecida + m.despesaFixaProjetada) / m.despesaPrevista) * 100 : 0
                return (
                  <div key={m.chave} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{MESES[m.mes]} {m.ano}</span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '999px',
                        backgroundColor: cfg.cor + '18', color: cfg.cor, fontSize: '11px', fontWeight: 600,
                      }}>
                        <cfg.Icon size={11} strokeWidth={2} /> {cfg.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>Receita prevista</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{fmtOculto(m.receitaPrevista, ocultar)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>Despesa prevista</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{fmtOculto(m.despesaPrevista, ocultar)}</span>
                    </div>

                    <div style={{ height: '5px', borderRadius: '3px', backgroundColor: '#FEF3C7', overflow: 'hidden', marginBottom: '2px', display: 'flex' }}>
                      <div style={{ width: `${pctFixo}%`, backgroundColor: '#94A3B8' }} />
                    </div>
                    <p style={{ fontSize: '10px', color: '#94A3B8', margin: '2px 0 12px' }}>
                      {Math.round(pctFixo)}% já é compromisso conhecido · resto é estimativa
                    </p>

                    <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>Saldo do mês</span>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: cfg.cor }}>{fmtOculto(m.saldoMes, ocultar)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Simulador */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '22px 24px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={16} color="#145A45" strokeWidth={1.85} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Dá pra gastar a mais?</h3>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 16px' }}>
                Simule um gasto extra num mês — por exemplo, presentes de Natal em dezembro — e veja o impacto no saldo projetado.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '6px' }}>Mês</label>
                  <select value={simMesChave} onChange={e => setSimMesChave(e.target.value)}
                    style={{ height: '44px', borderRadius: '12px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', padding: '0 12px', fontSize: '13px', color: '#0F172A', minWidth: '160px' }}>
                    {resultado.meses.map(m => (
                      <option key={m.chave} value={m.chave}>{MESES[m.mes]} {m.ano}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '6px' }}>Com o quê? (opcional)</label>
                  <input value={simDescricao} onChange={e => setSimDescricao(e.target.value)} placeholder="Ex: Presentes de Natal"
                    style={{ height: '44px', borderRadius: '12px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', padding: '0 14px', fontSize: '13px', color: '#0F172A', minWidth: '200px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: '6px' }}>Valor</label>
                  <div style={{ display: 'flex', alignItems: 'center', height: '44px', borderRadius: '12px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', padding: '0 14px', minWidth: '140px' }}>
                    <span style={{ fontSize: '12.5px', color: '#94A3B8', marginRight: '4px' }}>R$</span>
                    <input
                      inputMode="numeric" placeholder="0,00" value={simValor}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '')
                        const num = parseInt(digits || '0', 10)
                        setSimValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                      }}
                      style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '13px', fontWeight: 600, color: '#0F172A', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {mesSimulado && simResultado && valorSimNum > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '14px',
                  backgroundColor: STATUS_CFG[simResultado.status].cor + '12',
                  border: `1px solid ${STATUS_CFG[simResultado.status].cor}30`,
                }}>
                  {simResultado.status === 'negativo'
                    ? <TrendingDown size={20} color={COR_NEGATIVO} strokeWidth={1.85} />
                    : simResultado.status === 'atencao'
                    ? <AlertTriangle size={20} color={COR_ATENCAO} strokeWidth={1.85} />
                    : <CheckCircle2 size={20} color={COR_POSITIVO} strokeWidth={1.85} />
                  }
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {simResultado.status === 'negativo' && `Não cabe sem ajustar outra coisa`}
                      {simResultado.status === 'atencao' && `Cabe, mas fica apertado`}
                      {simResultado.status === 'positivo' && `Tranquilo, cabe no orçamento`}
                    </p>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                      Gastando {fmt(valorSimNum)}{simDescricao ? ` com ${simDescricao}` : ''} em {MESES[mesSimulado.mes]}, o saldo do mês
                      {' '}fica em <strong style={{ color: STATUS_CFG[simResultado.status].cor }}>{fmt(simResultado.saldoComExtra)}</strong>
                      {' '}(hoje a previsão é {fmt(mesSimulado.saldoMes)}).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Transparência: o que entra na conta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '18px' }}>
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Compromissos fixos considerados</h3>
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '0 0 14px' }}>Suas despesas e receitas fixas ativas, usadas todo mês na projeção.</p>
                {resultado.compromissosFixos.length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>Nenhuma despesa fixa cadastrada em Movimentos ainda.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {resultado.compromissosFixos.map(c => {
                      const Icon = ICONES_CAT[c.categoria] || MoreHorizontal
                      const cor = c.tipo === 'receita' ? COR_POSITIVO : '#64748B'
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: cor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={13} color={cor} strokeWidth={1.75} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{c.nome}</p>
                            <p style={{ fontSize: '10.5px', color: '#94A3B8', margin: 0 }}>Dia {c.dia_vencimento}{c.variavel ? ' · valor variável (média)' : ''}</p>
                          </div>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: cor }}>
                            {c.tipo === 'receita' ? '+' : '-'}{fmtOculto(c.valor, ocultar)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '18px' }}>
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Estimativa de receitas</h3>
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '0 0 14px' }}>Média real dos últimos {HISTORICO_MESES} meses, por origem — inclui salário lançado normalmente, sem precisar cadastrar como receita fixa.</p>
                {resultado.categoriasReceita.filter(c => c.mediaVariavel > 1).length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>Ainda não há histórico de receita suficiente pra estimar.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {resultado.categoriasReceita.filter(c => c.mediaVariavel > 1).slice(0, 8).map(c => {
                      const Icon = ICONES_CAT[c.categoria] || MoreHorizontal
                      return (
                        <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: COR_POSITIVO + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={13} color={COR_POSITIVO} strokeWidth={1.75} />
                          </div>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', flex: 1 }}>{c.categoria}</span>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: COR_POSITIVO }}>~{fmtOculto(c.mediaVariavel, ocultar)}/mês</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '18px', padding: '18px' }}>
                <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Estimativa de gastos variáveis</h3>
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '0 0 14px' }}>Média real dos últimos {HISTORICO_MESES} meses, por categoria — repetida em todos os meses futuros.</p>
                {resultado.categorias.filter(c => c.mediaVariavel > 1).length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>Ainda não há histórico suficiente pra estimar.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {resultado.categorias.filter(c => c.mediaVariavel > 1).slice(0, 8).map(c => {
                      const Icon = ICONES_CAT[c.categoria] || MoreHorizontal
                      return (
                        <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={13} color="#64748B" strokeWidth={1.75} />
                          </div>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', flex: 1 }}>{c.categoria}</span>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>~{fmtOculto(c.mediaVariavel, ocultar)}/mês</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '16px', padding: '14px 16px', borderRadius: '14px', backgroundColor: '#F8FAFC' }}>
              <Info size={14} color="#94A3B8" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                Esta previsão soma o que já está lançado (parcelas e compras no cartão com data futura), suas despesas e receitas
                fixas cadastradas em Movimentos, e uma estimativa de receita e de gasto variável baseada na sua média real dos
                últimos {HISTORICO_MESES} meses — inclusive salário lançado manualmente todo mês, sem precisar virar receita fixa.
                Não considera aportes em metas nem variações sazonais — quanto mais distante o mês, menos precisa tende a ser a estimativa.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
