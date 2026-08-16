'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CalendarClock, ChevronDown, ChevronRight, CheckCircle2, Clock } from 'lucide-react'

const TIPOS = [
  { value: 'todos',        label: 'Todos os tipos' },
  { value: 'diagnostico',  label: 'Diagnóstico'    },
  { value: 'organizacao',  label: 'Organização'    },
  { value: 'ajuste',       label: 'Ajuste'         },
  { value: 'consolidacao', label: 'Consolidação'   },
  { value: 'mensal',       label: 'Mensal'         },
]

const STATUS = [
  { value: 'todos',     label: 'Todos os status' },
  { value: 'agendada',  label: 'Agendada'        },
  { value: 'realizada', label: 'Realizada'       },
]

function fmtData(dataStr: string) {
  const d = new Date(dataStr + 'T12:00:00')
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function tipoLabel(v: string) {
  return TIPOS.find(t => t.value === v)?.label || v
}

export default function ConsultorSessoesPage() {
  const [loading, setLoading]     = useState(true)
  const [sessoes, setSessoes]     = useState<any[]>([])
  const [filtroTipo, setFiltroTipo]     = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('sessoes')
      .select('id, tipo, data_sessao, status, consultoria_id, consultorias(familia_id, familias(nome))')
      .order('data_sessao', { ascending: false })
    setSessoes(data || [])
    setLoading(false)
  }

  const filtradas = sessoes.filter(s => {
    if (filtroTipo !== 'todos' && s.tipo !== filtroTipo) return false
    if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false
    return true
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            Sessões
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {filtradas.length} {filtradas.length === 1 ? 'sessão' : 'sessões'}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="premium-input w-full appearance-none text-sm font-medium"
              style={{
                height: '46px', borderRadius: '13px', padding: '0 36px 0 16px',
                border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', color: '#0F172A',
                cursor: 'pointer',
              }}>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
                <CalendarClock size={20} color="#94A3B8" strokeWidth={1.75} />
              </div>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma sessão encontrada.</p>
            </div>
          ) : filtradas.map((s: any) => {
            const nomeFamilia = s.consultorias?.familias?.nome || 'Família'
            const realizada = s.status === 'realizada'
            return (
              <button key={s.id}
                onClick={() => router.push(`/consultor/clientes/${s.consultoria_id}/sessoes/${s.id}`)}
                className="flex items-center gap-4 px-5 lg:px-6 py-4 border-t transition-all w-full text-left"
                style={{ borderColor: '#F1F5F9', cursor: 'pointer', background: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FAFBFC' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(20,90,69,0.08)' }}>
                  <CalendarClock size={15} color="#145A45" strokeWidth={1.75} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{nomeFamilia}</p>
                  <p className="text-xs mt-0.5 capitalize" style={{ color: '#94A3B8' }}>
                    {tipoLabel(s.tipo)} · {fmtData(s.data_sessao)}
                  </p>
                </div>

                <span className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
                  style={{
                    color: realizada ? '#059669' : '#D97706',
                    backgroundColor: realizada ? '#D1FAE5' : '#FEF3C7',
                  }}>
                  {realizada ? <CheckCircle2 size={12} strokeWidth={2.5} /> : <Clock size={12} strokeWidth={2.5} />}
                  {realizada ? 'Realizada' : 'Agendada'}
                </span>

                <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} className="flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
