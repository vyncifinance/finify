'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Save } from 'lucide-react'

const TIPOS = [
  { value: 'diagnostico',   label: 'Diagnóstico'   },
  { value: 'organizacao',   label: 'Organização'   },
  { value: 'ajuste',        label: 'Ajuste'        },
  { value: 'consolidacao',  label: 'Consolidação'  },
  { value: 'mensal',        label: 'Mensal'        },
]

function dataLocalISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function NovaSessaoPage() {
  const params = useParams()
  const router = useRouter()
  const consultoriaId = params.id as string

  const [loading, setLoading]     = useState(true)
  const [salvando, setSalvando]   = useState(false)
  const [nomeFamilia, setNomeFamilia] = useState('')

  const [tipo, setTipo]                 = useState('mensal')
  const [dataSessao, setDataSessao]     = useState(() => dataLocalISO(new Date()))
  const [resumo, setResumo]             = useState('')
  const [proximosPassos, setProximosPassos] = useState('')

  const supabase = createClient()

  useEffect(() => { carregar() }, [consultoriaId])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('consultorias').select('familias(nome)').eq('id', consultoriaId).single()
    setNomeFamilia((data?.familias as any)?.nome || 'Família')
    setLoading(false)
  }

  async function handleSalvar() {
    if (!dataSessao) return
    setSalvando(true)
    const { error } = await supabase.from('sessoes').insert({
      consultoria_id: consultoriaId,
      tipo, data_sessao: dataSessao, status: 'realizada',
      resumo: resumo.trim() || null,
      proximos_passos: proximosPassos.trim() || null,
    })
    setSalvando(false)
    if (!error) router.push(`/consultor/clientes/${consultoriaId}`)
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-2xl mx-auto">
        <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}`)}
          className="flex items-center gap-1.5 text-sm font-medium mb-5"
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={15} strokeWidth={2} /> {nomeFamilia}
        </button>

        <h1 className="text-xl lg:text-2xl font-bold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
          Registrar sessão
        </h1>
        <p className="text-sm mb-8" style={{ color: '#64748B' }}>{nomeFamilia}</p>

        <div className="rounded-3xl p-5 lg:p-6 mb-8 flex flex-col gap-5"
          style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Tipo de sessão</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="premium-input" style={{ ...inputStyle, marginTop: '6px', cursor: 'pointer' }}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data da sessão</label>
              <input type="date" value={dataSessao} onChange={e => setDataSessao(e.target.value)}
                className="premium-input" style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Resumo</label>
            <textarea value={resumo} onChange={e => setResumo(e.target.value)} rows={4}
              placeholder="O que foi conversado nessa sessão?"
              className="premium-input" style={{ ...textareaStyle, marginTop: '6px', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div>
            <label style={labelStyle}>Próximos passos</label>
            <textarea value={proximosPassos} onChange={e => setProximosPassos(e.target.value)} rows={3}
              placeholder="O que fica combinado para a próxima sessão?"
              className="premium-input" style={{ ...textareaStyle, marginTop: '6px', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>

        <button onClick={handleSalvar} disabled={salvando || !dataSessao}
          className="btn-cta flex items-center justify-center gap-2 px-6 rounded-2xl text-sm font-semibold text-white w-full sm:w-auto"
          style={{
            background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
            boxShadow: '0 4px 16px rgba(11,59,46,0.3)', height: '52px',
            border: 'none', cursor: (salvando || !dataSessao) ? 'default' : 'pointer',
            opacity: (salvando || !dataSessao) ? 0.7 : 1,
          }}>
          <Save size={16} strokeWidth={2} />
          {salvando ? 'Salvando...' : 'Salvar sessão'}
        </button>
      </div>
    </div>
  )
}
