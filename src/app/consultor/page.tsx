'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Users, CalendarClock, ListChecks, Plus, ArrowRight, Video, Phone, Presentation,
  X, Search, Check, Loader2
} from 'lucide-react'

const PLANOS = [
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'trimestral',  label: 'Trimestral'  },
  { value: 'dedicado',    label: 'Dedicado'    },
]

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

  const [modalOpen, setModalOpen]           = useState(false)
  const [buscaFamilia, setBuscaFamilia]     = useState('')
  const [resultados, setResultados]         = useState<{ id: string; nome: string }[]>([])
  const [buscando, setBuscando]             = useState(false)
  const [familiaSelecionada, setFamiliaSelecionada] = useState<{ id: string; nome: string } | null>(null)
  const [plano, setPlano]                   = useState('diagnostico')
  const [salvando, setSalvando]             = useState(false)
  const [erro, setErro]                     = useState('')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (!modalOpen) return
    const termo = buscaFamilia.trim()
    if (!termo) { setResultados([]); return }
    setBuscando(true)
    const timeout = setTimeout(async () => {
      const { data } = await supabase.from('familias').select('id, nome')
        .ilike('nome', `%${termo}%`).order('nome', { ascending: true }).limit(8)
      setResultados(data || [])
      setBuscando(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [buscaFamilia, modalOpen])

  function abrirModal() {
    setBuscaFamilia(''); setResultados([]); setFamiliaSelecionada(null)
    setPlano('diagnostico'); setErro(''); setModalOpen(true)
  }

  async function handleCriarConsultoria() {
    if (!familiaSelecionada) { setErro('Selecione uma família.'); return }
    setSalvando(true); setErro('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setErro('Sessão expirada, faça login de novo.'); setSalvando(false); return }

    const { data, error } = await supabase.from('consultorias').insert({
      familia_id: familiaSelecionada.id,
      consultor_id: session.user.id,
      plano, status: 'ativo',
    }).select('id').single()

    setSalvando(false)
    if (error) { setErro('Não foi possível criar. Talvez essa família já tenha uma consultoria ativa.'); return }
    setModalOpen(false)
    router.push(`/consultor/clientes/${data.id}`)
  }

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
          <button onClick={abrirModal}
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
        <button onClick={abrirModal}
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

      {/* Modal Nova Consultoria */}
      {modalOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#fff', borderRadius: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>Nova consultoria</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
              Família
            </label>

            {familiaSelecionada ? (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ border: '1.5px solid #D1FAE5', backgroundColor: '#F0FDF4' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #145A45 0%, #2F8F68 100%)', color: '#fff' }}>
                  {familiaSelecionada.nome[0]?.toUpperCase()}
                </div>
                <p className="flex-1 text-sm font-medium" style={{ color: '#0F172A' }}>{familiaSelecionada.nome}</p>
                <button onClick={() => { setFamiliaSelecionada(null); setBuscaFamilia('') }}
                  className="text-xs font-semibold" style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Trocar
                </button>
              </div>
            ) : (
              <div className="relative mb-4">
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={buscaFamilia} onChange={e => setBuscaFamilia(e.target.value)}
                  placeholder="Buscar família pelo nome..." autoFocus
                  className="premium-input"
                  style={{
                    width: '100%', height: '48px', borderRadius: '13px', border: '1.5px solid #E5E7EB',
                    backgroundColor: '#FAFAFA', color: '#0F172A', padding: '0 16px 0 40px',
                  }} />
                {(buscando || resultados.length > 0) && (
                  <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0', maxHeight: '200px', overflowY: 'auto' }}>
                    {buscando ? (
                      <div className="flex items-center justify-center gap-2 p-4">
                        <Loader2 size={14} color="#94A3B8" className="animate-spin" />
                        <span className="text-xs" style={{ color: '#94A3B8' }}>Buscando...</span>
                      </div>
                    ) : resultados.map(f => (
                      <button key={f.id} onClick={() => { setFamiliaSelecionada(f); setResultados([]) }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-left border-t first:border-t-0"
                        style={{ borderColor: '#F1F5F9', background: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F8FAFC' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}>
                        <span className="text-sm" style={{ color: '#0F172A' }}>{f.nome}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!buscando && buscaFamilia.trim() && resultados.length === 0 && (
                  <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Nenhuma família encontrada com esse nome.</p>
                )}
              </div>
            )}

            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748B', letterSpacing: '0.06em' }}>
              Plano
            </label>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {PLANOS.map(p => (
                <button key={p.value} onClick={() => setPlano(p.value)}
                  className="btn-soft py-2.5 rounded-xl text-xs font-semibold"
                  style={{
                    border: `1.5px solid ${plano === p.value ? '#2FB36A' : '#E5E7EB'}`,
                    backgroundColor: plano === p.value ? '#F0FDF4' : '#fff',
                    color: plano === p.value ? '#145A45' : '#64748B',
                    cursor: 'pointer',
                  }}>
                  {plano === p.value && <Check size={12} strokeWidth={3} className="inline mr-1" style={{ verticalAlign: '-1px' }} />}
                  {p.label}
                </button>
              ))}
            </div>

            {erro && (
              <p style={{ fontSize: '12.5px', color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '8px 12px', marginBottom: '14px' }}>
                {erro}
              </p>
            )}

            <button onClick={handleCriarConsultoria} disabled={salvando || !familiaSelecionada}
              className="btn-cta w-full h-12 rounded-xl text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
                opacity: (salvando || !familiaSelecionada) ? 0.6 : 1,
                border: 'none', cursor: (salvando || !familiaSelecionada) ? 'default' : 'pointer',
              }}>
              {salvando ? 'Criando...' : 'Criar consultoria'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
