'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Users, ChevronDown, ChevronRight } from 'lucide-react'
import { calcularAcompanhamento } from '@/lib/acompanhamento'
import IndicadorAcompanhamento from '@/components/IndicadorAcompanhamento'
import IndicadorSaudeFinanceira from '@/components/IndicadorSaudeFinanceira'

const PLANOS = [
  { value: 'todos',       label: 'Todos os planos' },
  { value: 'diagnostico', label: 'Diagnóstico'     },
  { value: 'trimestral',  label: 'Trimestral'      },
  { value: 'dedicado',    label: 'Dedicado'        },
]

const STATUS = [
  { value: 'todos',     label: 'Todos os status' },
  { value: 'ativo',     label: 'Ativo'    },
  { value: 'pausado',   label: 'Pausado'  },
  { value: 'encerrado', label: 'Encerrado'},
  { value: 'graduado',  label: 'Graduado' },
]

const STATUS_COR: Record<string, { cor: string; bg: string }> = {
  ativo:     { cor: '#059669', bg: '#D1FAE5' },
  pausado:   { cor: '#D97706', bg: '#FEF3C7' },
  encerrado: { cor: '#6B7280', bg: '#F1F5F9' },
  graduado:  { cor: '#2FB36A', bg: '#F0FDF4' },
}

function fmtData(dataStr?: string | null) {
  if (!dataStr) return '—'
  const d = new Date(dataStr + 'T12:00:00')
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ConsultorClientesPage() {
  const [loading, setLoading]           = useState(true)
  const [consultorias, setConsultorias] = useState<any[]>([])
  const [ultimaSessaoPorConsultoria, setUltimaSessaoPorConsultoria] = useState<Record<string, string>>({})
  const [acoesPorConsultoria, setAcoesPorConsultoria] = useState<Record<string, { total: number; concluidas: number }>>({})
  const [saudePorFamilia, setSaudePorFamilia] = useState<Record<string, number | null>>({})
  const [filtroPlano, setFiltroPlano]   = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)

    const { data: consultoriasData } = await supabase
      .from('consultorias')
      .select('id, plano, status, data_inicio, familia_id, familias(nome)')
      .order('created_at', { ascending: false })
    setConsultorias(consultoriasData || [])

    const { data: sessoesRealizadas } = await supabase
      .from('sessoes')
      .select('consultoria_id, data_sessao')
      .eq('status', 'realizada')
      .order('data_sessao', { ascending: false })

    const ultimas: Record<string, string> = {}
    for (const s of sessoesRealizadas || []) {
      if (!ultimas[s.consultoria_id]) ultimas[s.consultoria_id] = s.data_sessao
    }
    setUltimaSessaoPorConsultoria(ultimas)

    const { data: planosData } = await supabase.from('planos_acao').select('consultoria_id, status')
    const acoes: Record<string, { total: number; concluidas: number }> = {}
    for (const p of planosData || []) {
      if (!acoes[p.consultoria_id]) acoes[p.consultoria_id] = { total: 0, concluidas: 0 }
      acoes[p.consultoria_id].total++
      if (p.status === 'concluida') acoes[p.consultoria_id].concluidas++
    }
    setAcoesPorConsultoria(acoes)

    const { data: saudeData } = await supabase.from('saude_financeira_familia')
      .select('familia_id, percentual_comprometido')
    const saude: Record<string, number | null> = {}
    for (const s of saudeData || []) saude[s.familia_id] = s.percentual_comprometido
    setSaudePorFamilia(saude)

    setLoading(false)
  }

  const filtradas = consultorias.filter(c => {
    if (filtroPlano !== 'todos' && c.plano !== filtroPlano) return false
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false
    return true
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            Clientes
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {filtradas.length} {filtradas.length === 1 ? 'consultoria' : 'consultorias'}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <select value={filtroPlano} onChange={e => setFiltroPlano(e.target.value)}
              className="premium-input w-full appearance-none text-sm font-medium"
              style={{
                height: '46px', borderRadius: '13px', padding: '0 36px 0 16px',
                border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', color: '#0F172A',
                cursor: 'pointer',
              }}>
              {PLANOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <ChevronDown size={15} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="premium-input w-full appearance-none text-sm font-medium"
              style={{
                height: '46px', borderRadius: '13px', padding: '0 36px 0 16px',
                border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', color: '#0F172A',
                cursor: 'pointer',
              }}>
              {STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={15} color="#94A3B8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-3xl overflow-hidden"
          style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: '#94A3B8' }}>Carregando...</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#F7F8FA' }}>
                <Users size={20} color="#94A3B8" strokeWidth={1.75} />
              </div>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma consultoria encontrada.</p>
            </div>
          ) : filtradas.map((c: any) => {
            const nomeFamilia = c.familias?.nome || 'Família'
            const statusCor = STATUS_COR[c.status] || { cor: '#6B7280', bg: '#F1F5F9' }
            const ultimaSessao = ultimaSessaoPorConsultoria[c.id]
            const acoes = acoesPorConsultoria[c.id] || { total: 0, concluidas: 0 }
            const acompanhamento = calcularAcompanhamento({
              ultimaSessaoRealizada: ultimaSessao || null,
              totalAcoes: acoes.total,
              acoesConcluidas: acoes.concluidas,
            })
            return (
              <button key={c.id} onClick={() => router.push(`/consultor/clientes/${c.id}`)}
                className="flex items-center gap-4 px-5 lg:px-6 py-4 border-t transition-all w-full text-left"
                style={{ borderColor: '#F1F5F9', cursor: 'pointer', background: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FAFBFC' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', color: '#fff' }}>
                  {nomeFamilia[0]?.toUpperCase() || 'F'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{nomeFamilia}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    Última sessão: {fmtData(ultimaSessao)}
                  </p>
                </div>

                <span className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-full capitalize flex-shrink-0"
                  style={{ border: '1.5px solid #E5E7EB', color: '#64748B', backgroundColor: 'transparent' }}>
                  {c.plano}
                </span>

                <span className="text-xs font-semibold px-3 py-1.5 rounded-full capitalize flex-shrink-0"
                  style={{ color: statusCor.cor, backgroundColor: statusCor.bg }}>
                  {c.status}
                </span>

                <div className="hidden lg:block flex-shrink-0" style={{ width: '120px' }}>
                  <IndicadorSaudeFinanceira percentual={saudePorFamilia[c.familia_id] ?? null} variant="compact" />
                </div>

                <div className="hidden md:block flex-shrink-0" style={{ width: '160px' }}>
                  <IndicadorAcompanhamento resultado={acompanhamento} size="sm" />
                </div>

                <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} className="flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
