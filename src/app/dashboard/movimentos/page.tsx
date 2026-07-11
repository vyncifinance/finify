'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ChevronDown,
  Plus, Wallet, X, UtensilsCrossed, Home, Car, Smile,
  Heart, BookOpen, ShoppingBag, Church, MoreHorizontal,
  Briefcase, TrendingUp, Laptop, DollarSign, Trash2, Pencil,
  CreditCard, FileText, AlignLeft, Repeat, CheckCircle2,
  Pill, Gift, Sparkles, GraduationCap, Smartphone, Shirt, Wrench, ClipboardList, Filter, Search, PawPrint,
  Building2, Truck, Landmark, Megaphone, Calculator, Users, Check
} from 'lucide-react'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CATEGORIAS_DESPESA = ['Alimentação','Moradia','Transporte','Lazer','Saúde','Educação','Cartão de Crédito','Dízimo','Farmácia','Presente','Estética','Estudos','Eletrônicos','Vestuário','Consertos','Serviços','Pet','Investimentos','Outros']
const CATEGORIAS_RECEITA = ['Salário','Renda Extra','Freelance','Investimento','Outros']

const CATEGORIAS_EMPRESA_DESPESA = ['Fornecedores','Impostos','Pró-labore','Folha de Pagamento','Marketing','Aluguel/Sede','Software/Ferramentas','Contabilidade','Outros']
const CATEGORIAS_EMPRESA_RECEITA = ['Faturamento','Prestação de Serviço','Outras Receitas']

