'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useOcultarValores, fmtOculto } from '@/hooks/useOcultarValores'
import {
  Home, Car, Wallet, MoreHorizontal, Plus, X, Pencil, Trash2,
  TrendingDown, PiggyBank, Building2
} from 'lucide-react'

const TIPOS = [
  { key: 'imovel',  label: 'Imóvel',   Icon: Home },
  { key: 'veiculo', label: 'Veículo',  Icon: Car },
  { key: 'caixa',   label: 'Caixa',    Icon: Wallet },
  { key: 'outro',   label: 'Outro',    Icon: MoreHorizontal },
]

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PatrimonioPage() {
  const [loading, setLoading]     = useState(true)
  const [familiaId, setFamiliaId] = useState('')
  const [userId, setUserId]       = useState('')
  const [bens, setBens]           = useState<any[]>([])
  const [isMobile, setIsMobile]   = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando]   = useState<any>(null)
  const [nome, setNome]           = useState('')
  const [tipo, setTipo]           = useState('imovel')
  const [valor, setValor]         = useState('')
  const [ehDivida, setEhDivida]   = useState(false)
  const [salvando, setSalvando]   = useState(false)
  const [deletando, setDeletando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const ocultar  = useOcultarValores()
  const supabase = createClient()

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024)
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    setUserId(session.user.id)
    const { data: profile } = await supabase.from('profiles').select('familia_id').eq('id', session.user.id).single()
    if (profile) {
      setFamiliaId(profile.familia_id)
      await carregar(profile.familia_id)
    }
    setLoading(false)
  }

  async function carregar(fid: string) {
    const { data } = await supabase.from('bens').select('*').eq('familia_id', fid).order('created_at', { ascending: false })
    if (data) setBens(data)
  }

  function abrirNovo() {
    setEditando(null); setNome(''); setTipo('imovel'); setValor(''); setEhDivida(false)
    setConfirmDelete(false); setModalOpen(true)
  }

  function abrirEditar(b: any) {
    setEditando(b); setNome(b.nome); setTipo(b.tipo)
    setValor(Number(b.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
    setEhDivida(!!b.eh_divida)
    setConfirmDelete(false); setModalOpen(true)
  }

  async function handleSalvar() {
    if (!nome.trim() || !valor) return
    setSalvando(true)
    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.'))

    if (editando) {
      const { error } = await supabase.from('bens').update({
        nome: nome.trim(), tipo, valor: valorNum, eh_divida: ehDivida,
      }).eq('id', editando.id)
      if (!error) { setModalOpen(false); await carregar(familiaId) }
    } else {
      const { error } = await supabase.from('bens').insert({
        familia_id: familiaId, user_id: userId, nome: nome.trim(), tipo, valor: valorNum, eh_divida: ehDivida,
      })
      if (!error) { setModalOpen(false); await carregar(familiaId) }
    }
    setSalvando(false)
  }

  async function handleDeletar() {
    if (!editando) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('bens').delete().eq('id', editando.id)
    setDeletando(false)
    if (!error) {
      setBens(prev => prev.filter(b => b.id !== editando.id))
      setModalOpen(false)
    }
  }

  const ativos      = bens.filter(b => !b.eh_divida)
  const dividas      = bens.filter(b => b.eh_divida)
  const totalAtivos  = ativos.reduce((s, b) => s + Number(b.valor), 0)
  const totalDividas = dividas.reduce((s, b) => s + Number(b.valor), 0)
  const patrimonioLiquido = totalAtivos - totalDividas

  const grupos = TIPOS.map(t => ({
    ...t,
    itens: ativos.filter(b => b.tipo === t.key),
    total: ativos.filter(b => b.tipo === t.key).reduce((s, b) => s + Number(b.valor), 0),
  })).filter(g => g.itens.length > 0)

  const modalContent = (
    <>
      {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0B3B2E', margin: 0, letterSpacing: '-0.3px' }}>
          {editando ? 'Editar bem' : 'Novo bem'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editando && (
            <button onClick={handleDeletar} disabled={deletando}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: confirmDelete ? '#EF4444' : 'rgba(239,68,68,0.10)', color: confirmDelete ? '#fff' : '#DC2626' }}>
              <Trash2 size={13} strokeWidth={2} />
              {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
            </button>
          )}
          <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div style={{ padding: '18px 24px 8px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Nome</p>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Apartamento centro"
          style={{ width: '100%', height: '52px', padding: '0 16px', borderRadius: '14px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', fontSize: '14px', color: '#111827', marginBottom: '16px', boxSizing: 'border-box' }} />

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Tipo</p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {TIPOS.map(t => {
            const ativo = tipo === t.key
            return (
              <button key={t.key} onClick={() => setTipo(t.key)}
                style={{ padding: '8px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: ativo ? '1.5px solid #2FB36A' : '1.5px solid #E5E7EB', backgroundColor: ativo ? '#F0FDF4' : '#fff', color: ativo ? '#0B3B2E' : '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <t.Icon size={14} strokeWidth={1.75} color={ativo ? '#2FB36A' : '#94A3B8'} />
                {t.label}
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Valor</p>
        <input
          type="text" inputMode="numeric" value={valor}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            const num = parseInt(digits || '0', 10)
            setValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
          }}
          placeholder="0,00"
          style={{ width: '100%', height: '52px', padding: '0 16px', borderRadius: '14px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', fontSize: '14px', color: '#111827', marginBottom: '10px', boxSizing: 'border-box' }} />

        <button onClick={() => setEhDivida(!ehDivida)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '12px', border: ehDivida ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB', backgroundColor: ehDivida ? 'rgba(239,68,68,0.06)' : '#FAFAFA', cursor: 'pointer', marginBottom: '16px', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: ehDivida ? '#EF4444' : '#E2E8F0', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: ehDivida ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: ehDivida ? '#DC2626' : '#111827', margin: 0 }}>É uma dívida</p>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
              {ehDivida ? 'Esse valor será descontado do patrimônio líquido' : 'Financiamento, empréstimo, saldo devedor...'}
            </p>
          </div>
        </button>
      </div>

      <div style={{ padding: '14px 24px 24px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
        <button onClick={handleSalvar} disabled={salvando || !nome.trim() || !valor}
          style={{
            width: '100%', height: '56px', borderRadius: '16px', border: 'none', fontSize: '15px', fontWeight: 700, color: '#fff',
            cursor: salvando || !nome.trim() || !valor ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)',
            boxShadow: '0 4px 16px rgba(11,59,46,0.3)',
            opacity: salvando || !nome.trim() || !valor ? 0.6 : 1,
          }}>
          {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Adicionar bem'}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '100px' }}>
        <div style={{ background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', padding: '20px 20px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>Patrimônio</h1>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Bens, investimentos e dívidas</p>
            </div>
            <button onClick={abrirNovo}
              style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Plus size={18} color="#fff" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div style={{ padding: '0 16px', marginTop: '-20px' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Patrimônio líquido</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.5px', margin: 0 }}>{loading ? '...' : fmtOculto(patrimonioLiquido, ocultar)}</p>
            {totalDividas > 0 && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>Ativos</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#2FB36A', margin: 0 }}>{fmtOculto(totalAtivos, ocultar)}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#94A3B8', margin: 0 }}>Dívidas</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#EF4444', margin: 0 }}>-{fmtOculto(totalDividas, ocultar)}</p>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '48px 0', fontSize: '14px', color: '#94A3B8' }}>Carregando...</p>
          ) : bens.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: '10px' }}>
              <Building2 size={32} color="#E2E8F0" strokeWidth={1} />
              <p style={{ fontSize: '13px', color: '#94A3B8' }}>Nenhum bem cadastrado ainda.</p>
              <button onClick={abrirNovo} style={{ fontSize: '13px', fontWeight: 600, color: '#0B3B2E', background: 'none', border: 'none', cursor: 'pointer' }}>
                Cadastrar primeiro bem →
              </button>
            </div>
          ) : (
            <>
              {grupos.map(g => (
                <div key={g.key} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>{g.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>{fmt(g.total)}</span>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '18px', overflow: 'hidden' }}>
                    {g.itens.map((b: any, i: number) => (
                      <button key={b.id} onClick={() => abrirEditar(b)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', background: 'none', border: i > 0 ? undefined : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(11,59,46,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <g.Icon size={14} color="#0B3B2E" strokeWidth={1.75} />
                        </div>
                        <p style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nome}</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0, flexShrink: 0 }}>{fmt(Number(b.valor))}</p>
                        <Pencil size={12} color="#94A3B8" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {dividas.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '0 2px' }}>
                    <TrendingDown size={13} color="#EF4444" strokeWidth={2} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444' }}>Dívidas</span>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '18px', overflow: 'hidden' }}>
                    {dividas.map((b: any, i: number) => (
                      <button key={b.id} onClick={() => abrirEditar(b)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TrendingDown size={14} color="#EF4444" strokeWidth={1.75} />
                        </div>
                        <p style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nome}</p>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#EF4444', margin: 0, flexShrink: 0 }}>-{fmt(Number(b.valor))}</p>
                        <Pencil size={12} color="#94A3B8" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1080px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>Patrimônio</h1>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>Bens, investimentos e dívidas da família</p>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', boxShadow: '0 4px 16px rgba(11,59,46,0.3)', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} strokeWidth={2.5} /> Novo bem
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(11,59,46,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <PiggyBank size={15} color="#0B3B2E" strokeWidth={1.75} />
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Patrimônio líquido</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.4px' }}>{loading ? '...' : fmtOculto(patrimonioLiquido, ocultar)}</p>
          </div>
          <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(47,179,106,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <Building2 size={15} color="#2FB36A" strokeWidth={1.75} />
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Total em ativos</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#2FB36A', letterSpacing: '-0.4px' }}>{loading ? '...' : fmtOculto(totalAtivos, ocultar)}</p>
          </div>
          <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <TrendingDown size={15} color="#EF4444" strokeWidth={1.75} />
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>Total em dívidas</p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#EF4444', letterSpacing: '-0.4px' }}>{loading ? '...' : fmtOculto(totalDividas, ocultar)}</p>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '48px', fontSize: '14px', color: '#94A3B8' }}>Carregando...</p>
        ) : bens.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', gap: '12px' }}>
            <Building2 size={32} color="#E2E8F0" strokeWidth={1} />
            <p style={{ fontSize: '14px', color: '#94A3B8' }}>Nenhum bem cadastrado ainda.</p>
            <button onClick={abrirNovo} style={{ fontSize: '13px', fontWeight: 600, color: '#0B3B2E', background: 'none', border: 'none', cursor: 'pointer' }}>
              Cadastrar primeiro bem →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {grupos.map(g => (
              <div key={g.key} style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <g.Icon size={15} color="#0B3B2E" strokeWidth={1.75} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{g.label}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>{fmt(g.total)}</span>
                </div>
                {g.itens.map((b: any, i: number) => (
                  <button key={b.id} onClick={() => abrirEditar(b)}
                    className="hover:bg-gray-50"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', background: 'none', border: i > 0 ? undefined : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ flex: 1, fontSize: '13.5px', fontWeight: 500, color: '#111827', margin: 0 }}>{b.nome}</p>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#111827', margin: 0 }}>{fmt(Number(b.valor))}</p>
                    <Pencil size={12} color="#94A3B8" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            ))}

            {dividas.length > 0 && (
              <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingDown size={15} color="#EF4444" strokeWidth={1.75} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>Dívidas</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#EF4444' }}>-{fmt(totalDividas)}</span>
                </div>
                {dividas.map((b: any, i: number) => (
                  <button key={b.id} onClick={() => abrirEditar(b)}
                    className="hover:bg-gray-50"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', background: 'none', border: i > 0 ? undefined : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <p style={{ flex: 1, fontSize: '13.5px', fontWeight: 500, color: '#111827', margin: 0 }}>{b.nome}</p>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#EF4444', margin: 0 }}>-{fmt(Number(b.valor))}</p>
                    <Pencil size={12} color="#94A3B8" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Mobile */}
      {modalOpen && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(85vh - 65px)', marginBottom: '65px' }}>
            {modalContent}
          </div>
        </div>
      )}

      {/* Modal Desktop */}
      {modalOpen && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '480px', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', margin: 'auto' }}>
            {modalContent}
          </div>
        </div>
      )}
    </>
  )
}
