import React, { useState, useEffect, useMemo } from 'react';
import { Formula, InsumoFormula, ListasSelects, MateriaPrima, ProdutoStatus } from '../types';
import { 
  calcularCustoInsumo, 
  calcularMetricasFormula, 
  formatarValorUnitarioLitro,
  normalizarInsumosPara1000L,
  calcularItemNormalizadoPara1000L,
  obterInsumosDisponiveis
} from '../utils/formulaCalculations';
import { getLocalFormulas } from '../services/api';
import { formatarMoeda } from '../utils/calculations';
import { 
  X, 
  FlaskConical, 
  Plus, 
  Trash2, 
  Save, 
  Sparkles, 
  Calculator, 
  AlertCircle, 
  ArrowUp, 
  ArrowDown, 
  SlidersHorizontal,
  Info,
  Beaker,
  CheckCircle2,
  Search,
  Factory
} from 'lucide-react';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  formulaParaEditar?: Formula | null;
  listas: ListasSelects;
  formulasExistentes?: Formula[];
  onSalvar: (formula: Formula) => Promise<void>;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({
  isOpen,
  onClose,
  formulaParaEditar,
  listas,
  formulasExistentes,
  onSalvar
}) => {
  // Estado do Toggle Modo Laboratório / Criação Livre
  const [isCriacaoLivre, setIsCriacaoLivre] = useState<boolean>(false);
  
  // Campos Principais
  const [produto, setProduto] = useState<string>('');
  const [buscaProduto, setBuscaProduto] = useState<string>('');
  const [status, setStatus] = useState<ProdutoStatus>('Ativo');
  const [rendimento, setRendimento] = useState<number | ''>(1000);
  const [unidadeRendimento, setUnidadeRendimento] = useState<string>('L');
  const [obs, setObs] = useState<string>('');

  // Lista dinâmica de Insumos
  const [insumos, setInsumos] = useState<InsumoFormula[]>([
    {
      seq: 1,
      insumo: '',
      uni: 'L',
      precoUni: 0,
      baseFormula: 0,
      metodologia: '',
      custoTotal: 0
    }
  ]);

  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  // Lista de fórmulas cadastradas (para extrair as de 'Uso interno' com poder de matéria-prima)
  const todasFormulas = useMemo(() => {
    if (formulasExistentes && formulasExistentes.length > 0) {
      return formulasExistentes;
    }
    return getLocalFormulas();
  }, [formulasExistentes]);

  // Lista unificada de insumos (Fórmulas de Uso Interno + Matérias-Primas do Catálogo)
  const insumosDisponiveis = useMemo(() => {
    return obterInsumosDisponiveis(
      listas.materiasPrimas || [],
      todasFormulas,
      formulaParaEditar?.id,
      formulaParaEditar?.produto
    );
  }, [listas.materiasPrimas, todasFormulas, formulaParaEditar?.id, formulaParaEditar?.produto]);

  // Matérias-Primas e Fórmulas ordenadas
  const materiasPrimasOrdenadas = insumosDisponiveis.todas;

  // Lista de produtos para select pesquisável no modo padrão
  const produtosDisponiveis = useMemo(() => {
    let prods: string[] = [];
    if (listas.produtosDetalhes && listas.produtosDetalhes.length > 0) {
      prods = listas.produtosDetalhes.map(p => p.nome);
    } else if (listas.produtos) {
      prods = [...listas.produtos];
    }
    return Array.from(new Set(prods.filter(Boolean))).sort((a, b) => 
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })
    );
  }, [listas.produtos, listas.produtosDetalhes]);

  // Inicializa formulário apenas na abertura do modal ou quando formulaParaEditar mudar
  useEffect(() => {
    if (!isOpen) return;

    setErro('');
    if (formulaParaEditar) {
      setIsCriacaoLivre(Boolean(formulaParaEditar.isCriacaoLivre));
      setProduto(formulaParaEditar.produto || '');
      setBuscaProduto(formulaParaEditar.produto || '');
      setStatus(formulaParaEditar.status || 'Ativo');
      setRendimento(formulaParaEditar.rendimento || 1000);
      setUnidadeRendimento(formulaParaEditar.unidadeRendimento || 'L');
      setObs(formulaParaEditar.obs || '');
      if (Array.isArray(formulaParaEditar.insumos) && formulaParaEditar.insumos.length > 0) {
        setInsumos(formulaParaEditar.insumos.map((item, idx) => ({
          seq: item.seq || idx + 1,
          insumo: item.insumo || '',
          uni: item.uni || 'L',
          precoUni: Number(item.precoUni) || 0,
          baseFormula: Number(item.baseFormula) || 0,
          metodologia: item.metodologia || '',
          custoTotal: Number(item.custoTotal) || 0
        })));
      } else {
        setInsumos([
          { seq: 1, insumo: '', uni: 'L', precoUni: 0, baseFormula: 0, metodologia: '', custoTotal: 0 }
        ]);
      }
    } else {
      // Nova Fórmula Padrão
      setIsCriacaoLivre(false);
      let prods: string[] = [];
      if (listas.produtosDetalhes && listas.produtosDetalhes.length > 0) {
        prods = listas.produtosDetalhes.map(p => p.nome);
      } else if (listas.produtos) {
        prods = [...listas.produtos];
      }
      const primeiroProd = prods.filter(Boolean)[0] || '';
      setProduto(primeiroProd);
      setBuscaProduto(primeiroProd);
      setStatus('Ativo');
      setRendimento(1000);
      setUnidadeRendimento('L');
      setObs('');
      const primeiraMP = (listas.materiasPrimas || [])[0];
      setInsumos([
        {
          seq: 1,
          insumo: primeiraMP ? primeiraMP.nome : '',
          uni: primeiraMP?.uni || 'L',
          precoUni: primeiraMP ? primeiraMP.precoUni : 0,
          baseFormula: 0,
          metodologia: '',
          custoTotal: 0
        }
      ]);
    }
  }, [isOpen, formulaParaEditar]);

  // Ao alternar o toggle "Criação Livre", ajusta as travas arquiteturais
  const handleToggleCriacaoLivre = (novoValor: boolean) => {
    setIsCriacaoLivre(novoValor);
    if (novoValor) {
      // Entrando no Modo Laboratório / Criação Livre:
      setProduto('');
      setBuscaProduto('');
      setRendimento('');
      setUnidadeRendimento('ml');
    } else {
      // Voltando para Modo Padrão:
      setRendimento(1000);
      setUnidadeRendimento('L');
      if (!produtosDisponiveis.includes(produto) && produtosDisponiveis.length > 0) {
        setProduto(produtosDisponiveis[0]);
        setBuscaProduto(produtosDisponiveis[0]);
      }
    }
  };

  // Atualização dinâmica dos insumos e recálculo
  const handleInsumoChange = (
    index: number, 
    campo: keyof InsumoFormula, 
    valor: any
  ) => {
    setInsumos(prev => {
      const novaLista = [...prev];
      const itemAtual = { ...novaLista[index] };

      if (campo === 'insumo') {
        const mpEncontrada = materiasPrimasOrdenadas.find(m => m.nome === valor);
        itemAtual.insumo = valor;
        if (mpEncontrada) {
          itemAtual.precoUni = mpEncontrada.precoUni;
          if (!isCriacaoLivre || !itemAtual.uni) {
            itemAtual.uni = mpEncontrada.uni || 'L';
          }
        }
      } else if (campo === 'baseFormula') {
        itemAtual.baseFormula = Math.max(0, Number(valor) || 0);
      } else if (campo === 'uni') {
        itemAtual.uni = valor;
      } else if (campo === 'metodologia') {
        itemAtual.metodologia = valor;
      } else if (campo === 'seq') {
        itemAtual.seq = Math.max(1, parseInt(valor, 10) || 1);
      }

      // Recalcula custo total da linha
      itemAtual.custoTotal = calcularCustoInsumo(itemAtual.precoUni, itemAtual.baseFormula, itemAtual.uni);
      novaLista[index] = itemAtual;
      return novaLista;
    });
  };

  // Adicionar nova linha de insumo
  const handleAdicionarInsumo = () => {
    setInsumos(prev => {
      const proximaSeq = prev.length + 1;
      const primeiraMP = materiasPrimasOrdenadas[0];
      return [
        ...prev,
        {
          seq: proximaSeq,
          insumo: primeiraMP ? primeiraMP.nome : '',
          uni: primeiraMP?.uni || (isCriacaoLivre ? 'ml' : 'L'),
          precoUni: primeiraMP ? primeiraMP.precoUni : 0,
          baseFormula: 0,
          metodologia: '',
          custoTotal: 0
        }
      ];
    });
  };

  // Remover linha de insumo e reordenar sequências
  const handleRemoverInsumo = (indexParaRemover: number) => {
    if (insumos.length <= 1) {
      setErro('A fórmula precisa conter ao menos 1 insumo.');
      return;
    }
    setInsumos(prev => {
      const filtrados = prev.filter((_, idx) => idx !== indexParaRemover);
      // Reordena sequências em cascata
      return filtrados.map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
    });
  };

  // Mover insumo para cima / baixo
  const handleMoverInsumo = (index: number, direcao: 'cima' | 'baixo') => {
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= insumos.length) return;

    setInsumos(prev => {
      const copia = [...prev];
      const [itemRemovido] = copia.splice(index, 1);
      copia.splice(novoIndex, 0, itemRemovido);
      // Reordena as sequências
      return copia.map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
    });
  };

  // Cálculos matemáticos em tempo real e normalização
  const metricas = useMemo(() => {
    const r = typeof rendimento === 'number' ? rendimento : (parseFloat(rendimento as string) || 0);
    return calcularMetricasFormula(insumos, r, unidadeRendimento, isCriacaoLivre);
  }, [insumos, rendimento, unidadeRendimento, isCriacaoLivre]);

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const nomeProdFinal = produto.trim();
    if (!nomeProdFinal) {
      setErro('Por favor, informe o nome do produto / fragrância.');
      return;
    }

    if (isCriacaoLivre && (!rendimento || Number(rendimento) <= 0)) {
      setErro('Por favor, informe o rendimento do lote de produção no modo Criação Livre.');
      return;
    }

    if (insumos.length === 0) {
      setErro('Adicione ao menos um insumo na formulação.');
      return;
    }

    const insumosComQuantidade = insumos.filter(i => i.baseFormula > 0 && i.insumo.trim());
    if (insumosComQuantidade.length === 0) {
      setErro('Preencha a quantidade (Base Fórmula) de pelo menos 1 insumo com valor maior que zero.');
      return;
    }

    setSalvando(true);
    try {
      const rNum = typeof rendimento === 'number' ? rendimento : (parseFloat(rendimento as string) || 0);

      // Normaliza os insumos para a base industrial de 1.000 Litros se for Criação Livre
      const insumosFinais = isCriacaoLivre 
        ? normalizarInsumosPara1000L(insumos, rNum, unidadeRendimento)
        : insumos.map((item, idx) => ({
            seq: item.seq || idx + 1,
            insumo: item.insumo,
            uni: item.uni || 'L',
            precoUni: Number(item.precoUni) || 0,
            baseFormula: Number(item.baseFormula) || 0,
            metodologia: item.metodologia?.trim() || '',
            custoTotal: calcularCustoInsumo(item.precoUni, item.baseFormula, item.uni)
          }));

      const formulaPayload: Formula = {
        id: formulaParaEditar?.id || `temp_${Date.now()}`,
        produto: nomeProdFinal,
        status: status || 'Ativo',
        isCriacaoLivre,
        rendimento: 1000, // Sempre salvo no padrão industrial de 1.000 Litros
        unidadeRendimento: 'L',
        custoTotal: metricas.custoProjetado1000L,
        custoUnitarioLitro: metricas.custoUnitarioLitro,
        insumos: insumosFinais,
        obs: isCriacaoLivre && rendimento
          ? `${obs ? `${obs}\n\n` : ''}[Ensaio Laboratorial P&D]: Criado em ensaio de ${rendimento} ${unidadeRendimento} e normalizado automaticamente para base industrial de 1.000 Litros.`
          : obs.trim(),
        createdAt: formulaParaEditar?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSalvar(formulaPayload);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar fórmula:', err);
      setErro(err.message || 'Erro ao gravar fórmula no banco de dados.');
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        
        {/* CABEÇALHO DO MODAL COM TOGGLE "CRIAÇÃO LIVRE" */}
        <div className="p-4 sm:p-6 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isCriacaoLivre 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-500/10' 
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-lg sm:text-xl font-bold text-amber-200">
                  {formulaParaEditar ? 'Editar Fórmula de Engenharia' : 'Nova Fórmula de Produto (P&D)'}
                </h2>
                {isCriacaoLivre && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                    Modo Laboratório
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isCriacaoLivre 
                  ? 'Ambiente de bancada com conversão e normalização matemática automática para 1000L'
                  : 'Formulação industrial padrão baseada no rendimento fixo de 1.000 Litros'}
              </p>
            </div>
          </div>

          {/* TOGGLE / SWITCH "CRIAÇÃO LIVRE" NO TOPO */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-900 border border-slate-700/70 hover:border-slate-600 px-3.5 py-2 rounded-xl transition-all">
            <div 
              onClick={() => handleToggleCriacaoLivre(!isCriacaoLivre)}
              className="text-right cursor-pointer select-none"
            >
              <span className={`text-xs font-bold block transition-colors ${isCriacaoLivre ? 'text-purple-300' : 'text-slate-200'}`}>
                Criação Livre
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {isCriacaoLivre ? 'Modo Laboratório Ativo' : 'Modo Industrial Padrão'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleCriacaoLivre(!isCriacaoLivre)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                isCriacaoLivre ? 'bg-purple-600' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={isCriacaoLivre}
              title="Alternar entre Modo Padrão (1000L) e Criação Livre (Laboratório/P&D)"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isCriacaoLivre ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors ml-2"
              title="Fechar Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO FORMULÁRIO (SCROLLÁVEL) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          
          {erro && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-center space-x-3 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{erro}</span>
            </div>
          )}

          {/* SESSÃO 1: DADOS GERAIS DO PRODUTO & RENDIMENTO */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Identificação do Produto & Parâmetros de Lote</span>
              </h3>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                isCriacaoLivre 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {isCriacaoLivre ? 'Laboratório (P&D)' : 'Industrial Padrão (1000L)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* CAMPO PRODUTO */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Produto / Fragrância <span className="text-rose-400">*</span>
                </label>

                {!isCriacaoLivre ? (
                  /* Modo Padrão: Select com busca consumindo Lista Global */
                  <div className="space-y-1">
                    <select
                      value={produto}
                      onChange={(e) => setProduto(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                    >
                      <option value="" disabled>Selecione o produto...</option>
                      {produtosDisponiveis.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Consumindo a lista global de produtos cadastrados.
                    </p>
                  </div>
                ) : (
                  /* Modo Criação Livre: Input de Texto Livre */
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={produto}
                      onChange={(e) => setProduto(e.target.value)}
                      placeholder="Ex: NOVO AROMA LAB-01"
                      required
                      className="w-full bg-slate-900 border border-purple-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 placeholder:text-slate-600 uppercase"
                    />
                    <p className="text-[10px] text-purple-300">
                      ✨ O produto será cadastrado na Lista Global de Produtos no Firestore com status <strong>{status}</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* CAMPO STATUS */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Status da Formulação
                </label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProdutoStatus)}
                  className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none ${
                    isCriacaoLivre ? 'border-purple-500/50 focus:border-purple-400' : 'border-slate-700 focus:border-amber-400'
                  }`}
                >
                  <option value="Uso interno" className="text-cyan-400 font-bold">Uso interno (Base P&D / Insumo de Outras Fórmulas)</option>
                  <option value="Ativo" className="text-emerald-400 font-bold">Ativo (Liberado para Produção e Vendas)</option>
                  <option value="Teste" className="text-amber-400 font-bold">Teste (Em Validação / Laboratório)</option>
                  <option value="Inativo" className="text-slate-400 font-bold">Inativo (Oculto)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Escolha o status desejado (ex: <strong>Uso interno</strong> para a fórmula nascer pronta e utilizável como insumo).
                </p>
              </div>

              {/* CAMPO RENDIMENTO & UNIDADE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Rendimento do Lote de Produção
                </label>

                {!isCriacaoLivre ? (
                  /* Modo Padrão: Fixo visualmente em 1000L */
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 flex items-center justify-between font-mono">
                    <span className="font-bold text-amber-300">1.000 Litros</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      Fixo (Padrão)
                    </span>
                  </div>
                ) : (
                  /* Modo Criação Livre: Inputs de Rendimento e Unidade */
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={rendimento}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRendimento(val === '' ? '' : parseFloat(val));
                      }}
                      placeholder="Ex: 500"
                      required
                      className="w-full bg-slate-900 border border-purple-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-purple-400"
                    />
                    <select
                      value={unidadeRendimento}
                      onChange={(e) => setUnidadeRendimento(e.target.value)}
                      className="w-full bg-slate-900 border border-purple-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-purple-400"
                    >
                      <option value="ml">ml (Mililitros)</option>
                      <option value="L">L (Litros)</option>
                      <option value="g">g (Gramas)</option>
                      <option value="Kg">Kg (Quilos)</option>
                    </select>
                  </div>
                )}
                <p className="text-[10px] text-slate-400">
                  {isCriacaoLivre 
                    ? (rendimento ? `Base do teste: ${rendimento} ${unidadeRendimento} (~${metricas.rendimentoEmLitros}L). Normaliza p/ 1000L.` : 'Informe a quantidade e unidade do ensaio laboratorial.') 
                    : 'Rendimento industrial base de 1.000 Litros.'}
                </p>
              </div>

            </div>
          </div>

          {/* SESSÃO 2: TABELA REPETÍVEL DINÂMICA DE INSUMOS (MATÉRIAS-PRIMAS) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-amber-400" />
                  <span>Composição & Metodologia dos Insumos ({insumos.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cadastre a sequência de adição, matérias-primas, metodologia de mistura e dosagens da receita.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAdicionarInsumo}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Insumo</span>
              </button>
            </div>

            {/* BANNER INFORMATIVO DE CONVERSÃO AUTOMÁTICA EM CRIAÇÃO LIVRE */}
            {isCriacaoLivre && (
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-purple-200">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-purple-300">
                    Conversão e Fechamento Automático para Padrão 1.000 Litros
                  </span>
                  <p className="text-[11px] text-purple-300/80">
                    Informe as dosagens na escala do seu ensaio ({rendimento ? `${rendimento} ${unidadeRendimento}` : 'de bancada'}). Ao salvar a fórmula, o sistema converterá e fechará todos os insumos automaticamente no padrão industrial de <strong>1.000 Litros</strong> com unidades em <strong>L</strong> ou <strong>Kg</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* LISTA DINÂMICA DE INSUMOS (RESPONSIVA MOBILE-FIRST) */}
            <div className="space-y-3">
              {insumos.map((item, index) => {
                const itemNorm = isCriacaoLivre 
                  ? calcularItemNormalizadoPara1000L(item, metricas.rendimentoEmLitros) 
                  : null;

                return (
                <div 
                  key={index}
                  className="bg-slate-950 border border-slate-800/90 hover:border-slate-700 rounded-xl p-3 sm:p-4 space-y-3 transition-all"
                >
                  
                  {/* LINHA 1: SEQ, INSUMO, UNI, R$ UNI, BASE FORMULA, CUSTO TOTAL, REMOVER */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    
                    {/* SEQ COM BOTÕES DE REORDENAÇÃO */}
                    <div className="sm:col-span-2 flex items-center gap-1.5">
                      <div className="w-full">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono mb-1">
                          Seq
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.seq}
                          onChange={(e) => handleInsumoChange(index, 'seq', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 pt-3">
                        <button
                          type="button"
                          onClick={() => handleMoverInsumo(index, 'cima')}
                          disabled={index === 0}
                          className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 rounded text-[10px]"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoverInsumo(index, 'baixo')}
                          disabled={index === insumos.length - 1}
                          className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-400 disabled:opacity-30 rounded text-[10px]"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* SELEÇÃO DA MATÉRIA-PRIMA OU FÓRMULA INTERNA */}
                    <div className="sm:col-span-4">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono">
                          Insumo / Matéria-Prima <span className="text-rose-400">*</span>
                        </label>
                        {insumosDisponiveis.formulasUsoInterno.some(f => f.nome.toLowerCase() === (item.insumo || '').toLowerCase()) && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                            <Factory className="w-2.5 h-2.5 text-cyan-400" /> Base Interna (P&D)
                          </span>
                        )}
                      </div>
                      <select
                        value={item.insumo}
                        onChange={(e) => handleInsumoChange(index, 'insumo', e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                      >
                        <option value="" disabled>Selecione a matéria-prima ou base interna...</option>
                        
                        {/* GRUPO 1: FÓRMULAS DE USO INTERNO COM PODER DE MATÉRIA-PRIMA */}
                        {insumosDisponiveis.formulasUsoInterno.length > 0 && (
                          <optgroup label="🧪 Fórmulas de Uso Interno (Bases P&D)">
                            {insumosDisponiveis.formulasUsoInterno.map((f) => (
                              <option key={`fi_${f.nome}`} value={f.nome} className="text-cyan-300 font-semibold bg-slate-900">
                                🧪 {f.nome} — ({formatarMoeda(f.precoUni)}/{f.uni || 'L'}) [Base Interna]
                              </option>
                            ))}
                          </optgroup>
                        )}

                        {/* GRUPO 2: MATÉRIAS-PRIMAS DO CATÁLOGO GERAL */}
                        <optgroup label="📦 Matérias-Primas do Catálogo">
                          {insumosDisponiveis.catalogoPadrao.map((mp) => (
                            <option key={`mp_${mp.nome}`} value={mp.nome} className="text-slate-100 bg-slate-900">
                              {mp.nome} — ({formatarMoeda(mp.precoUni)}/{mp.uni || 'L'})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* UNIDADE (UNI) */}
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono mb-1">
                        UNI
                      </label>
                      {!isCriacaoLivre ? (
                        <input
                          type="text"
                          value={item.uni || 'L'}
                          readOnly
                          className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-center font-bold text-slate-300 cursor-not-allowed"
                        />
                      ) : (
                        <select
                          value={item.uni || 'ml'}
                          onChange={(e) => handleInsumoChange(index, 'uni', e.target.value)}
                          className="w-full bg-slate-900 border border-purple-500/50 rounded-lg px-1.5 py-1.5 text-xs text-center font-bold text-purple-300 focus:outline-none focus:border-purple-400"
                        >
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="g">g</option>
                          <option value="Kg">Kg</option>
                          <option value="un">un</option>
                        </select>
                      )}
                    </div>

                    {/* PREÇO UNITÁRIO (R$ UNI - READONLY) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono mb-1">
                        R$ Uni
                      </label>
                      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300">
                        {formatarMoeda(item.precoUni)}
                      </div>
                    </div>

                    {/* QUANTIDADE (BASE FÓRMULA) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono mb-1">
                        Base Fórmula (Qtd) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.baseFormula || ''}
                        onChange={(e) => handleInsumoChange(index, 'baseFormula', e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* BOTÃO REMOVER LINHA */}
                    <div className="sm:col-span-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoverInsumo(index)}
                        disabled={insumos.length <= 1}
                        className="p-2 bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-900/50 rounded-lg transition-colors disabled:opacity-20"
                        title="Remover este insumo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* LINHA 2: NOVO CAMPO METODOLOGIA + RESUMO DE CUSTO DO INSUMO */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-900">
                    
                    {/* METODOLOGIA DA ETAPA */}
                    <div className="sm:col-span-8">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase font-mono mb-1">
                        Metodologia & Instrução de Execução da Etapa
                      </label>
                      <input
                        type="text"
                        value={item.metodologia || ''}
                        onChange={(e) => handleInsumoChange(index, 'metodologia', e.target.value)}
                        placeholder="Ex: Adicionar sob agitação lenta a 40°C por 10 minutos até total homogenização..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* CUSTO TOTAL CALCULADO DO INSUMO + PROJEÇÃO 1000L */}
                    <div className="sm:col-span-4 bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex flex-col justify-center">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isCriacaoLivre ? 'Custo Ensaio:' : 'Custo do Insumo:'}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatarMoeda(item.custoTotal)}
                        </span>
                      </div>
                      {itemNorm && item.baseFormula > 0 && (
                        <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-purple-300 font-semibold font-mono flex items-center gap-1">
                            <Factory className="w-2.5 h-2.5 text-cyan-400" />
                            <span>Padrão 1000L:</span>
                          </span>
                          <span className="text-cyan-300 font-mono font-bold">
                            {itemNorm.baseFormulaNormalizada} {itemNorm.novaUni} ({formatarMoeda(itemNorm.custoTotal1000L)})
                          </span>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              );
              })}

              {/* BOTÃO ADICIONAR INSUMO ABAIXO DA ÚLTIMA LINHA (FACILIDADE DE USO) */}
              <div className="pt-1">
                <button
                  type="button"
                  id="btn-adicionar-insumo-inferior"
                  onClick={handleAdicionarInsumo}
                  className="w-full py-2.5 px-4 bg-slate-900/80 hover:bg-slate-800 border border-dashed border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 group shadow-sm cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-lg bg-amber-500/20 group-hover:bg-amber-500/30 border border-amber-500/30 flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span>+ Adicionar Insumo</span>
                </button>
              </div>
            </div>
          </div>

          {/* SESSÃO 3: CAMPO OBSERVAÇÕES GERAIS (TEXTAREA) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-semibold text-slate-300 font-mono uppercase">
              Observações Gerais da Fórmula & Instruções de Segurança (OBS)
            </label>
            <textarea
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Descreva detalhes adicionais, tempo de cura, especificações de envase, restrições ou notas de P&D..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
            />
          </div>

        </form>

        {/* RODAPÉ DO MODAL COM CÁLCULOS MATEMÁTICOS DE NORMALIZAÇÃO & BOTÕES DE AÇÃO */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* CARDS DE CÁLCULO E NORMALIZAÇÃO */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1">
            
            {/* CARD 1: CUSTO TOTAL DO LOTE */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                {isCriacaoLivre ? `Custo Lote (${rendimento ? `${rendimento}${unidadeRendimento}` : 'P&D'})` : 'Custo Total (1000L)'}
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-amber-300">
                {formatarMoeda(metricas.custoTotalLote)}
              </span>
            </div>

            {/* CARD 2: CUSTO NORMALIZADO R$ / LITRO (O VALOR PADRÃO NORMALIZADO) */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-400 font-bold uppercase font-mono block flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                <span>Custo Normalizado R$/L</span>
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-300">
                {formatarValorUnitarioLitro(metricas.custoUnitarioLitro)}
                <span className="text-xs font-normal text-emerald-400/80"> / Litro</span>
              </span>
            </div>

            {/* CARD 3: PROJEÇÃO PARA 1000L */}
            <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                Projeção Industrial (1000L)
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-slate-200">
                {formatarMoeda(metricas.custoProjetado1000L)}
              </span>
            </div>

          </div>

          {/* BOTÕES DE FECHAR E SALVAR */}
          <div className="flex items-center space-x-3 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={salvando}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando no Firebase...' : 'Salvar Fórmula'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
