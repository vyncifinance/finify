// lib/previsao.ts
//
// Cálculo da Previsão financeira (fluxo de caixa projetado) — tela /dashboard/previsao.
// "Dá pra gastar com presentes de Natal em dezembro?" é exatamente a pergunta que essa
// conta tenta responder: projeta, mês a mês, o que já está confirmado (parcelas e compras
// de cartão já lançadas com data futura, despesas/receitas fixas cadastradas) e soma uma
// estimativa de gasto variável baseada na média real dos últimos meses.
//
// IMPORTANTE — mesma regra de "o que conta como despesa" usada no Dashboard e em
// Movimentos (ver CLAUDE.md, seção "Consistência entre Telas"): descarta o lançamento
// consolidado "Pagamento de fatura" (categoria 'Cartão de Crédito' debitado de fora do
// cartão) pra não contar a compra em dobro — a compra já foi contabilizada na hora, na
// categoria real, com a data já empurrada pra fatura correta (dia_fechamento/dia_vencimento
// do cartão). Se essa regra mudar no Dashboard ou em Movimentos, replicar aqui também.

export type LancamentoPrevisao = {
  tipo: 'receita' | 'despesa'
  valor: number | string
  categoria: string
  data: string // YYYY-MM-DD
  conta_id?: string | null
  despesa_fixa_id?: string | null
}

export type DespesaFixaPrevisao = {
  id: string
  nome: string
  categoria: string
  valor: number | string
  dia_vencimento: number
  valor_variavel?: boolean
  tipo: 'despesa' | 'receita'
  ativo?: boolean
}

export type ContaPrevisao = { id: string; tipo: string }

export type StatusMes = 'positivo' | 'atencao' | 'negativo'

export type MesPrevisto = {
  ano: number
  mes: number // 0-11
  chave: string // "2026-12"
  receitaConhecida: number
  receitaFixaProjetada: number
  receitaPrevista: number
  despesaConhecida: number
  despesaFixaProjetada: number
  despesaVariavelEstimada: number
  despesaPrevista: number
  saldoMes: number
  saldoAcumulado: number
  status: StatusMes
}

export type CategoriaEstimativa = {
  categoria: string
  mediaTotal: number
  mediaFixa: number
  mediaVariavel: number
}

export type CompromissoFixo = {
  id: string
  nome: string
  categoria: string
  valor: number
  dia_vencimento: number
  tipo: 'despesa' | 'receita'
  variavel: boolean
}

export type ResultadoPrevisao = {
  meses: MesPrevisto[]
  categorias: CategoriaEstimativa[]
  compromissosFixos: CompromissoFixo[]
}

// Aportes em metas e investimentos: dinheiro que muda de lugar, não é consumido —
// mesmo critério usado no Dashboard (ehCategoriaAlocacao) pra não inflar a média de gasto.
const CATEGORIAS_ALOCACAO = new Set(['Investimento', 'Investimentos'])

function chaveMes(ano: number, mes: number) {
  return `${ano}-${String(mes + 1).padStart(2, '0')}`
}

function chaveDoLancamento(data: string) {
  return data.slice(0, 7) // "YYYY-MM-DD" -> "YYYY-MM"
}

function contarComoDespesa(l: LancamentoPrevisao, idsCartoes: Set<string>) {
  if (l.categoria === 'Cartão de Crédito' && !idsCartoes.has(l.conta_id || '')) return false
  return true
}

