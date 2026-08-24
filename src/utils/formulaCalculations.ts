import { InsumoFormula, UnidadeMedida, Formula, MateriaPrima } from '../types';

/**
 * Retorna todas as opções de insumos disponíveis para compor fórmulas,
 * mesclando as Matérias-Primas do catálogo com todas as Fórmulas de 'Uso interno' (Bases Aromáticas/Químicas).
 * Evita autorreferência da fórmula atualmente em edição.
 */
export function obterInsumosDisponiveis(
  materiasPrimasCatalogo: MateriaPrima[] = [],
  formulasExistentes: Formula[] = [],
  idFormulaAtual?: string,
  nomeFormulaAtual?: string
): {
  todas: MateriaPrima[];
  formulasUsoInterno: MateriaPrima[];
  catalogoPadrao: MateriaPrima[];
} {
  const formulasUsoInterno: MateriaPrima[] = formulasExistentes
    .filter(f => {
      if (f.status !== 'Uso interno') return false;
      if (idFormulaAtual && f.id === idFormulaAtual) return false;
      if (nomeFormulaAtual && f.produto && f.produto.trim().toLowerCase() === nomeFormulaAtual.trim().toLowerCase()) return false;
      return true;
    })
    .map(f => ({
      nome: f.produto,
      precoUni: Number(f.custoUnitarioLitro) || 0,
      uni: f.unidadeRendimento || 'L',
      isFormulaInterna: true,
      formulaId: f.id
    }));

  const catalogoPadrao: MateriaPrima[] = (materiasPrimasCatalogo || []).map(mp => ({
    ...mp,
    isFormulaInterna: false
  }));

  formulasUsoInterno.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  catalogoPadrao.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  return {
    todas: [...formulasUsoInterno, ...catalogoPadrao],
    formulasUsoInterno,
    catalogoPadrao
  };
}

/**
 * Calcula o custo monetário de uma linha de insumo levando em consideração sua unidade de medida:
 * - Se for 'ml', converte para litros (/ 1000) considerando o preço unitário em R$/L
 * - Se for 'g', converte para kg (/ 1000) considerando o preço unitário em R$/Kg
 * - Se for 'L', 'Kg', 'un' ou padrão, multiplica diretamente
 */
export function calcularCustoInsumo(precoUni: number, qtd: number, uni: string): number {
  const p = Number(precoUni) || 0;
  const q = Number(qtd) || 0;
  const u = (uni || 'L').trim().toLowerCase();

  if (u === 'ml' || u === 'g') {
    return Number(((q / 1000) * p).toFixed(4));
  }
  return Number((q * p).toFixed(4));
}

/**
 * Converte o valor de rendimento para a unidade padrão em Litros/Kg
 */
export function normalizarRendimentoParaLitros(rendimento: number, unidade: string): number {
  const r = Number(rendimento) || 0;
  const u = (unidade || 'L').trim().toLowerCase();

  if (r <= 0) return 1; // Previne divisão por zero

  if (u === 'ml' || u === 'g') {
    return r / 1000;
  }
  return r;
}

export interface CalculoFormulaResult {
  custoTotalLote: number;
  custoUnitarioLitro: number;
  custoProjetado1000L: number;
  rendimentoEmLitros: number;
  fatorEscala1000L: number;
}

/**
 * Executa o algoritmo de normalização matemática de fórmulas da Olor Luz:
 * - Modo Padrão: Lote fixo de 1000L. Custo R$/L = Custo Total / 1000.
 * - Modo Criação Livre: Lote em escala de bancada/teste (ex: 500ml, 100g, etc).
 *   Projeta os insumos e custos para a base de 1 Litro (R$/L) e 1000 Litros.
 */
export function calcularMetricasFormula(
  insumos: InsumoFormula[],
  rendimento: number,
  unidadeRendimento: string,
  isCriacaoLivre: boolean
): CalculoFormulaResult {
  if (!isCriacaoLivre) {
    // Modo Padrão: Rendimento fixo de 1000 Litros
    let custoTotalLote = 0;
    insumos.forEach((item) => {
      custoTotalLote += (Number(item.baseFormula) || 0) * (Number(item.precoUni) || 0);
    });

    const custoUnitarioLitro = custoTotalLote / 1000;
    return {
      custoTotalLote: Number(custoTotalLote.toFixed(2)),
      custoUnitarioLitro: Number(custoUnitarioLitro.toFixed(4)),
      custoProjetado1000L: Number(custoTotalLote.toFixed(2)),
      rendimentoEmLitros: 1000,
      fatorEscala1000L: 1
    };
  }

  // Modo Criação Livre (Laboratório / P&D)
  let custoTotalLote = 0;
  insumos.forEach((item) => {
    custoTotalLote += calcularCustoInsumo(item.precoUni, item.baseFormula, item.uni);
  });

  const rendimentoEmLitros = normalizarRendimentoParaLitros(rendimento, unidadeRendimento);
  const custoUnitarioLitro = rendimentoEmLitros > 0 ? (custoTotalLote / rendimentoEmLitros) : 0;
  const custoProjetado1000L = custoUnitarioLitro * 1000;
  const fatorEscala1000L = rendimentoEmLitros > 0 ? (1000 / rendimentoEmLitros) : 1;

  return {
    custoTotalLote: Number(custoTotalLote.toFixed(4)),
    custoUnitarioLitro: Number(custoUnitarioLitro.toFixed(4)),
    custoProjetado1000L: Number(custoProjetado1000L.toFixed(2)),
    rendimentoEmLitros: Number(rendimentoEmLitros.toFixed(4)),
    fatorEscala1000L: Number(fatorEscala1000L.toFixed(4))
  };
}