const ICONES_CAT: Record<string, any> = {
  'Alimentação': UtensilsCrossed, 'Moradia': Home, 'Transporte': Car, 'Lazer': Smile,
  'Saúde': Heart, 'Educação': BookOpen, 'Compras': ShoppingBag, 'Dízimo': Church,
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

function formatDiaLabel(dataStr: string) {
  const hoje  = new Date()
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1)
  const data  = new Date(dataStr + 'T12:00:00')
  const f = (d: Date) => d.toISOString().split('T')[0]
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
  const [dataLanc, setDataLanc]           = useState(new Date().toISOString().split('T')[0])
  const [dizimar, setDizimar]             = useState(true)
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

      await carregarLancamentos(fid, profile.nome, nomeFam, contexto)
      await recarregarDespesasFixas(fid, contexto)
    }
    setLoading(false)
  }

  function trocarContexto(novo: { tipo: 'pessoal' | 'empresa'; empresaId?: string; nome: string }) {
    setContextoAtivo(novo)
    setContextoAberto(false)
    try { localStorage.setItem('finify_contexto', JSON.stringify(novo)) } catch {}
    carregarLancamentos(familiaIdRef.current, membroAtual, familiaNome, novo)
    recarregarDespesasFixas(familiaIdRef.current, novo)
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
    const ini = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1).toISOString().split('T')[0]
    const fim = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).toISOString().split('T')[0]
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
    setDataLanc(new Date().toISOString().split('T')[0])
    setMembroForm(membroAtual); setDizimar(false)
    setObservacao(''); setParcelado(false); setNumParcelas('2'); setDiaParcela('1')
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

  // Sincroniza aportes/estornos de investimento com o saldo da carteira (tabela investimentos).
  // Só atua no contexto pessoal — Investimentos, assim como Reserva de Emergência e Metas, não existe para empresas.
  async function ajustarSaldoInvestimento(fid: string, dataStr: string, delta: number, empresaId: string | null) {
    if (!fid || delta === 0 || empresaId) return
    const mesRef = `${dataStr.slice(0, 7)}-01`

    const { data: registroMes } = await supabase.from('investimentos')
      .select('id, saldo').eq('familia_id', fid).eq('mes', mesRef).maybeSingle()

    if (registroMes) {
      const novoSaldo = Number(registroMes.saldo) + delta
      await supabase.from('investimentos').update({ saldo: novoSaldo }).eq('id', registroMes.id)
      return
    }

    if (delta > 0) {
      const { data: anteriores } = await supabase.from('investimentos')
        .select('saldo').eq('familia_id', fid).lt('mes', mesRef)
        .order('mes', { ascending: false }).limit(1)
      const base = anteriores && anteriores[0] ? Number(anteriores[0].saldo) : 0
      await supabase.from('investimentos').insert({
        familia_id: fid, user_id: userId, mes: mesRef, saldo: base + delta,
        observacao: 'Aporte automático via Movimentos',
      })
    }
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

    if (editando) {
      const eraInvestimento   = ehCategoriaInvestimento(editando.categoria) && editando.tipo === 'despesa'
      const eInvestimentoNovo = ehCategoriaInvestimento(categoria) && tipo === 'despesa'

      const { error } = await supabase.from('lancamentos').update({
        tipo, valor: valorNum, categoria, membro: membroForm, data: dataLanc,
        dizimar: tipo === 'receita' ? dizimar : false,
        descricao: observacao || null,
      }).eq('id', editando.id)

      if (!error) {
        if (eraInvestimento) await ajustarSaldoInvestimento(fid, editando.data, -Number(editando.valor), editando.empresa_id || null)
        if (eInvestimentoNovo) await ajustarSaldoInvestimento(fid, dataLanc, valorNum, empresaId)
      }
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid) }
    } else if (parcelado && tipo === 'despesa') {
      // Lançamento parcelado — cria N lançamentos
      const n = parseInt(numParcelas) || 2
      const dia = parseInt(diaParcela) || 1
      const valorParcela = valorNum / n
      const dataBase = new Date(dataLanc + 'T12:00:00')
      const inserts = []
      for (let i = 0; i < n; i++) {
        const d = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dia)
        const dataStr = d.toISOString().split('T')[0]
        inserts.push({
          familia_id: fid, user_id: userId, tipo: 'despesa',
          valor: Math.round(valorParcela * 100) / 100,
          categoria, membro: membroForm, data: dataStr, hora,
          dizimar: false, empresa_id: empresaId,
          descricao: `${observacao ? observacao + ' ' : ''}Parcela ${i + 1}/${n}`,
        })
      }
      const { error } = await supabase.from('lancamentos').insert(inserts)
      if (!error && ehCategoriaInvestimento(categoria)) {
        for (const item of inserts) await ajustarSaldoInvestimento(fid, item.data, item.valor, empresaId)
      }
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid) }
    } else {
      const { error } = await supabase.from('lancamentos').insert({
        familia_id: fid, user_id: userId, tipo, valor: valorNum,
        categoria, membro: membroForm, data: dataLanc, hora,
        dizimar: tipo === 'receita' ? dizimar : false,
        empresa_id: empresaId,
        descricao: observacao || null,
      })
      if (!error && tipo === 'despesa' && ehCategoriaInvestimento(categoria)) {
        await ajustarSaldoInvestimento(fid, dataLanc, valorNum, empresaId)
      }
      setSalvando(false)
      if (!error) { setModalOpen(false); await carregarLancamentos(fid) }
    }
  }

  async function handleDeletar() {
    if (!editando) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletando(true)
    const { error } = await supabase.from('lancamentos').delete().eq('id', editando.id)
    if (!error && editando.tipo === 'despesa' && ehCategoriaInvestimento(editando.categoria)) {
      await ajustarSaldoInvestimento(familiaIdRef.current, editando.data, -Number(editando.valor), editando.empresa_id || null)
    }
    setDeletando(false)
    if (!error) {
      setLancamentos(prev => prev.filter((l: any) => l.id !== editando.id))
      setModalOpen(false)
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
    const dataStr = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, '0')}-${String(df.dia_vencimento).padStart(2, '0')}`
    const ehReceita = df.tipo === 'receita'
    const { error } = await supabase.from('lancamentos').insert({
      familia_id: fid, user_id: userId, tipo: ehReceita ? 'receita' : 'despesa', valor,
      categoria: df.categoria, membro: membroAtual, data: dataStr, hora,
      dizimar: ehReceita && !df.empresa_id, descricao: null, despesa_fixa_id: df.id,
      empresa_id: df.empresa_id || null,
    })
    if (!error) {
      if (!ehReceita && ehCategoriaInvestimento(df.categoria)) {
        await ajustarSaldoInvestimento(fid, dataStr, valor, df.empresa_id || null)
      }
      // Para valores variáveis, o valor confirmado vira a nova referência do próximo mês
      if (df.valor_variavel && valor !== Number(df.valor)) {
        await supabase.from('despesas_fixas').update({ valor }).eq('id', df.id)
        await recarregarDespesasFixas(fid)
      }
      await carregarLancamentos(fid)
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
      if (df.lancamento.tipo === 'despesa' && ehCategoriaInvestimento(df.lancamento.categoria)) {
        await ajustarSaldoInvestimento(familiaIdRef.current, df.lancamento.data, -Number(df.lancamento.valor), df.lancamento.empresa_id || null)
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

  const filtrados = lancamentos.filter(l => {
    if (filtro !== 'todos' && l.tipo !== filtro) return false
    if (filtroMembro !== 'todos' && l.membro !== filtroMembro) return false
    if (filtroCategoria !== 'todos' && l.categoria !== filtroCategoria) return false
    if (busca.trim() && !(l.descricao || '').toLowerCase().includes(busca.trim().toLowerCase())) return false
    return true
  })

  const categoriasPresentes = Array.from(new Set(
    lancamentos
      .filter(l => filtro === 'todos' || l.tipo === filtro)
      .map(l => l.categoria)
  )).sort()

  const grupos: Record<string, any[]> = {}
  filtrados.forEach(l => {
    if (!grupos[l.data]) grupos[l.data] = []
    grupos[l.data].push(l)
  })
  const diasOrdenados = Object.keys(grupos).sort((a, b) => b.localeCompare(a))

  const totalRec = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0)
  const totalDes = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0)
  const resultado = totalRec - totalDes
  const saldoProjetado = resultado + totalReceitasFixasPendentes - totalDespesasFixasPendentes
  const mesLabel  = `${MESES[mesRef.getMonth()]} ${mesRef.getFullYear()}`
  const categorias = contextoAtivo.tipo === 'empresa'
    ? (tipo === 'despesa' ? CATEGORIAS_EMPRESA_DESPESA : CATEGORIAS_EMPRESA_RECEITA)
    : (tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA)

  // Seção "Despesas Fixas" — compartilhada entre mobile e desktop
  const despesasFixasSection = (isMob: boolean) => (
    <div style={{ marginBottom: isMob ? '16px' : '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Repeat size={isMob ? 14 : 16} color="#64748B" strokeWidth={1.75} />
          <span style={{ fontSize: isMob ? '13px' : '15px', fontWeight: 700, color: '#0B3B2E', letterSpacing: '-0.2px' }}>Despesas Fixas</span>
          {totalDespesasFixasPendentes > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', padding: '5px 12px', borderRadius: '999px' }}>
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
    </div>
  )

  // Conteúdo do modal de despesa fixa
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
  const modalContent = (isMob: boolean) => (
    <>
      {/* Drag handle mobile */}
      {isMob && <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E2E8F0', margin: '12px auto 4px', flexShrink: 0 }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          {editando ? 'Editar lançamento' : 'Novo lançamento'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {editando && (
            <button onClick={handleDeletar} disabled={deletando}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: confirmDelete ? '#EF4444' : '#FEF2F2', color: confirmDelete ? '#fff' : '#DC2626' }}>
              <Trash2 size={13} strokeWidth={2} />
              {deletando ? 'Deletando...' : confirmDelete ? 'Confirmar' : 'Deletar'}
            </button>
          )}
          <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
            <X size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 8px' }}>

        {/* Lançando em — mini-seletor de contexto */}
        {!editando && (
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Lançando em</p>
            <button type="button" onClick={() => setContextoAberto(!contextoAberto)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', border: `1.5px solid ${contextoAtivo.tipo === 'empresa' ? 'rgba(20,90,69,0.35)' : '#E2E8F0'}`, backgroundColor: contextoAtivo.tipo === 'empresa' ? '#F0FDF4' : '#F8FAFC', cursor: 'pointer' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0, backgroundColor: contextoAtivo.tipo === 'empresa' ? '#14574518' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {contextoAtivo.tipo === 'empresa'
                  ? <Building2 size={14} color="#145A45" strokeWidth={1.75} />
                  : <Users size={14} color="#64748B" strokeWidth={1.75} />}
              </div>
              <span style={{ flex: 1, textAlign: 'left', fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>{contextoAtivo.nome}</span>
              {contextoAtivo.tipo === 'empresa' && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#145A45', backgroundColor: '#D1FAE5', padding: '2px 7px', borderRadius: '999px' }}>PJ</span>
              )}
              <ChevronDown size={15} color="#94A3B8" strokeWidth={2} style={{ transform: contextoAberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {contextoAberto && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 10, overflow: 'hidden' }}>
                <button type="button" onClick={() => { trocarContexto({ tipo: 'pessoal', nome: familiaNome }); handleTipo(tipo) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Users size={14} color="#64748B" strokeWidth={1.75} />
                  <span style={{ flex: 1, fontSize: '13px', color: '#0F172A' }}>{familiaNome}</span>
                  {contextoAtivo.tipo === 'pessoal' && <Check size={14} color="#145A45" strokeWidth={2.5} />}
                </button>
                {empresas.map((emp: any) => (
                  <button key={emp.id} type="button" onClick={() => { trocarContexto({ tipo: 'empresa', empresaId: emp.id, nome: emp.nome }); handleTipo(tipo) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'none', border: 'none', borderTop: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}>
                    <Building2 size={14} color="#145A45" strokeWidth={1.75} />
                    <span style={{ flex: 1, fontSize: '13px', color: '#0F172A' }}>{emp.nome}</span>
                    {contextoAtivo.tipo === 'empresa' && contextoAtivo.empresaId === emp.id && <Check size={14} color="#145A45" strokeWidth={2.5} />}
                  </button>
                ))}
                <a href="/dashboard/perfil"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderTop: '1px solid #F1F5F9', textDecoration: 'none', color: '#145A45', fontSize: '13px', fontWeight: 600 }}>
                  <Plus size={14} strokeWidth={2.5} /> Adicionar empresa (CNPJ)
                </a>
              </div>
            )}
          </div>
        )}

        {/* Tipo */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          {[{ key: 'despesa', label: 'Despesa', cor: '#EF4444' }, { key: 'receita', label: 'Receita', cor: '#10B981' }].map(t => (
            <button key={t.key} onClick={() => handleTipo(t.key as any)}
              style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: `2px solid ${tipo === t.key ? t.cor : '#E2E8F0'}`, backgroundColor: tipo === t.key ? t.cor + '12' : '#fff', color: tipo === t.key ? t.cor : '#64748B' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '6px 16px', marginBottom: '10px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Valor</p>
          <input
            type="text" inputMode="numeric" value={valor}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '')
              const num = parseInt(digits || '0', 10)
              setValor(digits === '' ? '' : (num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
            }}
            placeholder="0,00"
            style={{ width: '100%', textAlign: 'center', fontSize: isMob ? '28px' : '32px', fontWeight: 700, border: 'none', outline: 'none', backgroundColor: 'transparent', color: tipo === 'despesa' ? '#EF4444' : '#10B981' }}
          />
        </div>

        {/* Membro */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Quem está lançando</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '6px', marginBottom: '10px' }}>
          {(membrosFamilia.length ? membrosFamilia : [membroAtual]).map(m => (
            <button key={m} onClick={() => setMembroForm(m)}
              style={{ padding: '8px', borderRadius: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${membroForm === m ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: membroForm === m ? '#F0FDF4' : '#fff', color: membroForm === m ? '#0E3B2E' : '#64748B' }}>
              {m.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Categoria */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Categoria</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {categorias.map(c => {
            const Icon = ICONES_CAT[c] || MoreHorizontal
            return (
              <button key={c} onClick={() => setCategoria(c)}
                style={{ padding: '8px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', border: `1px solid ${categoria === c ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: categoria === c ? '#F0FDF4' : '#fff', color: categoria === c ? '#0E3B2E' : '#64748B', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '64px' }}>
                <Icon size={14} strokeWidth={1.75} color={categoria === c ? '#0E3B2E' : '#94A3B8'} />
                {c}
              </button>
            )
          })}
        </div>

        {/* Data + Dízimo */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
          <input type="date" value={dataLanc} onChange={e => setDataLanc(e.target.value)}
            style={{ flex: 1, padding: '9px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
          {tipo === 'receita' && (
            <button onClick={() => setDizimar(!dizimar)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '12px', border: `1px solid ${dizimar ? '#D1FAE5' : '#E2E8F0'}`, backgroundColor: dizimar ? '#F0FDF4' : '#F8FAFC', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: dizimar ? '#10B981' : '#E2E8F0' }}>
                <div style={{ position: 'absolute', top: '2px', left: dizimar ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: dizimar ? '#059669' : '#94A3B8', whiteSpace: 'nowrap' }}>Dízimo</span>
            </button>
          )}
        </div>

        {/* Parcelado — só despesa e novo lançamento */}
        {tipo === 'despesa' && !editando && (
          <div style={{ marginBottom: '10px' }}>
            <button onClick={() => setParcelado(!parcelado)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${parcelado ? '#3B82F6' : '#E2E8F0'}`, backgroundColor: parcelado ? '#EFF6FF' : '#F8FAFC', cursor: 'pointer', marginBottom: parcelado ? '8px' : '0' }}>
              <div style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '10px', backgroundColor: parcelado ? '#3B82F6' : '#E2E8F0', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '2px', left: parcelado ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: parcelado ? '#1D4ED8' : '#0F172A', margin: 0 }}>Compra parcelada</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Divide o valor em parcelas mensais</p>
              </div>
            </button>
            {parcelado && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px 14px', backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#1D4ED8', marginBottom: '4px' }}>Nº de parcelas</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setNumParcelas(String(Math.max(2, parseInt(numParcelas) - 1)))}
                      style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #BFDBFE', backgroundColor: '#fff', cursor: 'pointer', fontSize: '16px', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#1D4ED8', minWidth: '24px', textAlign: 'center' }}>{numParcelas}x</span>
                    <button onClick={() => setNumParcelas(String(Math.min(48, parseInt(numParcelas) + 1)))}
                      style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #BFDBFE', backgroundColor: '#fff', cursor: 'pointer', fontSize: '16px', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#1D4ED8', marginBottom: '4px' }}>Dia de vencimento</p>
                  <input type="number" min="1" max="31" value={diaParcela} onChange={e => setDiaParcela(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #BFDBFE', fontSize: '16px', fontWeight: 700, color: '#1D4ED8', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }} />
                </div>
                {valor && (
                  <div style={{ gridColumn: '1 / -1', padding: '8px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #BFDBFE', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                      {numParcelas}x de <strong style={{ color: '#1D4ED8' }}>
                        {fmt(parseFloat(valor.replace(/\./g, '').replace(',', '.')) / parseInt(numParcelas))}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Observação */}
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Observação (opcional)</p>
        <textarea value={observacao} onChange={e => setObservacao(e.target.value)}
          placeholder="Ex: Geladeira Samsung, comprada no Extra..."
          rows={2}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '8px' }} />

        {confirmDelete && (
          <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginBottom: '4px' }}>
            Toque em "Confirmar" para deletar permanentemente.
          </p>
        )}
      </div>

      {/* Botão fixo */}
      <div style={{ padding: '12px 20px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#fff', flexShrink: 0 }}>
        <button onClick={handleSalvar} disabled={salvando || !valor}
          style={{ width: '100%', height: '48px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 600, color: '#fff', cursor: salvando || !valor ? 'not-allowed' : 'pointer', backgroundColor: '#0E3B2E', opacity: salvando || !valor ? 0.6 : 1 }}>
          {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : parcelado ? `Criar ${numParcelas} parcelas` : 'Registrar lançamento'}
        </button>
      </div>
    </>
  )

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
      `}</style>

      {/* ── MOBILE ── */}
      <div className="lg:hidden" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '100px' }}>
        <div style={{
          backgroundColor: '#0E3B2E', padding: '20px 20px 36px',
          border: contextoAtivo.tipo === 'empresa' ? '1.5px solid rgba(47,179,106,0.4)' : 'none',
          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <button onClick={() => setContextoAbertoHeader(!contextoAbertoHeader)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, maxWidth: '100%' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contextoAtivo.nome || 'Fluxo Patrimonial'}
                </h1>
                {contextoAtivo.tipo === 'empresa' && (
                  <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#0E3B2E', backgroundColor: '#58D68D', padding: '2px 6px', borderRadius: '999px', flexShrink: 0 }}>PJ</span>
                )}
                <ChevronDown size={14} color="rgba(255,255,255,0.6)" style={{ transform: contextoAbertoHeader ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
              </button>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{mesLabel}</p>

              {contextoAbertoHeader && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '240px', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 12px 32px rgba(0,0,0,0.2)', zIndex: 20, overflow: 'hidden' }}>
                  <button onClick={() => { trocarContexto({ tipo: 'pessoal', nome: familiaNome }); setContextoAbertoHeader(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <Users size={15} color="#64748B" strokeWidth={1.75} />
                    <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{familiaNome}</span>
                    {contextoAtivo.tipo === 'pessoal' && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                  </button>
                  {empresas.map((emp: any) => (
                    <button key={emp.id} onClick={() => { trocarContexto({ tipo: 'empresa', empresaId: emp.id, nome: emp.nome }); setContextoAbertoHeader(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', borderTop: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}>
                      <Building2 size={15} color="#145A45" strokeWidth={1.75} />
                      <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{emp.nome}</span>
                      {contextoAtivo.tipo === 'empresa' && contextoAtivo.empresaId === emp.id && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                    </button>
                  ))}
                  <a href="/dashboard/perfil"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderTop: '1px solid #F1F5F9', textDecoration: 'none', color: '#145A45', fontSize: '13.5px', fontWeight: 600 }}>
                    <Plus size={15} strokeWidth={2.5} /> Adicionar empresa (CNPJ)
                  </a>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => mudarMes(-1)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={16} color="#fff" />
              </button>
              <button onClick={() => mudarMes(1)} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={16} color="#fff" />
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', padding: '0 16px', marginTop: '-20px', marginBottom: '16px' }}>
          {[
            { label: 'Receitas',  val: totalRec,  cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
            { label: 'Despesas',  val: totalDes,  cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight  },
            { label: 'Resultado', val: resultado, cor: resultado >= 0 ? '#10B981' : '#EF4444', bg: resultado >= 0 ? '#ECFDF5' : '#FEF2F2', Icon: Wallet },
          ].map(c => (
            <div key={c.label} style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <c.Icon size={14} color={c.cor} strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', marginBottom: '4px' }}>{c.label}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: c.cor, lineHeight: 1.2 }}>
                {loading ? '...' : `R$ ${Math.abs(c.val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 16px' }}>
          {despesasFixasSection(true)}
        </div>

        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94A3B8" strokeWidth={1.75} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por observação..."
              style={{ width: '100%', height: '42px', paddingLeft: '38px', paddingRight: busca ? '38px' : '14px', borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#fff', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
            {busca && (
              <button onClick={() => setBusca('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                <X size={15} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px', overflowX: 'auto' }}>
          {[{ key: 'todos', label: 'Todos' }, { key: 'receita', label: 'Receitas' }, { key: 'despesa', label: 'Despesas' }].map(f => (
            <button key={f.key} onClick={() => { setFiltro(f.key as any); setFiltroCategoria('todos') }}
              style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${filtro === f.key ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: filtro === f.key ? '#0E3B2E' : '#fff', color: filtro === f.key ? '#fff' : '#64748B', cursor: 'pointer' }}>
              {f.label}
            </button>
          ))}
          {membros.map(m => (
            <button key={m} onClick={() => setFiltroMembro(filtroMembro === m ? 'todos' : m)}
              style={{ padding: '6px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${filtroMembro === m ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: filtroMembro === m ? '#0E3B2E' : '#fff', color: filtroMembro === m ? '#fff' : '#64748B', cursor: 'pointer' }}>
              {m.split(' ')[0]}
            </button>
          ))}
        </div>

        {categoriasPresentes.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '0 16px 12px' }}>
            {categoriasPresentes.map(c => {
              const Icon = ICONES_CAT[c] || MoreHorizontal
              const ativo = filtroCategoria === c
              return (
                <button key={c} onClick={() => setFiltroCategoria(ativo ? 'todos' : c)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${ativo ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: ativo ? '#0E3B2E' : '#fff', color: ativo ? '#fff' : '#64748B', cursor: 'pointer' }}>
                  <Icon size={12} strokeWidth={1.75} color={ativo ? '#fff' : '#94A3B8'} />
                  {c}
                </button>
              )
            })}
          </div>
        )}

        <div style={{ padding: '0 16px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '64px 0', fontSize: '14px', color: '#94A3B8' }}>Carregando...</p>
          ) : diasOrdenados.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: '12px' }}>
              <Wallet size={32} color="#E2E8F0" strokeWidth={1} />
              <p style={{ fontSize: '14px', color: '#94A3B8' }}>Nenhum lançamento neste período.</p>
            </div>
          ) : diasOrdenados.map(dia => {
            const itens    = grupos[dia]
            const totalDia = itens.reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
            return (
              <div key={dia} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{formatDiaLabel(dia)}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: totalDia >= 0 ? '#10B981' : '#EF4444' }}>
                    {totalDia >= 0 ? '+' : '-'} {fmt(Math.abs(totalDia))}
                  </span>
                </div>
                <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden' }}>
                  {itens.map((l: any, i: number) => {
                    const Icon = ICONES_CAT[l.categoria] || (l.tipo === 'receita' ? ArrowDownLeft : ArrowUpRight)
                    return (
                      <button key={l.id} onClick={() => abrirModalEditar(l)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', backgroundColor: 'transparent', border: i > 0 ? '1px solid #F1F5F9' : 'none', borderLeft: 'none', borderRight: 'none', borderBottom: 'none', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={16} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{l.categoria}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{l.membro?.split(' ')[0]} · {l.hora}</p>
                            {l.descricao && <AlignLeft size={10} color="#94A3B8" strokeWidth={1.75} />}
                          </div>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: l.tipo === 'receita' ? '#10B981' : '#EF4444', flexShrink: 0, margin: 0 }}>
                          {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
                        </p>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Pencil size={12} color="#64748B" strokeWidth={1.75} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={abrirModalNovo}
          style={{ position: 'fixed', bottom: '80px', right: '24px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#0E3B2E', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(14,59,46,0.4)', zIndex: 40 }}>
          <Plus size={24} color="#fff" strokeWidth={2} />
        </button>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block p-8 max-w-[1440px] mx-auto" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="flex items-center justify-between mb-6">
          <div style={{ position: 'relative' }}>
            <button onClick={() => setContextoAbertoHeader(!contextoAbertoHeader)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', marginLeft: '-10px', borderRadius: '10px',
                backgroundColor: contextoAtivo.tipo === 'empresa' ? 'rgba(20,90,69,0.06)' : 'transparent',
              }}>
              <h1 className="text-2xl font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.5px' }}>{contextoAtivo.nome || 'Fluxo Patrimonial'}</h1>
              {contextoAtivo.tipo === 'empresa' && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#145A45', backgroundColor: '#D1FAE5', padding: '3px 9px', borderRadius: '999px' }}>PJ</span>
              )}
              <ChevronDown size={18} color="#94A3B8" style={{ transform: contextoAbertoHeader ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>Acompanhe receitas e despesas{contextoAtivo.tipo === 'pessoal' && familiaNome ? ` da família ${familiaNome}` : ''}</p>

            {contextoAbertoHeader && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '6px', width: '260px', backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 12px 32px rgba(0,0,0,0.12)', zIndex: 20, overflow: 'hidden' }}>
                <button onClick={() => { trocarContexto({ tipo: 'pessoal', nome: familiaNome }); setContextoAbertoHeader(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <Users size={15} color="#64748B" strokeWidth={1.75} />
                  <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{familiaNome}</span>
                  {contextoAtivo.tipo === 'pessoal' && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                </button>
                {empresas.map((emp: any) => (
                  <button key={emp.id} onClick={() => { trocarContexto({ tipo: 'empresa', empresaId: emp.id, nome: emp.nome }); setContextoAbertoHeader(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'none', border: 'none', borderTop: '1px solid #F1F5F9', cursor: 'pointer', textAlign: 'left' }}>
                    <Building2 size={15} color="#145A45" strokeWidth={1.75} />
                    <span style={{ flex: 1, fontSize: '13.5px', color: '#0F172A' }}>{emp.nome}</span>
                    {contextoAtivo.tipo === 'empresa' && contextoAtivo.empresaId === emp.id && <Check size={15} color="#145A45" strokeWidth={2.5} />}
                  </button>
                ))}
                <a href="/dashboard/perfil"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderTop: '1px solid #F1F5F9', textDecoration: 'none', color: '#145A45', fontSize: '13.5px', fontWeight: 600 }}>
                  <Plus size={15} strokeWidth={2.5} /> Adicionar empresa (CNPJ)
                </a>
              </div>
            )}
          </div>
          <button onClick={abrirModalNovo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: '#0F766E', boxShadow: '0 4px 12px rgba(15,118,110,0.3)', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} strokeWidth={2.5} /> Novo lançamento
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={() => mudarMes(-1)} className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: '#E2E8F0', color: '#64748B', backgroundColor: '#fff', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center" style={{ color: '#0F172A' }}>{mesLabel}</span>
          <button onClick={() => mudarMes(1)} className="w-9 h-9 rounded-full flex items-center justify-center border" style={{ borderColor: '#E2E8F0', color: '#64748B', backgroundColor: '#fff', cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          {[
            { label: 'Receitas', val: totalRec, cor: '#10B981', bg: '#ECFDF5', Icon: ArrowDownLeft },
            { label: 'Despesas', val: totalDes, cor: '#EF4444', bg: '#FEF2F2', Icon: ArrowUpRight },
            { label: 'Resultado do mês', val: resultado, cor: '#F59E0B', bg: '#FFFBEB', Icon: Wallet },
          ].map(c => (
            <div key={c.label} className="rounded-[20px] p-6 border" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: c.bg }}>
                <c.Icon size={19} color={c.cor} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: '#64748B' }}>{c.label}</p>
              <p className="text-2xl font-semibold" style={{ color: c.cor, letterSpacing: '-0.5px' }}>{loading ? '...' : fmt(c.val)}</p>
            </div>
          ))}
        </div>

        {despesasFixasSection(false)}

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
            {[{ key: 'todos', label: 'Todos' }, { key: 'receita', label: 'Receitas' }, { key: 'despesa', label: 'Despesas' }].map(f => (
              <button key={f.key} onClick={() => { setFiltro(f.key as any); setFiltroCategoria('todos') }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: filtro === f.key ? '#fff' : 'transparent', color: filtro === f.key ? '#0F172A' : '#64748B', boxShadow: filtro === f.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: '#F1F5F9' }}>
            <button onClick={() => setFiltroMembro('todos')}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: filtroMembro === 'todos' ? '#fff' : 'transparent', color: filtroMembro === 'todos' ? '#0F172A' : '#64748B', boxShadow: filtroMembro === 'todos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
              Todos os membros
            </button>
            {membros.map(m => (
              <button key={m} onClick={() => setFiltroMembro(m)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: filtroMembro === m ? '#fff' : 'transparent', color: filtroMembro === m ? '#0F172A' : '#64748B', boxShadow: filtroMembro === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', border: 'none', cursor: 'pointer' }}>
                {m}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', marginLeft: 'auto', minWidth: '260px' }}>
            <Search size={15} color="#94A3B8" strokeWidth={1.75} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por observação..."
              style={{ width: '100%', height: '38px', paddingLeft: '38px', paddingRight: busca ? '38px' : '14px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#fff', fontSize: '13px', color: '#0F172A', outline: 'none', boxSizing: 'border-box' }} />
            {busca && (
              <button onClick={() => setBusca('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                <X size={15} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {categoriasPresentes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {categoriasPresentes.map(c => {
              const Icon = ICONES_CAT[c] || MoreHorizontal
              const ativo = filtroCategoria === c
              return (
                <button key={c} onClick={() => setFiltroCategoria(ativo ? 'todos' : c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ border: `1px solid ${ativo ? '#0E3B2E' : '#E2E8F0'}`, backgroundColor: ativo ? '#0E3B2E' : '#fff', color: ativo ? '#fff' : '#64748B', cursor: 'pointer' }}>
                  <Icon size={12} strokeWidth={1.75} color={ativo ? '#fff' : '#94A3B8'} />
                  {c}
                </button>
              )
            })}
          </div>
        )}

        <div className="rounded-[20px] border overflow-hidden" style={{ backgroundColor: '#fff', borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {loading ? (
            <p className="text-sm text-center py-16" style={{ color: '#94A3B8' }}>Carregando...</p>
          ) : diasOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Wallet size={32} color="#E2E8F0" strokeWidth={1} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum lançamento neste período.</p>
              <button onClick={abrirModalNovo} className="text-sm font-semibold hover:underline" style={{ color: '#0F766E', background: 'none', border: 'none', cursor: 'pointer' }}>Registrar primeiro lançamento →</button>
            </div>
          ) : diasOrdenados.map(dia => {
            const itens    = grupos[dia]
            const totalDia = itens.reduce((s, l) => s + (l.tipo === 'receita' ? Number(l.valor) : -Number(l.valor)), 0)
            return (
              <div key={dia}>
                <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#F8FAFC' }}>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>{formatDiaLabel(dia)}</span>
                  <span className="text-xs font-semibold" style={{ color: totalDia >= 0 ? '#10B981' : '#EF4444' }}>
                    {totalDia >= 0 ? '+' : '-'} {fmt(Math.abs(totalDia))}
                  </span>
                </div>
                {itens.map((l: any) => {
                  const Icon = ICONES_CAT[l.categoria] || (l.tipo === 'receita' ? ArrowDownLeft : ArrowUpRight)
                  return (
                    <button key={l.id} onClick={() => abrirModalEditar(l)}
                      className="w-full flex items-center gap-3 px-6 py-3.5 border-t text-left hover:bg-gray-50"
                      style={{ borderColor: '#F1F5F9', background: 'none', cursor: 'pointer' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: l.tipo === 'receita' ? '#ECFDF5' : '#FEF2F2' }}>
                        <Icon size={15} color={l.tipo === 'receita' ? '#10B981' : '#EF4444'} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{l.categoria}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs" style={{ color: '#94A3B8' }}>{l.membro} · {l.hora}</p>
                          {l.descricao && <AlignLeft size={11} color="#94A3B8" strokeWidth={1.75} />}
                          {l.descricao && <p className="text-xs truncate" style={{ color: '#94A3B8', maxWidth: '200px' }}>{l.descricao}</p>}
                        </div>
                      </div>
                      <p className="font-semibold text-sm flex-shrink-0" style={{ color: l.tipo === 'receita' ? '#10B981' : '#EF4444' }}>
                        {l.tipo === 'receita' ? '+' : '-'} {fmt(Number(l.valor))}
                      </p>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#F1F5F9' }}>
                        <Pencil size={12} color="#64748B" strokeWidth={1.75} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

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
    </>
  )
}
