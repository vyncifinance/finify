'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ChevronDown, Calendar,
  Plus, Wallet, X, UtensilsCrossed, Home, Car, Smile,
  Heart, BookOpen, ShoppingBag, Church, MoreHorizontal, HandHeart,
  Briefcase, TrendingUp, Laptop, DollarSign, Trash2, Pencil,
  CreditCard, FileText, AlignLeft, Repeat, CheckCircle2,
  Pill, Gift, Sparkles, GraduationCap, Smartphone, Shirt, Wrench, ClipboardList, Filter, Search, PawPrint,
  Building2, Truck, Landmark, Megaphone, Calculator, Users, Check, AlertTriangle
} from 'lucide-react'
import OrcamentosSection from './OrcamentosSection'
import { aportarEmMeta } from '@/lib/metaAportes'
import { calcularPosicaoMes, corComprometimento } from '@/lib/posicaoMes'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATEGORIAS_DESPESA = ['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Cartão de Crédito','Dízimo','Doações','Farmácia','Presente','Estética','Estudos','Eletrônicos','Vestuário','Consertos','Serviços','Pet','Investimentos','Outros']
const CATEGORIAS_RECEITA = ['Salário','Renda Extra','Freelance','Investimento','Outros']

const CATEGORIAS_EMPRESA_DESPESA = ['Fornecedores','Impostos','Pró-labore','Folha de Pagamento','Marketing','Aluguel/Sede','Software/Ferramentas','Contabilidade','Outros']
const CATEGORIAS_EMPRESA_RECEITA = ['Faturamento','Prestação de Serviço','Outras Receitas']

const ICONES_CAT: Record<string, any> = {
  'Alimentação': UtensilsCrossed, 'Moradia': Home, 'Transporte': Car, 'Lazer': Smile,
  'Saúde': Heart, 'Educação': BookOpen, 'Compras': ShoppingBag, 'Dízimo': Church, 'Doações': HandHeart,
  'Cartão de Crédito': CreditCard, 'Outros': MoreHorizontal,
  'Farmácia': Pill, 'Presente': Gift, 'Estética': Sparkles, 'Estudos': GraduationCap,
  'Eletrônicos': Smartphone, 'Vestuário': Shirt, 'Consertos': Wrench, 'Serviços': ClipboardList,
  'Pet': PawPrint,
  'Investimentos': TrendingUp,
  'Salário': Briefcase, 'Renda Extra': DollarSign, 'Freelance': Laptop, 'Investimento': TrendingUp,
  'Fornecedores': Truck, 'Impostos': Landmark, 'Pró-labore': Wallet, 'Folha de Pagamento': Users,
  'Marketing': Megaphone, 'Aluguel/Sede': Building2, 'Software/Ferramentas': Laptop, 'Contabilidade': Calculator,
  'Faturamento': TrendingUp, 'Prestação de Serviço': Briefcase, 'Outras Receitas': DollarSign,
}