/**
 * Normaliza uma linha individual de insumo do modo laboratório (ml, g, etc.) para o padrão industrial de 1.000L (L, Kg, un)
 */
export function calcularItemNormalizadoPara1000L(
  item: InsumoFormula,
  rendimentoEmLitros: number
): { baseFormulaNormalizada: number; novaUni: string; custoTotal1000L: number } {
  const rLitros = rendimentoEmLitros > 0 ? rendimentoEmLitros : 1;
  const fatorEscala = 1000 / rLitros;
  const rawQtd = Number(item.baseFormula) || 0;
  const rawUni = (item.uni || 'L').trim().toLowerCase();
  const precoUni = Number(item.precoUni) || 0;

  let baseFormulaNormalizada = 0;
  let novaUni = 'L';

  if (rawUni === 'ml') {
    // Ex: 340ml em ensaio de 1000ml (1L) -> (340/1000) * 1000 = 340 L
    baseFormulaNormalizada = (rawQtd / 1000) * fatorEscala;
    novaUni = 'L';
  } else if (rawUni === 'g') {
    // Ex: 50g em ensaio de 1000ml (1L) -> (50/1000) * 1000 = 50 Kg
    baseFormulaNormalizada = (rawQtd / 1000) * fatorEscala;
    novaUni = 'Kg';
  } else if (rawUni === 'kg' || rawUni === 'quilo' || rawUni === 'quilos') {
    baseFormulaNormalizada = rawQtd * fatorEscala;
    novaUni = 'Kg';
  } else if (rawUni === 'un' || rawUni === 'unidade' || rawUni === 'unidades') {
    baseFormulaNormalizada = rawQtd * fatorEscala;
    novaUni = 'un';
  } else {
    // Litros ou default
    baseFormulaNormalizada = rawQtd * fatorEscala;
    novaUni = 'L';
  }

  // Formatação limpa de casas decimais (arredonda no máximo 4 casas)
  baseFormulaNormalizada = Number(Number(baseFormulaNormalizada).toFixed(4));
  const custoTotal1000L = Number((baseFormulaNormalizada * precoUni).toFixed(2));

  return {
    baseFormulaNormalizada,
    novaUni,
    custoTotal1000L
  };
}

/**
 * Converte todos os insumos de uma formulação laboratorial para a base industrial de 1.000 Litros
 * Fechando em unidades industriais (L, Kg, un)
 */
export function normalizarInsumosPara1000L(
  insumos: InsumoFormula[],
  rendimento: number,
  unidadeRendimento: string
): InsumoFormula[] {
  const rendimentoEmLitros = normalizarRendimentoParaLitros(rendimento, unidadeRendimento);

  return insumos.map((item, idx) => {
    const { baseFormulaNormalizada, novaUni, custoTotal1000L } = calcularItemNormalizadoPara1000L(
      item,
      rendimentoEmLitros
    );

    return {
      seq: item.seq || idx + 1,
      insumo: item.insumo,
      uni: novaUni,
      precoUni: Number(item.precoUni) || 0,
      baseFormula: baseFormulaNormalizada,
      metodologia: item.metodologia?.trim() || '',
      custoTotal: custoTotal1000L
    };
  });
}

/**
 * Normaliza qualquer objeto Formula que não esteja fechado no padrão de 1.000 Litros
 */
export function normalizarFormulaCompleta(formula: Formula): Formula {
  const r = Number(formula.rendimento) || 1000;
  const u = formula.unidadeRendimento || 'L';

  // Se já estiver em 1000L e os insumos não tiverem ml/g, apenas recalcula custos
  const precisaNormalizarInsumos = 
    r !== 1000 || 
    u !== 'L' || 
    formula.insumos.some(i => (i.uni || '').toLowerCase() === 'ml' || (i.uni || '').toLowerCase() === 'g');

  if (!precisaNormalizarInsumos) {
    return formula;
  }

  const metricas = calcularMetricasFormula(formula.insumos, r, u, true);
  const insumosNormalizados = normalizarInsumosPara1000L(formula.insumos, r, u);

  return {
    ...formula,
    rendimento: 1000,
    unidadeRendimento: 'L',
    custoTotal: metricas.custoProjetado1000L,
    custoUnitarioLitro: metricas.custoUnitarioLitro,
    insumos: insumosNormalizados,
    updatedAt: formula.updatedAt || new Date().toISOString()
  };
}

/**
 * Formata valor monetário com precisão customizada (para centavos de insumos e R$/L)
 */
export function formatarValorUnitarioLitro(valor: number): string {
  const v = Number(valor) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(v);
}

