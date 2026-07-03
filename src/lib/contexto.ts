// lib/contexto.ts
// Controla qual "conta" está ativa: Pessoal (família) ou uma Empresa (CNPJ).
// Persistido em cookie local — por dispositivo, sem precisar de query extra no banco.

export type ContextoAtivo = {
  tipo: 'pessoal' | 'empresa'
  empresaId: string | null
}

const COOKIE_NAME = 'finify_contexto'

export function lerContexto(): ContextoAtivo {
  if (typeof document === 'undefined') {
    return { tipo: 'pessoal', empresaId: null }
  }
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  if (!match) return { tipo: 'pessoal', empresaId: null }

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]))
    if (parsed?.tipo === 'empresa' && parsed?.empresaId) {
      return { tipo: 'empresa', empresaId: parsed.empresaId }
    }
    return { tipo: 'pessoal', empresaId: null }
  } catch {
    return { tipo: 'pessoal', empresaId: null }
  }
}

export function salvarContexto(contexto: ContextoAtivo) {
  if (typeof document === 'undefined') return
  const valor = encodeURIComponent(JSON.stringify(contexto))
  // 1 ano de validade — só reseta se o usuário trocar manualmente
  document.cookie = `${COOKIE_NAME}=${valor}; path=/; max-age=${60 * 60 * 24 * 365}`
}
