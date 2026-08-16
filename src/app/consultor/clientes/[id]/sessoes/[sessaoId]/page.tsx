'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Pencil, Save, Calendar } from 'lucide-react'

const TIPOS = [
  { value: 'diagnostico',   label: 'Diagnóstico'   },
  { value: 'organizacao',   label: 'Organização'   },
  { value: 'ajuste',        label: 'Ajuste'        },
  { value: 'consolidacao',  label: 'Consolidação'  },
  { value: 'mensal',        label: 'Mensal'        },
]

const STATUS_LABEL: Record<string, string> = {
  agendada: 'Agendada',
  realizada: 'Realizada',
}

function formatData(dataStr: string) {
  const d = new Date(dataStr + 'T12:00:00')
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function tipoLabel(v: string) {
  return TIPOS.find(t => t.value === v)?.label || v
}

export default function SessaoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const consultoriaId = params.id as string
  const sessaoId = params.sessaoId as string

  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [nomeFamilia, setNomeFamilia] = useState('')
  const [sessao, setSessao]     = useState<any>(null)

  const [tipo, setTipo]                 = useState('mensal')
  const [dataSessao, setDataSessao]     = useState('')
  const [status, setStatus]             = useState('agendada')
  const [resumo, setResumo]             = useState('')
  const [proximosPassos, setProximosPassos] = useState('')

  const supabase = createClient()

  useEffect(() => { carregar() }, [sessaoId])

  async function carregar() {
    setLoading(true)
    const { data: consultoria } = await supabase.from('consultorias').select('familias(nome)').eq('id', consultoriaId).single()
    setNomeFamilia((consultoria?.familias as any)?.nome || 'Família')

    const { data } = await supabase.from('sessoes').select('*').eq('id', sessaoId).single()
    if (data) {
      setSessao(data)
      setTipo(data.tipo)
      setDataSessao(data.data_sessao)
      setStatus(data.status)
      setResumo(data.resumo || '')
      setProximosPassos(data.proximos_passos || '')
    }
    setLoading(false)
  }

  async function handleSalvar() {
    setSalvando(true)
    const { error } = await supabase.from('sessoes').update({
      tipo, data_sessao: dataSessao, status,
      resumo: resumo.trim() || null,
      proximos_passos: proximosPassos.trim() || null,
    }).eq('id', sessaoId)
    setSalvando(false)
    if (!error) {
      setEditando(false)
      await carregar()
    }
  }

  const inputStyle = {
    height: '52px', borderRadius: '13px', border: '1.5px solid #E5E7EB',
    backgroundColor: '#FAFAFA', color: '#0F172A', padding: '0 16px', width: '100%',
  }
  const textareaStyle = {
    borderRadius: '13px', border: '1.5px solid #E5E7EB',
    backgroundColor: '#FAFAFA', color: '#0F172A', padding: '14px 16px', width: '100%',
  }
  const labelStyle = { fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Carregando...</p>
      </div>
    )
  }

  if (!sessao) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Sessão não encontrada.</p>
        <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}`)} className="text-sm font-semibold" style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-2xl mx-auto">
        <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}`)}
          className="flex items-center gap-1.5 text-sm font-medium mb-5"
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={15} strokeWidth={2} /> {nomeFamilia}
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
              Sessão de {tipoLabel(sessao.tipo)}
            </h1>
            <div className="flex items-center gap-2">
              <Calendar size={13} color="#94A3B8" strokeWidth={1.75} />
              <p className="text-sm" style={{ color: '#64748B' }}>{formatData(sessao.data_sessao)} · {STATUS_LABEL[sessao.status] || sessao.status}</p>
            </div>
          </div>
          {!editando && (
            <button onClick={() => setEditando(true)}
              className="btn-soft flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: '#F0FDF4', color: '#145A45', border: '1px solid #D1FAE5', cursor: 'pointer' }}>
              <Pencil size={14} strokeWidth={2} /> Editar
            </button>
          )}
        </div>

        {!editando ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl p-5 lg:p-6" style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>Resumo</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: sessao.resumo ? '#334155' : '#94A3B8' }}>
                {sessao.resumo || 'Nenhum resumo registrado.'}
              </p>
            </div>
            <div className="rounded-3xl p-5 lg:p-6" style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>Próximos passos</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: sessao.proximos_passos ? '#334155' : '#94A3B8' }}>
                {sessao.proximos_passos || 'Nenhum próximo passo registrado.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl p-5 lg:p-6 mb-8 flex flex-col gap-5"
              style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)}
                    className="premium-input" style={{ ...inputStyle, marginTop: '6px', cursor: 'pointer' }}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Data</label>
                  <input type="date" value={dataSessao} onChange={e => setDataSessao(e.target.value)}
                    className="premium-input" style={{ ...inputStyle, marginTop: '6px' }} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="premium-input" style={{ ...inputStyle, marginTop: '6px', cursor: 'pointer' }}>
                    <option value="agendada">Agendada</option>
                    <option value="realizada">Realizada</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Resumo</label>
                <textarea value={resumo} onChange={e => setResumo(e.target.value)} rows={4}
                  className="premium-input" style={{ ...textareaStyle, marginTop: '6px', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={labelStyle}>Próximos passos</label>
                <textarea value={proximosPassos} onChange={e => setProximosPassos(e.target.value)} rows={3}
                  className="premium-input" style={{ ...textareaStyle, marginTop: '6px', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSalvar} disabled={salvando}
                className="btn-cta flex items-center justify-center gap-2 px-6 rounded-2xl text-sm font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
                  boxShadow: '0 4px 16px rgba(11,59,46,0.3)', height: '52px',
                  border: 'none', cursor: salvando ? 'default' : 'pointer', opacity: salvando ? 0.7 : 1,
                }}>
                <Save size={16} strokeWidth={2} />
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button onClick={() => { setEditando(false); carregar() }}
                className="btn-soft px-6 rounded-2xl text-sm font-semibold"
                style={{ height: '52px', color: '#64748B', border: '1.5px solid #E5E7EB', backgroundColor: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
