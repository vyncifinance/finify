'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Plus, X, Save } from 'lucide-react'

function dataLocalISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export default function DiagnosticoPage() {
  const params = useParams()
  const router = useRouter()
  const consultoriaId = params.id as string

  const [loading, setLoading]     = useState(true)
  const [salvando, setSalvando]   = useState(false)
  const [nomeFamilia, setNomeFamilia] = useState('')

  const [receitaMedia, setReceitaMedia]   = useState('')
  const [despesaMedia, setDespesaMedia]   = useState('')
  const [maiorCategoria, setMaiorCategoria] = useState('')
  const [dizimoStatus, setDizimoStatus]   = useState('')
  const [pontosAtencao, setPontosAtencao] = useState<string[]>([''])
  const [acoes, setAcoes] = useState<{ descricao: string; prazo: string }[]>([{ descricao: '', prazo: '' }])

  const supabase = createClient()

  useEffect(() => { carregar() }, [consultoriaId])

  async function carregar() {
    setLoading(true)

    const { data: consultoria } = await supabase
      .from('consultorias').select('familia_id, familias(nome)').eq('id', consultoriaId).single()

    if (!consultoria) { setLoading(false); return }
    setNomeFamilia((consultoria.familias as any)?.nome || 'Família')
    const fid = consultoria.familia_id

    const { data: contasData } = await supabase.from('contas').select('id, tipo').eq('familia_id', fid)
    const idsCartoes = new Set((contasData || []).filter((c: any) => c.tipo === 'cartao_credito').map((c: any) => c.id))
    const contarComoDespesa = (l: any) => {
      if (l.categoria === 'Cartão de Crédito' && !idsCartoes.has(l.conta_id)) return false
      return true
    }

    const hoje60 = dataLocalISO(new Date(Date.now() - 60 * 86400000))
    const hoje   = dataLocalISO(new Date())
    const { data: lancBruto } = await supabase.from('lancamentos')
      .select('tipo, valor, categoria, conta_id')
      .eq('familia_id', fid).is('empresa_id', null)
      .gte('data', hoje60).lte('data', hoje)
    const lanc = (lancBruto || []).filter(contarComoDespesa)

    const totalReceita = lanc.filter((l: any) => l.tipo === 'receita').reduce((s: number, l: any) => s + Number(l.valor), 0)
    const totalDespesa  = lanc.filter((l: any) => l.tipo === 'despesa').reduce((s: number, l: any) => s + Number(l.valor), 0)
    // Janela de 60 dias ≈ 2 meses — divide pra chegar numa média mensal.
    setReceitaMedia((totalReceita / 2).toFixed(2))
    setDespesaMedia((totalDespesa / 2).toFixed(2))

    const porCategoria: Record<string, number> = {}
    lanc.filter((l: any) => l.tipo === 'despesa').forEach((l: any) => {
      porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + Number(l.valor)
    })
    const topCategoria = Object.entries(porCategoria).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
    if (topCategoria) setMaiorCategoria(topCategoria[0])

    setLoading(false)
  }

  function addPonto() { setPontosAtencao(prev => [...prev, '']) }
  function removerPonto(i: number) { setPontosAtencao(prev => prev.filter((_, idx) => idx !== i)) }
  function editarPonto(i: number, valor: string) {
    setPontosAtencao(prev => prev.map((p, idx) => idx === i ? valor : p))
  }

  function addAcao() { setAcoes(prev => [...prev, { descricao: '', prazo: '' }]) }
  function removerAcao(i: number) { setAcoes(prev => prev.filter((_, idx) => idx !== i)) }
  function editarAcao(i: number, campo: 'descricao' | 'prazo', valor: string) {
    setAcoes(prev => prev.map((a, idx) => idx === i ? { ...a, [campo]: valor } : a))
  }

  async function handleSalvar() {
    setSalvando(true)

    const pontosLimpos = pontosAtencao.map(p => p.trim()).filter(Boolean)
    const acoesLimpas  = acoes.filter(a => a.descricao.trim())

    const { error: erroDiag } = await supabase.from('diagnosticos').insert({
      consultoria_id: consultoriaId,
      receita_media: parseFloat(receitaMedia) || 0,
      despesa_media: parseFloat(despesaMedia) || 0,
      maior_categoria_gasto: maiorCategoria.trim() || null,
      dizimo_status: dizimoStatus || null,
      pontos_atencao: pontosLimpos,
    })

    if (erroDiag) { setSalvando(false); return }

    if (acoesLimpas.length > 0) {
      await supabase.from('planos_acao').insert(
        acoesLimpas.map(a => ({
          consultoria_id: consultoriaId,
          descricao: a.descricao.trim(),
          prazo: a.prazo || null,
          status: 'pendente',
        }))
      )
    }

    setSalvando(false)
    router.push(`/consultor/clientes/${consultoriaId}`)
  }

  const inputStyle = {
    height: '52px', borderRadius: '13px', border: '1.5px solid #E5E7EB',
    backgroundColor: '#FAFAFA', color: '#0F172A', padding: '0 16px', width: '100%',
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
      <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-3xl mx-auto">
        <button onClick={() => router.push(`/consultor/clientes/${consultoriaId}`)}
          className="flex items-center gap-1.5 text-sm font-medium mb-5"
          style={{ color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={15} strokeWidth={2} /> {nomeFamilia}
        </button>

        <h1 className="text-xl lg:text-2xl font-bold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>
          Novo diagnóstico
        </h1>
        <p className="text-sm mb-8" style={{ color: '#64748B' }}>
          {nomeFamilia} · valores calculados automaticamente dos últimos 60 dias
        </p>

        <div className="rounded-3xl p-5 lg:p-6 mb-6"
          style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label style={labelStyle}>Receita média (mensal)</label>
              <input type="number" step="0.01" value={receitaMedia} onChange={e => setReceitaMedia(e.target.value)}
                className="premium-input" style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
            <div>
              <label style={labelStyle}>Despesa média (mensal)</label>
              <input type="number" step="0.01" value={despesaMedia} onChange={e => setDespesaMedia(e.target.value)}
                className="premium-input" style={{ ...inputStyle, marginTop: '6px' }} />
            </div>
          </div>

          <div className="mb-5">
            <label style={labelStyle}>Maior categoria de gasto</label>
            <input type="text" value={maiorCategoria} onChange={e => setMaiorCategoria(e.target.value)}
              placeholder="Ex: Alimentação" className="premium-input" style={{ ...inputStyle, marginTop: '6px' }} />
          </div>

          <div>
            <label style={labelStyle}>Status do dízimo</label>
            <select value={dizimoStatus} onChange={e => setDizimoStatus(e.target.value)}
              className="premium-input" style={{ ...inputStyle, marginTop: '6px', cursor: 'pointer' }}>
              <option value="">Selecione</option>
              <option value="em_dia">Em dia</option>
              <option value="pendente">Pendente</option>
              <option value="nao_pratica">Não pratica</option>
            </select>
          </div>
        </div>

        {/* Pontos de atenção */}
        <div className="rounded-3xl p-5 lg:p-6 mb-6"
          style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Pontos de atenção</p>
            <button onClick={addPonto}
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Plus size={13} strokeWidth={2.5} /> Adicionar ponto
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {pontosAtencao.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={p} onChange={e => editarPonto(i, e.target.value)}
                  placeholder="Ex: Sem reserva de emergência" className="premium-input" style={{ ...inputStyle, height: '48px' }} />
                <button onClick={() => removerPonto(i)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#FEF2F2', border: 'none', cursor: 'pointer' }}>
                  <X size={14} color="#DC2626" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Plano de ação */}
        <div className="rounded-3xl p-5 lg:p-6 mb-8"
          style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Plano de ação</p>
            <button onClick={addAcao}
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#145A45', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Plus size={13} strokeWidth={2.5} /> Adicionar ação
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {acoes.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={a.descricao} onChange={e => editarAcao(i, 'descricao', e.target.value)}
                  placeholder="Ex: Criar reserva de emergência de 3 meses"
                  className="premium-input" style={{ ...inputStyle, height: '48px', flex: 1 }} />
                <input type="date" value={a.prazo} onChange={e => editarAcao(i, 'prazo', e.target.value)}
                  className="premium-input" style={{ ...inputStyle, height: '48px', width: '160px', flexShrink: 0 }} />
                <button onClick={() => removerAcao(i)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#FEF2F2', border: 'none', cursor: 'pointer' }}>
                  <X size={14} color="#DC2626" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleSalvar} disabled={salvando}
          className="btn-cta flex items-center justify-center gap-2 px-6 rounded-2xl text-sm font-semibold text-white w-full sm:w-auto"
          style={{
            background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
            boxShadow: '0 4px 16px rgba(11,59,46,0.3)', height: '52px',
            border: 'none', cursor: salvando ? 'default' : 'pointer', opacity: salvando ? 0.7 : 1,
          }}>
          <Save size={16} strokeWidth={2} />
          {salvando ? 'Salvando...' : 'Salvar diagnóstico'}
        </button>
      </div>
    </div>
  )
}
