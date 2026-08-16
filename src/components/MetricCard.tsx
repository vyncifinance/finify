import { ArrowUp, ArrowDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  valor: string
  cor?: string                 // hex — calculada pela regra de estado de quem chama, não fixa aqui
  sparkline?: number[]
  tendencia?: 'up' | 'down' | null
}

function pathSparkline(valores: number[], largura: number, altura: number) {
  if (valores.length < 2) return ''
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const range = max - min || 1
  const passo = largura / (valores.length - 1)
  return valores
    .map((v, i) => {
      const x = i * passo
      const y = altura - ((v - min) / range) * altura
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function MetricCard({ label, valor, cor = '#0F172A', sparkline, tendencia }: MetricCardProps) {
  const W = 72
  const H = 22

  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>{label}</p>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <p style={{ fontSize: '22px', fontWeight: 700, color: cor, letterSpacing: '-0.4px', lineHeight: 1 }}>{valor}</p>
          {tendencia && (
            tendencia === 'up'
              ? <ArrowUp size={13} color={cor} strokeWidth={2.5} />
              : <ArrowDown size={13} color={cor} strokeWidth={2.5} />
          )}
        </div>
        {sparkline && sparkline.length >= 2 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
            <path d={pathSparkline(sparkline, W, H)} fill="none" stroke={cor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  )
}
