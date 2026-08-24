import React, { useState, useEffect, useMemo } from 'react';
import { ListasSelects, MateriaPrima, ProdutoItem, ProdutoStatus, Formula } from '../types';
import { 
  salvarListasCustomizadasApi, 
  DEFAULT_LISTAS, 
  CURRENT_LISTAS, 
  DEFAULT_MATERIAS_PRIMAS, 
  DEFAULT_PRODUTOS_DETALHADOS, 
  sortAlphabetically,
  getLocalFormulas
} from '../services/api';
import { formatarMoeda } from '../utils/calculations';
import { 
  Users, 
  Package, 
  Tag, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  RotateCcw,
  Check,
  X,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  RefreshCw,
  Sparkles,
  Ban,
  Filter,
  Factory
} from 'lucide-react';

interface ListasManagementProps {
  listas: ListasSelects;
  onRefresh?: () => void;
}

type ListaTab = 'vendedores' | 'produtos' | 'tiposSaida' | 'materiasPrimas';

// Unidades de medida comuns para Matérias-Primas
const OPCOES_UNIDADES = [
  { valor: 'L', label: 'L (Litros)' },
  { valor: 'kg', label: 'kg (Quilos)' },
  { valor: 'g', label: 'g (Gramas)' },
  { valor: 'ml', label: 'ml (Mililitros)' },
  { valor: 'un', label: 'un (Unidade)' },
  { valor: 'cx', label: 'cx (Caixa)' },
  { valor: 'pct', label: 'pct (Pacote)' }
];

