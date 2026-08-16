export default function TimelineTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '999px',
      backgroundColor: '#F0FDF4', color: '#0F6E56',
      fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.01em',
    }}>
      {children}
    </span>
  )
}
