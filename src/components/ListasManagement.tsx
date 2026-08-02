import React, { useState, useEffect } from 'react';
import { ListasSelects } from '../types';
import { salvarListasCustomizadasApi, DEFAULT_LISTAS, CURRENT_LISTAS } from '../services/api';
import { 
  Users, 
  Package, 
  Tag, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ListChecks, 
  RotateCcw,
  Check,
  X
} from 'lucide-react';

interface ListasManagementProps {
  listas: ListasSelects;
  onRefresh?: () => void;
}

type ListaTab = 'vendedores' | 'produtos' | 'tiposSaida';

export const ListasManagement: React.FC<ListasManagementProps> = ({ listas, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<ListaTab>('vendedores');

  // Estado das listas locais
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<string[]>([]);
  const [tiposSaida, setTiposSaida] = useState<string[]>([]);

  // Filtros de Busca
  const [busca, setBusca] = useState<string>('');

  // Estado de Inclusão / Edição
  const [novoItemNome, setNovoItemNome] = useState<string>('');
  const [itemEmEdicao, setItemEmEdicao] = useState<{ index: number; nomeAntigo: string; novoNome: string } | null>(null);

  // Modal de confirmação de exclusão
  const [itemParaDeletar, setItemParaDeletar] = useState<string | null>(null);

  // Estado de Salvamento e Mensagens
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Inicializa listas
  useEffect(() => {
    setVendedores(listas.vendedores || CURRENT_LISTAS.vendedores || DEFAULT_LISTAS.vendedores);
    setProdutos(listas.produtos || CURRENT_LISTAS.produtos || DEFAULT_LISTAS.produtos);
    setTiposSaida(listas.tiposSaida || CURRENT_LISTAS.tiposSaida || DEFAULT_LISTAS.tiposSaida);
  }, [listas]);

  // Função auxiliar para obter a lista ativa
  const getListaAtiva = (): string[] => {
    if (activeSubTab === 'vendedores') return vendedores;
    if (activeSubTab === 'produtos') return produtos;
    return tiposSaida;
  };

  const setListaAtiva = (novaLista: string[]) => {
    if (activeSubTab === 'vendedores') setVendedores(novaLista);
    else if (activeSubTab === 'produtos') setProdutos(novaLista);
    else setTiposSaida(novaLista);
  };

  // Salvar alterações no Firebase Firestore
  const persistirListas = async (
    novosVend = vendedores, 
    novosProd = produtos, 
    novosSaida = tiposSaida
  ) => {
    setSalvando(true);
    setMensagem(null);

    try {
      const res = await salvarListasCustomizadasApi({
        vendedores: novosVend,
        produtos: novosProd,
        tiposSaida: novosSaida
      });

      if (res.success) {
        setMensagem({ tipo: 'sucesso', texto: res.message });
        if (onRefresh) onRefresh();
      } else {
        setMensagem({ tipo: 'erro', texto: 'Erro ao salvar listas no Firebase.' });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Falha na gravação: ${err.message || 'Erro desconhecido'}` });
    } finally {
      setSalvando(false);
    }
  };

  // Adicionar novo item
  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novoItemNome.trim();

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do item a ser adicionado.' });
      return;
    }

    const listaAtual = getListaAtiva();
    if (listaAtual.some(i => i.toLowerCase() === nomeLimpo.toLowerCase())) {
      setMensagem({ tipo: 'erro', texto: `O item "${nomeLimpo}" já existe nesta lista.` });
      return;
    }

    const novaLista = [...listaAtual, nomeLimpo];
    setListaAtiva(novaLista);
    setNovoItemNome('');

    if (activeSubTab === 'vendedores') await persistirListas(novaLista, produtos, tiposSaida);
    else if (activeSubTab === 'produtos') await persistirListas(vendedores, novaLista, tiposSaida);
    else await persistirListas(vendedores, produtos, novaLista);
  };

  // Salvar Edição de Item
  const handleSalvarEdicao = async () => {
    if (!itemEmEdicao) return;
    const nomeLimpo = itemEmEdicao.novoNome.trim();

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'O nome do item não pode ser vazio.' });
      return;
    }

    const listaAtual = getListaAtiva();
    const existeOutro = listaAtual.some((item, idx) => idx !== itemEmEdicao.index && item.toLowerCase() === nomeLimpo.toLowerCase());
    
    if (existeOutro) {
      setMensagem({ tipo: 'erro', texto: `Já existe outro item com o nome "${nomeLimpo}".` });
      return;
    }

    const novaLista = [...listaAtual];
    novaLista[itemEmEdicao.index] = nomeLimpo;
    setListaAtiva(novaLista);
    setItemEmEdicao(null);

    if (activeSubTab === 'vendedores') await persistirListas(novaLista, produtos, tiposSaida);
    else if (activeSubTab === 'produtos') await persistirListas(vendedores, novaLista, tiposSaida);
    else await persistirListas(vendedores, produtos, novaLista);
  };

  // Confirmar Exclusão
  const handleConfirmarExclusao = async () => {
    if (!itemParaDeletar) return;

    const listaAtual = getListaAtiva();
    const novaLista = listaAtual.filter(item => item !== itemParaDeletar);

    setListaAtiva(novaLista);
    setItemParaDeletar(null);

    if (activeSubTab === 'vendedores') await persistirListas(novaLista, produtos, tiposSaida);
    else if (activeSubTab === 'produtos') await persistirListas(vendedores, novaLista, tiposSaida);
    else await persistirListas(vendedores, produtos, novaLista);
  };

  // Restaurar Padrões originais do sistema
  const handleRestaurarPadrao = async () => {
    if (window.confirm(`Deseja restaurar os itens padrões da lista de ${getTituloSubTab(activeSubTab)}?`)) {
      if (activeSubTab === 'vendedores') {
        setVendedores(DEFAULT_LISTAS.vendedores);
        await persistirListas(DEFAULT_LISTAS.vendedores, produtos, tiposSaida);
      } else if (activeSubTab === 'produtos') {
        setProdutos(DEFAULT_LISTAS.produtos);
        await persistirListas(vendedores, DEFAULT_LISTAS.produtos, tiposSaida);
      } else {
        setTiposSaida(DEFAULT_LISTAS.tiposSaida);
        await persistirListas(vendedores, produtos, DEFAULT_LISTAS.tiposSaida);
      }
    }
  };

  // Auxiliar para títulos e ícones
  function getTituloSubTab(tab: ListaTab): string {
    if (tab === 'vendedores') return 'Vendedores';
    if (tab === 'produtos') return 'Produtos / Fragrâncias';
    return 'Tipos de Saída';
  }

  const listaExibida = getListaAtiva().filter(item =>
    !busca || item.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-w-5xl mx-auto space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-amber-200 flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-amber-400" />
            Gestão de Listas do Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre, edite ou remova opções de <strong>Vendedores</strong>, <strong>Produtos</strong> e <strong>Tipos de Saída</strong> disponíveis em formulários do ERP.
          </p>
        </div>

        <button
          onClick={handleRestaurarPadrao}
          disabled={salvando}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all border border-slate-700 flex items-center gap-2 self-start sm:self-auto"
          title="Restaurar lista padrão de fábrica"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Restaurar Padrão</span>
        </button>
      </div>

      {/* FEEDBACK DE MENSAGEM */}
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

      {/* NAVEGAÇÃO DE SUB-ABAS DE LISTAS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => { setActiveSubTab('vendedores'); setBusca(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'vendedores'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Vendedores</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'vendedores' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}>
            {vendedores.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveSubTab('produtos'); setBusca(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'produtos'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos / Fragrâncias</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'produtos' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}>
            {produtos.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveSubTab('tiposSaida'); setBusca(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'tiposSaida'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Tipos de Saída</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'tiposSaida' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}>
            {tiposSaida.length}
          </span>
        </button>
      </div>

      {/* FORMULÁRIO DE ADIÇÃO & BARRA DE PESQUISA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Formulário de Adicionar */}
        <form onSubmit={handleAdicionar} className="md:col-span-2 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
          <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-400" />
            Adicionar Novo Item em {getTituloSubTab(activeSubTab)}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={novoItemNome}
              onChange={(e) => setNovoItemNome(e.target.value)}
              placeholder={`Digite o nome do novo ${getTituloSubTab(activeSubTab)}...`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              {salvando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        {/* Campo de Busca */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-center">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            Filtrar na Lista
          </label>
          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por nome..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-500" />
          </div>
        </div>

      </div>

      {/* TABELA / LISTA DE ITENS */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-mono font-semibold border-b border-slate-800 uppercase">
              <tr>
                <th className="px-5 py-3.5 w-16 text-center">#</th>
                <th className="px-5 py-3.5">Nome / Descrição</th>
                <th className="px-5 py-3.5 w-32 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {listaExibida.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-slate-500">
                    Nenhum item encontrado na lista.
                  </td>
                </tr>
              ) : (
                listaExibida.map((item, index) => {
                  const realIndex = getListaAtiva().indexOf(item);
                  const estaEditando = itemEmEdicao?.index === realIndex;

                  return (
                    <tr key={item + index} className="hover:bg-slate-900/50 transition-colors group">
                      <td className="px-5 py-3.5 text-center font-mono text-slate-500 text-[11px]">
                        {realIndex + 1}
                      </td>

                      <td className="px-5 py-3.5 font-medium text-slate-200">
                        {estaEditando ? (
                          <input
                            type="text"
                            autoFocus
                            value={itemEmEdicao.novoNome}
                            onChange={(e) => setItemEmEdicao({ ...itemEmEdicao, novoNome: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSalvarEdicao();
                              if (e.key === 'Escape') setItemEmEdicao(null);
                            }}
                            className="w-full bg-slate-900 border border-amber-400 rounded-lg px-3 py-1.5 text-xs text-amber-200 focus:outline-none"
                          />
                        ) : (
                          <span className="text-slate-100 font-semibold">{item}</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {estaEditando ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSalvarEdicao}
                              className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                              title="Salvar alteração"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemEmEdicao(null)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                              title="Cancelar edição"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setItemEmEdicao({ index: realIndex, nomeAntigo: item, novoNome: item })}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title={`Editar nome de "${item}"`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setItemParaDeletar(item)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title={`Remover "${item}"`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemParaDeletar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">Excluir Item da Lista?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja remover <strong className="text-amber-300">"{itemParaDeletar}"</strong> da lista de {getTituloSubTab(activeSubTab)}?
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
