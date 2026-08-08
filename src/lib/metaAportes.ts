// Fluxo único de "aportar numa meta" — usado tanto pelo botão "Aportar" da tela de Metas
// quanto pela despesa categoria "Investimentos" (alocada pra uma meta) em Movimentos.
// Existir num só lugar evita o que já aconteceu uma vez: as duas telas implementarem a
// mesma ideia de formas ligeiramente diferentes (categorias diferentes, sem tratar meta
// automática, etc.) e o resultado ficar inconsistente no Dashboard.

export const CATEGORIA_APORTE_META = 'Investimentos'

type AportarEmMetaParams = {
  supabase: any
  meta: { id: string; nome: string; valor_atual: number | string; automatica?: boolean }
  valor: number
  familiaId: string
  userId: string
  membroAtual: string
}

type AportarEmMetaResultado =
  | { automatica: true }
  | { automatica: false; lancamento: any }

/**
 * Aporta um valor numa meta.
 * - Meta automática (ex: Reserva de Emergência): soma direto num "Caixa" em Patrimônio
 *   (tabela `bens`) e atualiza `valor_atual` — não gera lançamento de despesa.
 * - Meta normal: cria uma despesa categoria "Investimentos" vinculada à meta (`meta_id`)
 *   e atualiza `valor_atual`.
 *
 * Lança sempre na data de hoje — mesmo comportamento em ambas as telas.
 */
export async function aportarEmMeta({
  supabase, meta, valor, familiaId, userId, membroAtual,
}: AportarEmMetaParams): Promise<AportarEmMetaResultado> {
  if (meta.automatica) {
    const NOME_BEM_RESERVA = 'Reserva de Emergência (aportes)'
    const { data: bemExistente } = await supabase.from('bens').select('id, valor')
      .eq('familia_id', familiaId).eq('tipo', 'caixa').eq('nome', NOME_BEM_RESERVA).maybeSingle()

    if (bemExistente) {
      await supabase.from('bens').update({ valor: Number(bemExistente.valor) + valor }).eq('id', bemExistente.id)
    } else {
      await supabase.from('bens').insert({
        familia_id: familiaId, user_id: userId, nome: NOME_BEM_RESERVA,
        tipo: 'caixa', valor, eh_divida: false,
      })
    }

    const novoValorAtual = Number(meta.valor_atual) + valor
    await supabase.from('metas').update({ valor_atual: novoValorAtual }).eq('id', meta.id)
    return { automatica: true }
  }

  const novoValorAtual = Number(meta.valor_atual) + valor
  const { error: erroMeta } = await supabase.from('metas').update({ valor_atual: novoValorAtual }).eq('id', meta.id)
  if (erroMeta) throw erroMeta

  const agora = new Date()
  const hora  = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
  const { data: lancamento, error: erroLancamento } = await supabase.from('lancamentos').insert({
    familia_id: familiaId, user_id: userId, tipo: 'despesa', valor,
    categoria: CATEGORIA_APORTE_META, membro: membroAtual,
    data: agora.toISOString().split('T')[0], hora,
    descricao: `Aporte para meta: ${meta.nome}`,
    meta_id: meta.id,
  }).select().single()
  if (erroLancamento) throw erroLancamento

  return { automatica: false, lancamento }
}
