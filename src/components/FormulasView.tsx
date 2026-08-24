import React, { useState, useEffect, useMemo } from 'react';
import { Formula, ListasSelects, User, ProdutoStatus } from '../types';
import { getFormulasApi, salvarFormulaApi, excluirFormulaApi } from '../services/api';
import { FormulaModal } from './FormulaModal';
import { formatarMoeda } from '../utils/calculations';
import { formatarValorUnitarioLitro } from '../utils/formulaCalculations';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Beaker, 
  Calculator, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  Info,
  SlidersHorizontal,
  Copy,
  Factory
} from 'lucide-react';

interface FormulasViewProps {
  listas: ListasSelects;
  onRefreshListas: () => Promise<void>;
  currentUser?: User;
}

export const FormulasView: React.FC<FormulasViewProps> = ({
  listas,
  onRefreshListas,
  currentUser
}) => {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroModo, setFiltroModo] = useState<string>('todos');
  
  // Linhas expandidas (Accordion: array de IDs expandidos)
  const [linhasExpandidas, setLinhasExpandidas] = useState<Record<string, boolean>>({});

  // Modal de Criação / Edição
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [formulaEmEdicao, setFormulaEmEdicao] = useState<Formula | null>(null);

  // Modal de Confirmação de Exclusão
  const [idParaExcluir, setIdParaExcluir] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<boolean>(false);

  // Feedback Toast
  const [toast, setToast] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; mensagem: string } | null>(null);

  // Dispara Toast temporário
  const showToast = (mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  // Carrega fórmulas do Firestore / LocalStorage
  const carregarFormulas = async () => {
    setCarregando(true);
    try {
      const data = await getFormulasApi();
      setFormulas(data);
      // Expande por padrão a primeira fórmula para demonstração imediata
      if (data.length > 0 && Object.keys(linhasExpandidas).length === 0) {
        setLinhasExpandidas({ [data[0].id]: true });
      }
    } catch (err) {
      console.error('Erro ao carregar fórmulas:', err);
      showToast('Erro ao carregar fórmulas do banco.', 'erro');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarFormulas();
  }, [listas]);

  // Alterar status diretamente pela tabela de fórmulas
  const handleQuickStatusChange = async (formula: Formula, novoStatus: ProdutoStatus) => {
    const formulaAtualizada: Formula = { ...formula, status: novoStatus };
    const res = await salvarFormulaApi(formulaAtualizada);
    if (res.success) {
      showToast(`Status de "${formula.produto}" alterado para ${novoStatus}`, 'sucesso');
      await carregarFormulas();
      await onRefreshListas();
    } else {
      showToast(res.message, 'erro');
    }
  };

  // Alterna o estado de expansão de uma linha
  const toggleExpansao = (id: string) => {
    setLinhasExpandidas(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Expandir / Recolher Todas
  const handleExpandirTodas = () => {
    const todasExpandidas = Object.values(linhasExpandidas).every(Boolean) && 
      Object.keys(linhasExpandidas).length === formulas.length;

    if (todasExpandidas) {
      setLinhasExpandidas({});
    } else {
      const novoEstado: Record<string, boolean> = {};
      formulas.forEach(f => {
        novoEstado[f.id] = true;
      });
      setLinhasExpandidas(novoEstado);
    }
  };

  // Salvar fórmula do modal
  const handleSalvarFormula = async (formulaPayload: Formula) => {
    const res = await salvarFormulaApi(formulaPayload);
    if (res.success) {
      showToast(res.message, 'sucesso');
      await carregarFormulas();
      await onRefreshListas();
    } else {
      showToast(res.message, 'erro');
    }
  };

  // Excluir fórmula
  const handleConfirmarExclusao = async () => {
    if (!idParaExcluir) return;
    setExcluindo(true);
    try {
      const res = await excluirFormulaApi(idParaExcluir);
      if (res.success) {
        showToast(res.message, 'sucesso');
        setFormulas(prev => prev.filter(f => f.id !== idParaExcluir));
      } else {
        showToast(res.message, 'erro');
      }
    } catch (err) {
      console.error('Erro ao excluir fórmula:', err);
      showToast('Erro ao excluir fórmula.', 'erro');
    } finally {
      setExcluindo(false);
      setIdParaExcluir(null);
    }
  };

  // Duplicar fórmula para P&D / Criação Livre
  const handleDuplicarFormula = (f: Formula) => {
    const copia: Formula = {
      ...f,
      id: `temp_${Date.now()}`,
      produto: `${f.produto} (Cópia P&D)`,
      isCriacaoLivre: true,
      status: 'Teste',
      rendimento: 1000,
      unidadeRendimento: 'L',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setFormulaEmEdicao(copia);
    setModalAberto(true);
  };

  // Filtro de Fórmulas
  const formulasFiltradas = useMemo(() => {
    return formulas.filter(f => {
      const busca = filtroTexto.toLowerCase().trim();
      const matchBusca = !busca || 
        f.produto.toLowerCase().includes(busca) || 
        (f.obs || '').toLowerCase().includes(busca) ||
        (f.insumos || []).some(i => i.insumo.toLowerCase().includes(busca) || (i.metodologia || '').toLowerCase().includes(busca));

      const matchStatus = filtroStatus === 'todos' || f.status === filtroStatus;
      
      const matchModo = filtroModo === 'todos' || 
        (filtroModo === 'livre' && f.isCriacaoLivre) || 
        (filtroModo === 'padrao' && !f.isCriacaoLivre);

      return matchBusca && matchStatus && matchModo;
    });
  }, [formulas, filtroTexto, filtroStatus, filtroModo]);

  // Métricas do Dashboard Superior
  const metricasGerais = useMemo(() => {
    const total = formulas.length;
    const ativas = formulas.filter(f => f.status === 'Ativo').length;
    const testes = formulas.filter(f => f.status === 'Teste' || f.isCriacaoLivre).length;
    
    // Custo médio por litro
    const somaCustosLitro = formulas.reduce((acc, curr) => acc + (curr.custoUnitarioLitro || 0), 0);
    const mediaCustoLitro = total > 0 ? (somaCustosLitro / total) : 0;

    return { total, ativas, testes, mediaCustoLitro };
  }, [formulas]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* TOAST FLUTUANTE */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center space-x-3 text-xs font-semibold animate-slideDown ${
          toast.tipo === 'sucesso' 
            ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40' 
            : toast.tipo === 'erro' 
              ? 'bg-rose-950/95 text-rose-200 border-rose-500/40'
              : 'bg-slate-900/95 text-slate-200 border-slate-700'
        }`}>
          {toast.tipo === 'sucesso' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.tipo === 'erro' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.tipo === 'info' && <Info className="w-4 h-4 text-amber-400" />}
          <span>{toast.mensagem}</span>
        </div>
      )}

      {/* DASHBOARD HEADER COM CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: TOTAL DE FÓRMULAS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Total de Fórmulas
            </span>
            <div className="text-2xl sm:text-3xl font-black font-cinzel text-amber-200">
              {metricasGerais.total}
            </div>
            <p className="text-[10px] text-slate-500">Cadastradas no Firestore</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 2: FÓRMULAS ATIVAS (LINHA INDUSTRIAL) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Fórmulas Ativas
            </span>
            <div className="text-2xl sm:text-3xl font-black font-cinzel text-emerald-300">
              {metricasGerais.ativas}
            </div>
            <p className="text-[10px] text-emerald-400/80">Liberadas p/ Fabricação & Vendas</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 3: EM TESTE / P&D (CRIAÇÃO LIVRE) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              P&D / Laboratório
            </span>
            <div className="text-2xl sm:text-3xl font-black font-cinzel text-purple-300">
              {metricasGerais.testes}
            </div>
            <p className="text-[10px] text-purple-400/80">Em bancada & Validação</p>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <Beaker className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 4: CUSTO MÉDIO POR LITRO */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Custo Médio Ponderado
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
              {formatarValorUnitarioLitro(metricasGerais.mediaCustoLitro)}
            </div>
            <p className="text-[10px] text-slate-500">Média normalizada (R$/L)</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* BARRA DE FERRAMENTAS: BUSCA, FILTROS E BOTÃO NOVA FÓRMULA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        
        {/* BUSCA E FILTROS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          
          {/* CAMPO DE PESQUISA */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por produto, insumo ou OBS..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* FILTRO STATUS */}
          <div className="relative">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 transition-colors font-medium"
            >
              <option value="todos">Status: Todos</option>
              <option value="Ativo">Status: Apenas Ativos (Vendas)</option>
              <option value="Uso interno">Status: Uso interno (Não Vende)</option>
              <option value="Teste">Status: Em Teste (P&D)</option>
              <option value="Inativo">Status: Inativos</option>
            </select>
          </div>

          {/* FILTRO MODO */}
          <div className="relative">
            <select
              value={filtroModo}
              onChange={(e) => setFiltroModo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 transition-colors font-medium"
            >
              <option value="todos">Modo: Todos os Tipos</option>
              <option value="padrao">Modo: Padrão Industrial (1000L)</option>
              <option value="livre">Modo: Criação Livre (Laboratório)</option>
            </select>
          </div>

        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex items-center gap-2.5 justify-end">
          
          <button
            type="button"
            onClick={handleExpandirTodas}
            className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5"
            title="Expandir ou recolher todos os acordions"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Expandir/Recolher</span>
          </button>

          <button
            type="button"
            onClick={carregarFormulas}
            disabled={carregando}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors disabled:opacity-50"
            title="Recarregar Fórmulas"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setFormulaEmEdicao(null);
              setModalAberto(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Fórmula (P&D)</span>
          </button>

        </div>

      </div>

      {/* TABELA PRINCIPAL EXPANSÍVEL (ACCORDION) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {carregando ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Carregando catálogo de fórmulas químicas...</p>
          </div>
        ) : formulasFiltradas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Beaker className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">Nenhuma fórmula encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {filtroTexto || filtroStatus !== 'todos' || filtroModo !== 'todos'
                ? 'Nenhum registro coincide com os filtros aplicados. Tente ajustar os termos da busca.'
                : 'Cadastre sua primeira fórmula aromática ou formulação de produto clicando em "Nova Fórmula (P&D)".'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              
              {/* CABEÇALHO DA TABELA PAI */}
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Produto / Fragrância</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Rendimento Base</th>
                  <th className="py-3.5 px-4 text-right">Custo Unitário (R$)/L</th>
                  <th className="py-3.5 px-4 text-right">Custo do Lote</th>
                  <th className="py-3.5 px-4 text-center">Insumos</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>

              {/* CORPO DA TABELA PAI COM LINHAS FILHAS EXPANSÍVEIS */}
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {formulasFiltradas.map((formula) => {
                  const isExpandida = Boolean(linhasExpandidas[formula.id]);

                  return (
                    <React.Fragment key={formula.id}>
                      
                      {/* LINHA PAI */}
                      <tr 
                        className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                          isExpandida ? 'bg-slate-800/30' : ''
                        }`}
                        onClick={() => toggleExpansao(formula.id)}
                      >
                        
                        {/* ÍCONE DE ACCORDION EXPANDIR/RECOLHER */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpansao(formula.id);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-700/60 text-slate-400 transition-transform"
                          >
                            {isExpandida ? (
                              <ChevronDown className="w-4 h-4 text-amber-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* PRODUTO COM BADGES */}
                        <td className="py-3.5 px-4 font-semibold text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel text-sm text-amber-200">
                              {formula.produto}
                            </span>
                            {formula.isCriacaoLivre && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Laboratório P&D</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STATUS COM SELECT RÁPIDO */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-block relative">
                            <select
                              value={formula.status || 'Ativo'}
                              onChange={(e) => handleQuickStatusChange(formula, e.target.value as ProdutoStatus)}
                              className={`text-[10px] font-bold rounded-full px-2.5 py-1 border transition-all cursor-pointer focus:outline-none appearance-none pr-5 bg-slate-950/90 ${
                                formula.status === 'Ativo'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                                  : formula.status === 'Uso interno'
                                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:border-cyan-400'
                                    : formula.status === 'Teste'
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-400'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                              }`}
                              title="Alterar status da fórmula"
                            >
                              <option value="Ativo" className="bg-slate-900 text-emerald-400 font-bold">● Ativo</option>
                              <option value="Uso interno" className="bg-slate-900 text-cyan-300 font-bold">● Uso interno</option>
                              <option value="Teste" className="bg-slate-900 text-amber-300 font-bold">● Teste</option>
                              <option value="Inativo" className="bg-slate-900 text-slate-400 font-bold">● Inativo</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-slate-500 text-[8px]">
                              ▼
                            </div>
                          </div>
                        </td>

                        {/* RENDIMENTO BASE */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formula.isCriacaoLivre ? (
                            <span>{formula.rendimento} {formula.unidadeRendimento}</span>
                          ) : (
                            <span className="text-amber-300/90 font-bold">1.000 L</span>
                          )}
                        </td>

                        {/* CUSTO UNITÁRIO (R$)/L NORMALIZADO */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-300 text-sm">
                          {formatarValorUnitarioLitro(formula.custoUnitarioLitro)}
                          <span className="text-[10px] font-normal text-emerald-400/70 ml-1">/ L</span>
                        </td>

                        {/* CUSTO TOTAL DO LOTE */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300">
                          {formatarMoeda(formula.custoTotal)}
                        </td>

                        {/* QUANTIDADE DE INSUMOS */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                            {formula.insumos?.length || 0} itens
                          </span>
                        </td>

                        {/* AÇÕES (EDITAR, DUPLICAR, EXCLUIR) */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-1.5">
                            
                            {/* BOTÃO DUPLICAR */}
                            <button
                              type="button"
                              onClick={() => handleDuplicarFormula(formula)}
                              className="p-1.5 text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                              title="Criar variação de P&D (Cópia)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* BOTÃO EDITAR */}
                            <button
                              type="button"
                              onClick={() => {
                                setFormulaEmEdicao(formula);
                                setModalAberto(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="Editar Fórmula"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* BOTÃO EXCLUIR */}
                            <button
                              type="button"
                              onClick={() => setIdParaExcluir(formula.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Excluir Fórmula"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </td>

                      </tr>

                      {/* LINHA FILHA (ACCORDION EXPANDIDO) */}
                      {isExpandida && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan={8} className="p-4 sm:p-6">
                            <div className="space-y-4 rounded-xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5">
                              
                              {/* CABEÇALHO DO ACCORDION COM METODOLOGIA E DETALHES */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    <Beaker className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                                      Detalhamento Químico & Insumos — {formula.produto}
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                      Rendimento da receita: {formula.rendimento} {formula.unidadeRendimento} 
                                      {formula.isCriacaoLivre && ` • Normalizado para base de 1.000 Litros`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto">
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      Custo Normalizado:
                                    </span>
                                    <span className="text-xs font-mono font-bold text-emerald-300">
                                      {formatarValorUnitarioLitro(formula.custoUnitarioLitro)} / Litro
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* TABELA FILHA DE INSUMOS */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold text-slate-400 uppercase font-mono">
                                      <th className="py-2.5 px-3 text-center w-12">Seq</th>
                                      <th className="py-2.5 px-3">Insumo (Matéria-Prima)</th>
                                      <th className="py-2.5 px-3 text-center">UNI</th>
                                      <th className="py-2.5 px-3 text-right">R$ Unitário</th>
                                      <th className="py-2.5 px-3 text-right">Base Fórmula (Qtd)</th>
                                      <th className="py-2.5 px-3">Metodologia / Instrução de Adição</th>
                                      <th className="py-2.5 px-3 text-right">Custo Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40 font-medium">
                                    {formula.insumos && formula.insumos.length > 0 ? (
                                      formula.insumos.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/30">
                                          
                                          {/* SEQ */}
                                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300/80">
                                            {item.seq || idx + 1}
                                          </td>

                                          {/* NOME DO INSUMO */}
                                          <td className="py-2.5 px-3 font-semibold text-slate-200">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span>{item.insumo}</span>
                                              {formulas.some(f => f.status === 'Uso interno' && f.produto.trim().toLowerCase() === item.insumo.trim().toLowerCase()) && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                                                  <Factory className="w-2.5 h-2.5 text-cyan-400" /> Base Interna (P&D)
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          {/* UNI */}
                                          <td className="py-2.5 px-3 text-center">
                                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                                              {item.uni || 'L'}
                                            </span>
                                          </td>

                                          {/* R$ UNI */}
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                            {formatarMoeda(item.precoUni)}
                                          </td>

                                          {/* BASE FÓRMULA (QTD) */}
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-200">
                                            {item.baseFormula} {item.uni || 'L'}
                                          </td>

                                          {/* METODOLOGIA */}
                                          <td className="py-2.5 px-3 text-slate-300">
                                            {item.metodologia ? (
                                              <span className="italic text-slate-300">
                                                {item.metodologia}
                                              </span>
                                            ) : (
                                              <span className="text-slate-600 text-[11px]">
                                                (Adição direta padrão)
                                              </span>
                                            )}
                                          </td>

                                          {/* CUSTO TOTAL */}
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                                            {formatarMoeda(item.custoTotal)}
                                          </td>

                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={7} className="py-4 text-center text-slate-500">
                                          Nenhum insumo especificado nesta fórmula.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* OBSERVAÇÕES GERAIS (OBS) */}
                              {formula.obs && (
                                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Observações Gerais & Processo de Envase:</span>
                                  </span>
                                  <p className="text-xs text-slate-300 whitespace-pre-wrap">
                                    {formula.obs}
                                  </p>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}

                    </React.Fragment>
                  );
                })}
              </tbody>

            </table>
          </div>
        )}

      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {modalAberto && (
        <FormulaModal
          isOpen={modalAberto}
          onClose={() => {
            setModalAberto(false);
            setFormulaEmEdicao(null);
          }}
          formulaParaEditar={formulaEmEdicao}
          listas={listas}
          formulasExistentes={formulas}
          onSalvar={handleSalvarFormula}
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {idParaExcluir && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scaleUp text-slate-100">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold">Excluir Fórmula de Engenharia</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir esta fórmula? Os dados de composição e custos serão removidos do Firestore.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIdParaExcluir(null)}
                disabled={excluindo}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={excluindo}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-1.5"
              >
                {excluindo ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
