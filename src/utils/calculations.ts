import { CalculationResult, TipoSaida } from '../types';

/**
 * Calcula os valores financeiros da venda seguindo as regras inegociáveis do SIG Olor Luz:
 * 
 * 1. Preço Unitário: Buscado na aba Listas (cruzamento de Embalagem com Tabela de Preço).
 * 2. Preço de Venda: (Preço Unitário * Quantidade) + Modificador.
 *    - O Modificador é o valor total em R$ (Adicional positivo ou Desconto negativo).
 *    - O modificador NÃO se multiplica pela quantidade.
 * 3. Regra Vendas Internas (Olor Luz):
 *    - Se o Vendedor selecionado for "Olor Luz", NÃO se calcula comissão (Comissão = R$ 0,00).
 *      A comissão só se aplica a vendedores externos.
 * 4. Regra de Comissão Padrão (Vendedores Externos):
 *    - 12% sobre o subtotal bruto (Preço Unitário * Quantidade).
 *    - O Modificador é repassado integralmente, somando ou subtraindo desse valor de comissão.
 *    - Formula: (0.12 * Preço Unitário * Quantidade) + Modificador
 * 5. Regra "Consignado":
 *    - Se Tipo de Saída for Consignado, a comissão é sempre R$ 0,00.
 * 6. Regra "Outras Saídas":
 *    - Se Tipo de Saída não for "Venda" nem "Consignado" (ex: Mostruário, Bonificação),
 *      todos os valores financeiros (Preço Uni, Preço Venda, Comissão) devem ser 0.
 */
export function calcularValoresVenda(
  tipoSaida: TipoSaida,
  precoUniBuscado: number,
  quantidade: number,
  modificadorR$: number, // Positivo para Adicional, Negativo para Desconto
  vendedor?: string
): CalculationResult {
  const tipoNorm = (tipoSaida || '').toString().trim().toLowerCase();
  const qtd = Math.max(0, Number(quantidade) || 0);
  const mod = Number(modificadorR$) || 0;
  const unitPrice = Math.max(0, Number(precoUniBuscado) || 0);

  const isOlorLuz = (vendedor || '').toString().trim().toLowerCase() === 'olor luz';
  const isAmostraGratis = tipoNorm === 'amostra grátis' || tipoNorm === 'amostra gratis';

  // 1. Regra para Saídas não financeiras (Consignado, Amostra Grátis, Mostruário, Bonificação, etc.):
  // Apenas saídas do tipo "Venda" geram faturamento financeiro e preço unitário no sistema.
  if (tipoNorm !== 'venda') {
    return {
      precoUni: 0,
      subtotalBruto: 0,
      precoVenda: 0,
      comissao: 0,
      regraAplicada: `${tipoSaida || 'Não Venda'}: Saída sem contabilização financeira de faturamento (R$ 0,00)`,
    };
  }

  // 2. Cálculo do Valor dos Produtos para Saídas do tipo Venda
  const subtotalBruto = unitPrice * qtd;
  const precoVenda = Math.max(0, subtotalBruto + mod);

  // 3. Regra Venda Interna por "Olor Luz" (Sem comissão)
  if (isOlorLuz) {
    return {
      precoUni: unitPrice,
      subtotalBruto,
      precoVenda,
      comissao: 0,
      regraAplicada: 'Venda Interna (Olor Luz): Sem comissão (R$ 0,00)',
    };
  }

  // 4. Comissão Padrão para Vendedores Externos (12% do subtotal bruto + Modificador integral)
  const comissaoBase = subtotalBruto * 0.12;
  const comissaoFinal = comissaoBase + mod;

  return {
    precoUni: unitPrice,
    subtotalBruto,
    precoVenda,
    comissao: Number(comissaoFinal.toFixed(2)),
    regraAplicada: 'Venda Padrão (Externa): 12% sobre subtotal bruto + Modificador integral em R$',
  };
}

/**
 * Utilitário de formatação de moeda brasileira (BRL)
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0);
}

/**
 * Utilitário para formatar datas em Padrão Brasileiro DD/MM/YYYY
 */
export function formatarDataBR(dataIso: string): string {
  if (!dataIso) return '-';
  const partes = dataIso.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataIso;
}
