'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Building2, ChevronDown, Check, Plus } from 'lucide-react'

export type Empresa = {
  id: string
  nome: string
  cnpj: string
}

type Props = {
  familiaNome: string          // ex: "Rodrigues"
  empresas: Empresa[]
  contextoAtivo: { tipo: 'pessoal' | 'empresa'; empresaId: string | null }
  onTrocar: (contexto: { tipo: 'pessoal' | 'empresa'; empresaId: string | null }) => void
  onAdicionarEmpresa: () => void
  variant?: 'header' | 'compact'   // 'header' = topo da tela | 'compact' = dentro do modal
}

function formatCnpj(cnpj: string) {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export default function ContextSwitcher({
  familiaNome,
  empresas,
  contextoAtivo,
  onTrocar,
  onAdicionarEmpresa,
  variant = 'header',
}: Props) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  const empresaAtiva = contextoAtivo.tipo === 'empresa'
    ? empresas.find(e => e.id === contextoAtivo.empresaId)
    : null

  const isHeader = variant === 'header'
  const rotuloAtivo = empresaAtiva ? empresaAtiva.nome : familiaNome

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: isHeader ? 'rgba(255,255,255,0.08)' : '#F8FAFC',
          border: isHeader ? '1px solid rgba(255,255,255,0.14)' : '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '7px 10px 7px 8px',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: empresaAtiva ? '#334155' : 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
        }}>
          {empresaAtiva
            ? <Building2 size={12} color="#fff" strokeWidth={2} />
            : <User size={12} color="#fff" strokeWidth={2} />}
        </div>
        <span style={{
          fontSize: '13px', fontWeight: 500,
          color: isHeader ? '#fff' : '#0F172A',
        }}>
          {rotuloAtivo}
        </span>
        {empresaAtiva && (
          <span style={{
            fontSize: '9.5px', fontWeight: 600, color: '#166534',
            background: 'rgba(47,179,106,0.14)', border: '1px solid rgba(47,179,106,0.3)',
            borderRadius: '999px', padding: '3px 8px',
          }}>
            PJ
          </span>
        )}
        <ChevronDown size={14} color={isHeader ? 'rgba(255,255,255,0.6)' : '#64748B'} strokeWidth={2} />
      </button>

      {aberto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 60,
          minWidth: '240px', background: '#fff', borderRadius: '14px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.12)',
          border: '1px solid #ECEFF3', padding: '6px',
        }}>
          <p style={{
            fontSize: '10.5px', fontWeight: 700, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '8px 10px 4px', margin: 0,
          }}>
            Trocar contexto
          </p>

          {/* Pessoal / Família */}
          <button
            onClick={() => { onTrocar({ tipo: 'pessoal', empresaId: null }); setAberto(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: contextoAtivo.tipo === 'pessoal' ? '#F0FDF4' : 'transparent',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
            }}>
              <User size={15} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#0B3B2E', margin: 0 }}>{familiaNome}</p>
              <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>Conta da família</p>
            </div>
            {contextoAtivo.tipo === 'pessoal' && <Check size={16} color="#2FB36A" strokeWidth={2.5} />}
          </button>

          {/* Empresas */}
          {empresas.map(emp => (
            <button
              key={emp.id}
              onClick={() => { onTrocar({ tipo: 'empresa', empresaId: emp.id }); setAberto(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: contextoAtivo.empresaId === emp.id ? '#F0FDF4' : 'transparent',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#334155',
              }}>
                <Building2 size={15} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', margin: 0 }}>{emp.nome}</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>CNPJ · {formatCnpj(emp.cnpj)}</p>
              </div>
              {contextoAtivo.empresaId === emp.id && <Check size={16} color="#2FB36A" strokeWidth={2.5} />}
            </button>
          ))}

          {/* Adicionar empresa */}
          <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '4px', paddingTop: '4px' }}>
            <button
              onClick={() => { onAdicionarEmpresa(); setAberto(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'transparent', textAlign: 'left',
              }}
            >
              <Plus size={15} color="#2FB36A" strokeWidth={2} />
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#2FB36A', margin: 0 }}>
                Adicionar empresa (CNPJ)
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
