export type UserTipo = 'Master' | 'Vendedor';

export interface User {
  nome: string;
  tipo: UserTipo;
  email: string;
  senha?: string;
}

export type TipoSaida = 'Venda' | 'Consignado' | 'Amostra Grátis' | 'Mostruário' | 'Bonificação' | string;

export type StatusComissao = 'Pendente' | 'Pago' | 'Cancelado' | string;

export interface Venda {
  id: string; // Coluna A: ID
  data: string; // Coluna B: Data (YYYY-MM-DD)
  idSaida: string; // Coluna C: ID_Saida
  vendedor: string; // Coluna D: Vendedor
  tabelaPreco?: string; // Coluna E: Tabela de Preço
  tipoSaida: TipoSaida; // Coluna F: Tipo Saida
  produto: string; // Coluna G: Produto
  embalagem: string; // Coluna H: Embalagem_VENDA
  quantidade: number; // Coluna I: Quantidade
  modificador: number; // Coluna J: Desconto/Adicional em R$
  precoUni: number; // Coluna K: Preco uni
  precoVenda: number; // Coluna L: Preco de Venda
  comissao: number; // Coluna M: R$ de Comissao
  statusComissao: StatusComissao; // Coluna N: Status Comissao
  dia: number; // Coluna O: Dia
  mes: number; // Coluna P: Mes
  ano: number; // Coluna Q: Ano
  obs: string; // Coluna R: OBS
  clienteInfluenciador?: string; // Coluna S: Cliente/Influenciador
  contato?: string; // Coluna T: Contato
}

export type ProdutoStatus = 'Ativo' | 'Inativo' | 'Teste' | 'Uso interno';

export interface ProdutoItem {
  nome: string;
  status: ProdutoStatus;
}

export interface MateriaPrima {
  nome: string;
  precoUni: number;
  uni?: string; // Unidade de medida (ex: 'L', 'kg', 'g', 'ml', 'un')
  isFormulaInterna?: boolean; // Se é uma fórmula/base com status 'Uso interno'
  formulaId?: string; // ID da fórmula de origem
}

export type UnidadeMedida = 'L' | 'ml' | 'Kg' | 'g' | 'un' | string;

export interface InsumoFormula {
  seq: number;
  insumo: string; // Nome da Matéria Prima
  uni: string; // Unidade (L, ml, Kg, g, un)
  precoUni: number; // R$ unitário
  baseFormula: number; // Quantidade na receita
  metodologia?: string; // NOVO campo: descrição da execução da etapa
  custoTotal: number; // Calculado dinamicamente (Base Formula * R$ uni / normalização)
}

export interface Formula {
  id: string;
  produto: string; // Nome do produto
  status: ProdutoStatus; // 'Ativo' | 'Inativo' | 'Teste'
  isCriacaoLivre: boolean; // Flag de Criação Livre (Modo Laboratório / P&D)
  rendimento: number; // Rendimento do lote (ex: 1000 no padrão, ou 500 no laboratório)
  unidadeRendimento: string; // 'L', 'ml', 'Kg', 'g'
  custoTotal: number; // Custo do lote / receita
  custoUnitarioLitro: number; // Custo R$/L normalizado para 1 Litro padrão
  insumos: InsumoFormula[];
  obs?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListasSelects {
  vendedores: string[];
  produtos: string[]; // Produtos Ativos disponíveis para vendas
  produtosDetalhes?: ProdutoItem[]; // Lista completa de produtos com seus respectivos status (Ativo, Inativo, Teste)
  embalagens: string[];
  tabelasPreco: string[];
  tiposSaida: string[];
  statusComissao: string[];
  materiasPrimas?: MateriaPrima[];
}

export interface ItemPrecoMatriz {
  embalagem: string;
  tabelaPreco: string;
  precoUni: number;
}

export interface ListasData {
  selects: ListasSelects;
  dadosBrutos: Record<string, any>[];
  precosMatriz: ItemPrecoMatriz[];
}

export interface ApiResponse {
  status: 'success' | 'error';
  message?: string;
  listas?: ListasSelects;
  dadosBrutos?: Record<string, any>[];
  vendas?: Venda[];
  registros?: Venda[];
  timestamp?: string;
}

export interface CalculationResult {
  precoUni: number;
  subtotalBruto: number;
  precoVenda: number;
  comissao: number;
  regraAplicada: string;
}
