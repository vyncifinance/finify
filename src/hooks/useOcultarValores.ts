import { useState, useEffect } from 'react'

export function useOcultarValores() {
  const [ocultar, setOcultar] = useState(false)

  useEffect(() => {
    // Lê o estado inicial
    const saved = localStorage.getItem('finify_ocultar_valores')
    setOcultar(saved === 'true')

    // Escuta mudanças (quando o layout toggler muda)
    function onStorage(e: StorageEvent) {
      if (e.key === 'finify_ocultar_valores') {
        setOcultar(e.newValue === 'true')
      }
    }

    // Também escuta evento customizado para mesma aba
    function onToggle(e: Event) {
      const val = (e as CustomEvent).detail
      setOcultar(val)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('finify_ocultar', onToggle)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('finify_ocultar', onToggle)
    }
  }, [])

  return ocultar
}

export function fmtOculto(val: number, ocultar: boolean): string {
  if (ocultar) return 'R$ ••••••'
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export function fmtShortOculto(val: number, ocultar: boolean): string {
  if (ocultar) return 'R$ •••'
  const abs = Math.abs(val)
  if (abs >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}
