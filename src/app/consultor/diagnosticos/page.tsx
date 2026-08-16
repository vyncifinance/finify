'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Stethoscope, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

const DIZIMO_STATUS = [
  { value: 'todos',       label: 'Todos os status' },
  { value: 'em_dia',      label: 'Em dia'          },
  { value: 'pendente',    label: 'Pendente'        },
  { value: 'nao_pratica', label: 'Não pratica'     },
]

const DIZIMO_LABEL: Record<string, { label: string; cor: string; bg: string }> = {
  em_dia:      { label: 'Em dia',      cor: '#059669', bg: '#D1FAE5' },
  pendente:    { label: 'Pendente',    cor: '#D97706', bg: '#FEF3C7' },
  nao_pratica: { label: 'Não pratica', cor: '#6B7280', bg: '#F1F5F9' },
}

function fmt(val: number) {
  return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtData(dataStr: string) {
  const d = new Date(dataStr)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ConsultorDiagnosticosPage() {
  const [loading, setLoading]         = useState(true)
  const [diagnosticos, setDiagnosticos] = useState<any[]>([])
  const [filtroDizimo, setFiltroDizimo] = useState('todos')

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('diagnosticos')
      .select('id, receita_media, despesa_media, maior_categoria_gasto, dizimo_status, pontos_atencao, created_at, consultoria_id, consultorias(familia_id, familias(nome))')
      .order('created_at', { ascending: false })
    setDiagnosticos(data || [])
    setLoading(false)
  }

  const filtrados = diagnosticos.filter(d => {
    if (filtroDizimo !== 'todos' && d.dizimo_status !== filtroDizimo) return false
    return true
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
            Diagnósticos
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            {filtrados.length} {filtrados.length === 1 ? 'diagnóstico registrado' : 'diagnósticos registrados'}
          </p>
        </div>

        {/* Filtro */}
        <div className="flex mb-6">
          <div className="relative w-full sm:w-56">
            <select value={filtroDizimo} onChange={e => setFiltroDizimo(e.target.value)}
              className="premium-input w-full appearance-none text-sm font-medium"
              style={{
                height: '46px', borderRadius: '13px', padding: '0 36px 0 16px',
                border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', color: '#0F172A',
                cursor: 'pointer',
              }}>
              {DIZIMO_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
          ) : filtrados.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#F7F8FA' }}>
                <Stethoscope size={20} color="#94A3B8" strokeWidth={1.75} />
              </div>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum diagnóstico encontrado.</p>
            </div>
          ) : filtrados.map((d: any) => {
            const nomeFamilia = d.consultorias?.familias?.nome || 'Família'
            const dizimoCfg = DIZIMO_LABEL[d.dizimo_status] || null
            return (
              <button key={d.id} onClick={() => router.push(`/consultor/clientes/${d.consultoria_id}`)}
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
                    {fmtData(d.created_at)} · Receita {fmt(d.receita_media)} · Despesa {fmt(d.despesa_media)}
                  </p>
                </div>

                {d.pontos_atencao?.length > 0 && (
                  <span className="hidden sm:flex items-center gap-1 text-xs flex-shrink-0" style={{ color: '#B7791F' }}>
                    <AlertTriangle size={12} strokeWidth={2} /> {d.pontos_atencao.length}
                  </span>
                )}

                {dizimoCfg && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0"
                    style={{ color: dizimoCfg.cor, backgroundColor: dizimoCfg.bg }}>
                    {dizimoCfg.label}
                  </span>
                )}

                <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} className="flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
