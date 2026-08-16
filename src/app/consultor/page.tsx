'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users, CalendarClock, ListChecks, Plus, ArrowRight, Video, Phone, Presentation
} from 'lucide-react'

const TIPO_ICONE: Record<string, any> = {
  online: Video,
  presencial: Presentation,
  ligacao: Phone,
}

function dataLocalISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function fmtDataSessao(dataStr: string) {
  const d = new Date(dataStr + 'T12:00:00')
  return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export default function ConsultorDashboardPage() {
  const [loading, setLoading]           = useState(true)
  const [clientesAtivos, setClientesAtivos] = useState(0)
  const [sessoesSemana, setSessoesSemana]   = useState<any[]>([])
  const [acoesPendentes, setAcoesPendentes] = useState(0)

  const supabase = createClient()

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)

    const hoje    = dataLocalISO(new Date())
    const em7dias = dataLocalISO(new Date(Date.now() + 7 * 86400000))

    const { count: countAtivos } = await supabase
      .from('consultorias').select('id', { count: 'exact', head: true })
      .eq('status', 'ativo')
    setClientesAtivos(countAtivos || 0)

    const { count: countAcoes } = await supabase
      .from('planos_acao').select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
    setAcoesPendentes(countAcoes || 0)

    const { data: sessoesData } = await supabase
      .from('sessoes')
      .select('id, tipo, data_sessao, status, consultorias(familia_id, familias(nome))')
      .eq('status', 'agendada')
      .gte('data_sessao', hoje)
      .lte('data_sessao', em7dias)
      .order('data_sessao', { ascending: true })
    setSessoesSemana(sessoesData || [])

    setLoading(false)
  }

  const kpis = [
    { label: 'Clientes ativos',      val: clientesAtivos,          Icon: Users,        cor: '#145A45', bg: '#F0FDF4' },
    { label: 'Sessões desta semana', val: sessoesSemana.length,    Icon: CalendarClock,cor: '#2FB36A', bg: '#F0FDF4' },
    { label: 'Ações pendentes',      val: acoesPendentes,          Icon: ListChecks,   cor: '#B7791F', bg: '#FFFBEB' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
              Dashboard do Consultor
            </h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              Visão geral das consultorias ativas
            </p>
          </div>
          <button
            className="btn-cta hidden lg:flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
              boxShadow: '0 4px 16px rgba(11,59,46,0.3)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Nova consultoria
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {kpis.map(k => (
            <div key={k.label} className="rounded-3xl p-5"
              style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: k.bg }}>
                <k.Icon size={18} color={k.cor} strokeWidth={1.75} />
              </div>
              <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
                {loading ? '...' : k.val}
              </p>
            </div>
          ))}
        </div>

        {/* Botão mobile */}
        <button
          className="btn-cta lg:hidden w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold text-white mb-8"
          style={{
            background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
            boxShadow: '0 4px 16px rgba(11,59,46,0.3)',
            border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={16} strokeWidth={2} />
          Nova consultoria
        </button>

        {/* Sessões da semana */}
        <div className="rounded-3xl overflow-hidden"
          style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b" style={{ borderColor: '#F1F5F9' }}>
            <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Sessões da semana</p>
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#145A45' }}>
              Ver todas <ArrowRight size={13} strokeWidth={2} />
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: '#94A3B8' }}>Carregando...</p>
            </div>
          ) : sessoesSemana.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#F7F8FA' }}>
                <CalendarClock size={20} color="#94A3B8" strokeWidth={1.75} />
              </div>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhuma sessão agendada nos próximos 7 dias.</p>
            </div>
          ) : sessoesSemana.map((s: any) => {
            const Icon = TIPO_ICONE[s.tipo] || CalendarClock
            const nomeFamilia = s.consultorias?.familias?.nome || 'Família'
            return (
              <div key={s.id} className="flex items-center gap-3 px-5 lg:px-6 py-4 border-t" style={{ borderColor: '#F1F5F9' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(20,90,69,0.08)' }}>
                  <Icon size={15} color="#145A45" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{nomeFamilia}</p>
                  <p className="text-xs capitalize" style={{ color: '#94A3B8' }}>{s.tipo}</p>
                </div>
                <span className="text-xs font-semibold flex-shrink-0 capitalize" style={{ color: '#64748B' }}>
                  {fmtDataSessao(s.data_sessao)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
