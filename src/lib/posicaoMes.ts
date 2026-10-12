// Posição do mês — a conta que a tela de Movimentos mostra no bloco principal.
//
// Existem DUAS perguntas diferentes aqui, e misturá-las conta valor em dobro:
//
// 1. COMPETÊNCIA — "quanto este mês produziu?"
//    receitas - despesas. As compras de cartão JÁ estão em `despesas`, pela
//    categoria real, desde a hora da compra. O que falta descontar são as
//    despesas fixas ainda não pagas, porque enquanto não são pagas não existe
//    lançamento e elas não entraram em `despesas`.
//
// 2. CAIXA — "quanto ainda sai da conta?"
//    fixas em aberto + faturas de cartão pendentes, comparado com o saldo real
//    da conta corrente. Aqui a fatura ENTRA, porque o dinheiro ainda não saiu
//    do banco — mesmo que a despesa já tenha sido contabilizada no item 1.
//
// A fatura pendente aparece só no item 2. Subtraí-la também do resultado
// projetado seria contá-la duas vezes.
//
// Este módulo é compartilhado de propósito: Dashboard e Linha do Tempo leem os
// mesmos lançamentos e precisam da mesma conta (regra de consistência entre
// telas do CLAUDE.md). Mudou aqui, muda em todas.

export type EntradaPosicaoMes = {
  /** Soma das receitas do mês já lançadas. */
  receitas: number
  /** Soma das despesas do mês já lançadas, compras de cartão incluídas. */
  despesas: number
  /** Soma das despesas fixas do mês que ainda não geraram lançamento. */
  fixasNaoLancadas: number
  /** Soma das faturas de cartão em aberto (todas as contas de cartão). */
  faturasPendentes: number
  /** Saldo informado da conta corrente. `null` quando não foi configurado. */
  saldoConta: number | null
}

export type PosicaoMes = {
  receitas: number
  despesas: number
  /** Competência: o que o mês produziu até agora. */
  resultado: number
  fixasNaoLancadas: number
  /** Competência, já descontando as fixas que ainda vão ser lançadas. */
  resultadoProjetado: number
  /** Quanto das receitas já foi comprometido, de 0 a 100 (para a barra). */
  pctComprometido: number
  /** Caixa: fixas em aberto + faturas pendentes. */
  aSairDaConta: number
  /** Caixa: saldo menos o que ainda sai. `null` sem saldo configurado. */
  sobraDepois: number | null
  /** `true` quando o saldo não cobre o que ainda sai. */
  saldoInsuficiente: boolean
}

export function calcularPosicaoMes(e: EntradaPosicaoMes): PosicaoMes {
  const receitas = Number(e.receitas) || 0
  const despesas = Number(e.despesas) || 0
  const fixasNaoLancadas = Number(e.fixasNaoLancadas) || 0
  const faturasPendentes = Number(e.faturasPendentes) || 0

  const resultado = receitas - despesas
  const resultadoProjetado = resultado - fixasNaoLancadas
  const aSairDaConta = fixasNaoLancadas + faturasPendentes

  // Sem receita no mês, qualquer despesa já é 100% comprometido — evita
  // divisão por zero virar NaN e sumir com a barra.
  const comprometido = despesas + fixasNaoLancadas
  const pctComprometido = receitas > 0
    ? Math.min(100, Math.round((comprometido / receitas) * 100))
    : (comprometido > 0 ? 100 : 0)

  const saldoConta = e.saldoConta == null ? null : Number(e.saldoConta)
  const sobraDepois = saldoConta == null ? null : saldoConta - aSairDaConta

  return {
    receitas,
    despesas,
    resultado,
    fixasNaoLancadas,
    resultadoProjetado,
    pctComprometido,
    aSairDaConta,
    sobraDepois,
    saldoInsuficiente: sobraDepois != null && sobraDepois < 0,
  }
}

/** Cor da barra de comprometimento. Verde até 80%, âmbar até 100%, vermelho acima. */
export function corComprometimento(pct: number): string {
  if (pct >= 100) return '#EF4444'
  if (pct >= 80) return '#F59E0B'
  return '#58D68D'
}