function fmt(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// toISOString() converte pra UTC — no Brasil (UTC-3), lançar à noite fazia a data
// "pular" pro dia seguinte. Isso usa os componentes de data locais, sem conversão.
function dataLocalISO(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

// Domingo da semana a que a data pertence — a chave de agrupamento da lista.
function inicioSemana(dataStr: string) {
  const d = new Date(dataStr + 'T12:00:00')
  d.setDate(d.getDate() - d.getDay())
  return dataLocalISO(d)
}

function labelSemana(ini: Date, fim: Date) {
  if (ini.getMonth() === fim.getMonth()) {
    return `${ini.getDate()} a ${fim.getDate()} de ${MESES[ini.getMonth()]}`
  }
  return `${ini.getDate()} de ${MESES[ini.getMonth()]} a ${fim.getDate()} de ${MESES[fim.getMonth()]}`
}

function formatDiaLabel(dataStr: string) {
  const hoje  = new Date()
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
  const data  = new Date(dataStr + 'T12:00:00')
  const f = (d: Date) => dataLocalISO(d)
  if (f(data) === f(hoje))  return 'Hoje'
  if (f(data) === f(ontem)) return 'Ontem'
  const dias = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  return `${dias[data.getDay()]}, ${data.getDate()} de ${MESES[data.getMonth()]}`
}

export default function MovimentosPage() {
  const router       = useRouter()
  const pathname     = usePathname()
  const familiaIdRef = useRef('')

  const [loading, setLoading]           = useState(true)
  const [familiaId, setFamiliaId]       = useState('')
  const [familiaNome, setFamiliaNome]   = useState('')
  const [empresas, setEmpresas]         = useState<any[]>([])
  const [contextoAtivo, setContextoAtivo] = useState<{ tipo: 'pessoal' | 'empresa'; empresaId?: string; nome: string }>({ tipo: 'pessoal', nome: '' })
  const [contextoAberto, setContextoAberto] = useState(false)
  const [contextoAbertoHeader, setContextoAbertoHeader] = useState(false)
  const [userId, setUserId]             = useState('')
  const [membroAtual, setMembroAtual]   = useState('')
  const [mesRef, setMesRef]             = useState(new Date())
  const [lancamentos, setLancamentos]   = useState<any[]>([])
  const [filtro, setFiltro]             = useState<'todos'|'receita'|'despesa'>('todos')
  const [filtroMembro, setFiltroMembro] = useState('todos')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  // Filtros saíram do corpo da tela (duas fileiras de pílulas) para um painel.
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  // Qual painel de pendência está aberto. Antes, Despesas Fixas e Faturas eram
  // duas seções sempre visíveis acima da lista.
  const [painelAberto, setPainelAberto] = useState<'fixas' | 'cartoes' | null>(null)
  // No modal, a categoria começa nas mais usadas; isto abre a lista completa.
  const [categoriasTodas, setCategoriasTodas] = useState(false)
  const [semanaOverride, setSemanaOverride] = useState<Record<string, boolean>>({})
  const [busca, setBusca]               = useState('')
  const [membros, setMembros]           = useState<string[]>([])
  const [membrosFamilia, setMembrosFamilia] = useState<string[]>([])

  const [despesasFixas, setDespesasFixas] = useState<any[]>([])
  const [dfModalOpen, setDfModalOpen]     = useState(false)
  const [dfEditando, setDfEditando]       = useState<any>(null)
  const [dfNome, setDfNome]               = useState('')
  const [dfValor, setDfValor]             = useState('')
  const [dfCategoria, setDfCategoria]     = useState('Moradia')
  const [dfDia, setDfDia]                 = useState('5')
  const [dfVariavel, setDfVariavel]       = useState(false)
  const [dfTipo, setDfTipo]               = useState<'despesa'|'receita'>('despesa')
  const [dfSalvando, setDfSalvando]       = useState(false)
  const [dfDeletando, setDfDeletando]     = useState(false)
  const [dfConfirmDelete, setDfConfirmDelete] = useState(false)
  const [dfErro, setDfErro] = useState('')

  const [pagarModalOpen, setPagarModalOpen] = useState(false)
  const [dfPagando, setDfPagando]           = useState<any>(null)
  const [valorPagar, setValorPagar]         = useState('')
  const [pagando, setPagando]               = useState(false)

  const [modalOpen, setModalOpen]         = useState(false)
  const [editando, setEditando]           = useState<any>(null)
  const [tipo, setTipo]                   = useState<'despesa'|'receita'>('despesa')
  const [valor, setValor]                 = useState('')
  const [categoria, setCategoria]         = useState('Alimentação')
  const [membroForm, setMembroForm]       = useState('')
  const [dataLanc, setDataLanc]           = useState(dataLocalISO(new Date()))
  const [dizimar, setDizimar]             = useState(true)
  const [posicoesRF, setPosicoesRF]       = useState<any[]>([])
  const [posicaoAporteId, setPosicaoAporteId] = useState('')
  const [metas, setMetas]                 = useState<any[]>([])
  const [modoAporte, setModoAporte]       = useState<'posicao' | 'meta'>('posicao')
  const [metaAporteId, setMetaAporteId]   = useState('')
  const [contas, setContas]               = useState<any[]>([])
  const [contaSelecionadaId, setContaSelecionadaId] = useState('')
  const [novoCartaoOpen, setNovoCartaoOpen] = useState(false)
  const [novoCartaoNome, setNovoCartaoNome] = useState('')
  const [novoCartaoFechamento, setNovoCartaoFechamento] = useState('')
  const [novoCartaoVencimento, setNovoCartaoVencimento] = useState('')
  const [salvandoCartao, setSalvandoCartao] = useState(false)
  const [editandoCartaoId, setEditandoCartaoId] = useState<string | null>(null)
  const [confirmDeleteCartao, setConfirmDeleteCartao] = useState(false)
  const [deletandoCartao, setDeletandoCartao] = useState(false)
  // Saldo real da conta corrente: saldo inicial (o que já tinha antes do Finify) + tudo
  // que entrou/saiu da própria conta corrente desde a data de referência — número literal,
  // pra comparar direto com a fatura pendente, sem entrar na conta de resultado/despesas fixas.
  const [saldoContaReal, setSaldoContaReal] = useState<number | null>(null)
  const [modalSaldoContaOpen, setModalSaldoContaOpen] = useState(false)
  const [saldoInicialInput, setSaldoInicialInput] = useState('')
  const [salvandoSaldoConta, setSalvandoSaldoConta] = useState(false)
  const [pagandoFatura, setPagandoFatura] = useState<string | null>(null)
  const [erroFatura, setErroFatura] = useState('')
  const [erroFaturaCartaoId, setErroFaturaCartaoId] = useState<string | null>(null)
  const [cartaoDetalhado, setCartaoDetalhado] = useState<string | null>(null)
  const [itensCartaoDetalhe, setItensCartaoDetalhe] = useState<any[]>([])
  const [carregandoDetalheCartao, setCarregandoDetalheCartao] = useState(false)
  const [faturasPendentes, setFaturasPendentes] = useState<Record<string, number>>({})
  const [observacao, setObservacao]       = useState('')
  const [parcelado, setParcelado]         = useState(false)
  const [numParcelas, setNumParcelas]     = useState('2')
  const [diaParcela, setDiaParcela]       = useState('1')
  const [salvando, setSalvando]           = useState(false)
  const [deletando, setDeletando]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isMobile, setIsMobile]           = useState(true)

  const supabase = createClient()

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024)
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { init() }, [])
  useEffect(() => {
    if (familiaIdRef.current) carregarLancamentos(familiaIdRef.current)
  }, [mesRef])
  useEffect(() => {
    if (familiaIdRef.current) carregarFaturasPendentes(familiaIdRef.current, contas)
  }, [contas])
  useEffect(() => {
    if (familiaIdRef.current) carregarSaldoContaReal(familiaIdRef.current, contas)
  }, [contas])
  useEffect(() => {
    // Trocou de mês ou de filtro: volta pro estado recolhido padrão.
    setSemanaOverride({})
  }, [mesRef, filtro, filtroMembro, filtroCategoria, busca])
  useEffect(() => {
    setCartaoDetalhado(null)
  }, [mesRef])
  useEffect(() => {
    const handler = () => {
      if (!document.hidden && familiaIdRef.current) carregarLancamentos(familiaIdRef.current)
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  async function init() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    setUserId(session.user.id)
    const { data: profile } = await supabase
      .from('profiles').select('nome, familia_id, familias(nome)')
      .eq('id', session.user.id).single()
    if (profile) {
      const fid = profile.familia_id
      const nomeFam = (profile.familias as any)?.nome || ''
      setMembroAtual(profile.nome || '')
      setFamiliaId(fid)
      familiaIdRef.current = fid
      setFamiliaNome(nomeFam)
      setMembroForm(profile.nome || '')
      const { data: membrosData } = await supabase
        .from('profiles').select('nome').eq('familia_id', fid)
      if (membrosData) setMembrosFamilia(membrosData.map((m: any) => m.nome).filter(Boolean))

      const { data: empresasData } = await supabase.from('empresas')
        .select('*').eq('familia_id', fid).order('created_at', { ascending: true })
      const listaEmpresas = empresasData || []
      setEmpresas(listaEmpresas)

      const { data: posicoesData } = await supabase.from('posicoes_investimento')
        .select('id, nome').eq('familia_id', fid).eq('tipo', 'renda_fixa_cdi')
        .order('created_at', { ascending: false })
      setPosicoesRF(posicoesData || [])

      const { data: metasData } = await supabase.from('metas')
        .select('id, nome, valor_atual, valor_alvo, automatica').eq('familia_id', fid)
        .order('created_at', { ascending: false })
      setMetas(metasData || [])

      // Restaura o último contexto usado nesse dispositivo (se ainda existir)
      let contexto: { tipo: 'pessoal' | 'empresa'; empresaId?: string; nome: string } = { tipo: 'pessoal', nome: nomeFam }
      try {
        const salvo = localStorage.getItem('finify_contexto')
        if (salvo) {
          const parsed = JSON.parse(salvo)
          if (parsed.tipo === 'empresa' && parsed.empresaId) {
            const emp = listaEmpresas.find((e: any) => e.id === parsed.empresaId)
            if (emp) contexto = { tipo: 'empresa', empresaId: emp.id, nome: emp.nome }
          }
        }
      } catch {}
      setContextoAtivo(contexto)

      // As contas precisam ser carregadas DEPOIS de resolver o contexto, porque agora
      // elas dependem dele — um cartão de CNPJ não existe no fluxo pessoal.
      await recarregarContas(fid, contexto)
      await carregarLancamentos(fid, profile.nome, nomeFam, contexto)
      await recarregarDespesasFixas(fid, contexto)
    }
    setLoading(false)
  }

  function trocarContexto(novo: { tipo: 'pessoal' | 'empresa'; empresaId?: string; nome: string }) {
    setContextoAtivo(novo)
    setContextoAberto(false)
    try { localStorage.setItem('finify_contexto', JSON.stringify(novo)) } catch {}
    recarregarContas(familiaIdRef.current, novo)
    carregarLancamentos(familiaIdRef.current, membroAtual, familiaNome, novo)
    recarregarDespesasFixas(familiaIdRef.current, novo)
  }

  // Contas e cartões seguem o contexto, igual a lancamentos e despesas_fixas.
  // Sem isso, o cartão cadastrado no CNPJ aparecia na tela da família e a fatura
  // dele era comparada com o saldo da conta corrente pessoal.
  async function recarregarContas(fid: string, contexto?: { tipo: 'pessoal' | 'empresa'; empresaId?: string }) {
    if (!fid) return
    const ctx = contexto || contextoAtivo
    let query = supabase.from('contas').select('*').eq('familia_id', fid)
    query = ctx.tipo === 'empresa' && ctx.empresaId
      ? query.eq('empresa_id', ctx.empresaId)
      : query.is('empresa_id', null)
    const { data } = await query.order('created_at', { ascending: true })
    const lista = data || []
    setContas(lista)
    const contaCorrente = lista.find((c: any) => c.tipo === 'corrente')
    setContaSelecionadaId(contaCorrente?.id || '')
    // As faturas pendentes e o saldo são recalculados pelos efeitos que observam `contas`.
  }

  async function recarregarDespesasFixas(fid: string, contexto?: { tipo: 'pessoal' | 'empresa'; empresaId?: string }) {
    const ctx = contexto || contextoAtivo
    let query = supabase.from('despesas_fixas').select('*')
      .eq('familia_id', fid).eq('ativo', true)
    query = ctx.tipo === 'empresa' && ctx.empresaId
      ? query.eq('empresa_id', ctx.empresaId)
      : query.is('empresa_id', null)
    const { data } = await query.order('dia_vencimento', { ascending: true })
    if (data) setDespesasFixas(data)
  }

  async function carregarLancamentos(fid: string, nomeUsuario?: string, nomeFamilia?: string, contexto?: { tipo: 'pessoal' | 'empresa'; empresaId?: string }) {
    if (!fid) return
    const ctx = contexto || contextoAtivo
    const ini = dataLocalISO(new Date(mesRef.getFullYear(), mesRef.getMonth(), 1))
    const fim = dataLocalISO(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0))
    let query = supabase.from('lancamentos').select('*')
      .eq('familia_id', fid).gte('data', ini).lte('data', fim)
    query = ctx.tipo === 'empresa' && ctx.empresaId
      ? query.eq('empresa_id', ctx.empresaId)
      : query.is('empresa_id', null)
    const { data: lanc } = await query
      .order('data', { ascending: false }).order('hora', { ascending: false })
    if (lanc) {
      setLancamentos(lanc)
      const s = new Set<string>()
      lanc.forEach((l: any) => { if (l.membro) s.add(l.membro) })
      if (nomeUsuario) s.add(nomeUsuario)
      if (nomeFamilia) s.add(`Família ${nomeFamilia}`)
      setMembros(Array.from(s))
    }
  }

  function mudarMes(delta: number) {
    setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + delta, 1))
  }

  function abrirModalNovo() {
    setEditando(null)
    setTipo('despesa'); setValor('')
    setCategoria(contextoAtivo.tipo === 'empresa' ? CATEGORIAS_EMPRESA_DESPESA[0] : 'Alimentação')
    setDataLanc(dataLocalISO(new Date()))
    setMembroForm(membroAtual); setDizimar(false)
    setObservacao(''); setParcelado(false); setNumParcelas('2'); setDiaParcela('1')
    setPosicaoAporteId('')
    setMetaAporteId('')
    setModoAporte('posicao')
    const contaCorrente = contas.find(c => c.tipo === 'corrente')
    setContaSelecionadaId(contaCorrente?.id || '')
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function abrirModalEditar(l: any) {
    setEditando(l); setTipo(l.tipo)
    const vf = Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setValor(vf); setCategoria(l.categoria); setDataLanc(l.data)
    setMembroForm(l.membro); setDizimar(l.dizimar !== false)
    setObservacao(l.descricao || '')
    setParcelado(false); setNumParcelas('2'); setDiaParcela('1')
    setPosicaoAporteId(l.posicao_investimento_id || '')
    setMetaAporteId(l.meta_id || '')
    setModoAporte(l.meta_id ? 'meta' : 'posicao')
    const contaCorrente = contas.find(c => c.tipo === 'corrente')
    setContaSelecionadaId(l.conta_id || contaCorrente?.id || '')
    setConfirmDelete(false)
    setModalOpen(true)
  }

  function handleTipo(t: 'despesa' | 'receita') {
    setTipo(t)
    if (contextoAtivo.tipo === 'empresa') {
      setCategoria(t === 'despesa' ? CATEGORIAS_EMPRESA_DESPESA[0] : CATEGORIAS_EMPRESA_RECEITA[0])
      setDizimar(false) // receita de PJ não dizima por padrão — só se marcado manualmente
    } else {
      setCategoria(t === 'despesa' ? 'Alimentação' : 'Salário')
      setDizimar(t === 'receita')
    }
    setParcelado(false)
  }

  function ehCategoriaInvestimento(cat: string) {
    return cat === 'Investimento' || cat === 'Investimentos'
  }

  // Aplica um aporte numa posição específica de Renda Fixa, vinculado ao lançamento que o originou.
  // Substitui a sincronização antiga (que apontava pra tabela investimentos, já descontinuada).
  async function aplicarAporteEmPosicao(posicaoId: string, lancamentoId: string, valor: number, data: string) {
    if (!posicaoId) return
    await supabase.from('aportes_posicao').insert({
      posicao_id: posicaoId, lancamento_id: lancamentoId, valor, data_aporte: data,
    })
  }

  // Remove qualquer aporte já vinculado a esse lançamento (usado antes de recriar, na edição,
  // ou sozinho, na exclusão).
  async function removerAporteDoLancamento(lancamentoId: string) {
    await supabase.from('aportes_posicao').delete().eq('lancamento_id', lancamentoId)
  }

  async function carregarFaturasPendentes(fid: string, listaContas: any[]) {
    const cartoes = listaContas.filter((c: any) => c.tipo === 'cartao_credito')
    if (cartoes.length === 0) { setFaturasPendentes({}); return }
    const { data } = await supabase.from('lancamentos').select('conta_id, valor, data')
      .eq('familia_id', fid).eq('tipo', 'despesa').eq('fatura_paga', false)
      .in('conta_id', cartoes.map((c: any) => c.id))
    // Essa conta é sempre "de agora" — compara o saldo disponível hoje com a fatura que
    // está sendo formada neste momento (não com o mês que está sendo navegado na tela).
    // Precisa usar o dia de FECHAMENTO (não o de vencimento) pra decidir se a fatura em
    // formação já virou a do mês seguinte — é o mesmo critério usado ao lançar uma compra
    // nova (handleSalvar). Se usássemos o vencimento aqui, ficaria descompassado: uma
    // compra lançada hoje já cai na fatura do mês seguinte (pelo fechamento), mas essa
    // conta só empurraria pro mês seguinte depois que a data de hoje passasse do
    // vencimento — bem mais tarde — ignorando itens que já existem pra frente.
    const hoje = new Date()
    const totais: Record<string, number> = {}
    ;(data || []).forEach((l: any) => {
      const cartao = cartoes.find((c: any) => c.id === l.conta_id)
      if (!cartao?.dia_vencimento) {
        totais[l.conta_id] = (totais[l.conta_id] || 0) + Number(l.valor)
        return
      }
      const diaCorte = cartao.dia_fechamento || cartao.dia_vencimento
      let vencimentoAtual = new Date(hoje.getFullYear(), hoje.getMonth(), cartao.dia_vencimento)
      if (hoje.getDate() > diaCorte) {
        vencimentoAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, cartao.dia_vencimento)
      }
      const vencimentoAtualStr = dataLocalISO(vencimentoAtual)
      if (l.data <= vencimentoAtualStr) {
        totais[l.conta_id] = (totais[l.conta_id] || 0) + Number(l.valor)
      }
    })
    setFaturasPendentes(totais)
  }

  // Saldo da conta = exatamente o número que você digitar, sem somar nenhum lançamento.
  // Simples assim de propósito — você atualiza esse valor quando quiser (olhando o extrato
  // real do banco), e a gente só compara ele direto com a fatura pendente.
  async function carregarSaldoContaReal(fid: string, listaContas: any[]) {
    const contaCorrente = listaContas.find((c: any) => c.tipo === 'corrente')
    if (!contaCorrente || contaCorrente.saldo_inicial == null) { setSaldoContaReal(null); return }
    setSaldoContaReal(Number(contaCorrente.saldo_inicial))
  }

  async function handleSalvarSaldoConta() {
    const contaCorrente = contas.find(c => c.tipo === 'corrente')
    if (!contaCorrente || !saldoInicialInput) return
    setSalvandoSaldoConta(true)
    const payload = {
      saldo_inicial: Number(saldoInicialInput.replace(',', '.')),
    }
    const { data: contaAtualizada, error } = await supabase.from('contas')
      .update(payload).eq('id', contaCorrente.id).select().single()
    if (!error && contaAtualizada) {
      const novasContas = contas.map(c => c.id === contaCorrente.id ? contaAtualizada : c)
      setContas(novasContas)
      await carregarSaldoContaReal(familiaIdRef.current, novasContas)
      setModalSaldoContaOpen(false)
    } else {
      console.error('Erro ao salvar saldo da conta:', error)
    }
    setSalvandoSaldoConta(false)
  }

  function abrirModalSaldoConta() {
    const contaCorrente = contas.find(c => c.tipo === 'corrente')
    setSaldoInicialInput(contaCorrente?.saldo_inicial != null ? String(contaCorrente.saldo_inicial) : '')
    setModalSaldoContaOpen(true)
  }

  async function handleCriarCartao() {
    if (!novoCartaoNome.trim()) return
    setSalvandoCartao(true)
    const payload = {
      nome: novoCartaoNome.trim(),
      dia_fechamento: novoCartaoFechamento ? parseInt(novoCartaoFechamento) : null,
      dia_vencimento: novoCartaoVencimento ? parseInt(novoCartaoVencimento) : null,
    }

    if (editandoCartaoId) {
      const { data: contaAtualizada, error } = await supabase.from('contas')
        .update(payload).eq('id', editandoCartaoId).select().single()
      if (!error && contaAtualizada) {
        setContas(prev => prev.map(c => c.id === editandoCartaoId ? contaAtualizada : c))
        fecharModalCartao()
      }
    } else {
      // O cartão nasce no contexto em que foi criado: dentro de uma empresa ele fica
      // vinculado ao CNPJ e não aparece mais no fluxo pessoal.
      const { data: novaConta, error } = await supabase.from('contas').insert({
        familia_id: familiaIdRef.current, tipo: 'cartao_credito',
        empresa_id: contextoAtivo.tipo === 'empresa' ? contextoAtivo.empresaId : null,
        ...payload,
      }).select().single()
      if (!error && novaConta) {
        setContas(prev => [...prev, novaConta])
        setContaSelecionadaId(novaConta.id)
        fecharModalCartao()
      }
    }
    setSalvandoCartao(false)
  }

  function fecharModalCartao() {
    setNovoCartaoOpen(false)
    setEditandoCartaoId(null)
    setConfirmDeleteCartao(false)
    setNovoCartaoNome(''); setNovoCartaoFechamento(''); setNovoCartaoVencimento('')
  }

  function abrirEditarCartao(c: any) {
    setEditandoCartaoId(c.id)
    setNovoCartaoNome(c.nome)
    setNovoCartaoFechamento(c.dia_fechamento ? String(c.dia_fechamento) : '')
    setNovoCartaoVencimento(c.dia_vencimento ? String(c.dia_vencimento) : '')
    setConfirmDeleteCartao(false)
    setNovoCartaoOpen(true)
  }

  async function handleDeletarCartao() {
    if (!editandoCartaoId) return
    if (!confirmDeleteCartao) { setConfirmDeleteCartao(true); return }
    setDeletandoCartao(true)
    const { error } = await supabase.from('contas').delete().eq('id', editandoCartaoId)
    setDeletandoCartao(false)
    if (!error) {
      setContas(prev => prev.filter(c => c.id !== editandoCartaoId))
      fecharModalCartao()
    }
  }

  // Paga a fatura de um cartão: soma tudo que ainda não foi pago nele e cria UM lançamento
  // único saindo da conta corrente — igual acontece de verdade no extrato do banco. As compras
  // individuais do cartão continuam existindo (pra categoria), só passam a contar como "pagas".
  // Mostra os lançamentos daquele cartão só do mês que está sendo visualizado — clica de novo pra fechar.
  async function toggleDetalheCartao(cartaoId: string) {
    if (cartaoDetalhado === cartaoId) { setCartaoDetalhado(null); return }
    setCartaoDetalhado(cartaoId)
    setCarregandoDetalheCartao(true)
    const ini = dataLocalISO(new Date(mesRef.getFullYear(), mesRef.getMonth(), 1))
    const fim = dataLocalISO(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0))
    const { data } = await supabase.from('lancamentos').select('*')
      .eq('familia_id', familiaIdRef.current).eq('conta_id', cartaoId)
      .gte('data', ini).lte('data', fim)
      .order('data', { ascending: false })
    setItensCartaoDetalhe(data || [])
    setCarregandoDetalheCartao(false)
  }

  async function handlePagarFatura(cartaoId: string) {
    setPagandoFatura(cartaoId)
    setErroFatura('')
    setErroFaturaCartaoId(null)
    const fid = familiaIdRef.current
    const contaCorrente = contas.find(c => c.tipo === 'corrente')
    if (!contaCorrente) {
      setErroFatura('Nenhuma conta corrente encontrada para debitar o pagamento.')
      setErroFaturaCartaoId(cartaoId)
      setPagandoFatura(null)
      return
    }

    const cartao = contas.find(c => c.id === cartaoId)
    const { data: todosPendentes, error: erroBusca } = await supabase.from('lancamentos').select('id, valor, data')
      .eq('familia_id', fid).eq('conta_id', cartaoId).eq('tipo', 'despesa').eq('fatura_paga', false)

    if (erroBusca) {
      console.error('Erro ao buscar lançamentos pendentes da fatura:', erroBusca)
      setErroFatura('Não foi possível carregar a fatura. Tente novamente.')
      setErroFaturaCartaoId(cartaoId)
      setPagandoFatura(null)
      return
    }

    // Mesma lógica do card: só quita o que é da fatura atual (mesmo antes do vencimento
    // chegar) — parcela de fatura realmente futura fica pra ser paga na hora dela.
    const hoje = new Date()
    let pendentes = todosPendentes || []
    if (cartao?.dia_vencimento) {
      let vencimentoAtual = new Date(hoje.getFullYear(), hoje.getMonth(), cartao.dia_vencimento)
      if (hoje.getDate() > cartao.dia_vencimento) {
        vencimentoAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, cartao.dia_vencimento)
      }
      const vencimentoAtualStr = dataLocalISO(vencimentoAtual)
      pendentes = pendentes.filter((l: any) => l.data <= vencimentoAtualStr)
    }

    const total = pendentes.reduce((s: number, l: any) => s + Number(l.valor), 0)
    if (total <= 0) { setPagandoFatura(null); return }

    const agora = new Date()
    const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

    const { data: lancamentoPagamento, error } = await supabase.from('lancamentos').insert({
      familia_id: fid, user_id: userId, tipo: 'despesa', valor: total,
      categoria: 'Cartão de Crédito', membro: membroAtual,
      data: dataLocalISO(agora), hora, dizimar: false,
      conta_id: contaCorrente.id, fatura_paga: true,
      descricao: `Pagamento de fatura — ${cartao?.nome || 'Cartão'}`,
    }).select().single()

    if (error) {
      console.error('Erro ao registrar pagamento de fatura:', error)
      setErroFatura(error.message || 'Não foi possível registrar o pagamento. Tente novamente.')
      setErroFaturaCartaoId(cartaoId)
      setPagandoFatura(null)
      return
    }

    // Marca as compras originais como pagas. Se isso falhar, o débito acima fica "órfão"
    // (dinheiro já saiu, mas os itens continuam pendentes) — nesse caso desfazemos o
    // lançamento de pagamento pra não cobrar em duplicidade numa nova tentativa.
    const ids = pendentes.map((l: any) => l.id)
    const { error: erroUpdate, count } = await supabase.from('lancamentos')
      .update({ fatura_paga: true }, { count: 'exact' }).in('id', ids)

    if (erroUpdate || count !== ids.length) {
      console.error('Erro ao marcar itens da fatura como pagos:', erroUpdate, { esperado: ids.length, atualizado: count })
      await supabase.from('lancamentos').delete().eq('id', lancamentoPagamento.id)
      setErroFatura('O pagamento não pôde ser concluído (falha ao atualizar os itens da fatura). Nada foi debitado — verifique as permissões (RLS) da tabela de lançamentos e tente novamente.')
      setErroFaturaCartaoId(cartaoId)
      setPagandoFatura(null)
      await carregarLancamentos(fid)
      await carregarFaturasPendentes(fid, contas); await carregarSaldoContaReal(fid, contas)
      return
    }

    await carregarLancamentos(fid)
    await carregarFaturasPendentes(fid, contas); await carregarSaldoContaReal(fid, contas)
    setPagandoFatura(null)
  }

  async function ajustarValorAtualMeta(metaId: string | null | undefined, delta: number) {
    if (!metaId || delta === 0) return
    const { data: meta } = await supabase.from('metas').select('valor_atual').eq('id', metaId).maybeSingle()
    if (!meta) return // meta pode ter sido deletada — lançamento fica órfão, sem erro
    const novoValor = Math.max(Number(meta.valor_atual) + delta, 0)
    await supabase.from('metas').update({ valor_atual: novoValor }).eq('id', metaId)
  }

  async function handleSalvar() {
    if (!valor) return
    setSalvando(true)
    const valorNum = parseFloat(valor.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) { setSalvando(false); return }
    const fid  = familiaIdRef.current
    const agora = new Date()
    const hora  = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`
    const empresaId = contextoAtivo.tipo === 'empresa' ? contextoAtivo.empresaId : null
    const ehInvestimentoAgora = ehCategoriaInvestimento(categoria) && tipo === 'despesa'
    const posicaoParaAporte = ehInvestimentoAgora && posicaoAporteId ? posicaoAporteId : null

    // Compra em cartão de crédito só sai da conta corrente quando a fatura é paga —
    // até lá, fatura_paga fica false e o lançamento não conta no Saldo em conta.
    const contaEscolhida = contas.find(c => c.id === contaSelecionadaId)
    const faturaPagaValor = tipo === 'despesa' ? (contaEscolhida?.tipo !== 'cartao_credito') : true

    // Regra de fechamento só se aplica ao CRIAR um lançamento novo, quando "dataLanc" é a
    // data real da compra digitada agora. Ao EDITAR, o formulário já foi preenchido com a
    // data de vencimento da fatura em que o item está (não a data da compra original) — se
    // reaplicássemos a mesma regra aqui, empurraríamos a fatura mais um mês pra frente a
    // cada edição (bug: item "sumia" da tela porque ia parar silenciosamente no mês seguinte).
    let dataFinal = dataLanc
    if (!editando && tipo === 'despesa' && contaEscolhida?.tipo === 'cartao_credito' && contaEscolhida.dia_vencimento) {
      const dataCompra = new Date(dataLanc + 'T12:00:00')
      let mesFatura = dataCompra.getMonth()
      if (contaEscolhida.dia_fechamento && dataCompra.getDate() > contaEscolhida.dia_fechamento) {
        mesFatura += 1
      }
      dataFinal = dataLocalISO(new Date(dataCompra.getFullYear(), mesFatura, contaEscolhida.dia_vencimento))
    }

    if (editando) {
      const { error } = await supabase.from('lancamentos').update({
        tipo, valor: valorNum, categoria, membro: membroForm, data: dataFinal,
        dizimar: tipo === 'receita' ? dizimar : false,
        descricao: observacao || null,
        posicao_investimento_id: posicaoParaAporte,
        conta_id: contaSelecionadaId || null,
        fatura_paga: faturaPagaValor,
      }).eq('id', editando.id)

      if (!error) {
        // Sempre remove o aporte antigo vinculado (se existia) e recria do zero — mais simples
        // e seguro que tentar "diferenciar" o que mudou (valor, data ou a posição escolhida).
        await removerAporteDoLancamento(editando.id)
        if (posicaoParaAporte) await aplicarAporteEmPosicao(posicaoParaAporte, editando.id, valorNum, dataFinal)
        if (editando.meta_id) await ajustarValorAtualMeta(editando.meta_id, valorNum - Number(editando.valor))

        // Propaga pras demais parcelas da mesma compra (nome, categoria, conta) — mas NÃO
        // valor, data nem fatura_paga, que são legitimamente diferentes/individuais por parcela.
        if (editando.grupo_parcela_id) {
          const novoPrefixo = (observacao || '').replace(/\s*Parcela\s+\d+\/\d+\s*$/i, '').trim()
          const { data: irmas } = await supabase.from('lancamentos').select('id, descricao')
            .eq('grupo_parcela_id', editando.grupo_parcela_id).neq('id', editando.id)
          for (const irma of irmas || []) {
            const tailMatch = (irma.descricao || '').match(/Parcela\s+\d+\/\d+\s*$/i)
            const tail = tailMatch ? tailMatch[0] : ''
            const novaDescricao = novoPrefixo ? `${novoPrefixo} ${tail}`.trim() : (tail || null)
            await supabase.from('lancamentos').update({
              categoria, membro: membroForm, conta_id: contaSelecionadaId || null,
              descricao: novaDescricao,
            }).eq('id', irma.id)
          }
        }
      }
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid); await carregarFaturasPendentes(fid, contas); await carregarSaldoContaReal(fid, contas) }
    } else if (parcelado && tipo === 'despesa') {
      // Lançamento parcelado — cria N lançamentos. Aporte automático em posição não se aplica
      // aqui (compra parcelada não é, na prática, um aporte de investimento recorrente).
      const n = parseInt(numParcelas) || 2
      const valorParcela = valorNum / n
      const dataCompra = new Date(dataLanc + 'T12:00:00')

      // Regra de fechamento de fatura: se o cartão tem dia_fechamento configurado e a compra
      // aconteceu DEPOIS desse dia, a fatura do mês corrente já fechou — a primeira parcela
      // (e todas as seguintes) empurram um mês pra frente. Cada parcela cai no dia de
      // vencimento do cartão, não numa data digitada à mão.
      let mesBase = dataCompra.getMonth()
      let anoBase = dataCompra.getFullYear()
      let dia = 1
      if (contaEscolhida?.tipo === 'cartao_credito') {
        if (contaEscolhida.dia_fechamento && dataCompra.getDate() > contaEscolhida.dia_fechamento) {
          mesBase += 1
        }
        dia = contaEscolhida.dia_vencimento || dataCompra.getDate()
      } else {
        dia = dataCompra.getDate()
      }

      const inserts = []
      const grupoParcelaId = crypto.randomUUID()
      for (let i = 0; i < n; i++) {
        const d = new Date(anoBase, mesBase + i, dia)
        const dataStr = dataLocalISO(d)
        inserts.push({
          familia_id: fid, user_id: userId, tipo: 'despesa',
          valor: Math.round(valorParcela * 100) / 100,
          categoria, membro: membroForm, data: dataStr, hora,
          dizimar: false, empresa_id: empresaId,
          conta_id: contaSelecionadaId || null,
          fatura_paga: faturaPagaValor,
          grupo_parcela_id: grupoParcelaId,
          descricao: `${observacao ? observacao + ' ' : ''}Parcela ${i + 1}/${n}`,
        })
      }
      const { error } = await supabase.from('lancamentos').insert(inserts)
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid); await carregarFaturasPendentes(fid, contas); await carregarSaldoContaReal(fid, contas) }
    } else {
      // Despesa "Investimentos" alocada pra uma meta usa o mesmo fluxo único do botão
      // "Aportar" da tela de Metas — trata meta automática, data de hoje, descrição padrão etc.
      // Não passa pelo insert genérico abaixo (evita divergir dos dois fluxos de novo).
      if (ehInvestimentoAgora && modoAporte === 'meta' && metaAporteId) {
        const meta = metas.find((m: any) => m.id === metaAporteId)
        if (meta) {
          try {
            await aportarEmMeta({ supabase, meta, valor: valorNum, familiaId: fid, userId, membroAtual })
            setSalvando(false)
            setModalOpen(false)
            await carregarLancamentos(fid)
            return
          } catch (e) {
            console.log('Erro ao aportar em meta:', e)
            setSalvando(false)
            return
          }
        }
      }

      const { data: novoLancamento, error } = await supabase.from('lancamentos').insert({
        familia_id: fid, user_id: userId, tipo, valor: valorNum,
        categoria, membro: membroForm, data: dataFinal, hora,
        dizimar: tipo === 'receita' ? dizimar : false,
        empresa_id: empresaId,
        descricao: observacao || null,
        posicao_investimento_id: posicaoParaAporte,
        conta_id: contaSelecionadaId || null,
        fatura_paga: faturaPagaValor,
      }).select().single()

      if (!error && novoLancamento && posicaoParaAporte) {
        await aplicarAporteEmPosicao(posicaoParaAporte, novoLancamento.id, valorNum, dataFinal)
      }
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid); await carregarFaturasPendentes(fid, contas); await carregarSaldoContaReal(fid, contas) }
    }
  }

  async function handleDeletar() {
    if (!editando) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('lancamentos').delete().eq('id', editando.id)
    if (!error && editando.posicao_investimento_id) {
      await removerAporteDoLancamento(editando.id)
    }
    if (!error && editando.meta_id) {
      await ajustarValorAtualMeta(editando.meta_id, -Number(editando.valor))
    }
    setDeletando(false)
    if (!error) {
      setLancamentos(prev => prev.filter((l: any) => l.id !== editando.id))
      setModalOpen(false)
      await carregarFaturasPendentes(familiaIdRef.current, contas); await carregarSaldoContaReal(familiaIdRef.current, contas)
    }
  }

  function abrirDfModalNovo() {
    setDfEditando(null); setDfNome(''); setDfValor('')
    setDfCategoria(contextoAtivo.tipo === 'empresa' ? CATEGORIAS_EMPRESA_DESPESA[0] : 'Moradia')
    setDfDia('5')
    setDfVariavel(false); setDfTipo('despesa')
    setDfConfirmDelete(false); setDfErro(''); setDfModalOpen(true)
  }

  function abrirDfModalEditar(df: any) {
    setDfEditando(df); setDfNome(df.nome)
    setDfValor(Number(df.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    setDfCategoria(df.categoria); setDfDia(String(df.dia_vencimento))
    setDfVariavel(!!df.valor_variavel); setDfTipo(df.tipo === 'receita' ? 'receita' : 'despesa')
    setDfConfirmDelete(false); setDfErro(''); setDfModalOpen(true)
  }

  function handleDfTipo(t: 'despesa' | 'receita') {
    setDfTipo(t)
    if (contextoAtivo.tipo === 'empresa') {
      setDfCategoria(t === 'despesa' ? CATEGORIAS_EMPRESA_DESPESA[0] : CATEGORIAS_EMPRESA_RECEITA[0])
    } else {
      setDfCategoria(t === 'despesa' ? 'Moradia' : 'Salário')
    }
  }

  async function handleSalvarDf() {
    if (!dfNome.trim() || !dfValor) return
    setDfSalvando(true)
    setDfErro('')
    const valorNum = parseFloat(dfValor.replace(/\./g, '').replace(',', '.'))
    const diaNum   = Math.min(31, Math.max(1, parseInt(dfDia) || 1))
    const fid = familiaIdRef.current
    const empresaId = contextoAtivo.tipo === 'empresa' ? contextoAtivo.empresaId : null

    if (dfEditando) {
      const { error } = await supabase.from('despesas_fixas').update({
        nome: dfNome.trim(), valor: valorNum, categoria: dfCategoria, dia_vencimento: diaNum, valor_variavel: dfVariavel, tipo: dfTipo,
      }).eq('id', dfEditando.id)
      setDfSalvando(false)
      if (!error) { setDfModalOpen(false); await recarregarDespesasFixas(fid) }
      else { console.error('Erro ao atualizar despesa fixa:', error); setDfErro(error.message || 'Não foi possível salvar. Tente novamente.') }
    } else {
      const { error } = await supabase.from('despesas_fixas').insert({
        familia_id: fid, user_id: userId, nome: dfNome.trim(), valor: valorNum,
        categoria: dfCategoria, dia_vencimento: diaNum, valor_variavel: dfVariavel, tipo: dfTipo, ativo: true,
        empresa_id: empresaId,
      })
      setDfSalvando(false)
      if (!error) { setDfModalOpen(false); await recarregarDespesasFixas(fid) }
      else { console.error('Erro ao criar despesa fixa:', error); setDfErro(error.message || 'Não foi possível salvar. Tente novamente.') }
    }
  }

  async function handleDeletarDf() {
    if (!dfEditando) return
    if (!dfConfirmDelete) { setDfConfirmDelete(true); return }
    setDfDeletando(true)
    setDfErro('')
    const { error } = await supabase.from('despesas_fixas').update({ ativo: false }).eq('id', dfEditando.id)
    setDfDeletando(false)
    if (!error) {
      setDespesasFixas(prev => prev.filter((d: any) => d.id !== dfEditando.id))
      setDfModalOpen(false)
    } else {
      console.error('Erro ao deletar despesa fixa:', error)
      setDfErro(error.message || 'Não foi possível deletar. Tente novamente.')
    }
  }

  function iniciarPagamento(df: any) {
    setDfErro('')
    if (df.valor_variavel) {
      setDfPagando(df)
      setValorPagar(Number(df.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      setPagarModalOpen(true)
    } else {
      efetivarPagamento(df, Number(df.valor))
    }
  }

  async function efetivarPagamento(df: any, valor: number) {
    setPagando(true)
    const fid   = familiaIdRef.current
    const agora = new Date()
    const hora  = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
    // Data real do pagamento (hoje), não a data de vencimento — evita lançamentos "no futuro"
    // já marcados como pagos quando você quita a conta antes do dia de vencer.
    const dataStr = dataLocalISO(agora)
    const ehReceita = df.tipo === 'receita'
    const { error } = await supabase.from('lancamentos').insert({
      familia_id: fid, user_id: userId, tipo: ehReceita ? 'receita' : 'despesa', valor,
      categoria: df.categoria, membro: membroAtual, data: dataStr, hora,
      dizimar: ehReceita && !df.empresa_id, descricao: null, despesa_fixa_id: df.id,
      empresa_id: df.empresa_id || null,
    })
    if (!error) {
      // Despesas fixas ainda não têm seletor de posição no cadastro — se quiser aplicar um
      // pagamento recorrente numa posição, edite o lançamento gerado aqui embaixo (em Movimentos)
      // e escolha a posição por lá.
      // Para valores variáveis, o valor confirmado vira a nova referência do próximo mês
      if (df.valor_variavel && valor !== Number(df.valor)) {
        await supabase.from('despesas_fixas').update({ valor }).eq('id', df.id)
        await recarregarDespesasFixas(fid)
      }
      await carregarLancamentos(fid)
      await carregarFaturasPendentes(fid, contas); await carregarSaldoContaReal(fid, contas)
    } else {
      console.error('Erro ao registrar pagamento:', error)
      setDfErro(error.message || 'Não foi possível registrar o pagamento. Tente novamente.')
    }
    setPagando(false)
    if (!error) setPagarModalOpen(false)
  }

  async function confirmarPagamentoVariavel() {
    if (!dfPagando || !valorPagar) return
    const valorNum = parseFloat(valorPagar.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) return
    await efetivarPagamento(dfPagando, valorNum)
  }

  async function desfazerPagamento(df: any) {
    if (!df.lancamento) return
    const { error } = await supabase.from('lancamentos').delete().eq('id', df.lancamento.id)
    if (!error) {
      if (df.lancamento.posicao_investimento_id) {
        await removerAporteDoLancamento(df.lancamento.id)
      }
      await carregarLancamentos(familiaIdRef.current)
    }
    else console.error('Erro ao desfazer pagamento:', error)
  }

  const fixasDoMes = despesasFixas.map((df: any) => {
    const lanc = lancamentos.find((l: any) => l.despesa_fixa_id === df.id)
    const hoje = new Date()
    const ehMesAtual = hoje.getFullYear() === mesRef.getFullYear() && hoje.getMonth() === mesRef.getMonth()
    const atrasada = !lanc && ehMesAtual && hoje.getDate() > df.dia_vencimento
    return { ...df, tipo: df.tipo === 'receita' ? 'receita' : 'despesa', lancamento: lanc, pago: !!lanc, atrasada }
  })
  const fixasDespesas = fixasDoMes.filter((f: any) => f.tipo === 'despesa')
  const fixasReceitas = fixasDoMes.filter((f: any) => f.tipo === 'receita')
  const totalDespesasFixasPendentes = fixasDespesas.filter((f: any) => !f.pago).reduce((s: number, f: any) => s + Number(f.valor), 0)
  const totalReceitasFixasPendentes = fixasReceitas.filter((f: any) => !f.pago).reduce((s: number, f: any) => s + Number(f.valor), 0)

  // Fluxo de caixa projetado do mês
  const hojeProj      = new Date()
  const diasNoMes     = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).getDate()
  const ehMesAtualProj = hojeProj.getFullYear() === mesRef.getFullYear() && hojeProj.getMonth() === mesRef.getMonth()
  const percorridoMes = ehMesAtualProj ? Math.round((Math.min(hojeProj.getDate(), diasNoMes) / diasNoMes) * 100) : 100

  const idsCartoes = new Set(contas.filter((c: any) => c.tipo === 'cartao_credito').map((c: any) => c.id))

  const filtrados = lancamentos.filter(l => {
    if (idsCartoes.has(l.conta_id)) return false // lançamentos de cartão só aparecem dentro do card da fatura, não duplicados aqui
    if (filtro !== 'todos' && l.tipo !== filtro) return false
    if (filtroMembro !== 'todos' && l.membro !== filtroMembro) return false
    if (filtroCategoria !== 'todos' && l.categoria !== filtroCategoria) return false
    if (busca.trim() && !(l.descricao || '').toLowerCase().includes(busca.trim().toLowerCase())) return false
    return true
  })

  const categoriasPresentes = Array.from(new Set(
    lancamentos
      .filter(l => !idsCartoes.has(l.conta_id))
      .filter(l => filtro === 'todos' || l.tipo === filtro)
      .map(l => l.categoria)
  )).sort()

  const grupos: Record<string, any[]> = {}
  filtrados.forEach(l => {
    if (!grupos[l.data]) grupos[l.data] = []
    grupos[l.data].push(l)
  })
  const diasOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  // A lista é agrupada por SEMANA e vem recolhida. Um mês com muitos lançamentos
  // virava uma lista interminável; assim a tela cabe de uma vez e você abre só a
  // semana que quer olhar. A semana corrente vem aberta — é onde está o que você
  // acabou de lançar. Semana começa no domingo, como no calendário brasileiro.
  const semanaAtualKey = inicioSemana(dataLocalISO(new Date()))

  function semanaEstaAberta(key: string) {
    if (key in semanaOverride) return semanaOverride[key]
    return key === semanaAtualKey
  }
  function toggleSemana(key: string) {
    setSemanaOverride(prev => ({ ...prev, [key]: !semanaEstaAberta(key) }))
  }

  const semanas = (() => {
    const mapa: Record<string, string[]> = {}
    diasOrdenados.forEach(dia => {
      const k = inicioSemana(dia)
      if (!mapa[k]) mapa[k] = []
      mapa[k].push(dia)
    })
    return Object.keys(mapa).sort((a, b) => b.localeCompare(a)).map(k => {
      const dias = mapa[k]
      const itens = dias.flatMap(d => grupos[d])
      // Mesmo critério do total do dia: compra de cartão ainda não faturada
      // não entra no total da semana.
      const total = itens
        .filter((l: any) => l.tipo === 'receita' || l.fatura_paga !== false)
        .reduce((s: number, l: any) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
      const ini = new Date(k + 'T12:00:00')
      const fim = new Date(ini); fim.setDate(ini.getDate() + 6)
      return { key: k, dias, qtd: itens.length, total, label: labelSemana(ini, fim), atual: k === semanaAtualKey }
    })
  })()

  const totalRec = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
  // Aportes em investimento/meta não contam como despesa de consumo — mesma regra já aplicada
  // no Dashboard e na Linha do Tempo, pra "Resultado do mês" bater igual nas três telas.
  // Bate com o saldo real do banco: aportes em investimento/meta saíram fisicamente da conta,
  // então contam como despesa aqui (diferente da Reserva de Emergência no Dashboard, que
  // olha só despesa de consumo).
  // Compra em cartão de crédito conta como despesa NA HORA (regime de competência), pela
  // categoria REAL da compra (Alimentação, Transporte...) — não espera a fatura ser paga. O
  // lançamento consolidado "Pagamento de fatura" (categoria 'Cartão de Crédito', debitado da
  // conta corrente) é só transferência entre contas, descartado aqui pra não somar em dobro.
  const idsCartoesResumo = new Set(contas.filter((c: any) => c.tipo === 'cartao_credito').map((c: any) => c.id))
  const totalDes = lancamentos
    .filter(l => l.tipo === 'despesa')
    .filter(l => !(l.categoria === 'Cartão de Crédito' && !idsCartoesResumo.has(l.conta_id)))
    .reduce((s, l) => s + Number(l.valor), 0)
  const resultado = totalRec - totalDes

  // Quanto está comprometido nas faturas de cartão (soma de todos os cartões, regime de caixa).
  const totalFaturasPendentes  = Object.values(faturasPendentes).reduce((s, v) => s + v, 0)
  const mesLabel  = `${MESES[mesRef.getMonth()]} ${mesRef.getFullYear()}`
  const categorias = contextoAtivo.tipo === 'empresa'
    ? (tipo === 'despesa' ? CATEGORIAS_EMPRESA_DESPESA : CATEGORIAS_EMPRESA_RECEITA)
    : (tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA)

  const cartoes = contas.filter((c: any) => c.tipo === 'cartao_credito')

  // Categorias do modal: as que esta família mais usa primeiro, não as 20 em
  // ordem alfabética. A frequência vem dos lançamentos do mês carregado; sem
  // histórico, cai na ordem original da lista, que já começa pelas comuns.
  const categoriasVisiveis = (() => {
    if (categoriasTodas) return categorias
    const freq: Record<string, number> = {}
    lancamentos.forEach((l: any) => {
      if (l.tipo === tipo) freq[l.categoria] = (freq[l.categoria] || 0) + 1
    })
    const lista = categorias.slice()
      .sort((a, b) => (freq[b] || 0) - (freq[a] || 0) || categorias.indexOf(a) - categorias.indexOf(b))
      .slice(0, 6)
    // A categoria selecionada tem que estar sempre visível — senão, ao editar
    // um lançamento de categoria incomum, o chip marcado não apareceria.
    if (!lista.includes(categoria) && categorias.includes(categoria)) {
      lista.pop()
      lista.unshift(categoria)
    }
    return lista
  })()

  // A conta do bloco principal vive em src/lib/posicaoMes.ts de propósito:
  // Dashboard e Linha do Tempo leem os mesmos lançamentos e precisam do mesmo
  // cálculo (regra de consistência entre telas do CLAUDE.md).
  const posicao = calcularPosicaoMes({
    receitas: totalRec,
    despesas: totalDes,
    fixasNaoLancadas: totalDespesasFixasPendentes,
    faturasPendentes: totalFaturasPendentes,
    saldoConta: saldoContaReal,
  })

  const filtrosAtivos = [
    filtro !== 'todos',
    filtroMembro !== 'todos',
    filtroCategoria !== 'todos',
    !!busca.trim(),
  ].filter(Boolean).length

  function limparFiltros() {
    setFiltro('todos')
    setFiltroMembro('todos')
    setFiltroCategoria('todos')
    setBusca('')
  }

  // Só o que exige ação do usuário. Cada item abre o painel correspondente.
  const pendencias = (() => {
    const itens: any[] = []
    const algumaAtrasada = fixasDespesas.some((f: any) => f.atrasada)
    if (totalDespesasFixasPendentes > 0) {
      itens.push({
        key: 'fixas',
        Icon: Repeat,
        titulo: algumaAtrasada ? 'Despesa fixa em atraso' : 'Despesas fixas em aberto',
        valor: fmt(totalDespesasFixasPendentes),
        detalhe: algumaAtrasada ? 'venceu e não foi paga' : 'a pagar neste mês',
        alerta: algumaAtrasada,
        painel: 'fixas' as const,
      })
    }
    cartoes.forEach((c: any) => {
      const pend = faturasPendentes[c.id] || 0
      if (pend <= 0) return
      itens.push({
        key: `cartao-${c.id}`,
        Icon: CreditCard,
        titulo: `Fatura ${c.nome}`,
        valor: fmt(pend),
        detalhe: c.dia_vencimento ? `vence dia ${c.dia_vencimento}` : 'na fatura atual',
        alerta: false,
        painel: 'cartoes' as const,
      })
    })
    return itens
  })()

  // Seção "Despesas Fixas" — compartilhada entre mobile e desktop
  const despesasFixasSection = (isMob: boolean) => (
    <div style={{ marginBottom: isMob ? '16px' : '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        {/* Sem colapso interno: quem abre e fecha esta seção agora é o painel
            de pendências. Dois níveis de recolher na mesma coisa confundia. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Repeat size={isMob ? 14 : 16} color="#6B7280" strokeWidth={1.75} />
          <span style={{ fontSize: isMob ? '13px' : '15px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.2px' }}>Despesas Fixas</span>
          {totalDespesasFixasPendentes > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#B91C1C', backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', padding: '5px 12px', borderRadius: '999px', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(totalDespesasFixasPendentes)} a pagar
            </span>
          )}
        </div>
        <button onClick={abrirDfModalNovo} className="df-new-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#0B3B2E', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '6px 12px', cursor: 'pointer' }}>
          <Plus size={14} strokeWidth={2.5} /> Nova
        </button>
      </div>

      {fixasDespesas.length === 0 ? (
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Nenhuma despesa fixa cadastrada.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
          {fixasDespesas.map((df: any, i: number) => {
            const Icon = ICONES_CAT[df.categoria] || MoreHorizontal
            return (
              <div key={df.id} className="df-card"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMob ? '12px 14px' : '14px 20px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
                <button onClick={() => abrirDfModalEditar(df)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(11,59,46,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color="#0B3B2E" strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{df.nome}</p>
                      {df.valor_variavel && (
                        <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#94A3B8', border: '1px solid #E5E7EB', borderRadius: '5px', padding: '1px 5px', flexShrink: 0 }}>VARIÁVEL</span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
                      Vence dia {df.dia_vencimento} · {df.valor_variavel && !df.pago ? '~' : ''}{fmt(Number(df.valor))}
                    </p>
                  </div>
                </button>
                {df.pago ? (
                  <button onClick={() => desfazerPagamento(df)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(47,179,106,0.25)', backgroundColor: 'rgba(47,179,106,0.12)', color: '#2FB36A', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    <CheckCircle2 size={12} strokeWidth={2} /> Pago
                  </button>
                ) : (
                  <button onClick={() => iniciarPagamento(df)}
                    style={{ padding: '5px 14px', borderRadius: '999px', border: df.atrasada ? '1px solid rgba(239,68,68,0.25)' : '1px solid #E5E7EB', backgroundColor: df.atrasada ? 'rgba(239,68,68,0.10)' : '#F7F8FA', color: df.atrasada ? '#EF4444' : '#64748B', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                    {df.atrasada ? 'Atrasada' : 'A pagar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Receitas fixas. O código já calculava `fixasReceitas` e nunca
          renderizava — uma receita fixa cadastrada não aparecia em lugar
          nenhum da tela. */}
      {fixasReceitas.length > 0 && (
        <div style={{ marginTop: isMob ? '16px' : '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ArrowDownLeft size={isMob ? 14 : 16} color="#6B7280" strokeWidth={1.75} />
            <span style={{ fontSize: isMob ? '13px' : '15px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.2px' }}>Receitas Fixas</span>
            {totalReceitasFixasPendentes > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', backgroundColor: '#F7F8FA', border: '1px solid #E5E7EB', padding: '5px 12px', borderRadius: '999px', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(totalReceitasFixasPendentes)} a receber
              </span>
            )}
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
            {fixasReceitas.map((rf: any, i: number) => {
              const Icon = ICONES_CAT[rf.categoria] || MoreHorizontal
              return (
                <div key={rf.id} className="df-card"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isMob ? '12px 14px' : '14px 20px', borderTop: i > 0 ? '1px solid #F7F8FA' : 'none' }}>
                  <button onClick={() => abrirDfModalEditar(rf)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: rf.pago ? 'rgba(47,179,106,0.10)' : '#F7F8FA', border: `1px solid ${rf.pago ? 'rgba(47,179,106,0.22)' : '#ECEFF3'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={rf.pago ? '#145A45' : '#6B7280'} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rf.nome}</p>
                        {rf.valor_variavel && (
                          <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '5px', padding: '1px 5px', flexShrink: 0 }}>VARIÁVEL</span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', fontVariantNumeric: 'tabular-nums' }}>
                        Entra dia {rf.dia_vencimento} · {rf.valor_variavel && !rf.pago ? '~' : ''}{fmt(Number(rf.valor))}
                      </p>
                    </div>
                  </button>
                  {rf.pago ? (
                    <button onClick={() => desfazerPagamento(rf)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(47,179,106,0.25)', backgroundColor: 'rgba(47,179,106,0.12)', color: '#0B3B2E', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      <CheckCircle2 size={12} strokeWidth={2} /> Recebido
                    </button>
                  ) : (
                    <button onClick={() => iniciarPagamento(rf)}
                      style={{ padding: '5px 14px', borderRadius: '999px', border: '1.5px solid #E5E7EB', backgroundColor: '#F7F8FA', color: '#374151', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      A receber
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // Seção "Faturas de Cartão" — compartilhada entre mobile e desktop, só aparece se houver cartões
  const faturasCartaoSection = (isMob: boolean) => {
    const cartoes = contas.filter((c: any) => c.tipo === 'cartao_credito')
    if (cartoes.length === 0) return null
    return (
      <div style={{ marginBottom: isMob ? '16px' : '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <CreditCard size={isMob ? 14 : 16} color="#64748B" strokeWidth={1.75} />
          <span style={{ fontSize: isMob ? '13px' : '15px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.2px' }}>Faturas de Cartão</span>
        </div>

        {/* Saldo real da conta corrente vs. fatura pendente — número literal e direto. */}
        {(() => {
          const contaCorrente = contas.find((c: any) => c.tipo === 'corrente')
          if (!contaCorrente) return null
          if (saldoContaReal === null) {
            return (
              <button onClick={abrirModalSaldoConta} style={{
                width: '100%', textAlign: 'left', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1',
                borderRadius: isMob ? '14px' : '16px', padding: isMob ? '14px' : '18px',
                marginBottom: '10px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Definir saldo da conta
                </span>
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '4px 0 0' }}>
                  Configure o saldo inicial pra comparar direto com a fatura pendente do cartão.
                </p>
              </button>
            )
          }
          const excedidoConta = saldoContaReal < totalFaturasPendentes
          return (
            <div style={{
              backgroundColor: '#fff', border: '1px solid #E2E8F0',
              borderRadius: isMob ? '14px' : '16px', padding: isMob ? '14px' : '18px',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Saldo em conta vs. fatura
                </span>
                <button onClick={abrirModalSaldoConta} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                  <Pencil size={13} strokeWidth={2} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: isMob ? '13px' : '14px', fontWeight: 700, color: '#0F172A' }}>
                  {fmt(saldoContaReal)} <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#94A3B8' }}>em conta</span>
                </span>
                <span style={{ fontSize: isMob ? '13px' : '14px', fontWeight: 700, color: '#0F172A' }}>
                  {fmt(totalFaturasPendentes)} <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#94A3B8' }}>na fatura</span>
                </span>
              </div>
              {/* Aqui mostra o PESO da fatura sobre o saldo, não um segundo
                  "sobra": quem responde quanto sobra é o bloco principal, que
                  já inclui as despesas fixas em aberto. Dois números chamados
                  "sobra" com escopos diferentes na mesma tela confundia. */}
              <div style={{ height: '8px', borderRadius: '999px', backgroundColor: '#F1F4F7', overflow: 'hidden', margin: '12px 0 8px' }}>
                <div style={{
                  width: `${saldoContaReal > 0 ? Math.min(100, Math.round((totalFaturasPendentes / saldoContaReal) * 100)) : 100}%`,
                  height: '8px', borderRadius: '999px',
                  backgroundColor: excedidoConta ? '#EF4444' : '#2FB36A', transition: 'width 0.2s',
                }} />
              </div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: excedidoConta ? '#B91C1C' : '#374151', margin: 0 }}>
                {excedidoConta
                  ? `Falta ${fmt(totalFaturasPendentes - saldoContaReal)} pra cobrir as faturas`
                  : `As faturas usam ${saldoContaReal > 0 ? Math.round((totalFaturasPendentes / saldoContaReal) * 100) : 0}% do saldo da conta`}
              </p>
            </div>
          )
        })()}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cartoes.map((c: any) => {
            const pendente = faturasPendentes[c.id] || 0
            const expandido = cartaoDetalhado === c.id
            return (
              <div key={c.id} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMob ? '12px 14px' : '14px 18px' }}>
                  <div>
                    <p style={{ fontSize: isMob ? '13px' : '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{c.nome}</p>
                    <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '2px 0 0' }}>
                      {pendente > 0 ? `${fmt(pendente)} na fatura atual` : 'Sem pendências'}
                      {' · '}
                      <button onClick={() => toggleDetalheCartao(c.id)} style={{ background: 'none', border: 'none', color: '#0E3B2E', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '11.5px' }}>
                        {expandido ? 'Ocultar' : 'Detalhar'}
                      </button>
                    </p>
                  </div>
                  {pendente > 0 && (
                    <button onClick={() => handlePagarFatura(c.id)} disabled={pagandoFatura === c.id}
                      style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#0E3B2E', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: pagandoFatura === c.id ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                      {pagandoFatura === c.id ? 'Pagando...' : 'Pagar fatura'}
                    </button>
                  )}
                  <button onClick={() => abrirEditarCartao(c)} title="Editar cartão"
                    style={{ width: '32px', height: '32px', borderRadius: '9px', border: '1px solid #E2E8F0', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}>
                    <Pencil size={13} color="#64748B" strokeWidth={1.75} />
                  </button>
                </div>
                {erroFatura && erroFaturaCartaoId === c.id && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderTop: '1px solid #FECACA',
                    borderRadius: '0', padding: '10px 14px', margin: 0,
                  }}>
                    <AlertTriangle size={14} color="#DC2626" strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '11.5px', color: '#B91C1C', margin: 0, lineHeight: 1.4 }}>{erroFatura}</p>
                  </div>
                )}
                {expandido && (
                  <div style={{ borderTop: '1px solid #F1F5F9' }}>
                    <p style={{ padding: '8px 14px 0', fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {mesLabel}
                    </p>
                    {carregandoDetalheCartao ? (
                      <p style={{ padding: '16px', fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' }}>Carregando...</p>
                    ) : itensCartaoDetalhe.length === 0 ? (
                      <p style={{ padding: '16px', fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' }}>Nenhum lançamento nesse cartão ainda.</p>
                    ) : (
                      itensCartaoDetalhe.map((l: any, i: number) => (
                        <button key={l.id} onClick={() => abrirModalEditar(l)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', background: 'none', border: i > 0 ? '1px solid #F1F5F9' : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12.5px', fontWeight: 500, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.descricao || l.categoria}</p>
                            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          </div>
                          <span style={{
                            fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', flexShrink: 0,
                            backgroundColor: l.fatura_paga ? '#ECFDF5' : '#FFFBEB',
                            color: l.fatura_paga ? '#2F8F68' : '#B7791F',
                          }}>
                            {l.fatura_paga ? 'Pago' : 'Pendente'}
                          </span>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#111827', flexShrink: 0, minWidth: '86px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(Number(l.valor))}
                          </span>
                        </button>
                      ))
                    )}
                    {/* Total da fatura: o detalhe listava as compras e deixava
                        a soma por fazer de cabeça. */}
                    {!carregandoDetalheCartao && itensCartaoDetalhe.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '11px 14px', borderTop: '1px solid #ECEFF3', backgroundColor: '#F7F8FA' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total da fatura</span>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827', minWidth: '86px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(itensCartaoDetalhe.reduce((s: number, l: any) => s + Number(l.valor), 0))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Blocos compartilhados entre desktop e mobile ──────────────────────────
  // Desktop e mobile chamam as MESMAS funções de propósito. O layout antigo
  // tinha dois blocos de JSX independentes e eles já tinham divergido: o card
  // "Resultado" era âmbar no desktop e verde/vermelho no mobile.

  // Bloco principal: um número lidera, em vez de três cards de peso igual.
  // Separa competência (o que o mês produziu) de caixa (o que ainda sai da conta).
  const blocoPosicao = (isMob: boolean) => (
    <div style={{
      background: 'linear-gradient(180deg, #06261F 0%, #0A342A 50%, #0D3F31 100%)',
      borderRadius: isMob ? '22px' : '24px',
      padding: isMob ? '22px 20px' : '26px 24px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(6,38,31,0.18)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '9px' }}>
        <p style={{ margin: 0, fontSize: '10.5px', fontWeight: 700, color: 'rgba(255,255,255,0.62)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          Resultado de {MESES[mesRef.getMonth()]}
        </p>
        {isMob && (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            <button onClick={() => mudarMes(-1)} aria-label="Mês anterior"
              style={{ width: '26px', height: '26px', border: 'none', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={14} color="#fff" strokeWidth={2} />
            </button>
            <button onClick={() => mudarMes(1)} aria-label="Mês seguinte"
              style={{ width: '26px', height: '26px', border: 'none', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={14} color="#fff" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <p style={{ margin: 0, fontSize: isMob ? '34px' : '40px', fontWeight: 700, color: '#fff', letterSpacing: isMob ? '-1.3px' : '-1.6px', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
        {loading ? '...' : `${posicao.resultado >= 0 ? '+' : '-'} ${fmt(Math.abs(posicao.resultado))}`}
      </p>

      <div style={{ height: '8px', margin: isMob ? '18px 0 8px' : '20px 0 9px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <div style={{ width: `${posicao.pctComprometido}%`, height: '8px', borderRadius: '999px', backgroundColor: corComprometimento(posicao.pctComprometido), transition: 'width 0.2s' }} />
      </div>
      <p style={{ margin: isMob ? '0 0 14px' : '0 0 18px', fontSize: isMob ? '11.5px' : '12px', color: 'rgba(255,255,255,0.72)' }}>
        {posicao.pctComprometido}% das receitas já comprometidas
      </p>

      {isMob ? (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '13px' }}>
          {[{ label: 'Receitas', val: posicao.receitas }, { label: 'Despesas', val: posicao.despesas }].map(c => (
            <div key={c.label} style={{ flex: '1 1 0', minWidth: 0, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '13px', padding: '11px 12px' }}>
              <p style={{ margin: '0 0 3px', fontSize: '11px', color: 'rgba(255,255,255,0.72)' }}>{c.label}</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.val)}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: '7px 0' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)' }}>Receitas</span>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(posicao.receitas)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: '7px 0' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)' }}>Despesas</span>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(posicao.despesas)}</span>
          </div>
        </>
      )}

      {posicao.fixasNaoLancadas > 0 && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: isMob ? '0 0 8px' : '7px 0' }}>
          <span style={{ fontSize: isMob ? '12.5px' : '13px', color: 'rgba(255,255,255,0.72)' }}>Fixas ainda não lançadas</span>
          <span style={{ fontSize: isMob ? '13px' : '13.5px', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>- {fmt(posicao.fixasNaoLancadas)}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: isMob ? '0' : '9px 0 0' }}>
        <span style={{ fontSize: isMob ? '12.5px' : '13px', fontWeight: 600, color: '#58D68D' }}>Resultado projetado</span>
        <span style={{ fontSize: isMob ? '14.5px' : '15px', fontWeight: 700, color: '#58D68D', fontVariantNumeric: 'tabular-nums' }}>
          {loading ? '...' : `${posicao.resultadoProjetado >= 0 ? '' : '- '}${fmt(Math.abs(posicao.resultadoProjetado))}`}
        </span>
      </div>

      {posicao.aSairDaConta > 0 && (
        <>
          <div style={{ height: '1px', margin: isMob ? '15px 0 12px' : '18px 0 14px', backgroundColor: 'rgba(255,255,255,0.12)' }} />
          <p style={{ margin: isMob ? '0 0 10px' : '0 0 11px', fontSize: isMob ? '10px' : '10.5px', fontWeight: 700, color: 'rgba(255,255,255,0.62)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            O que sai da conta
          </p>
          {saldoContaReal !== null && (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: '0 0 8px' }}>
              <span style={{ fontSize: isMob ? '12.5px' : '13px', color: 'rgba(255,255,255,0.72)' }}>Saldo em conta</span>
              <span style={{ fontSize: isMob ? '13px' : '13.5px', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(saldoContaReal)}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: '0 0 8px' }}>
            <span style={{ fontSize: isMob ? '12.5px' : '13px', color: 'rgba(255,255,255,0.72)' }}>Fixas + faturas a pagar</span>
            <span style={{ fontSize: isMob ? '13px' : '13.5px', fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmt(posicao.aSairDaConta)}</span>
          </div>
          {posicao.sobraDepois === null ? (
            <button onClick={abrirModalSaldoConta}
              style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: isMob ? '12.5px' : '13px', fontWeight: 600, color: '#58D68D', textDecoration: 'underline' }}>
              Definir saldo da conta para comparar
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: isMob ? '12.5px' : '13px', fontWeight: 600, color: posicao.saldoInsuficiente ? '#FCA5A5' : '#58D68D' }}>
                {posicao.saldoInsuficiente ? 'Falta para cobrir' : 'Sobra depois disso'}
              </span>
              <span style={{ fontSize: isMob ? '14.5px' : '15px', fontWeight: 700, color: posicao.saldoInsuficiente ? '#FCA5A5' : '#58D68D', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(Math.abs(posicao.sobraDepois))}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )

  // Pendências: substitui as três seções que antes ficavam sempre abertas
  // acima da lista. Só o que exige ação aparece, e o painel abre no clique.
  const cardPendencias = (isMob: boolean) => {
    if (pendencias.length === 0) return null
    return (
      <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '16px 20px 13px' }}>
          <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.2px' }}>Precisa de você</h2>
          <span style={{ minWidth: '20px', height: '20px', padding: '0 6px', boxSizing: 'border-box', borderRadius: '999px', backgroundColor: '#F1F4F7', color: '#374151', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pendencias.length}
          </span>
        </div>
        {pendencias.map((p: any) => (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 20px', borderTop: '1px solid #F7F8FA' }}>
            <span style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: p.alerta ? '#FEF2F2' : '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <p.Icon size={16} color={p.alerta ? '#DC2626' : '#6B7280'} strokeWidth={1.75} />
            </span>
            <span style={{ flex: '1 1 auto', minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span>
              <span style={{ display: 'block', marginTop: '2px', fontSize: '12px', fontWeight: p.alerta ? 600 : 400, color: p.alerta ? '#DC2626' : '#6B7280', fontVariantNumeric: 'tabular-nums' }}>
                {p.valor} · {p.detalhe}
              </span>
            </span>
            <button onClick={() => setPainelAberto(painelAberto === p.painel ? null : p.painel)} className="df-new-btn"
              style={{ padding: '7px 13px', border: '1.5px solid #E5E7EB', borderRadius: '10px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#374151', flexShrink: 0 }}>
              {painelAberto === p.painel ? 'Fechar' : 'Ver'}
            </button>
          </div>
        ))}
      </div>
    )
  }

  // O painel que a pendência abre. Reaproveita as seções que já existiam.
  const painelExpandido = (isMob: boolean) => {
    if (!painelAberto) return null
    return (
      <div style={{ marginTop: isMob ? '14px' : '16px' }}>
        {painelAberto === 'fixas' && despesasFixasSection(isMob)}
        {painelAberto === 'cartoes' && faturasCartaoSection(isMob)}
      </div>
    )
  }

  // Lista: o protagonista da tela. Valor em neutro escuro e alinhado
  // (tabular-nums); cor reservada para receita, que é a exceção.
  const listaMovimentos = (isMob: boolean) => (
    <div style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: isMob ? '18px' : '20px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)' }}>
      {loading ? (
        <p style={{ textAlign: 'center', padding: '64px 0', fontSize: '14px', color: '#94A3B8', margin: 0 }}>Carregando...</p>
      ) : diasOrdenados.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: '12px' }}>
          <Wallet size={32} color="#E5E7EB" strokeWidth={1} />
          <p style={{ fontSize: '14px', color: '#94A3B8', margin: 0 }}>
            {filtrosAtivos > 0 ? 'Nenhum lançamento com esses filtros.' : 'Nenhum lançamento neste período.'}
          </p>
          {filtrosAtivos > 0 ? (
            <button onClick={limparFiltros}
              style={{ fontSize: '13px', fontWeight: 600, color: '#0B3B2E', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Limpar filtros
            </button>
          ) : (
            <button onClick={abrirModalNovo}
              style={{ fontSize: '13px', fontWeight: 600, color: '#0B3B2E', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Registrar o primeiro
            </button>
          )}
        </div>
      ) : (
        <>
          {semanas.map(sem => {
          const aberta = semanaEstaAberta(sem.key)
          return (
          <div key={sem.key}>
            {/* Faixa da semana. Recolhida por padrão — um mês cheio de
                lançamentos cabe na tela inteiro antes de você abrir nada. */}
            <button onClick={() => toggleSemana(sem.key)} className="mov-row"
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: isMob ? '13px 16px' : '15px 22px', border: 'none', borderBottom: '1px solid #F1F4F7', backgroundColor: aberta ? '#FAFBFC' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
              <ChevronDown size={16} color="#9CA3AF" strokeWidth={2.25}
                style={{ flexShrink: 0, transform: aberta ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
              <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <span style={{ fontSize: isMob ? '13.5px' : '14px', fontWeight: 600, color: '#111827', letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sem.label}
                  </span>
                  {sem.atual && (
                    <span style={{ padding: '2px 8px', border: '1px solid rgba(47,179,106,0.25)', backgroundColor: 'rgba(47,179,106,0.12)', borderRadius: '999px', fontSize: '9.5px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '0.04em', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      ESTA SEMANA
                    </span>
                  )}
                </span>
                <span style={{ display: 'block', marginTop: '2px', fontSize: isMob ? '11.5px' : '12px', color: '#9CA3AF' }}>
                  {sem.qtd} {sem.qtd === 1 ? 'lançamento' : 'lançamentos'}
                </span>
              </span>
              <span style={{ fontSize: isMob ? '13.5px' : '14.5px', fontWeight: 600, color: '#111827', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {sem.total >= 0 ? '+' : '-'} {fmt(Math.abs(sem.total))}
              </span>
            </button>

            {aberta && sem.dias.map(dia => {
            const itens = grupos[dia]
            const totalDia = itens
              .filter((l: any) => l.tipo === 'receita' || l.fatura_paga !== false)
              .reduce((s: number, l: any) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
            return (
              <div key={dia}>
                {/* Dia: separador fino, não um card dentro do card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: isMob ? '10px 16px' : '11px 22px', backgroundColor: '#FAFBFC', borderTop: '1px solid #F1F4F7', borderBottom: '1px solid #F1F4F7' }}>
                  <span style={{ fontSize: isMob ? '10px' : '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                    {formatDiaLabel(dia)}
                  </span>
                  <span style={{ fontSize: isMob ? '11px' : '11.5px', fontWeight: 600, color: '#6B7280', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {totalDia >= 0 ? '+' : '-'} {fmt(Math.abs(totalDia))}
                  </span>
                </div>
                {itens.map((l: any) => {
                  const Icon = ICONES_CAT[l.categoria] || (l.tipo === 'receita' ? ArrowDownLeft : ArrowUpRight)
                  const ehReceita = l.tipo === 'receita'
                  const cartao = contas.find((c: any) => c.id === l.conta_id && c.tipo === 'cartao_credito')
                  return (
                    <button key={l.id} onClick={() => abrirModalEditar(l)} className="mov-row"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: isMob ? '12px' : '14px', padding: isMob ? '12px 16px' : '14px 22px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #F7F8FA', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: isMob ? '36px' : '38px', height: isMob ? '36px' : '38px', borderRadius: isMob ? '10px' : '11px', backgroundColor: ehReceita ? 'rgba(47,179,106,0.10)' : '#F7F8FA', border: `1px solid ${ehReceita ? 'rgba(47,179,106,0.22)' : '#ECEFF3'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={isMob ? 16 : 17} color={ehReceita ? '#145A45' : '#6B7280'} strokeWidth={1.75} />
                      </span>
                      <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                        {/* Título é a observação; a categoria desce pro apoio, porque
                            vinte linhas dizendo "Alimentação" não informam nada. */}
                        <span style={{ display: 'block', fontSize: isMob ? '13.5px' : '14px', fontWeight: 600, color: '#111827', letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.descricao || l.categoria}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', minWidth: 0 }}>
                          <span style={{ fontSize: isMob ? '11.5px' : '12px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.descricao ? `${l.categoria} · ` : ''}{l.membro?.split(' ')[0]} · {l.hora}
                          </span>
                          {cartao && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '10px', fontWeight: 600, color: '#6B7280', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              <CreditCard size={10} color="#9CA3AF" strokeWidth={2} />
                              {cartao.nome}
                            </span>
                          )}
                        </span>
                      </span>
                      <span style={{ fontSize: isMob ? '14px' : '15px', fontWeight: ehReceita ? 700 : 600, color: ehReceita ? '#145A45' : '#111827', fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: isMob ? 'auto' : '118px', flexShrink: 0 }}>
                        {ehReceita ? '+' : '-'} {fmt(Number(l.valor))}
                      </span>
                      {isMob ? (
                        <Pencil size={13} color="#CBD5E1" strokeWidth={1.75} style={{ flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: '30px', height: '30px', border: '1px solid #ECEFF3', backgroundColor: '#fff', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Pencil size={13} color="#9CA3AF" strokeWidth={1.75} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
            })}
          </div>
          )
          })}
        </>
      )}
    </div>
  )

  // Chips do que está filtrado agora. Só aparecem quando há filtro — em vez das
  // duas fileiras de pílulas permanentes do layout antigo.
  const chipsFiltroAtivo = () => {
    if (filtrosAtivos === 0) return null
    const chips: { label: string; limpar: () => void }[] = []
    if (filtro !== 'todos') chips.push({ label: filtro === 'receita' ? 'Receitas' : 'Despesas', limpar: () => setFiltro('todos') })
    if (filtroMembro !== 'todos') chips.push({ label: filtroMembro.split(' ')[0], limpar: () => setFiltroMembro('todos') })
    if (filtroCategoria !== 'todos') chips.push({ label: filtroCategoria, limpar: () => setFiltroCategoria('todos') })
    if (busca.trim()) chips.push({ label: `"${busca.trim()}"`, limpar: () => setBusca('') })
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '2px' }}>Filtrando por</span>
        {chips.map(c => (
          <button key={c.label} onClick={c.limpar}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 9px 5px 11px', border: '1px solid rgba(47,179,106,0.25)', backgroundColor: 'rgba(47,179,106,0.12)', borderRadius: '999px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: '#0B3B2E', maxWidth: '180px' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
            <X size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          </button>
        ))}
        <button onClick={limparFiltros}
          style={{ padding: '5px 4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textDecoration: 'underline' }}>
          Limpar
        </button>
      </div>
    )
  }

  // Segmentado de tipo, igual nos dois tamanhos.
  const segmentadoTipo = (isMob: boolean) => (
    <div style={{ display: 'flex', gap: '2px', padding: '3px', backgroundColor: '#F1F4F7', borderRadius: isMob ? '12px' : '11px' }}>
      {[{ key: 'todos', label: 'Todos' }, { key: 'receita', label: 'Receitas' }, { key: 'despesa', label: 'Despesas' }].map(f => {
        const ativo = filtro === f.key
        return (
          <button key={f.key} onClick={() => { setFiltro(f.key as any); setFiltroCategoria('todos') }}
            style={{ flex: isMob ? '1 1 0' : undefined, padding: isMob ? '8px 0' : '7px 15px', border: 'none', borderRadius: isMob ? '9px' : '8px', backgroundColor: ativo ? '#fff' : 'transparent', boxShadow: ativo ? '0 1px 2px rgba(15,23,42,0.08)' : 'none', fontSize: '12.5px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0F172A' : '#6B7280', cursor: 'pointer' }}>
            {f.label}
          </button>
        )
      })}
    </div>
  )

  // Painel de filtros: membro, categoria e busca saem do corpo da tela e entram
  // aqui. Membro continua de seleção única, como na lógica de filtragem.
  const painelFiltrosContent = (isMob: boolean) => (
    <>
      {isMob && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 22px 14px', borderBottom: '1px solid #F1F4F7', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.3px' }}>Filtros</h2>
        {filtrosAtivos > 0 && (
          <span style={{ minWidth: '19px', height: '19px', padding: '0 5px', boxSizing: 'border-box', borderRadius: '999px', backgroundColor: '#0B3B2E', color: '#fff', fontSize: '10.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {filtrosAtivos}
          </span>
        )}
        <span style={{ flex: '1 1 10px' }} />
        {filtrosAtivos > 0 && (
          <button onClick={limparFiltros}
            style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#6B7280', textDecoration: 'underline' }}>
            Limpar tudo
          </button>
        )}
        <button onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 18px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 8px' }}>Tipo</p>
        <div style={{ marginBottom: '18px' }}>{segmentadoTipo(true)}</div>

        {membros.length > 0 && (
          <>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 8px' }}>Quem lançou</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
              {membros.map(m => {
                const ativo = filtroMembro === m
                const qtd = lancamentos.filter((l: any) => l.membro === m).length
                return (
                  <button key={m} onClick={() => setFiltroMembro(ativo ? 'todos' : m)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px', border: `1.5px solid ${ativo ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: ativo ? 'rgba(47,179,106,0.08)' : '#FAFAFA', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: '13px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</span>
                    <span style={{ fontSize: '11.5px', color: ativo ? '#6B7280' : '#9CA3AF', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{qtd}</span>
                    {ativo && <Check size={15} color="#145A45" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {categoriasPresentes.length > 0 && (
          <>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 8px' }}>Categoria</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
              {categoriasPresentes.map(c => {
                const Icon = ICONES_CAT[c] || MoreHorizontal
                const ativo = filtroCategoria === c
                return (
                  <button key={c} onClick={() => setFiltroCategoria(ativo ? 'todos' : c)} className="df-chip"
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 11px', border: `1.5px solid ${ativo ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: ativo ? 'rgba(47,179,106,0.08)' : '#fff', borderRadius: '999px', cursor: 'pointer', fontSize: '11.5px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#6B7280' }}>
                    <Icon size={12} strokeWidth={1.75} color={ativo ? '#2FB36A' : '#9CA3AF'} />
                    {c}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em', margin: '0 0 8px' }}>Observação</p>
        <div style={{ position: 'relative' }}>
          <Search size={15} color="#9CA3AF" strokeWidth={1.75} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} className="df-input"
            placeholder="Ex: geladeira, viagem, farmácia..."
            style={{ width: '100%', height: '52px', padding: '0 14px 0 38px', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: '13px', backgroundColor: '#FAFAFA', fontSize: '13.5px', color: '#111827', outline: 'none' }} />
        </div>
      </div>

      <div style={{ padding: '14px 22px 20px', borderTop: '1px solid #F1F4F7', backgroundColor: '#fff', flexShrink: 0 }}>
        <button onClick={() => setFiltrosAbertos(false)} className="df-cta"
          style={{ width: '100%', height: '56px', border: 'none', borderRadius: '16px', background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', boxShadow: '0 4px 16px rgba(11,59,46,0.3)', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#fff' }}>
          Ver {filtrados.length} {filtrados.length === 1 ? 'lançamento' : 'lançamentos'}
        </button>
      </div>
    </>
  )

  const botaoFiltros = (isMob: boolean) => (
    <button onClick={() => setFiltrosAbertos(true)} className="df-new-btn"
      style={{ display: 'flex', alignItems: 'center', gap: '8px', height: isMob ? '36px' : '44px', padding: isMob ? '0 12px' : '0 15px', border: '1.5px solid #E5E7EB', backgroundColor: '#fff', borderRadius: isMob ? '11px' : '13px', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#374151', flexShrink: 0, position: 'relative' }}>
      <Filter size={15} color="#6B7280" strokeWidth={1.75} />
      {!isMob && 'Filtros'}
      {filtrosAtivos > 0 && (
        <span style={{ minWidth: '19px', height: '19px', padding: '0 5px', boxSizing: 'border-box', borderRadius: '999px', backgroundColor: '#0B3B2E', color: '#fff', fontSize: '10.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', position: isMob ? 'absolute' : 'static', top: isMob ? '-5px' : undefined, right: isMob ? '-5px' : undefined }}>
          {filtrosAtivos}
        </span>
      )}
    </button>
  )

  const seletorContexto = (isMob: boolean) => (
    <div style={{ position: 'relative', flex: isMob ? '1 1 auto' : '0 0 auto', minWidth: 0 }}>
      <button onClick={() => setContextoAbertoHeader(!contextoAbertoHeader)}
        style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: isMob ? 0 : '8px 12px 8px 10px', marginLeft: isMob ? 0 : '-10px', border: 'none', background: 'transparent', borderRadius: '11px', cursor: 'pointer', textAlign: 'left', maxWidth: '100%' }}>
        <span style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(47,179,106,0.35)' }}>
          {contextoAtivo.tipo === 'empresa'
            ? <Building2 size={15} color="#fff" strokeWidth={2} />
            : <Users size={15} color="#fff" strokeWidth={2} />}
        </span>
        <span style={{ flex: '1 1 auto', minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: isMob ? '14px' : '14.5px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contextoAtivo.nome || familiaNome || 'Fluxo Patrimonial'}
          </span>
          {isMob && <span style={{ display: 'block', fontSize: '11px', color: '#9CA3AF' }}>{mesLabel}</span>}
        </span>
        <ChevronDown size={14} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0, transform: contextoAbertoHeader ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {contextoAbertoHeader && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '250px', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #ECEFF3', boxShadow: '0 12px 32px rgba(15,23,42,0.16)', zIndex: 30, overflow: 'hidden' }}>
          <button onClick={() => { trocarContexto({ tipo: 'pessoal', nome: familiaNome }); setContextoAbertoHeader(false) }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <Users size={15} color="#6B7280" strokeWidth={1.75} />
            <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{familiaNome}</span>
            {contextoAtivo.tipo === 'pessoal' && <Check size={15} color="#145A45" strokeWidth={2.5} />}
          </button>
          {empresas.map((emp: any) => (
            <button key={emp.id} onClick={() => { trocarContexto({ tipo: 'empresa', empresaId: emp.id, nome: emp.nome }); setContextoAbertoHeader(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', borderTop: '1px solid #F7F8FA', cursor: 'pointer', textAlign: 'left' }}>
              <Building2 size={15} color="#145A45" strokeWidth={1.75} />
              <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.nome}</span>
              {contextoAtivo.tipo === 'empresa' && contextoAtivo.empresaId === emp.id && <Check size={15} color="#145A45" strokeWidth={2.5} />}
            </button>
          ))}
          <a href="/dashboard/perfil"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderTop: '1px solid #F7F8FA', textDecoration: 'none', color: '#145A45', fontSize: '13.5px', fontWeight: 600 }}>
            <Plus size={15} strokeWidth={2.5} /> Adicionar empresa (CNPJ)
          </a>
        </div>
      )}
    </div>
  )


  const dfModalContent = (isMob: boolean) => (
    <>
      {isMob && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0B3B2E', margin: 0, letterSpacing: '-0.3px' }}>
          {dfEditando ? 'Editar despesa fixa' : 'Nova despesa fixa'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {dfEditando && (
            <button onClick={handleDeletarDf} disabled={dfDeletando}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: dfConfirmDelete ? '#EF4444' : 'rgba(239,68,68,0.10)', color: dfConfirmDelete ? '#fff' : '#DC2626', transition: 'all 0.15s ease' }}>
              <Trash2 size={13} strokeWidth={2} />
              {dfDeletando ? 'Deletando...' : dfConfirmDelete ? 'Confirmar' : 'Deletar'}
            </button>
          )}
          <button onClick={() => setDfModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 8px' }}>

        {/* Tipo */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[{ key: 'despesa', label: 'Despesa', cor: '#EF4444' }, { key: 'receita', label: 'Receita', cor: '#10B981' }].map(t => (
            <button key={t.key} onClick={() => handleDfTipo(t.key as any)}
              style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${dfTipo === t.key ? t.cor : '#E2E8F0'}`, backgroundColor: dfTipo === t.key ? t.cor + '12' : '#fff', color: dfTipo === t.key ? t.cor : '#64748B' }}>
              {t.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Nome</p>
        <input value={dfNome} onChange={e => setDfNome(e.target.value)} placeholder="Ex: Aluguel" className="df-input"
          style={{ width: '100%', height: '52px', padding: '0 16px', borderRadius: '14px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', fontSize: '14px', color: '#111827', marginBottom: '16px', boxSizing: 'border-box' }} />

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Valor {dfVariavel ? 'de referência' : ''}</p>
        <input
          type="text" inputMode="numeric" value={dfValor} className="df-input"
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            const num = parseInt(digits || '0', 10)
            setDfValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
          }}
          placeholder="0,00"
          style={{ width: '100%', height: '52px', padding: '0 16px', borderRadius: '14px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', fontSize: '14px', color: '#111827', marginBottom: '10px', boxSizing: 'border-box' }} />

        <button onClick={() => setDfVariavel(!dfVariavel)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '12px', border: dfVariavel ? '1.5px solid #2FB36A' : '1.5px solid #E5E7EB', backgroundColor: dfVariavel ? '#F0FDF4' : '#FAFAFA', cursor: 'pointer', marginBottom: '16px', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: dfVariavel ? '#2FB36A' : '#E2E8F0', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: dfVariavel ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: dfVariavel ? '#0B3B2E' : '#111827', margin: 0 }}>Valor variável</p>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
              {dfVariavel ? 'Você confirma o valor ao marcar como pago' : 'O valor é sempre o mesmo (ex: aluguel, internet)'}
            </p>
          </div>
        </button>

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Categoria</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {(contextoAtivo.tipo === 'empresa'
              ? (dfTipo === 'despesa' ? CATEGORIAS_EMPRESA_DESPESA : CATEGORIAS_EMPRESA_RECEITA)
              : (dfTipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA)).map(c => {
            const Icon = ICONES_CAT[c] || MoreHorizontal
            const ativo = dfCategoria === c
            return (
              <button key={c} onClick={() => setDfCategoria(c)} className="df-chip"
                style={{ padding: '8px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: ativo ? '1.5px solid #2FB36A' : '1.5px solid #E5E7EB', backgroundColor: ativo ? '#F0FDF4' : '#fff', color: ativo ? '#0B3B2E' : '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '64px' }}>
                <Icon size={14} strokeWidth={1.75} color={ativo ? '#2FB36A' : '#94A3B8'} />
                {c}
              </button>
            )
          })}
        </div>

        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Dia de vencimento</p>
        <input type="number" min="1" max="31" value={dfDia} onChange={e => setDfDia(e.target.value)} className="df-input"
          style={{ width: '100%', height: '52px', padding: '0 16px', borderRadius: '14px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', fontSize: '14px', color: '#111827', marginBottom: '8px', boxSizing: 'border-box' }} />

        {dfConfirmDelete && (
          <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginBottom: '4px' }}>
            Toque em "Confirmar" para deletar permanentemente.
          </p>
        )}
      </div>

      <div style={{ padding: '14px 24px 24px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
        {dfErro && (
          <p style={{ fontSize: '12.5px', color: '#DC2626', textAlign: 'center', marginBottom: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '8px 12px' }}>
            {dfErro}
          </p>
        )}
        <button onClick={handleSalvarDf} disabled={dfSalvando || !dfNome.trim() || !dfValor} className="df-cta"
          style={{
            width: '100%', height: '56px', borderRadius: '16px', border: 'none', fontSize: '15px', fontWeight: 700, color: '#fff',
            cursor: dfSalvando || !dfNome.trim() || !dfValor ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #05281F 0%, #0C342A 55%, #0E3B2F 100%)',
            boxShadow: '0 4px 16px rgba(11,59,46,0.3)',
            opacity: dfSalvando || !dfNome.trim() || !dfValor ? 0.6 : 1,
          }}>
          {dfSalvando ? 'Salvando...' : dfEditando ? 'Salvar alterações' : 'Criar despesa fixa'}
        </button>
      </div>
    </>
  )

  // Conteúdo do modal de confirmação de pagamento (despesas variáveis)
  const pagarModalContent = (isMob: boolean) => (
    <>
      {isMob && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0B3B2E', margin: 0, letterSpacing: '-0.3px' }}>Confirmar pagamento</h2>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>{dfPagando?.nome}</p>
        </div>
        <button onClick={() => setPagarModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      <div style={{ padding: '18px 24px 8px' }}>
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Valor pago esse mês
        </p>
        <input
          type="text" inputMode="numeric" value={valorPagar} className="df-input" autoFocus
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '')
            const num = parseInt(digits || '0', 10)
            setValorPagar(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
          }}
          placeholder="0,00"
          style={{ width: '100%', height: '56px', padding: '0 16px', borderRadius: '14px', border: '1.5px solid #E5E7EB', backgroundColor: '#FAFAFA', fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px', boxSizing: 'border-box' }} />
        <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0 0 16px' }}>
          Essa despesa é variável — o valor confirmado vira a referência do próximo mês.
        </p>
      </div>

      <div style={{ padding: '14px 24px 24px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
        {dfErro && (
          <p style={{ fontSize: '12.5px', color: '#DC2626', textAlign: 'center', marginBottom: '10px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '8px 12px' }}>
            {dfErro}
          </p>
        )}
        <button onClick={confirmarPagamentoVariavel} disabled={pagando || !valorPagar} className="df-cta"
          style={{
            width: '100%', height: '56px', borderRadius: '16px', border: 'none', fontSize: '15px', fontWeight: 700, color: '#fff',
            cursor: pagando || !valorPagar ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #05281F 0%, #0C342A 55%, #0E3B2F 100%)',
            boxShadow: '0 4px 16px rgba(11,59,46,0.3)',
            opacity: pagando || !valorPagar ? 0.6 : 1,
          }}>
          {pagando ? 'Registrando...' : 'Confirmar pagamento'}
        </button>
      </div>
    </>
  )

  // Conteúdo do modal compartilhado
  const modalContent = (isMob: boolean) => {
    const valorNum = valor ? parseFloat(valor.replace(/\./g, '').replace(',', '.')) : 0
    const contaDoForm = contas.find((c: any) => c.id === contaSelecionadaId)
    const ehCartao = contaDoForm?.tipo === 'cartao_credito'
    return (
    <>
      {isMob && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}

      {/* Header. O contexto virou uma linha clicável embaixo do título, em vez
          de uma seção inteira com label em caixa alta. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 22px 14px', borderBottom: '1px solid #F1F4F7', flexShrink: 0 }}>
        <div style={{ position: 'relative', minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>
            {editando ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          {!editando && (
            <>
              <button type="button" onClick={() => setContextoAberto(!contextoAberto)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
                {contextoAtivo.tipo === 'empresa'
                  ? <Building2 size={13} color="#145A45" strokeWidth={1.75} />
                  : <Users size={13} color="#9CA3AF" strokeWidth={1.75} />}
                <span style={{ fontSize: '12.5px', color: '#6B7280' }}>
                  em <span style={{ fontWeight: 600, color: '#374151' }}>{contextoAtivo.nome}</span>
                </span>
                {contextoAtivo.tipo === 'empresa' && (
                  <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#0B3B2E', backgroundColor: 'rgba(47,179,106,0.12)', border: '1px solid rgba(47,179,106,0.25)', padding: '1px 6px', borderRadius: '999px' }}>PJ</span>
                )}
                <ChevronDown size={12} color="#9CA3AF" strokeWidth={2} style={{ transform: contextoAberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {contextoAberto && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', width: '240px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #ECEFF3', boxShadow: '0 12px 32px rgba(15,23,42,0.16)', zIndex: 10, overflow: 'hidden' }}>
                  <button type="button" onClick={() => { trocarContexto({ tipo: 'pessoal', nome: familiaNome }); handleTipo(tipo); setContextoAberto(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <Users size={14} color="#6B7280" strokeWidth={1.75} />
                    <span style={{ flex: 1, fontSize: '13px', color: '#0F172A' }}>{familiaNome}</span>
                    {contextoAtivo.tipo === 'pessoal' && <Check size={14} color="#145A45" strokeWidth={2.5} />}
                  </button>
                  {empresas.map((emp: any) => (
                    <button key={emp.id} type="button" onClick={() => { trocarContexto({ tipo: 'empresa', empresaId: emp.id, nome: emp.nome }); handleTipo(tipo); setContextoAberto(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px', background: 'none', border: 'none', borderTop: '1px solid #F7F8FA', cursor: 'pointer', textAlign: 'left' }}>
                      <Building2 size={14} color="#145A45" strokeWidth={1.75} />
                      <span style={{ flex: 1, fontSize: '13px', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.nome}</span>
                      {contextoAtivo.tipo === 'empresa' && contextoAtivo.empresaId === emp.id && <Check size={14} color="#145A45" strokeWidth={2.5} />}
                    </button>
                  ))}
                  <a href="/dashboard/perfil"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 13px', borderTop: '1px solid #F7F8FA', textDecoration: 'none', color: '#145A45', fontSize: '13px', fontWeight: 600 }}>
                    <Plus size={14} strokeWidth={2.5} /> Adicionar empresa (CNPJ)
                  </a>
                </div>
              )}
            </>
          )}
        </div>
        <span style={{ flex: '1 1 10px' }} />
        {editando && (
          <button onClick={handleDeletar} disabled={deletando}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: confirmDelete ? '#DC2626' : 'rgba(239,68,68,0.10)', color: confirmDelete ? '#fff' : '#B91C1C', flexShrink: 0 }}>
            <Trash2 size={13} strokeWidth={2} />
            {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
          </button>
        )}
        <button onClick={() => setModalOpen(false)} aria-label="Fechar"
          style={{ width: '30px', height: '30px', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 8px' }}>

        {/* O VALOR é o herói: é o primeiro campo que a pessoa preenche, então
            para de ser cinza dentro de uma caixa cinza. */}
        <div style={{ backgroundColor: '#fff', border: '1.5px solid #2FB36A', boxShadow: '0 0 0 3px rgba(47,179,106,0.12)', borderRadius: '18px', padding: '14px 18px 16px', marginBottom: '14px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '10.5px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Valor</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: isMob ? '18px' : '20px', fontWeight: 600, color: '#9CA3AF', flexShrink: 0 }}>R$</span>
            <input
              type="text" inputMode="numeric" value={valor} autoFocus={!editando}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '')
                const num = parseInt(digits || '0', 10)
                setValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
              }}
              placeholder="0,00"
              style={{ flex: '1 1 auto', minWidth: 0, padding: 0, border: 'none', outline: 'none', backgroundColor: 'transparent', fontFamily: 'inherit', fontSize: isMob ? '32px' : '40px', fontWeight: 700, color: '#111827', letterSpacing: isMob ? '-1.2px' : '-1.6px', fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
        </div>

        {/* Tipo: segmentado no verde da marca, com seta indicando direção. A cor
            deixa de ser o único sinal, então o vermelho berrante sai. */}
        <div style={{ display: 'flex', gap: '2px', padding: '3px', backgroundColor: '#F1F4F7', borderRadius: '13px', marginBottom: '18px' }}>
          {[{ key: 'despesa', label: 'Despesa', Icon: ArrowUpRight }, { key: 'receita', label: 'Receita', Icon: ArrowDownLeft }].map(t => {
            const ativo = tipo === t.key
            return (
              <button key={t.key} onClick={() => handleTipo(t.key as any)}
                style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px 0', border: 'none', borderRadius: '10px', backgroundColor: ativo ? '#fff' : 'transparent', boxShadow: ativo ? '0 1px 2px rgba(15,23,42,0.08)' : 'none', cursor: 'pointer', fontSize: '13.5px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#6B7280' }}>
                <t.Icon size={15} color={ativo ? '#0B3B2E' : '#9CA3AF'} strokeWidth={2} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Categoria: as mais usadas primeiro, não as 20 em ordem alfabética.
            A parede de categorias ocupava metade do modal. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <p style={{ margin: 0, fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Categoria</p>
          {categorias.length > categoriasVisiveis.length || categoriasTodas ? (
            <button type="button" onClick={() => setCategoriasTodas(!categoriasTodas)}
              style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#145A45' }}>
              {categoriasTodas ? 'Ver menos' : `Todas as ${categorias.length}`}
            </button>
          ) : null}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMob ? 2 : 3}, minmax(0, 1fr))`, gap: '7px', marginBottom: '18px' }}>
          {categoriasVisiveis.map(c => {
            const Icon = ICONES_CAT[c] || MoreHorizontal
            const ativo = categoria === c
            return (
              <button key={c} onClick={() => setCategoria(c)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 12px', border: `1.5px solid ${ativo ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: ativo ? 'rgba(47,179,106,0.08)' : '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '12.5px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#374151', textAlign: 'left' }}>
                <Icon size={15} strokeWidth={1.75} color={ativo ? '#0B3B2E' : '#9CA3AF'} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</span>
              </button>
            )
          })}
        </div>

        {/* Membro: só existe se houver mais de um na família. Com um membro só,
            era um botão solto ocupando meia largura sem decisão nenhuma. */}
        {membrosFamilia.length > 1 && (
          <>
            <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Quem está lançando</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '7px', marginBottom: '18px' }}>
              {membrosFamilia.map(m => {
                const ativo = membroForm === m
                return (
                  <button key={m} onClick={() => setMembroForm(m)}
                    style={{ padding: '11px', border: `1.5px solid ${ativo ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: ativo ? 'rgba(47,179,106,0.08)' : '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.split(' ')[0]}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Pago com — só despesa. É a escolha que decide se vira fatura. */}
        {tipo === 'despesa' && (
          <div style={{ marginBottom: '18px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Pago com</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {contas.map((c: any) => {
                const ativo = contaSelecionadaId === c.id
                return (
                  <button key={c.id} onClick={() => setContaSelecionadaId(c.id)}
                    style={{ flex: '1 1 120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '12px 10px', border: `1.5px solid ${ativo ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: ativo ? 'rgba(47,179,106,0.08)' : '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '12.5px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#374151' }}>
                    {c.tipo === 'cartao_credito'
                      ? <CreditCard size={15} color={ativo ? '#0B3B2E' : '#9CA3AF'} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                      : <Wallet size={15} color={ativo ? '#0B3B2E' : '#9CA3AF'} strokeWidth={1.75} style={{ flexShrink: 0 }} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</span>
                  </button>
                )
              })}
              <button onClick={() => { setEditandoCartaoId(null); setNovoCartaoNome(''); setNovoCartaoFechamento(''); setNovoCartaoVencimento(''); setNovoCartaoOpen(true) }}
                aria-label="Novo cartão"
                style={{ flex: '0 0 auto', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed #CBD5E1', backgroundColor: '#fff', borderRadius: '12px', cursor: 'pointer' }}>
                <Plus size={16} color="#6B7280" strokeWidth={2.25} />
              </button>
            </div>

            {/* A consequência escrita: a regra de competência não é óbvia na
                hora de lançar. */}
            {ehCartao && (
              <>
                <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: '#6B7280', lineHeight: 1.45 }}>
                  Entra como despesa de {categoria} agora e soma na fatura do {contaDoForm.nome}, que sai da conta quando você pagar.
                </p>
                {!parcelado && contaDoForm.dia_fechamento && contaDoForm.dia_vencimento && (() => {
                  const dataCompra = new Date(dataLanc + 'T12:00:00')
                  const empurrou = dataCompra.getDate() > contaDoForm.dia_fechamento
                  const dataFatura = new Date(dataCompra.getFullYear(), dataCompra.getMonth() + (empurrou ? 1 : 0), contaDoForm.dia_vencimento)
                  return (
                    <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: '#374151', backgroundColor: '#F7F8FA', border: '1px solid #ECEFF3', borderRadius: '10px', padding: '8px 11px', lineHeight: 1.45 }}>
                      {empurrou
                        ? `Compra depois do fechamento (dia ${contaDoForm.dia_fechamento}) — vai pra fatura de ${dataFatura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}, vencendo dia ${contaDoForm.dia_vencimento}.`
                        : `Entra na fatura deste mês, vencendo dia ${contaDoForm.dia_vencimento}.`}
                    </p>
                  )
                })()}
              </>
            )}
          </div>
        )}

        {/* Aporte — despesa na categoria de investimento, aplicando numa posição
            de Renda Fixa ou alocando pra uma meta. */}
        {tipo === 'despesa' && ehCategoriaInvestimento(categoria) && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '2px', padding: '3px', backgroundColor: '#F1F4F7', borderRadius: '12px', marginBottom: '10px' }}>
              {[{ key: 'posicao', label: 'Renda Fixa' }, { key: 'meta', label: 'Meta' }].map(o => {
                const ativo = modoAporte === o.key
                return (
                  <button key={o.key} onClick={() => setModoAporte(o.key as any)}
                    style={{ flex: '1 1 0', padding: '9px 0', border: 'none', borderRadius: '9px', backgroundColor: ativo ? '#fff' : 'transparent', boxShadow: ativo ? '0 1px 2px rgba(15,23,42,0.08)' : 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#6B7280' }}>
                    {o.label}
                  </button>
                )
              })}
            </div>

            {modoAporte === 'posicao' ? (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Aplicar em qual posição?</p>
                {posicoesRF.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', backgroundColor: '#F7F8FA', border: '1px solid #ECEFF3', borderRadius: '12px', padding: '10px 12px', lineHeight: 1.45 }}>
                    Nenhuma posição de Renda Fixa cadastrada — esse lançamento não vai render em nenhuma posição. Cadastre uma em Investimentos primeiro, se quiser aplicar.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                    <button onClick={() => setPosicaoAporteId('')}
                      style={{ padding: '9px 13px', border: `1.5px solid ${posicaoAporteId === '' ? '#9CA3AF' : '#E5E7EB'}`, backgroundColor: posicaoAporteId === '' ? '#F1F4F7' : '#fff', borderRadius: '11px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 500, color: '#374151' }}>
                      Nenhuma
                    </button>
                    {posicoesRF.map((p: any) => {
                      const ativo = posicaoAporteId === p.id
                      return (
                        <button key={p.id} onClick={() => setPosicaoAporteId(p.id)}
                          style={{ padding: '9px 13px', border: `1.5px solid ${ativo ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: ativo ? 'rgba(47,179,106,0.08)' : '#fff', borderRadius: '11px', cursor: 'pointer', fontSize: '12.5px', fontWeight: ativo ? 600 : 500, color: ativo ? '#0B3B2E' : '#374151' }}>
                          {p.nome}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Alocar para qual meta?</p>
                {metas.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', backgroundColor: '#F7F8FA', border: '1px solid #ECEFF3', borderRadius: '12px', padding: '10px 12px' }}>
                    Nenhuma meta cadastrada ainda. Crie uma na tela de Metas primeiro.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {metas.map((m: any) => {
                      const pctAtual = Math.min(Math.round((Number(m.valor_atual) / Number(m.valor_alvo)) * 100), 100)
                      const selecionada = metaAporteId === m.id
                      return (
                        <button key={m.id} onClick={() => setMetaAporteId(selecionada ? '' : m.id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '11px 13px', border: `1.5px solid ${selecionada ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: selecionada ? 'rgba(47,179,106,0.08)' : '#fff', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: selecionada ? 600 : 500, color: selecionada ? '#0B3B2E' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                          <span style={{ fontSize: '11.5px', color: '#9CA3AF', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{pctAtual}% de {fmt(Number(m.valor_alvo))}</span>
                        </button>
                      )
                    })}
                    {metaAporteId && metas.find((m: any) => m.id === metaAporteId)?.automatica && !editando && (
                      <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#6B7280', backgroundColor: '#F7F8FA', border: '1px solid #ECEFF3', borderRadius: '10px', padding: '8px 11px', lineHeight: 1.45 }}>
                        Essa meta é automática — o aporte vai direto pro Patrimônio (Caixa), sem gerar lançamento aqui em Movimentos.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Data e, ao lado, a decisão curta do tipo: dízimo na receita,
            parcelar na despesa. */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: parcelado ? '8px' : '18px' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Data</p>
            <input type="date" value={dataLanc} onChange={e => setDataLanc(e.target.value)} className="df-input"
              style={{ width: '100%', height: '52px', padding: '0 14px', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: '13px', backgroundColor: '#FAFAFA', fontFamily: 'inherit', fontSize: '13.5px', color: '#111827', outline: 'none' }} />
          </div>

          {tipo === 'receita' && (
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Dízimo</p>
              <button onClick={() => setDizimar(!dizimar)}
                style={{ width: '100%', height: '52px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', boxSizing: 'border-box', border: `1.5px solid ${dizimar ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: dizimar ? 'rgba(47,179,106,0.08)' : '#FAFAFA', borderRadius: '13px', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ position: 'relative', width: '38px', height: '21px', borderRadius: '999px', backgroundColor: dizimar ? '#2FB36A' : '#E5E7EB', flexShrink: 0, transition: 'background-color 0.2s' }}>
                  <span style={{ position: 'absolute', top: '2px', left: dizimar ? '19px' : '2px', width: '17px', height: '17px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
                </span>
                <span style={{ fontSize: '13px', fontWeight: dizimar ? 600 : 500, color: dizimar ? '#0B3B2E' : '#6B7280' }}>{dizimar ? 'Sim' : 'Não'}</span>
              </button>
            </div>
          )}

          {tipo === 'despesa' && !editando && (
            <div style={{ flex: '1 1 0', minWidth: 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Parcelar</p>
              <button onClick={() => setParcelado(!parcelado)}
                style={{ width: '100%', height: '52px', display: 'flex', alignItems: 'center', gap: '10px', padding: '0 14px', boxSizing: 'border-box', border: `1.5px solid ${parcelado ? '#2FB36A' : '#E5E7EB'}`, backgroundColor: parcelado ? 'rgba(47,179,106,0.08)' : '#FAFAFA', borderRadius: '13px', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ position: 'relative', width: '38px', height: '21px', borderRadius: '999px', backgroundColor: parcelado ? '#2FB36A' : '#E5E7EB', flexShrink: 0, transition: 'background-color 0.2s' }}>
                  <span style={{ position: 'absolute', top: '2px', left: parcelado ? '19px' : '2px', width: '17px', height: '17px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
                </span>
                <span style={{ fontSize: '13px', fontWeight: parcelado ? 600 : 500, color: parcelado ? '#0B3B2E' : '#6B7280' }}>{parcelado ? `${numParcelas}x` : 'Não'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Parcelado aberto. O valor informado é o TOTAL. */}
        {tipo === 'despesa' && !editando && parcelado && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', padding: '13px 14px', backgroundColor: 'rgba(47,179,106,0.06)', border: '1.5px solid rgba(47,179,106,0.25)', borderRadius: '13px', marginBottom: '18px' }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#0B3B2E' }}>Nº de parcelas</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <button onClick={() => setNumParcelas(String(Math.max(2, parseInt(numParcelas) - 1)))} aria-label="Menos uma parcela"
                  style={{ width: '30px', height: '30px', border: '1.5px solid #E5E7EB', backgroundColor: '#fff', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B3B2E', fontSize: '16px', fontWeight: 700 }}>-</button>
                <span style={{ minWidth: '34px', textAlign: 'center', fontSize: '17px', fontWeight: 700, color: '#0B3B2E', fontVariantNumeric: 'tabular-nums' }}>{numParcelas}x</span>
                <button onClick={() => setNumParcelas(String(Math.min(48, parseInt(numParcelas) + 1)))} aria-label="Mais uma parcela"
                  style={{ width: '30px', height: '30px', border: '1.5px solid #E5E7EB', backgroundColor: '#fff', borderRadius: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B3B2E', fontSize: '16px', fontWeight: 700 }}>+</button>
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 600, color: '#0B3B2E' }}>Dia de vencimento</p>
              {ehCartao && contaDoForm.dia_vencimento ? (
                <div style={{ height: '30px', display: 'flex', alignItems: 'center', padding: '0 10px', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', backgroundColor: '#fff', borderRadius: '9px', fontSize: '13px', fontWeight: 700, color: '#0B3B2E' }}>
                  Dia {contaDoForm.dia_vencimento}
                  <span style={{ fontWeight: 500, color: '#9CA3AF', fontSize: '11px', marginLeft: '5px' }}>(do cartão)</span>
                </div>
              ) : (
                <input type="number" min="1" max="31" value={diaParcela} onChange={e => setDiaParcela(e.target.value)}
                  style={{ width: '100%', height: '30px', padding: '0 10px', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', backgroundColor: '#fff', borderRadius: '9px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, color: '#0B3B2E', outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
              )}
            </div>
            {ehCartao && contaDoForm.dia_fechamento && (
              <div style={{ gridColumn: '1 / -1', fontSize: '11.5px', color: '#374151', backgroundColor: '#fff', border: '1.5px solid rgba(47,179,106,0.25)', borderRadius: '10px', padding: '8px 11px', lineHeight: 1.45 }}>
                {new Date(dataLanc + 'T12:00:00').getDate() > contaDoForm.dia_fechamento
                  ? `Compra depois do fechamento (dia ${contaDoForm.dia_fechamento}) — a 1ª parcela cai na fatura do mês seguinte.`
                  : `Compra antes do fechamento (dia ${contaDoForm.dia_fechamento}) — a 1ª parcela entra na fatura deste mês.`}
              </div>
            )}
            {valor && (
              <div style={{ gridColumn: '1 / -1', padding: '9px', backgroundColor: '#fff', border: '1.5px solid rgba(47,179,106,0.25)', borderRadius: '10px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#374151' }}>
                  {numParcelas}x de <strong style={{ color: '#0B3B2E', fontVariantNumeric: 'tabular-nums' }}>{fmt(valorNum / parseInt(numParcelas))}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Observação: explicitamente o que vira o título na lista */}
        <p style={{ margin: '0 0 8px', fontSize: '10.5px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Observação</p>
        <textarea value={observacao} onChange={e => setObservacao(e.target.value)} className="df-input"
          placeholder="Mercado do mês" rows={2}
          style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: '1.5px solid #E5E7EB', borderRadius: '13px', backgroundColor: '#FAFAFA', fontFamily: 'inherit', fontSize: '13px', color: '#111827', outline: 'none', resize: 'none' }} />
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#9CA3AF', lineHeight: 1.45 }}>
          Vira o título da linha na lista. Em branco, a lista mostra a categoria.
        </p>

        {confirmDelete && (
          <p style={{ margin: '10px 0 0', fontSize: '12px', fontWeight: 600, color: '#B91C1C', textAlign: 'center' }}>
            Toque em "Confirmar" para deletar permanentemente.
          </p>
        )}
      </div>

      <div style={{ padding: '14px 22px 20px', borderTop: '1px solid #F1F4F7', backgroundColor: '#fff', flexShrink: 0 }}>
        <button onClick={handleSalvar} disabled={salvando || !valor} className="df-cta"
          style={{ width: '100%', height: '56px', border: 'none', borderRadius: '16px', background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', boxShadow: '0 4px 16px rgba(11,59,46,0.3)', cursor: salvando || !valor ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 600, color: '#fff', opacity: salvando || !valor ? 0.45 : 1 }}>
          {salvando
            ? 'Salvando...'
            : editando
              ? 'Salvar alterações'
              : parcelado
                ? `Criar ${numParcelas} parcelas`
                : valor
                  ? `Registrar ${fmt(valorNum)}`
                  : 'Registrar lançamento'}
        </button>
      </div>
    </>
    )
  }

  return (
    <>
      <style jsx>{`
        .df-card { transition: background-color 0.15s ease; }
        .df-card:hover { background-color: #F7F8FA; }
        .df-new-btn { transition: all 0.15s ease; }
        .df-new-btn:hover { border-color: #2FB36A !important; background-color: #F0FDF4 !important; color: #0B3B2E !important; }
        .df-chip { transition: all 0.15s ease; }
        .df-chip:hover { border-color: #2FB36A; }
        .df-input { transition: all 0.2s ease; }
        .df-input:focus { border-color: #2FB36A !important; background-color: #fff !important; box-shadow: 0 0 0 3px rgba(47,179,106,0.12); outline: none; }
        .df-cta { transition: all 0.15s ease; }
        .df-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(11,59,46,0.35); }
        .mov-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(11,59,46,0.4) !important; }
        .mov-row:hover { background-color: #FAFBFC !important; }
      `}</style>

      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ backgroundColor: '#F7F9FB', minHeight: '100vh', paddingBottom: '100px' }}>

        {/* Barra de comando branca. O header verde chapado com cards flutuando
            saiu: era o padrão mais reconhecível da tela e empurrava a lista
            para baixo da dobra. */}
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #ECEFF3', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {seletorContexto(true)}
          {botaoFiltros(true)}
        </div>

        <div style={{ padding: '16px' }}>
          {blocoPosicao(true)}
        </div>

        {pendencias.length > 0 && (
          <div style={{ padding: '0 16px 16px' }}>
            {cardPendencias(true)}
            {painelExpandido(true)}
          </div>
        )}

        {contextoAtivo.tipo === 'pessoal' && !loading && familiaId && (
          <div style={{ padding: '0 16px 16px' }}>
            <OrcamentosSection
              supabase={supabase}
              familiaId={familiaId}
              mesRef={mesRef}
              lancamentos={lancamentos}
              contas={contas}
              isMobile
            />
          </div>
        )}

        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '11px' }}>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>Movimentos</h1>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {loading ? '' : `${filtrados.length} ${filtrados.length === 1 ? 'lançamento' : 'lançamentos'}`}
            </span>
          </div>

          <div style={{ marginBottom: '14px' }}>{segmentadoTipo(true)}</div>
          {chipsFiltroAtivo()}
          {listaMovimentos(true)}
        </div>

        <button onClick={abrirModalNovo} aria-label="Novo lançamento" className="mov-cta"
          style={{ position: 'fixed', bottom: '80px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(11,59,46,0.4)', zIndex: 40 }}>
          <Plus size={24} color="#fff" strokeWidth={2.25} />
        </button>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block" style={{ backgroundColor: '#F7F9FB', minHeight: '100vh' }}>

        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #ECEFF3', padding: '0 40px' }}>
          <div style={{ maxWidth: '1360px', margin: '0 auto', minHeight: '68px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', padding: '12px 0', boxSizing: 'border-box' }}>
            {seletorContexto(false)}

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px', backgroundColor: '#F1F4F7', borderRadius: '11px' }}>
              <button onClick={() => mudarMes(-1)} aria-label="Mês anterior"
                style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={15} color="#6B7280" strokeWidth={2} />
              </button>
              <span style={{ minWidth: '118px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{mesLabel}</span>
              <button onClick={() => mudarMes(1)} aria-label="Mês seguinte"
                style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={15} color="#6B7280" strokeWidth={2} />
              </button>
            </div>

            <div style={{ flex: '1 1 40px' }} />

            {botaoFiltros(false)}

            <button onClick={abrirModalNovo} className="mov-cta"
              style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '44px', padding: '0 18px', border: 'none', borderRadius: '14px', background: 'linear-gradient(135deg, #07271F 0%, #145A45 100%)', boxShadow: '0 4px 16px rgba(11,59,46,0.3)', cursor: 'pointer', fontSize: '13.5px', fontWeight: 600, color: '#fff', flexShrink: 0 }}>
              <Plus size={16} strokeWidth={2.5} /> Novo lançamento
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '28px 40px 64px', boxSizing: 'border-box', display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'flex-start' }}>

          {/* Coluna principal: a lista é o protagonista */}
          <div style={{ flex: '999 1 580px', minWidth: 0 }}>
            {painelAberto && (
              <div style={{ marginBottom: '24px' }}>
                {painelAberto === 'fixas' && despesasFixasSection(false)}
                {painelAberto === 'cartoes' && faturasCartaoSection(false)}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
              <h1 style={{ margin: 0, fontSize: '21px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.5px' }}>Movimentos</h1>
              <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
                {loading ? '' : `${filtrados.length} ${filtrados.length === 1 ? 'lançamento' : 'lançamentos'} em ${mesLabel}`}
              </span>
              <div style={{ flex: '1 1 20px' }} />
              {segmentadoTipo(false)}
            </div>

            {chipsFiltroAtivo()}
            {listaMovimentos(false)}
          </div>

          {/* Coluna de apoio: resumo e o que exige ação saem do caminho da lista */}
          <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {blocoPosicao(false)}
            {cardPendencias(false)}

            {contextoAtivo.tipo === 'pessoal' && !loading && familiaId && (
              <OrcamentosSection
                supabase={supabase}
                familiaId={familiaId}
                mesRef={mesRef}
                lancamentos={lancamentos}
                contas={contas}
              />
            )}
          </div>
        </div>
      </div>

      {/* Painel de filtros — bottom sheet no mobile, modal no desktop */}
      {filtrosAbertos && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setFiltrosAbertos(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(6,38,31,0.45)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(85vh - 65px)', marginBottom: '65px' }}>
            {painelFiltrosContent(true)}
          </div>
        </div>
      )}
      {filtrosAbertos && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setFiltrosAbertos(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,38,31,0.45)' }}>
          <div style={{ width: '520px', backgroundColor: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', margin: 'auto', boxShadow: '0 24px 64px rgba(6,38,31,0.32)' }}>
            {painelFiltrosContent(false)}
          </div>
        </div>
      )}

      {/* Modal Mobile */}
      {modalOpen && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(85vh - 65px)', marginBottom: '65px' }}>
            {modalContent(true)}
          </div>
        </div>
      )}

      {/* Modal Desktop */}
      {modalOpen && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '520px', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', margin: 'auto' }}>
            {modalContent(false)}
          </div>
        </div>
      )}

      {/* Modal Despesa Fixa — Mobile */}
      {dfModalOpen && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setDfModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', maxHeight: 'calc(85vh - 65px)', marginBottom: '65px' }}>
            {dfModalContent(true)}
          </div>
        </div>
      )}

      {/* Modal Despesa Fixa — Desktop */}
      {dfModalOpen && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setDfModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '480px', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', margin: 'auto' }}>
            {dfModalContent(false)}
          </div>
        </div>
      )}

      {/* Modal Confirmar Pagamento — Mobile */}
      {pagarModalOpen && isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setPagarModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', marginBottom: '65px' }}>
            {pagarModalContent(true)}
          </div>
        </div>
      )}

      {/* Modal Confirmar Pagamento — Desktop */}
      {pagarModalOpen && !isMobile && (
        <div onClick={e => { if (e.target === e.currentTarget) setPagarModalOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: '420px', backgroundColor: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', margin: 'auto' }}>
            {pagarModalContent(false)}
          </div>
        </div>
      )}

      {/* Modal Novo Cartão */}
      {novoCartaoOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) fecharModalCartao() }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: isMobile ? '100%' : '380px', backgroundColor: '#fff', borderRadius: isMobile ? '28px 28px 0 0' : '20px', padding: '24px' }}>
            {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '-8px auto 16px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{editandoCartaoId ? 'Editar cartão' : 'Novo cartão de crédito'}</h2>
              <button onClick={fecharModalCartao} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Nome</p>
            <input type="text" value={novoCartaoNome} onChange={e => setNovoCartaoNome(e.target.value)}
              placeholder="Ex: Nubank, Inter..."
              style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Dia de fechamento</p>
                <input type="number" min="1" max="31" value={novoCartaoFechamento} onChange={e => setNovoCartaoFechamento(e.target.value)}
                  placeholder="Ex: 20"
                  style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Dia de vencimento</p>
                <input type="number" min="1" max="31" value={novoCartaoVencimento} onChange={e => setNovoCartaoVencimento(e.target.value)}
                  placeholder="Ex: 27"
                  style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={handleCriarCartao} disabled={salvandoCartao || !novoCartaoNome.trim()}
              style={{ width: '100%', height: '46px', borderRadius: '12px', border: 'none', backgroundColor: '#0E3B2E', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: salvandoCartao || !novoCartaoNome.trim() ? 'not-allowed' : 'pointer', opacity: salvandoCartao || !novoCartaoNome.trim() ? 0.6 : 1, marginBottom: editandoCartaoId ? '10px' : 0 }}>
              {salvandoCartao ? 'Salvando...' : editandoCartaoId ? 'Salvar alterações' : 'Criar cartão'}
            </button>
            {editandoCartaoId && (
              <button onClick={handleDeletarCartao} disabled={deletandoCartao}
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid #FCA5A5', backgroundColor: confirmDeleteCartao ? '#FEF2F2' : '#fff', color: '#DC2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {deletandoCartao ? 'Excluindo...' : confirmDeleteCartao ? 'Confirmar exclusão do cartão' : 'Excluir cartão'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Saldo em Conta */}
      {modalSaldoContaOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalSaldoContaOpen(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.5)' }}>
          <div style={{ width: isMobile ? '100%' : '380px', backgroundColor: '#fff', borderRadius: isMobile ? '28px 28px 0 0' : '20px', padding: '24px' }}>
            {isMobile && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '-8px auto 16px' }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Saldo da conta</h2>
              <button onClick={() => setModalSaldoContaOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px', lineHeight: 1.4 }}>
              Digite quanto você tem na conta agora, olhando o extrato real do banco. É esse número,
              exatamente como digitado, que vai ser comparado com a fatura pendente do cartão — sem
              somar nem subtrair nenhum lançamento automaticamente. Atualize aqui sempre que quiser.
            </p>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Saldo atual</p>
            <input type="text" inputMode="decimal" value={saldoInicialInput} onChange={e => setSaldoInicialInput(e.target.value)}
              placeholder="Ex: 4922,75"
              style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
            <button onClick={handleSalvarSaldoConta} disabled={salvandoSaldoConta || !saldoInicialInput}
              style={{ width: '100%', height: '46px', borderRadius: '12px', border: 'none', backgroundColor: '#0E3B2E', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: salvandoSaldoConta || !saldoInicialInput ? 'not-allowed' : 'pointer', opacity: salvandoSaldoConta || !saldoInicialInput ? 0.6 : 1 }}>
              {salvandoSaldoConta ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