// Opções de status para Produtos
const OPCOES_STATUS_PRODUTO: { valor: ProdutoStatus; label: string; cor: string }[] = [
  { valor: 'Ativo', label: 'Ativo (Disponível em Vendas)', cor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { valor: 'Inativo', label: 'Inativo (Oculto em Vendas)', cor: 'text-slate-400 border-slate-700 bg-slate-800/80' },
  { valor: 'Teste', label: 'Teste (Em Validação / Oculto)', cor: 'text-amber-300 border-amber-500/30 bg-amber-500/10' }
];

export const ListasManagement: React.FC<ListasManagementProps> = ({ listas, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<ListaTab>('vendedores');

  // Estado das listas locais
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [tiposSaida, setTiposSaida] = useState<string[]>([]);
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [formulasUsoInterno, setFormulasUsoInterno] = useState<Formula[]>([]);

  // Carrega fórmulas de uso interno ao mudar para aba de matérias-primas
  useEffect(() => {
    try {
      const forms = getLocalFormulas();
      setFormulasUsoInterno(forms.filter(f => f.status === 'Uso interno'));
    } catch (e) {
      console.error('Erro ao carregar formulas no ListasManagement:', e);
    }
  }, [activeSubTab]);

  // Filtros de Busca e Status
  const [busca, setBusca] = useState<string>('');
  const [filtroStatusProduto, setFiltroStatusProduto] = useState<string>('todos');

  // Estado de Inclusão / Edição para Vendedores e Tipos de Saída
  const [novoItemNome, setNovoItemNome] = useState<string>('');
  const [itemEmEdicao, setItemEmEdicao] = useState<{ index: number; nomeAntigo: string; novoNome: string } | null>(null);

  // Estado de Inclusão / Edição para Produtos
  const [novoProdutoNome, setNovoProdutoNome] = useState<string>('');
  const [novoProdutoStatus, setNovoProdutoStatus] = useState<ProdutoStatus>('Ativo');
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<{ index: number; nome: string; status: ProdutoStatus } | null>(null);

  // Estado de Inclusão / Edição para Matérias-Primas
  const [novaMateriaNome, setNovaMateriaNome] = useState<string>('');
  const [novaMateriaUni, setNovaMateriaUni] = useState<string>('L');
  const [novaMateriaPreco, setNovaMateriaPreco] = useState<string>('');
  const [materiaEmEdicao, setMateriaEmEdicao] = useState<{ index: number; nome: string; precoUni: number | string; uni: string } | null>(null);

  // Modais de confirmação de exclusão
  const [itemParaDeletar, setItemParaDeletar] = useState<string | null>(null);
  const [produtoParaDeletar, setProdutoParaDeletar] = useState<ProdutoItem | null>(null);
  const [materiaParaDeletar, setMateriaParaDeletar] = useState<MateriaPrima | null>(null);

  // Estado de Salvamento e Mensagens
  const [salvando, setSalvando] = useState<boolean>(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Inicializa listas: garante que todos os produtos existentes venham como 'Ativo' por padrão
  useEffect(() => {
    setVendedores(listas.vendedores || CURRENT_LISTAS.vendedores || DEFAULT_LISTAS.vendedores);
    setTiposSaida(listas.tiposSaida || CURRENT_LISTAS.tiposSaida || DEFAULT_LISTAS.tiposSaida);
    
    // Normalização de Produtos (garante objeto ProdutoItem com status 'Ativo' por padrão se não definido)
    let produtosBase: ProdutoItem[] = [];
    if (Array.isArray(listas.produtosDetalhes) && listas.produtosDetalhes.length > 0) {
      produtosBase = listas.produtosDetalhes.map(p => ({
        nome: p.nome.trim(),
        status: (p.status === 'Inativo' || p.status === 'Teste' || p.status === 'Uso interno') ? p.status : 'Ativo'
      }));
    } else if (Array.isArray(listas.produtos) && listas.produtos.length > 0) {
      produtosBase = listas.produtos.map(p => ({
        nome: typeof p === 'string' ? p.trim() : (p as any).nome || '',
        status: ((p as any).status === 'Inativo' || (p as any).status === 'Teste' || (p as any).status === 'Uso interno') ? (p as any).status : 'Ativo'
      }));
    } else if (Array.isArray(CURRENT_LISTAS.produtosDetalhes) && CURRENT_LISTAS.produtosDetalhes.length > 0) {
      produtosBase = [...CURRENT_LISTAS.produtosDetalhes];
    } else {
      produtosBase = [...DEFAULT_PRODUTOS_DETALHADOS];
    }

    // Ordena alfabeticamente pelo nome
    produtosBase.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    setProdutos(produtosBase);

    // Normalização de Matérias-Primas
    const baseMats = listas.materiasPrimas || CURRENT_LISTAS.materiasPrimas || DEFAULT_MATERIAS_PRIMAS;
    const matsNormalizadas = baseMats.map(m => ({
      nome: m.nome,
      precoUni: typeof m.precoUni === 'number' ? m.precoUni : (parseFloat(String(m.precoUni).replace(',', '.')) || 0),
      uni: m.uni || 'L'
    }));
    setMateriasPrimas(matsNormalizadas);
  }, [listas]);

  // Função auxiliar para listas simples (Vendedores e Tipos de Saída)
  const getListaSimplesAtiva = (): string[] => {
    if (activeSubTab === 'vendedores') return vendedores;
    if (activeSubTab === 'tiposSaida') return tiposSaida;
    return [];
  };

  const setListaSimplesAtiva = (novaLista: string[]) => {
    if (activeSubTab === 'vendedores') setVendedores(novaLista);
    else if (activeSubTab === 'tiposSaida') setTiposSaida(novaLista);
  };

  // Salvar alterações no Firebase Firestore
  const persistirListas = async (
    novosVend = vendedores, 
    novosProd = produtos, 
    novosSaida = tiposSaida,
    novasMaterias = materiasPrimas
  ) => {
    setSalvando(true);
    setMensagem(null);

    try {
      const matsTratadas = novasMaterias.map(m => ({
        nome: m.nome,
        precoUni: typeof m.precoUni === 'number' ? m.precoUni : (parseFloat(String(m.precoUni).replace(',', '.')) || 0),
        uni: m.uni || 'L'
      }));

      const prodsTratados: ProdutoItem[] = novosProd.map(p => ({
        nome: p.nome.trim(),
        status: (p.status === 'Inativo' || p.status === 'Teste' || p.status === 'Uso interno') ? p.status : 'Ativo'
      }));

      // Extrai apenas os nomes dos produtos ATIVOS para o array simples de produtos
      const produtosAtivosNomes = sortAlphabetically(
        prodsTratados.filter(p => p.status === 'Ativo').map(p => p.nome)
      );

      const res = await salvarListasCustomizadasApi({
        vendedores: novosVend,
        produtos: produtosAtivosNomes,
        produtosDetalhes: prodsTratados,
        tiposSaida: novosSaida,
        materiasPrimas: matsTratadas
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

  // Adicionar novo item simples (Vendedores, Tipos de Saída)
  const handleAdicionarSimples = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novoItemNome.trim();

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do item a ser adicionado.' });
      return;
    }

    const listaAtual = getListaSimplesAtiva();
    if (listaAtual.some(i => i.toLowerCase() === nomeLimpo.toLowerCase())) {
      setMensagem({ tipo: 'erro', texto: `O item "${nomeLimpo}" já existe nesta lista.` });
      return;
    }

    const novaLista = [...listaAtual, nomeLimpo];
    setListaSimplesAtiva(novaLista);
    setNovoItemNome('');

    if (activeSubTab === 'vendedores') await persistirListas(novaLista, produtos, tiposSaida, materiasPrimas);
    else if (activeSubTab === 'tiposSaida') await persistirListas(vendedores, produtos, novaLista, materiasPrimas);
  };

  // Adicionar novo Produto / Fragrância com Status (Ativo, Inativo, Teste)
  const handleAdicionarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novoProdutoNome.trim();

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do produto / fragrância.' });
      return;
    }

    if (produtos.some(p => p.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      setMensagem({ tipo: 'erro', texto: `O produto "${nomeLimpo}" já está cadastrado na lista.` });
      return;
    }

    const novoItem: ProdutoItem = {
      nome: nomeLimpo,
      status: novoProdutoStatus
    };

    const novosProdutos = [...produtos, novoItem].sort((a, b) => 
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
    );

    setProdutos(novosProdutos);
    setNovoProdutoNome('');
    setNovoProdutoStatus('Ativo');

    await persistirListas(vendedores, novosProdutos, tiposSaida, materiasPrimas);
  };

  // Adicionar nova matéria-prima
  const handleAdicionarMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novaMateriaNome.trim();
    const precoNum = parseFloat(novaMateriaPreco.replace(',', '.')) || 0;
    const uniFinal = novaMateriaUni.trim() || 'L';

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome da matéria-prima.' });
      return;
    }

    if (materiasPrimas.some(m => m.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
      setMensagem({ tipo: 'erro', texto: `A matéria-prima "${nomeLimpo}" já está cadastrada.` });
      return;
    }

    const novasMaterias = [...materiasPrimas, { nome: nomeLimpo, precoUni: precoNum, uni: uniFinal }];
    setMateriasPrimas(novasMaterias);
    setNovaMateriaNome('');
    setNovaMateriaPreco('');
    setNovaMateriaUni('L');

    await persistirListas(vendedores, produtos, tiposSaida, novasMaterias);
  };

  // Salvar Edição de Item Simples
  const handleSalvarEdicaoSimples = async () => {
    if (!itemEmEdicao) return;
    const nomeLimpo = itemEmEdicao.novoNome.trim();

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'O nome do item não pode ser vazio.' });
      return;
    }

    const listaAtual = getListaSimplesAtiva();
    const existeOutro = listaAtual.some((item, idx) => idx !== itemEmEdicao.index && item.toLowerCase() === nomeLimpo.toLowerCase());
    
    if (existeOutro) {
      setMensagem({ tipo: 'erro', texto: `Já existe outro item com o nome "${nomeLimpo}".` });
      return;
    }

    const novaLista = [...listaAtual];
    novaLista[itemEmEdicao.index] = nomeLimpo;
    setListaSimplesAtiva(novaLista);
    setItemEmEdicao(null);

    if (activeSubTab === 'vendedores') await persistirListas(novaLista, produtos, tiposSaida, materiasPrimas);
    else if (activeSubTab === 'tiposSaida') await persistirListas(vendedores, produtos, novaLista, materiasPrimas);
  };

  // Salvar Edição de Produto (Nome e Status)
  const handleSalvarEdicaoProduto = async () => {
    if (!produtoEmEdicao) return;
    const nomeLimpo = produtoEmEdicao.nome.trim();

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'O nome do produto não pode ser vazio.' });
      return;
    }

    const existeOutro = produtos.some((p, idx) => idx !== produtoEmEdicao.index && p.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (existeOutro) {
      setMensagem({ tipo: 'erro', texto: `Já existe outro produto com o nome "${nomeLimpo}".` });
      return;
    }

    const novosProdutos = [...produtos];
    novosProdutos[produtoEmEdicao.index] = {
      nome: nomeLimpo,
      status: produtoEmEdicao.status
    };

    novosProdutos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

    setProdutos(novosProdutos);
    setProdutoEmEdicao(null);

    await persistirListas(vendedores, novosProdutos, tiposSaida, materiasPrimas);
  };

  // Alteração Rápida de Status do Produto diretamente na tabela
  const handleAlterarStatusProdutoRapido = async (indexReal: number, novoStatus: ProdutoStatus) => {
    const novosProdutos = [...produtos];
    novosProdutos[indexReal] = {
      ...novosProdutos[indexReal],
      status: novoStatus
    };

    setProdutos(novosProdutos);
    await persistirListas(vendedores, novosProdutos, tiposSaida, materiasPrimas);
  };

  // Salvar Edição de Matéria-Prima
  const handleSalvarEdicaoMateria = async () => {
    if (!materiaEmEdicao) return;
    const nomeLimpo = materiaEmEdicao.nome.trim();
    const precoNum = typeof materiaEmEdicao.precoUni === 'number' 
      ? materiaEmEdicao.precoUni 
      : parseFloat(String(materiaEmEdicao.precoUni).replace(',', '.')) || 0;
    const uniFinal = (materiaEmEdicao.uni || 'L').trim() || 'L';

    if (!nomeLimpo) {
      setMensagem({ tipo: 'erro', texto: 'O nome da matéria-prima não pode ser vazio.' });
      return;
    }

    const existeOutro = materiasPrimas.some((m, idx) => idx !== materiaEmEdicao.index && m.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (existeOutro) {
      setMensagem({ tipo: 'erro', texto: `Já existe outra matéria-prima com o nome "${nomeLimpo}".` });
      return;
    }

    const novasMaterias = [...materiasPrimas];
    novasMaterias[materiaEmEdicao.index] = { nome: nomeLimpo, precoUni: precoNum, uni: uniFinal };
    setMateriasPrimas(novasMaterias);
    setMateriaEmEdicao(null);

    await persistirListas(vendedores, produtos, tiposSaida, novasMaterias);
  };

  // Confirmar Exclusão de Item Simples
  const handleConfirmarExclusaoSimples = async () => {
    if (!itemParaDeletar) return;

    const listaAtual = getListaSimplesAtiva();
    const novaLista = listaAtual.filter(item => item !== itemParaDeletar);

    setListaSimplesAtiva(novaLista);
    setItemParaDeletar(null);

    if (activeSubTab === 'vendedores') await persistirListas(novaLista, produtos, tiposSaida, materiasPrimas);
    else if (activeSubTab === 'tiposSaida') await persistirListas(vendedores, produtos, novaLista, materiasPrimas);
  };

  // Confirmar Exclusão de Produto
  const handleConfirmarExclusaoProduto = async () => {
    if (!produtoParaDeletar) return;

    const novosProdutos = produtos.filter(p => p.nome !== produtoParaDeletar.nome);
    setProdutos(novosProdutos);
    setProdutoParaDeletar(null);

    await persistirListas(vendedores, novosProdutos, tiposSaida, materiasPrimas);
  };

  // Confirmar Exclusão de Matéria-Prima
  const handleConfirmarExclusaoMateria = async () => {
    if (!materiaParaDeletar) return;

    const novasMaterias = materiasPrimas.filter(m => m.nome !== materiaParaDeletar.nome);
    setMateriasPrimas(novasMaterias);
    setMateriaParaDeletar(null);

    await persistirListas(vendedores, produtos, tiposSaida, novasMaterias);
  };

  // Restaurar Padrões originais do sistema
  const handleRestaurarPadrao = async () => {
    if (window.confirm(`Deseja restaurar os itens padrões da lista de ${getTituloSubTab(activeSubTab)}?`)) {
      if (activeSubTab === 'vendedores') {
        setVendedores(DEFAULT_LISTAS.vendedores);
        await persistirListas(DEFAULT_LISTAS.vendedores, produtos, tiposSaida, materiasPrimas);
      } else if (activeSubTab === 'produtos') {
        setProdutos(DEFAULT_PRODUTOS_DETALHADOS);
        await persistirListas(vendedores, DEFAULT_PRODUTOS_DETALHADOS, tiposSaida, materiasPrimas);
      } else if (activeSubTab === 'tiposSaida') {
        setTiposSaida(DEFAULT_LISTAS.tiposSaida);
        await persistirListas(vendedores, produtos, DEFAULT_LISTAS.tiposSaida, materiasPrimas);
      } else if (activeSubTab === 'materiasPrimas') {
        setMateriasPrimas(DEFAULT_MATERIAS_PRIMAS);
        await persistirListas(vendedores, produtos, tiposSaida, DEFAULT_MATERIAS_PRIMAS);
      }
    }
  };

  // Auxiliar para títulos
  function getTituloSubTab(tab: ListaTab): string {
    if (tab === 'vendedores') return 'Vendedores';
    if (tab === 'produtos') return 'Produtos / Fragrâncias';
    if (tab === 'tiposSaida') return 'Tipos de Saída';
    return 'Matérias-Primas';
  }

  // Filtragem das listas
  const listaSimplesExibida = getListaSimplesAtiva().filter(item =>
    !busca || item.toLowerCase().includes(busca.toLowerCase())
  );

  const produtosExibidos = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatusProduto === 'todos' || p.status === filtroStatusProduto;
      return matchBusca && matchStatus;
    });
  }, [produtos, busca, filtroStatusProduto]);

  const materiasPrimasExibidas = materiasPrimas.filter(item =>
    !busca || item.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Contagem de status de produtos
  const produtosAtivosCount = useMemo(() => produtos.filter(p => p.status === 'Ativo').length, [produtos]);
  const produtosInativosCount = useMemo(() => produtos.filter(p => p.status === 'Inativo').length, [produtos]);
  const produtosTesteCount = useMemo(() => produtos.filter(p => p.status === 'Teste').length, [produtos]);
  const produtosUsoInternoCount = useMemo(() => produtos.filter(p => p.status === 'Uso interno').length, [produtos]);

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
            Cadastre, edite status e gerencie <strong>Vendedores</strong>, <strong>Produtos / Fragrâncias (Ativo, Inativo, Teste, Uso interno)</strong>, <strong>Tipos de Saída</strong> e <strong>Matérias-Primas</strong>.
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
          onClick={() => { setActiveSubTab('produtos'); setBusca(''); setFiltroStatusProduto('todos'); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'produtos'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos / Fragrâncias</span>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'produtos' ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
            }`}>
              {produtos.length}
            </span>
            <span className={`hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
              activeSubTab === 'produtos' ? 'bg-emerald-900/40 text-emerald-950' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {produtosAtivosCount} ativos
            </span>
          </div>
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

        <button
          onClick={() => { setActiveSubTab('materiasPrimas'); setBusca(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubTab === 'materiasPrimas'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-emerald-400" />
          <span>Matérias-Primas & Preços</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeSubTab === 'materiasPrimas' ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}>
            {materiasPrimas.length}
          </span>
        </button>
      </div>

      {/* SUB-ABA: PRODUTOS / FRAGRÂNCIAS COM STATUS */}
      {activeSubTab === 'produtos' && (
        <div className="space-y-4">
          
          {/* Alerta explicativo */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Regra de Vendas:</strong> Apenas os produtos marcados com o status <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">Ativo</span> aparecem disponíveis para seleção ao lançar saídas/vendas. Produtos em <span className="text-cyan-300 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">Uso interno</span>, <span className="text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">Inativo</span> ou <span className="text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">Teste</span> ficam salvos no catálogo mas <strong>ocultos no formulário de vendas</strong>.
            </div>
          </div>

          {/* Form de Adição de Produto & Filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <form onSubmit={handleAdicionarProduto} className="lg:col-span-7 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Adicionar Novo Produto / Fragrância
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Nome */}
                <input
                  type="text"
                  required
                  value={novoProdutoNome}
                  onChange={(e) => setNovoProdutoNome(e.target.value)}
                  placeholder="Nome do produto ou fragrância..."
                  className="sm:col-span-7 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />

                {/* Status */}
                <div className="sm:col-span-3">
                  <select
                    value={novoProdutoStatus}
                    onChange={(e) => setNovoProdutoStatus(e.target.value as ProdutoStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="Ativo" className="bg-slate-900 text-emerald-400">Ativo</option>
                    <option value="Uso interno" className="bg-slate-900 text-cyan-400">Uso interno</option>
                    <option value="Inativo" className="bg-slate-900 text-slate-400">Inativo</option>
                    <option value="Teste" className="bg-slate-900 text-amber-300">Teste</option>
                  </select>
                </div>

                {/* Botão Add */}
                <button
                  type="submit"
                  disabled={salvando}
                  className="sm:col-span-2 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1 disabled:opacity-50"
                  title="Cadastrar Produto"
                >
                  {salvando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* Filtros de Busca e Status */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5 flex flex-col justify-center">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  Filtrar Produtos
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {produtosExibidos.length} de {produtos.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7 relative">
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por nome..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                </div>
                <div className="sm:col-span-5">
                  <select
                    value={filtroStatusProduto}
                    onChange={(e) => setFiltroStatusProduto(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="todos">Todos ({produtos.length})</option>
                    <option value="Ativo">Ativos ({produtosAtivosCount})</option>
                    <option value="Uso interno">Uso interno ({produtosUsoInternoCount})</option>
                    <option value="Inativo">Inativos ({produtosInativosCount})</option>
                    <option value="Teste">Teste ({produtosTesteCount})</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA DE PRODUTOS */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono font-semibold border-b border-slate-800 uppercase">
                  <tr>
                    <th className="px-5 py-3.5 w-14 text-center">#</th>
                    <th className="px-5 py-3.5">Produto / Fragrância</th>
                    <th className="px-5 py-3.5 w-44 text-center">Status</th>
                    <th className="px-5 py-3.5 w-28 text-center">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {produtosExibidos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                        Nenhum produto encontrado com os filtros informados.
                      </td>
                    </tr>
                  ) : (
                    produtosExibidos.map((item, index) => {
                      const realIndex = produtos.indexOf(item);
                      const estaEditando = produtoEmEdicao?.index === realIndex;
                      const statusAtual = item.status || 'Ativo';

                      return (
                        <tr key={item.nome + index} className="hover:bg-slate-900/50 transition-colors group">
                          <td className="px-5 py-3.5 text-center font-mono text-slate-500 text-[11px]">
                            {realIndex + 1}
                          </td>

                          {/* Nome do Produto */}
                          <td className="px-5 py-3.5 font-medium text-slate-200">
                            {estaEditando ? (
                              <input
                                type="text"
                                autoFocus
                                value={produtoEmEdicao.nome}
                                onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, nome: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSalvarEdicaoProduto();
                                  if (e.key === 'Escape') setProdutoEmEdicao(null);
                                }}
                                className="w-full bg-slate-900 border border-amber-400 rounded-lg px-3 py-1.5 text-xs text-amber-200 focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                                <span className="text-slate-100 font-semibold">{item.nome}</span>
                              </div>
                            )}
                          </td>

                          {/* Coluna Status (Select interativo que salva e sincroniza automaticamente) */}
                          <td className="px-5 py-3.5 text-center">
                            {estaEditando ? (
                              <select
                                value={produtoEmEdicao.status}
                                onChange={(e) => setProdutoEmEdicao({ ...produtoEmEdicao, status: e.target.value as ProdutoStatus })}
                                className="bg-slate-900 border border-amber-400 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none text-slate-100"
                              >
                                <option value="Ativo" className="text-emerald-400 font-bold">Ativo</option>
                                <option value="Uso interno" className="text-cyan-400 font-bold">Uso interno</option>
                                <option value="Teste" className="text-amber-400 font-bold">Teste</option>
                                <option value="Inativo" className="text-slate-400 font-bold">Inativo</option>
                              </select>
                            ) : (
                              <div className="inline-block relative">
                                <select
                                  value={statusAtual}
                                  onChange={(e) => handleAlterarStatusProdutoRapido(realIndex, e.target.value as ProdutoStatus)}
                                  disabled={salvando}
                                  className={`text-xs font-bold rounded-full px-3 py-1 border transition-all cursor-pointer focus:outline-none appearance-none pr-6 bg-slate-950/80 ${
                                    statusAtual === 'Ativo'
                                      ? 'border-emerald-500/30 text-emerald-400 hover:border-emerald-400'
                                      : statusAtual === 'Uso interno'
                                      ? 'border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
                                      : statusAtual === 'Teste'
                                      ? 'border-amber-500/30 text-amber-300 hover:border-amber-400'
                                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                                  }`}
                                  title="Clique para alterar o status do produto/fórmula"
                                >
                                  <option value="Ativo" className="bg-slate-900 text-emerald-400 font-bold">● Ativo</option>
                                  <option value="Uso interno" className="bg-slate-900 text-cyan-300 font-bold">● Uso interno</option>
                                  <option value="Teste" className="bg-slate-900 text-amber-300 font-bold">● Teste</option>
                                  <option value="Inativo" className="bg-slate-900 text-slate-400 font-bold">● Inativo</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-500 text-[9px]">
                                  ▼
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="px-5 py-3.5 text-center">
                            {estaEditando ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={handleSalvarEdicaoProduto}
                                  className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                                  title="Salvar alteração"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setProdutoEmEdicao(null)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                                  title="Cancelar edição"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setProdutoEmEdicao({ index: realIndex, nome: item.nome, status: statusAtual })}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                  title={`Editar "${item.nome}"`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setProdutoParaDeletar(item)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title={`Remover "${item.nome}"`}
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
        </div>
      )}

      {/* SUB-ABA: MATÉRIAS-PRIMAS */}
      {activeSubTab === 'materiasPrimas' && (
        <div className="space-y-4">
          
          {/* CARD DE DESTAQUE: FÓRMULAS DE USO INTERNO COM PODER DE MATÉRIA-PRIMA */}
          {formulasUsoInterno.length > 0 && (
            <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Factory className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-cyan-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <span>Fórmulas de Uso Interno com Poder de Matéria-Prima</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {formulasUsoInterno.length} Base{formulasUsoInterno.length > 1 ? 's' : ''} Ativa{formulasUsoInterno.length > 1 ? 's' : ''}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Toda fórmula com status <strong>"Uso interno"</strong> tem poder de Matéria-Prima e aparece automaticamente nos seletores para compor novas fórmulas.
                    </p>
                  </div>
                </div>
              </div>

              {/* LISTA DAS BASES INTERNAS COM CUSTOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {formulasUsoInterno.map((f) => (
                  <div 
                    key={f.id} 
                    className="bg-slate-950/80 border border-cyan-500/20 hover:border-cyan-400/40 rounded-xl p-3 flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <FlaskConical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {f.produto}
                        </span>
                      </div>
                      <span className="text-[10px] text-cyan-400/80 block font-mono">
                        Base P&D • Lote {f.rendimento} {f.unidadeRendimento}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-emerald-300 block">
                        {formatarMoeda(f.custoUnitarioLitro)}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">/ Litro</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <form onSubmit={handleAdicionarMateria} className="lg:col-span-8 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Adicionar Nova Matéria-Prima
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Nome */}
                <input
                  type="text"
                  required
                  value={novaMateriaNome}
                  onChange={(e) => setNovaMateriaNome(e.target.value)}
                  placeholder="Nome da Matéria-Prima..."
                  className="sm:col-span-6 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />

                {/* Unidade (UNI) */}
                <div className="sm:col-span-2">
                  <select
                    value={novaMateriaUni}
                    onChange={(e) => setNovaMateriaUni(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                    title="Unidade de Medida Padrão"
                  >
                    {OPCOES_UNIDADES.map(u => (
                      <option key={u.valor} value={u.valor} className="bg-slate-900 text-slate-100">
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preço Unitário e Botão */}
                <div className="sm:col-span-4 flex gap-2">
                  <input
                    type="text"
                    value={novaMateriaPreco}
                    onChange={(e) => setNovaMateriaPreco(e.target.value)}
                    placeholder="R$/uni (ex: 17,00)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0 disabled:opacity-50"
                    title="Adicionar Matéria-Prima"
                  >
                    {salvando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Campo de Busca */}
            <div className="lg:col-span-4 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-center">
              <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                Filtrar Matérias-Primas
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

          {/* Tabela de Matérias-Primas */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono font-semibold border-b border-slate-800 uppercase">
                  <tr>
                    <th className="px-5 py-3.5 w-14 text-center">#</th>
                    <th className="px-5 py-3.5">Matéria-Prima</th>
                    <th className="px-5 py-3.5 w-24 text-center">UNI</th>
                    <th className="px-5 py-3.5 w-44 text-right">Preço Unitário (R$/uni)</th>
                    <th className="px-5 py-3.5 w-28 text-center">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {materiasPrimasExibidas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        Nenhuma matéria-prima encontrada na lista.
                      </td>
                    </tr>
                  ) : (
                    materiasPrimasExibidas.map((item, index) => {
                      const realIndex = materiasPrimas.indexOf(item);
                      const estaEditando = materiaEmEdicao?.index === realIndex;
                      const unidadeAtual = item.uni || 'L';

                      return (
                        <tr key={item.nome + index} className="hover:bg-slate-900/50 transition-colors group">
                          <td className="px-5 py-3.5 text-center font-mono text-slate-500 text-[11px]">
                            {realIndex + 1}
                          </td>

                          {/* Nome da Matéria-Prima */}
                          <td className="px-5 py-3.5 font-medium text-slate-200">
                            {estaEditando ? (
                              <input
                                type="text"
                                autoFocus
                                value={materiaEmEdicao.nome}
                                onChange={(e) => setMateriaEmEdicao({ ...materiaEmEdicao, nome: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSalvarEdicaoMateria();
                                  if (e.key === 'Escape') setMateriaEmEdicao(null);
                                }}
                                className="w-full bg-slate-900 border border-amber-400 rounded-lg px-3 py-1.5 text-xs text-amber-200 focus:outline-none"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <FlaskConical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-slate-100 font-semibold">{item.nome}</span>
                              </div>
                            )}
                          </td>

                          {/* Coluna UNI */}
                          <td className="px-5 py-3.5 text-center">
                            {estaEditando ? (
                              <select
                                value={materiaEmEdicao.uni}
                                onChange={(e) => setMateriaEmEdicao({ ...materiaEmEdicao, uni: e.target.value })}
                                className="bg-slate-900 border border-amber-400 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono font-bold focus:outline-none"
                              >
                                {OPCOES_UNIDADES.map(u => (
                                  <option key={u.valor} value={u.valor} className="bg-slate-900 text-slate-100">
                                    {u.valor}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 font-mono font-bold text-xs border border-amber-500/20">
                                {unidadeAtual}
                              </span>
                            )}
                          </td>

                          {/* Preço Unitário */}
                          <td className="px-5 py-3.5 text-right font-mono font-bold">
                            {estaEditando ? (
                              <input
                                type="text"
                                value={materiaEmEdicao.precoUni}
                                onChange={(e) => setMateriaEmEdicao({ ...materiaEmEdicao, precoUni: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSalvarEdicaoMateria();
                                  if (e.key === 'Escape') setMateriaEmEdicao(null);
                                }}
                                className="w-28 bg-slate-900 border border-amber-400 rounded-lg px-2 py-1 text-xs text-amber-200 text-right focus:outline-none"
                              />
                            ) : item.precoUni > 0 ? (
                              <span className="text-emerald-400">
                                {formatarMoeda(item.precoUni)}
                                <span className="text-[10px] text-slate-500 font-normal ml-1">/{unidadeAtual}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">R$ -</span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="px-5 py-3.5 text-center">
                            {estaEditando ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={handleSalvarEdicaoMateria}
                                  className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors"
                                  title="Salvar alteração"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setMateriaEmEdicao(null)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                                  title="Cancelar edição"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setMateriaEmEdicao({ index: realIndex, nome: item.nome, precoUni: item.precoUni, uni: unidadeAtual })}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                  title={`Editar "${item.nome}"`}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setMateriaParaDeletar(item)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title={`Remover "${item.nome}"`}
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
        </div>
      )}

      {/* SUB-ABA: VENDEDORES OU TIPOS DE SAÍDA */}
      {(activeSubTab === 'vendedores' || activeSubTab === 'tiposSaida') && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <form onSubmit={handleAdicionarSimples} className="md:col-span-2 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
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

          {/* Tabela de Vendedores ou Tipos de Saída */}
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
                  {listaSimplesExibida.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-10 text-center text-slate-500">
                        Nenhum item encontrado na lista.
                      </td>
                    </tr>
                  ) : (
                    listaSimplesExibida.map((item, index) => {
                      const realIndex = getListaSimplesAtiva().indexOf(item);
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
                                  if (e.key === 'Enter') handleSalvarEdicaoSimples();
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
                                  onClick={handleSalvarEdicaoSimples}
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
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PRODUTO */}
      {produtoParaDeletar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">Excluir Produto / Fragrância?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja remover o produto <strong className="text-amber-300">"{produtoParaDeletar.nome}"</strong> (Status: <span className="text-emerald-400 font-bold">{produtoParaDeletar.status}</span>) da lista do sistema?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setProdutoParaDeletar(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusaoProduto}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE ITEM SIMPLES */}
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
                onClick={handleConfirmarExclusaoSimples}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE MATÉRIA-PRIMA */}
      {materiaParaDeletar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-100">Excluir Matéria-Prima?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja remover a matéria-prima <strong className="text-amber-300">"{materiaParaDeletar.nome}"</strong> ({materiaParaDeletar.uni || 'L'} - Preço: {formatarMoeda(materiaParaDeletar.precoUni)}/{materiaParaDeletar.uni || 'L'})?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setMateriaParaDeletar(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusaoMateria}
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
