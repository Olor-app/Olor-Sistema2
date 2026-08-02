import React, { useState, useEffect } from 'react';
import { ListasSelects } from '../types';
import { 
  CURRENT_MATRIZ_PRECOS, 
  salvarMatrizPrecosApi, 
  DEFAULT_MATRIZ_PRECOS 
} from '../services/api';
import { formatarMoeda } from '../utils/calculations';
import { 
  Table, 
  Search, 
  DollarSign, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  PackagePlus,
  RefreshCw,
  Info
} from 'lucide-react';

interface PriceMatrixProps {
  listas: ListasSelects;
  dadosBrutos?: any[];
  onRefresh?: () => void;
}

export const PriceMatrix: React.FC<PriceMatrixProps> = ({ listas, onRefresh }) => {
  const TABELAS_EXIBICAO = ['Site', 'Tiktok', 'Venda Direta', 'Consignado', 'Preço Logista'];

  // Estado local das embalagens e preços
  const [embalagens, setEmbalagens] = useState<string[]>([]);
  const [matrizPrecos, setMatrizPrecos] = useState<Record<string, Record<string, number>>>({});
  const [buscaEmbalagem, setBuscaEmbalagem] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estado do Formulário de Nova Embalagem
  const [mostrarFormNova, setMostrarFormNova] = useState<boolean>(false);
  const [novaEmbalagemNome, setNovaEmbalagemNome] = useState<string>('');
  const [novosPrecos, setNovosPrecos] = useState<Record<string, number>>({
    'Site': 48.00,
    'Tiktok': 48.00,
    'Venda Direta': 45.00,
    'Consignado': 35.00,
    'Preço Logista': 30.00
  });

  // Modal de confirmação de exclusão
  const [itemParaDeletar, setItemParaDeletar] = useState<string | null>(null);

  // Inicializa dados com base nas listas do props ou no cache CURRENT_MATRIZ_PRECOS
  useEffect(() => {
    const embList = (listas.embalagens && listas.embalagens.length > 0)
      ? listas.embalagens
      : Object.keys(CURRENT_MATRIZ_PRECOS);

    setEmbalagens(embList);

    // Deep clone da matriz atual para edição segura
    const matrizInicial: Record<string, Record<string, number>> = {};
    embList.forEach((emb) => {
      matrizInicial[emb] = {
        'Site': CURRENT_MATRIZ_PRECOS[emb]?.['Site'] ?? DEFAULT_MATRIZ_PRECOS[emb]?.['Site'] ?? 45.00,
        'Tiktok': CURRENT_MATRIZ_PRECOS[emb]?.['Tiktok'] ?? DEFAULT_MATRIZ_PRECOS[emb]?.['Tiktok'] ?? 45.00,
        'Venda Direta': CURRENT_MATRIZ_PRECOS[emb]?.['Venda Direta'] ?? DEFAULT_MATRIZ_PRECOS[emb]?.['Venda Direta'] ?? 45.00,
        'Consignado': CURRENT_MATRIZ_PRECOS[emb]?.['Consignado'] ?? DEFAULT_MATRIZ_PRECOS[emb]?.['Consignado'] ?? 35.00,
        'Preço Logista': CURRENT_MATRIZ_PRECOS[emb]?.['Preço Logista'] ?? DEFAULT_MATRIZ_PRECOS[emb]?.['Preço Logista'] ?? 30.00,
      };
    });

    setMatrizPrecos(matrizInicial);
  }, [listas]);

  // Atualiza preço individual na tabela
  const handlePrecoChange = (emb: string, tabela: string, valorStr: string) => {
    const valNum = parseFloat(valorStr);
    const novoValor = isNaN(valNum) ? 0 : valNum;

    setMatrizPrecos((prev) => ({
      ...prev,
      [emb]: {
        ...(prev[emb] || {}),
        [tabela]: novoValor
      }
    }));
  };

  // Salva toda a matriz no Firebase Firestore
  const handleSalvarMatriz = async () => {
    setSalvando(true);
    setMensagem(null);

    try {
      const res = await salvarMatrizPrecosApi(matrizPrecos, embalagens);
      if (res.success) {
        setMensagem({ tipo: 'sucesso', texto: res.message });
        if (onRefresh) onRefresh();
      } else {
        setMensagem({ tipo: 'erro', texto: 'Erro ao salvar alterações no Firebase.' });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Falha na gravação: ${err.message || 'Erro desconhecido'}` });
    } finally {
      setSalvando(false);
    }
  };

  // Adiciona nova Embalagem com seus preços
  const handleAdicionarNovaEmbalagem = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novaEmbalagemNome.trim();

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do novo tipo de Embalagem.' });
      return;
    }

    if (embalagens.some((e) => e.toLowerCase() === nomeLimpo.toLowerCase())) {
      setMensagem({ tipo: 'erro', texto: `A embalagem "${nomeLimpo}" já existe na matriz.` });
      return;
    }

    const novasEmbalagens = [...embalagens, nomeLimpo];
    const novaMatriz = {
      ...matrizPrecos,
      [nomeLimpo]: { ...novosPrecos }
    };

    setEmbalagens(novasEmbalagens);
    setMatrizPrecos(novaMatriz);
    setNovaEmbalagemNome('');
    setMostrarFormNova(false);
    setSalvando(true);

    // Salva direto no Firestore
    const res = await salvarMatrizPrecosApi(novaMatriz, novasEmbalagens);
    setSalvando(false);

    if (res.success) {
      setMensagem({ 
        tipo: 'sucesso', 
        texto: `Nova embalagem "${nomeLimpo}" adicionada com sucesso! Ela já está disponível em Novas Saídas.` 
      });
      if (onRefresh) onRefresh();
    } else {
      setMensagem({ tipo: 'erro', texto: 'A embalagem foi adicionada na sessão, mas falhou ao salvar no Firestore.' });
    }
  };

  // Exclui embalagem
  const handleConfirmarExclusao = async () => {
    if (!itemParaDeletar) return;

    const embNome = itemParaDeletar;
    const novasEmbalagens = embalagens.filter((e) => e !== embNome);
    const novaMatriz = { ...matrizPrecos };
    delete novaMatriz[embNome];

    setEmbalagens(novasEmbalagens);
    setMatrizPrecos(novaMatriz);
    setItemParaDeletar(null);
    setSalvando(true);

    const res = await salvarMatrizPrecosApi(novaMatriz, novasEmbalagens);
    setSalvando(false);

    if (res.success) {
      setMensagem({ 
        tipo: 'sucesso', 
        texto: `Embalagem "${embNome}" removida com sucesso da matriz e das opções do sistema.` 
      });
      if (onRefresh) onRefresh();
    }
  };

  // Filtragem da lista
  const embalagensFiltradas = embalagens.filter((emb) =>
    !buscaEmbalagem || emb.toLowerCase().includes(buscaEmbalagem.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-w-6xl mx-auto space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-amber-200 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-400" />
            Matriz Tabela de Preços & Embalagens Editável
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie e atualize os preços das tabelas de venda ou cadastre/remova tipos de <strong>Embalagem</strong> para lançamento de Novas Saídas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMostrarFormNova(!mostrarFormNova)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ Nova Embalagem</span>
          </button>

          <button
            onClick={handleSalvarMatriz}
            disabled={salvando}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {salvando ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* BANNER DE FEEDBACK DE MENSAGENS */}
      {mensagem && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{mensagem.texto}</span>
          </div>
          <button
            onClick={() => setMensagem(null)}
            className="text-slate-400 hover:text-slate-200 text-xs underline font-semibold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO DE NOVA EMBALAGEM */}
      {mostrarFormNova && (
        <form
          onSubmit={handleAdicionarNovaEmbalagem}
          className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-4 animate-fadeIn shadow-inner"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-amber-400" />
              Cadastrar Novo Tipo de Embalagem
            </h3>
            <span className="text-xs text-slate-500">O novo tipo estará disponível imediatamente em Novas Saídas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Nome da Embalagem *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 500ML Spray, Refil 500ml..."
                value={novaEmbalagemNome}
                onChange={(e) => setNovaEmbalagemNome(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            {TABELAS_EXIBICAO.map((tab) => (
              <div key={tab} className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {tab} (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novosPrecos[tab] ?? 0}
                  onChange={(e) =>
                    setNovosPrecos({
                      ...novosPrecos,
                      [tab]: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-400 text-right"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMostrarFormNova(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Embalagem</span>
            </button>
          </div>
        </form>
      )}

      {/* BARRA DE PESQUISA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={buscaEmbalagem}
            onChange={(e) => setBuscaEmbalagem(e.target.value)}
            placeholder="Buscar embalagem por nome..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total de Embalagens Cadastradas: <strong className="text-amber-300">{embalagens.length}</strong>
        </div>
      </div>

      {/* TABELA DE MATRIZ EDITÁVEL */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-mono font-semibold border-b border-slate-800 uppercase">
              <tr>
                <th className="px-5 py-4 bg-slate-900/90 text-amber-300 min-w-[200px]">
                  Embalagem
                </th>
                {TABELAS_EXIBICAO.map((tab) => (
                  <th key={tab} className="px-4 py-4 text-right text-slate-300 min-w-[120px]">
                    {tab} (R$)
                  </th>
                ))}
                <th className="px-4 py-4 text-center text-slate-400 min-w-[80px]">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {embalagensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={TABELAS_EXIBICAO.length + 2} className="px-5 py-10 text-center text-slate-500">
                    Nenhuma embalagem encontrada.
                  </td>
                </tr>
              ) : (
                embalagensFiltradas.map((emb) => {
                  const precosEmb = matrizPrecos[emb] || {};

                  return (
                    <tr key={emb} className="hover:bg-slate-900/50 transition-colors group">
                      <td className="px-5 py-3.5 font-bold text-slate-200 bg-slate-900/20 whitespace-nowrap">
                        <span className="text-slate-100">{emb}</span>
                      </td>

                      {TABELAS_EXIBICAO.map((tab) => {
                        const valorAtual = precosEmb[tab] ?? 0;

                        return (
                          <td key={tab} className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={valorAtual}
                              onChange={(e) => handlePrecoChange(emb, tab, e.target.value)}
                              className="w-28 bg-slate-900 hover:bg-slate-800 focus:bg-slate-950 border border-slate-800 focus:border-amber-400 text-right px-2 py-1.5 rounded-lg text-xs font-mono font-semibold text-emerald-400 transition-colors focus:outline-none"
                            />
                          </td>
                        );
                      })}

                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setItemParaDeletar(emb)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title={`Remover embalagem "${emb}"`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DICA INFORMATIVA DE NEGÓCIO */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">Regra de Atualização em Tempo Real</p>
          <p className="leading-relaxed">
            Ao cadastrar novas embalagens ou alterar os preços das tabelas (<strong>Site</strong>, <strong>Tiktok</strong>, <strong>Venda Direta</strong>, etc.), as atualizações são aplicadas automaticamente e salvas no banco de dados NoSQL Firebase Firestore. Todas as novas saídas lançadas a partir deste momento utilizarão os preços atualizados.
          </p>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaDeletar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">Remover Embalagem?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir a embalagem <strong className="text-amber-300">"{itemParaDeletar}"</strong>? Ela será removida da matriz de preços e deixará de estar disponível no formulário de Novas Saídas.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setItemParaDeletar(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusao}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
