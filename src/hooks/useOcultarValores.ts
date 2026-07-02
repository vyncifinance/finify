'use client'

import { useState, useEffect } from 'react'

export function useOcultarValores() {
  const [ocultar, setOcultar] = useState(false)

  useEffect(() => {
    // Só executa no cliente, nunca no servidor
    const saved = localStorage.getItem('finify_ocultar_valores')
    setOcultar(saved === 'true')

    function onToggle(e: Event) {
      setOcultar((e as CustomEvent).detail)
    }

    window.addEventListener('finify_ocultar', onToggle)
    return () => window.removeEventListener('finify_ocultar', onToggle)
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
