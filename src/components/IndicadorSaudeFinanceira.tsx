import { classificarSaude, SAUDE_CONFIG } from '@/lib/saudeFinanceira'

const BAR_SAUDAVEL = 'rgba(15,23,42,0.55)'

export default function IndicadorSaudeFinanceira({ percentual, variant = 'card' }: { percentual: number | null; variant?: 'card' | 'compact' }) {
  const nivel = classificarSaude(percentual)

  if (!nivel) {
    return variant === 'compact'
      ? <span className="text-xs" style={{ color: '#94A3B8' }}>Sem dados</span>
      : <p className="text-sm" style={{ color: '#94A3B8' }}>Sem lançamentos este mês.</p>
  }

  const cfg = SAUDE_CONFIG[nivel]
  const barColor  = cfg.cor || BAR_SAUDAVEL
  const textColor = cfg.cor || '#0F172A'
  const pctClamped = Math.min(percentual as number, 100)

  if (variant === 'compact') {
    return (
      <div style={{ minWidth: '110px' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color: textColor }}>{percentual}%</span>
          <span style={{ fontSize: '10.5px', color: textColor }}>{cfg.label}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
          <div className="h-full rounded-full" style={{ width: `${pctClamped}%`, backgroundColor: barColor }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <p className="text-3xl font-bold" style={{ color: textColor, letterSpacing: '-0.5px' }}>{percentual}%</p>
        <span className="text-sm font-semibold" style={{ color: textColor }}>{cfg.label}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F1F5F9' }}>
        <div className="h-full rounded-full" style={{ width: `${pctClamped}%`, backgroundColor: barColor }} />
      </div>
      <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Receita comprometida com despesas este mês</p>
    </div>
  )
}
