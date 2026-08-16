export type NivelAcompanhamento = 'em_dia' | 'atencao' | 'risco'

export interface AcompanhamentoInput {
  ultimaSessaoRealizada: string | null // data_sessao (YYYY-MM-DD) da sessão 'realizada' mais recente
  totalAcoes: number
  acoesConcluidas: number
}

export interface AcompanhamentoResultado {
  nivel: NivelAcompanhamento
  diasDesdeUltimaSessao: number | null
  pctAcoesConcluidas: number
}

// Indicador de acompanhamento da jornada — não é um "semáforo" de saúde financeira,
// mede engajamento do cliente com a consultoria (seção 8 do documento de especificação).
export function calcularAcompanhamento({ ultimaSessaoRealizada, totalAcoes, acoesConcluidas }: AcompanhamentoInput): AcompanhamentoResultado {
  const dias = ultimaSessaoRealizada
    ? Math.floor((Date.now() - new Date(ultimaSessaoRealizada + 'T12:00:00').getTime()) / 86400000)
    : null
  const diasEfetivo = dias === null ? Infinity : dias
  const pct = totalAcoes > 0 ? (acoesConcluidas / totalAcoes) * 100 : 0

  let nivel: NivelAcompanhamento
  if (diasEfetivo > 75 || pct < 30) nivel = 'risco'
  else if (diasEfetivo > 45 || pct < 60) nivel = 'atencao'
  else nivel = 'em_dia'

  return { nivel, diasDesdeUltimaSessao: dias, pctAcoesConcluidas: Math.round(pct) }
}
