export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ width: '6px', height: '6px', backgroundColor: '#2FB36A', flexShrink: 0 }} />
      <span style={{
        fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
        letterSpacing: '0.07em', fontSize: '10.5px', fontWeight: 600, color: '#6B7280',
      }}>
        {children}
      </span>
    </div>
  )
}
