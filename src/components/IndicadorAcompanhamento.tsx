import { TrendingDown, AlertTriangle } from 'lucide-react'
import type { AcompanhamentoResultado } from '@/lib/acompanhamento'

const CONFIG: Record<AcompanhamentoResultado['nivel'], { label: string; peso: number; cor: string | null }> = {
  em_dia:  { label: 'Em dia',              peso: 500, cor: null },
  atencao: { label: 'Precisa de atenção',  peso: 700, cor: '#B45309' },
  risco:   { label: 'Risco de abandono',   peso: 700, cor: '#9F1239' },
}

export default function IndicadorAcompanhamento({ resultado, size = 'md' }: { resultado: AcompanhamentoResultado; size?: 'sm' | 'md' }) {
  const cfg = CONFIG[resultado.nivel]
  const fontSize = size === 'sm' ? '12px' : '13px'
  const iconSize = size === 'sm' ? 12 : 13

  return (
    <span className="inline-flex items-center gap-1.5" style={{ fontSize, fontWeight: cfg.peso, color: cfg.cor || '#334155' }}>
      {resultado.nivel === 'risco' && <AlertTriangle size={iconSize} color={cfg.cor!} strokeWidth={2.25} />}
      {resultado.nivel !== 'em_dia' && <TrendingDown size={iconSize} color={cfg.cor!} strokeWidth={2.25} />}
      {cfg.label}
    </span>
  )
}
