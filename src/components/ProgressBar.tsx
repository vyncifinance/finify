export default function ProgressBar({ pct, cor = '#9CA3AF', altura = 5 }: { pct: number; cor?: string; altura?: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  return (
    <div style={{ height: `${altura}px`, borderRadius: `${altura / 2}px`, backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${clamped}%`, backgroundColor: cor, borderRadius: `${altura / 2}px`, transition: 'width 0.2s' }} />
    </div>
  )
}
