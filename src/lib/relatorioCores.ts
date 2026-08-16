// Régua de cor da linguagem visual "pulse" (seção 10) — reaproveitada por
// MetricCard, ProgressBar e qualquer indicador do relatório. A cor nunca é
// fixa no componente: quem chama calcula o estado e passa a cor pronta.
export type EstadoCor = 'neutro' | 'positivo' | 'atencao' | 'negativo'

export const CORES_ESTADO: Record<EstadoCor, string> = {
  neutro:   '#9CA3AF',
  positivo: '#2FB36A',
  atencao:  '#B45309',
  negativo: '#9F1239',
}
