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

export interface ListasSelects {
  vendedores: string[];
  produtos: string[];
  embalagens: string[];
  tabelasPreco: string[];
  tiposSaida: string[];
  statusComissao: string[];
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
