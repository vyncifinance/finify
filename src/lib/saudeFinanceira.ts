export type NivelSaude = 'saudavel' | 'atencao' | 'risco'

export const SAUDE_CONFIG: Record<NivelSaude, { label: string; cor: string | null }> = {
  saudavel: { label: 'Saudável', cor: null },
  atencao:  { label: 'Atenção',  cor: '#B45309' },
  risco:    { label: 'Risco',    cor: '#9F1239' },
}

// Saúde financeira da família — independe de assiduidade nas sessões
// (isso é o indicador de acompanhamento da Fase 5). Mede se a família
// está bem financeiramente: % da receita do mês comprometido com despesas.
export function classificarSaude(percentual: number | null): NivelSaude | null {
  if (percentual === null || percentual === undefined) return null
  if (percentual > 90) return 'risco'
  if (percentual >= 70) return 'atencao'
  return 'saudavel'
}
