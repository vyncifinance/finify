// lib/categorias-empresa.ts
// Categorias específicas do contexto Empresa (CNPJ) — não reaproveitar as pessoais.

import {
  Briefcase, FileSignature, PiggyBank, Receipt, Users,
  Megaphone, Building, Wrench, Calculator, MoreHorizontal,
} from 'lucide-react'

export const CATEGORIAS_DESPESA_EMPRESA = [
  'Fornecedores', 'Impostos', 'Pró-labore', 'Folha de Pagamento',
  'Marketing', 'Aluguel/Sede', 'Software/Ferramentas', 'Contabilidade', 'Outros',
]

export const CATEGORIAS_RECEITA_EMPRESA = [
  'Faturamento', 'Prestação de Serviço', 'Outras Receitas',
]

export const ICONES_CAT_EMPRESA: Record<string, any> = {
  'Fornecedores': Briefcase,
  'Impostos': Receipt,
  'Pró-labore': PiggyBank,
  'Folha de Pagamento': Users,
  'Marketing': Megaphone,
  'Aluguel/Sede': Building,
  'Software/Ferramentas': Wrench,
  'Contabilidade': Calculator,
  'Outros': MoreHorizontal,
  'Faturamento': FileSignature,
  'Prestação de Serviço': Briefcase,
  'Outras Receitas': PiggyBank,
}