export function calcularPrevisao({
  hoje,
  horizonteMeses,
  mesesHistorico = 6,
  lancamentos,
  despesasFixas,
  contas,
}: {
  hoje: Date
  horizonteMeses: number
  mesesHistorico?: number
  lancamentos: LancamentoPrevisao[]
  despesasFixas: DespesaFixaPrevisao[]
  contas: ContaPrevisao[]
}): ResultadoPrevisao {
  const idsCartoes = new Set(contas.filter(c => c.tipo === 'cartao_credito').map(c => c.id))
  const validos = lancamentos.filter(l => contarComoDespesa(l, idsCartoes))

  // ── 1. Histórico: média real dos últimos `mesesHistorico` meses fechados (antes do mês
  // atual), por categoria de despesa. Divide só pelos meses que de fato têm lançamento —
  // mesma lógica já usada no Dashboard pra não distorcer com meses "vazios" de antes de
  // o usuário começar a usar o app.
  const chavesHistorico: string[] = []
  for (let i = mesesHistorico; i >= 1; i--) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    chavesHistorico.push(chaveMes(ref.getFullYear(), ref.getMonth()))
  }

  const totalPorCategoriaPorMes: Record<string, Record<string, number>> = {}
  const fixoPorCategoriaPorMes: Record<string, Record<string, number>> = {}
  const mesesComDado = new Set<string>()

  validos
    .filter(l => l.tipo === 'despesa' && !CATEGORIAS_ALOCACAO.has(l.categoria))
    .forEach(l => {
      const chave = chaveDoLancamento(l.data)
      if (!chavesHistorico.includes(chave)) return
      mesesComDado.add(chave)
      totalPorCategoriaPorMes[chave] = totalPorCategoriaPorMes[chave] || {}
      totalPorCategoriaPorMes[chave][l.categoria] = (totalPorCategoriaPorMes[chave][l.categoria] || 0) + Number(l.valor)
      if (l.despesa_fixa_id) {
        fixoPorCategoriaPorMes[chave] = fixoPorCategoriaPorMes[chave] || {}
        fixoPorCategoriaPorMes[chave][l.categoria] = (fixoPorCategoriaPorMes[chave][l.categoria] || 0) + Number(l.valor)
      }
    })

  const qtdMesesComDado = Math.max(mesesComDado.size, 1)
  const todasCategorias = new Set<string>()
  Object.values(totalPorCategoriaPorMes).forEach(porCat => Object.keys(porCat).forEach(c => todasCategorias.add(c)))

  const categorias: CategoriaEstimativa[] = Array.from(todasCategorias).map(categoria => {
    const somaTotal = chavesHistorico.reduce((s, chave) => s + (totalPorCategoriaPorMes[chave]?.[categoria] || 0), 0)
    const somaFixa = chavesHistorico.reduce((s, chave) => s + (fixoPorCategoriaPorMes[chave]?.[categoria] || 0), 0)
    const mediaTotal = somaTotal / qtdMesesComDado
    const mediaFixa = somaFixa / qtdMesesComDado
    return { categoria, mediaTotal, mediaFixa, mediaVariavel: Math.max(mediaTotal - mediaFixa, 0) }
  }).sort((a, b) => b.mediaVariavel - a.mediaVariavel)

  const estimativaVariavelTotal = categorias.reduce((s, c) => s + c.mediaVariavel, 0)

  // ── 2. Compromissos fixos ativos (despesas_fixas) — o mesmo conjunto todo mês,
  // usado tanto pra projetar valores futuros quanto pra listar de forma transparente
  // o que está "garantido" em cada mês.
  const compromissosFixos: CompromissoFixo[] = despesasFixas
    .filter(df => df.ativo !== false)
    .map(df => ({
      id: df.id,
      nome: df.nome,
      categoria: df.categoria,
      valor: Number(df.valor),
      dia_vencimento: df.dia_vencimento,
      tipo: df.tipo,
      variavel: !!df.valor_variavel,
    }))

  // Pra despesa fixa de valor variável (ex: conta de luz), usa a média do que foi
  // realmente lançado vinculado a ela nos últimos meses — cai no valor cadastrado
  // (referência) se ainda não tem histórico suficiente.
  function valorProjetadoDaFixa(df: CompromissoFixo): number {
    if (!df.variavel) return df.valor
    const lancamentosDaFixa = validos.filter(l => l.despesa_fixa_id === df.id && chavesHistorico.includes(chaveDoLancamento(l.data)))
    if (lancamentosDaFixa.length === 0) return df.valor
    const soma = lancamentosDaFixa.reduce((s, l) => s + Number(l.valor), 0)
    return soma / lancamentosDaFixa.length
  }

  // ── 3. Projeta cada mês futuro, a partir do mês seguinte ao atual.
  const meses: MesPrevisto[] = []
  let saldoAcumulado = 0

  for (let i = 1; i <= horizonteMeses; i++) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
    const ano = ref.getFullYear()
    const mes = ref.getMonth()
    const chave = chaveMes(ano, mes)

    const doMes = validos.filter(l => chaveDoLancamento(l.data) === chave)
    const receitaConhecida = doMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
    const despesaConhecida = doMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)

    // Só projeta a fixa se ainda não existe lançamento dela nesse mês — pra não contar
    // em dobro quando o mês já tem algo lançado adiantado (ex: parcela ou pagamento antecipado).
    let receitaFixaProjetada = 0
    let despesaFixaProjetada = 0
    compromissosFixos.forEach(df => {
      const jaLancada = doMes.some(l => l.despesa_fixa_id === df.id)
      if (jaLancada) return
      const valor = valorProjetadoDaFixa(df)
      if (df.tipo === 'receita') receitaFixaProjetada += valor
      else despesaFixaProjetada += valor
    })

    const receitaPrevista = receitaConhecida + receitaFixaProjetada
    const despesaVariavelEstimada = estimativaVariavelTotal
    const despesaPrevista = despesaConhecida + despesaFixaProjetada + despesaVariavelEstimada
    const saldoMes = receitaPrevista - despesaPrevista
    saldoAcumulado += saldoMes

    const status: StatusMes =
      saldoMes < 0 ? 'negativo'
      : (receitaPrevista > 0 && saldoMes / receitaPrevista < 0.1) ? 'atencao'
      : 'positivo'

    meses.push({
      ano, mes, chave,
      receitaConhecida, receitaFixaProjetada, receitaPrevista,
      despesaConhecida, despesaFixaProjetada, despesaVariavelEstimada, despesaPrevista,
      saldoMes, saldoAcumulado, status,
    })
  }

  return { meses, categorias, compromissosFixos }
}

// Simulador — "dá pra gastar R$ X a mais nesse mês?"
export function simularGastoExtra(mesPrevisto: MesPrevisto, valorExtra: number) {
  const saldoComExtra = mesPrevisto.saldoMes - valorExtra
  let status: StatusMes
  if (saldoComExtra < 0) status = 'negativo'
  else if (mesPrevisto.receitaPrevista > 0 && saldoComExtra / mesPrevisto.receitaPrevista < 0.1) status = 'atencao'
  else status = 'positivo'
  return { saldoComExtra, status }
}
