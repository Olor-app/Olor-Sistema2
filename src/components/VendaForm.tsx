import React, { useState, useEffect } from 'react';
import { ListasSelects, Venda, TipoSaida, StatusComissao } from '../types';
import { calcularValoresVenda, formatarMoeda } from '../utils/calculations';
import { buscarPrecoUnitario, salvarLoteVendas } from '../services/api';
import { 
  Save, 
  AlertCircle, 
  CheckCircle2, 
  Calculator, 
  Info, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  Layers,
  UserPlus
} from 'lucide-react';

interface VendaFormProps {
  listas: ListasSelects;
  dadosBrutos?: any[];
  onVendaSalva: (novaVenda: Venda | Venda[]) => void;
}

interface ItemLinha {
  idTemp: string;
  produto: string;
  embalagem: string;
  quantidade: number | string;
  modificador: number | string; // R$ Desconto (-) ou Adicional (+) Total em R$
  precoUniManual: number | null;
  expandido: boolean;
}

export const VendaForm: React.FC<VendaFormProps> = ({ listas, dadosBrutos, onVendaSalva }) => {
  // Data de hoje em YYYY-MM-DD
  const hojeIso = new Date().toISOString().split('T')[0];

  // Identifica vendedor padrão "Olor Luz" se existir na lista
  const obterVendedorPadrao = (): string => {
    if (!listas.vendedores || listas.vendedores.length === 0) return 'Olor Luz';
    const achado = listas.vendedores.find(v => v.trim().toLowerCase() === 'olor luz');
    return achado || listas.vendedores[0];
  };

  // 1. DADOS FIXOS DA SAÍDA / PEDIDO (PADRÃO INICIAL)
  const [dataVenda, setDataVenda] = useState<string>(hojeIso);
  const [vendedor, setVendedor] = useState<string>('');
  const [tipoSaida, setTipoSaida] = useState<TipoSaida>('Venda');
  const [tabelaPreco, setTabelaPreco] = useState<string>('Venda Direta');
  const [statusComissao, setStatusComissao] = useState<string>('');
  const [obs, setObs] = useState<string>('');

  // Estados para os Dados Adicionais (Minimizados por padrão)
  const [mostrarDadosAdicionais, setMostrarDadosAdicionais] = useState<boolean>(false);
  const [clienteInfluenciador, setClienteInfluenciador] = useState<string>('');
  const [contato, setContato] = useState<string>('');

  // Verifica se o vendedor atual é Olor Luz (venda interna sem comissão)
  const isOlorLuz = (vendedor || '').trim().toLowerCase() === 'olor luz';

  // Opções de Tipo de Saída garantindo 'Amostra Grátis'
  const tiposSaidaOpcoes = (listas.tiposSaida && listas.tiposSaida.length > 0)
    ? Array.from(new Set(['Venda', 'Consignado', 'Amostra Grátis', 'Mostruário', 'Bonificação', ...listas.tiposSaida]))
    : ['Venda', 'Consignado', 'Amostra Grátis', 'Mostruário', 'Bonificação'];

  // Tabelas de preço oficiais do SIG Olor Luz
  const tabelasOpcoes = (listas.tabelasPreco && listas.tabelasPreco.length > 0)
    ? Array.from(new Set(['Venda Direta', 'Site', 'Tiktok', ...listas.tabelasPreco]))
    : ['Venda Direta', 'Site', 'Tiktok'];

  // Opções de Status da Comissão (destacando Pago e Não Pago)
  const opcoesStatusComissao = (listas.statusComissao && listas.statusComissao.length > 0)
    ? Array.from(new Set(['Pago', 'Não Pago', ...listas.statusComissao]))
    : ['Pago', 'Não Pago'];

  // Função auxiliar para criar uma nova linha de produto totalmente limpa/vazia
  const criarLinhaProdutoVazia = (): ItemLinha => ({
    idTemp: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    produto: '',
    embalagem: '',
    quantidade: '',
    modificador: '',
    precoUniManual: null,
    expandido: false
  });

  // 2. LINHAS DE PRODUTOS DO PEDIDO
  const [itens, setItens] = useState<ItemLinha[]>([]);

  // Estados de feedback e envio
  const [loading, setLoading] = useState<boolean>(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemErro, setMensagemErro] = useState<string>('');

  // Função de reset completo do formulário para o estado padrão exigido
  const resetFormulario = () => {
    setDataVenda(new Date().toISOString().split('T')[0]);
    setVendedor(obterVendedorPadrao());
    setTipoSaida('Venda');
    setTabelaPreco('Venda Direta');
    setStatusComissao('');
    setObs('');
    setClienteInfluenciador('');
    setContato('');
    setMostrarDadosAdicionais(false);
    setItens([criarLinhaProdutoVazia()]);
  };

  // Seleções Iniciais Padrão ao carregar as listas
  useEffect(() => {
    setVendedor(obterVendedorPadrao());
    if (!tabelaPreco) setTabelaPreco('Venda Direta');
    if (!tipoSaida) setTipoSaida('Venda');

    if (itens.length === 0) {
      setItens([criarLinhaProdutoVazia()]);
    }
  }, [listas]);

  // Se o vendedor selecionado for Olor Luz, o status da comissão é forçado a ser vazio
  useEffect(() => {
    if (isOlorLuz) {
      setStatusComissao('');
    }
  }, [vendedor]);

  // Adicionar uma nova linha de produto ao pedido
  const handleAdicionarProduto = () => {
    setItens((prev) => [...prev, criarLinhaProdutoVazia()]);
  };

  // Remover uma linha de produto
  const handleRemoverProduto = (idTemp: string) => {
    if (itens.length <= 1) {
      setMensagemErro('O pedido precisa ter pelo menos 1 produto.');
      setTimeout(() => setMensagemErro(''), 3000);
      return;
    }
    setItens((prev) => prev.filter((item) => item.idTemp !== idTemp));
  };

  // Atualizar campo específico de um item
  const handleAtualizarItem = (idTemp: string, campo: keyof ItemLinha, valor: any) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item;
        return { ...item, [campo]: valor };
      })
    );
  };

  // Alternar visibilidade dos detalhes calculados da linha
  const handleToggleExpandir = (idTemp: string) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.idTemp !== idTemp) return item;
        return { ...item, expandido: !item.expandido };
      })
    );
  };

  // Restaurar o preço unitário da matriz para um item
  const handleRestaurarPrecoMatriz = (idTemp: string) => {
    handleAtualizarItem(idTemp, 'precoUniManual', null);
  };

  // Calcular totais gerais do pedido para a barra de resumo
  const resumoPedido = itens.reduce(
    (acc, item) => {
      const qtdNum = Number(item.quantidade) || 0;
      const modNum = parseFloat(String(item.modificador).replace(',', '.')) || 0;
      const precoUniCalc = buscarPrecoUnitario(item.embalagem, tabelaPreco, dadosBrutos);
      const precoUniEfetivo = item.precoUniManual !== null ? item.precoUniManual : precoUniCalc;
      const calc = calcularValoresVenda(tipoSaida, precoUniEfetivo, qtdNum, modNum, vendedor);

      acc.totalPecas += qtdNum;
      acc.subtotalBruto += calc.subtotalBruto;
      acc.valorTotalVenda += calc.precoVenda;
      acc.totalComissao += calc.comissao;
      return acc;
    },
    { totalPecas: 0, subtotalBruto: 0, valorTotalVenda: 0, totalComissao: 0 }
  );

  // Submissão do formulário completo (múltiplos produtos no mesmo ID_Saida)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemSucesso('');
    setMensagemErro('');

    if (!vendedor) {
      setMensagemErro('Por favor, selecione o Vendedor para esta saída.');
      return;
    }

    // Regra: Se o vendedor NÃO for Olor Luz, o Status da Comissão é obrigatório (Pago ou Não Pago)
    if (!isOlorLuz && !statusComissao) {
      setMensagemErro('Por favor, selecione o Status da Comissão (Pago ou Não Pago) para o vendedor selecionado.');
      return;
    }

    if (itens.length === 0) {
      setMensagemErro('Adicione pelo menos um produto ao pedido.');
      return;
    }

    // Validação de campos dos itens
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      if (!it.produto) {
        setMensagemErro(`Por favor, selecione o Produto para o item #${i + 1}.`);
        return;
      }
      if (!it.embalagem) {
        setMensagemErro(`Por favor, selecione a Embalagem para o item #${i + 1}.`);
        return;
      }
      const qtd = Number(it.quantidade);
      if (isNaN(qtd) || qtd <= 0) {
        setMensagemErro(`Por favor, informe uma Quantidade válida (maior que 0) para o item #${i + 1}.`);
        return;
      }
    }

    setLoading(true);

    // Extração confiável de dia, mês, ano sem fuso
    const parts = dataVenda.split('-');
    const ano = parseInt(parts[0], 10) || new Date().getFullYear();
    const mes = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const dia = parseInt(parts[2], 10) || new Date().getDate();

    const timestamp = Date.now().toString().slice(-4);
    const idSaidaCompartilhado = `SAI-${ano}${String(mes).padStart(2, '0')}${String(dia).padStart(2, '0')}-${timestamp}`;

    // Constrói array de vendas (cada produto é um registro com o mesmo ID_Saida)
    const vendasParaSalvar: Venda[] = itens.map((item, idx) => {
      const qtdNum = Number(item.quantidade) || 0;
      const modNum = parseFloat(String(item.modificador).replace(',', '.')) || 0;
      const precoUniCalc = buscarPrecoUnitario(item.embalagem, tabelaPreco, dadosBrutos);
      const precoUniEfetivo = item.precoUniManual !== null ? item.precoUniManual : precoUniCalc;
      const calc = calcularValoresVenda(tipoSaida, precoUniEfetivo, qtdNum, modNum, vendedor);

      return {
        id: `VEN-${ano}${String(mes).padStart(2, '0')}${String(dia).padStart(2, '0')}-${timestamp}-${idx + 1}`,
        data: dataVenda,
        idSaida: idSaidaCompartilhado,
        vendedor,
        tabelaPreco,
        tipoSaida,
        produto: item.produto,
        embalagem: item.embalagem,
        quantidade: qtdNum,
        modificador: modNum,
        precoUni: calc.precoUni,
        precoVenda: calc.precoVenda,
        comissao: calc.comissao,
        statusComissao: isOlorLuz ? '' : statusComissao,
        dia,
        mes,
        ano,
        obs,
        clienteInfluenciador: clienteInfluenciador.trim(),
        contato: contato.trim()
      };
    });

    try {
      const res = await salvarLoteVendas(vendasParaSalvar);
      if (res.success) {
        setMensagemSucesso(res.message);
        onVendaSalva(res.vendasSalvas);

        // Reseta todos os campos do formulário após o salvamento
        resetFormulario();
      } else {
        setMensagemErro(res.message);
      }
    } catch (err: any) {
      setMensagemErro(`Erro ao registrar lote de vendas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 max-w-5xl mx-auto">
      
      {/* Cabeçalho do Formulário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-amber-200 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-amber-400" />
            Lançamento de Saída / Pedido Multiprofuto
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre múltiplos produtos em uma única saída ({vendedor ? `Vendedor: ${vendedor}` : 'Selecione o vendedor'}). Todos os itens compartilharão o mesmo <span className="text-amber-300 font-mono">ID_Saida</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {itens.length} {itens.length === 1 ? 'Produto no Pedido' : 'Produtos no Pedido'}
          </span>
        </div>
      </div>

      {/* Alertas de Retorno */}
      {mensagemSucesso && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Pedido Salvo com Sucesso!</p>
            <p className="text-emerald-200/90 text-xs mt-0.5">{mensagemSucesso}</p>
          </div>
        </div>
      )}

      {mensagemErro && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Atenção</p>
            <p className="text-rose-200/90 text-xs mt-0.5">{mensagemErro}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* BLOCO 1: DADOS FIXOS DA SAÍDA / CABEÇALHO */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              1. Dados Fixos do Pedido (Cabeçalho da Saída)
            </span>
            <span className="text-[11px] text-slate-400">
              Aplica-se a todos os produtos deste lançamento
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Data da Saída *</label>
              <input
                type="date"
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Vendedor *</label>
              <select
                value={vendedor}
                onChange={(e) => setVendedor(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-semibold"
              >
                {listas.vendedores.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Saída *</label>
              <select
                value={tipoSaida}
                onChange={(e) => setTipoSaida(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              >
                {tiposSaidaOpcoes.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tabela de Preço *</label>
              <select
                value={tabelaPreco}
                onChange={(e) => setTabelaPreco(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-semibold focus:outline-none focus:border-amber-400"
              >
                {tabelasOpcoes.map((tb) => (
                  <option key={tb} value={tb}>{tb}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Botão de Toggle para Dados Adicionais (Minimizados por Padrão) */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setMostrarDadosAdicionais(!mostrarDadosAdicionais)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors bg-slate-900 border border-slate-800 hover:border-amber-500/30 px-3 py-1.5 rounded-lg active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>{mostrarDadosAdicionais ? 'Ocultar Dados Adicionais' : 'Dados Adicionais (+ Cliente/Influenciador, Contato)'}</span>
              {mostrarDadosAdicionais ? <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />}
              {(clienteInfluenciador || contato) && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded font-mono">
                  Preenchido
                </span>
              )}
            </button>

            {mostrarDadosAdicionais && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-900/90 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cliente / Influenciador (Opcional)
                  </label>
                  <input
                    type="text"
                    value={clienteInfluenciador}
                    onChange={(e) => setClienteInfluenciador(e.target.value)}
                    placeholder="Ex: Maria Silva / @influencer"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contato / Telefone (Opcional)
                  </label>
                  <input
                    type="text"
                    value={contato}
                    onChange={(e) => setContato(e.target.value)}
                    placeholder="Ex: (11) 98765-4321"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BLOCO 2: LISTA DE PRODUTOS DO PEDIDO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              2. Produtos Vendidos ({itens.length})
            </span>
            <button
              type="button"
              onClick={handleAdicionarProduto}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              + Novo Produto
            </button>
          </div>

          <div className="space-y-3">
            {itens.map((item, index) => {
              const qtdNum = Number(item.quantidade) || 0;
              const modNum = parseFloat(String(item.modificador).replace(',', '.')) || 0;
              const precoUniCalc = buscarPrecoUnitario(item.embalagem, tabelaPreco, dadosBrutos);
              const precoUniEfetivo = item.precoUniManual !== null ? item.precoUniManual : precoUniCalc;
              const calc = calcularValoresVenda(tipoSaida, precoUniEfetivo, qtdNum, modNum, vendedor);

              return (
                <div
                  key={item.idTemp}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700 space-y-3"
                >
                  {/* Cabeçalho do Item e Grade de Entradas */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                    
                    {/* Badge do Número do Item */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center font-mono">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        Produto #{index + 1}
                      </span>
                    </div>

                    {/* Resumo Rápido e Botões de Ação da Linha */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto">
                      <div className="flex items-center gap-3 text-xs bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">
                        <span className="text-slate-400">Total:</span>
                        <span className="font-bold text-amber-200 font-mono">
                          {formatarMoeda(calc.precoVenda)}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-400">Comissão:</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {formatarMoeda(calc.comissao)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Botão de Expandir / Esconder Detalhes Calculados */}
                        <button
                          type="button"
                          onClick={() => handleToggleExpandir(item.idTemp)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                            item.expandido
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                          title="Expandir/Minimizar cálculos detalhados"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>{item.expandido ? 'Ocultar Detalhes' : 'Detalhes'}</span>
                          {item.expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {/* Botão Deletar Item */}
                        <button
                          type="button"
                          onClick={() => handleRemoverProduto(item.idTemp)}
                          disabled={itens.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          title={itens.length <= 1 ? 'O pedido precisa ter ao menos 1 produto' : 'Remover este produto'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campos Editáveis Principais do Produto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                    
                    {/* Select Produto */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Produto *</label>
                      <select
                        value={item.produto}
                        onChange={(e) => handleAtualizarItem(item.idTemp, 'produto', e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-medium"
                      >
                        <option value="">Selecione o Produto...</option>
                        {listas.produtos.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Embalagem */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Embalagem *</label>
                      <select
                        value={item.embalagem}
                        onChange={(e) => handleAtualizarItem(item.idTemp, 'embalagem', e.target.value)}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                      >
                        <option value="">Selecione a Embalagem...</option>
                        {listas.embalagens.map((emb) => (
                          <option key={emb} value={emb}>{emb}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantidade */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">Quantidade *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => handleAtualizarItem(item.idTemp, 'quantidade', e.target.value)}
                        placeholder="Ex: 2"
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    {/* Modificador (Desconto ou Adicional) */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1" title="Desconto (-) ou Adicional (+) Total em R$">
                        Ajuste R$ (- ou +)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={item.modificador}
                        onChange={(e) => handleAtualizarItem(item.idTemp, 'modificador', e.target.value)}
                        placeholder="0.00 ou -2.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                  </div>

                  {/* Linha do Preço Unitário com opção de ajuste manual */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/80 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">Preço Unitário (R$):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={precoUniEfetivo}
                        onChange={(e) => handleAtualizarItem(item.idTemp, 'precoUniManual', parseFloat(e.target.value) || 0)}
                        className="w-32 bg-slate-950 border border-amber-500/40 rounded px-2 py-1 text-xs text-amber-300 font-semibold font-mono focus:outline-none focus:border-amber-400"
                      />
                      {item.precoUniManual !== null && (
                        <button
                          type="button"
                          onClick={() => handleRestaurarPrecoMatriz(item.idTemp)}
                          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                          title="Restaurar preço vindo da Matriz"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Restaurar Matriz
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {item.precoUniManual !== null ? 'Ajustado manualmente' : `Matriz: ${item.embalagem} × ${tabelaPreco}`}
                    </span>
                  </div>

                  {/* PAINEL EXPANDIDO DE CÁLCULOS E REGRAS DE NEGÓCIO DA LINHA */}
                  {item.expandido && (
                    <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3 mt-2 space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                        <span className="font-bold text-amber-300">Detalhamento dos Cálculos do Item #{index + 1}</span>
                        <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono">
                          {calc.regraAplicada}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono">
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Subtotal Bruto</span>
                          <span className="font-semibold text-slate-200">
                            {formatarMoeda(calc.subtotalBruto)}
                          </span>
                        </div>

                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Ajuste (R$)</span>
                          <span className={`font-semibold ${modNum < 0 ? 'text-rose-400' : modNum > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {formatarMoeda(modNum)}
                          </span>
                        </div>

                        <div className="bg-amber-500/10 p-2 rounded border border-amber-500/20">
                          <span className="text-[10px] text-amber-400 block">Preço de Venda Final</span>
                          <span className="font-bold text-amber-200">
                            {formatarMoeda(calc.precoVenda)}
                          </span>
                        </div>

                        <div className="bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                          <span className="text-[10px] text-emerald-400 block">Comissão Vendedor</span>
                          <span className="font-bold text-emerald-300">
                            {formatarMoeda(calc.comissao)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Botão Adicionar Mais Um Produto */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAdicionarProduto}
              className="w-full py-3 border-2 border-dashed border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/5 text-amber-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Novo Produto neste Pedido</span>
            </button>
          </div>
        </div>

        {/* BLOCO 3: STATUS COMISSÃO & OBSERVAÇÕES DO PEDIDO */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>
                Status da Comissão {!isOlorLuz && <span className="text-amber-400 font-bold">*</span>}
              </span>
              {isOlorLuz && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Olor Luz (Sem Comissão)
                </span>
              )}
            </label>
            <select
              value={isOlorLuz ? '' : statusComissao}
              onChange={(e) => setStatusComissao(e.target.value)}
              disabled={isOlorLuz}
              required={!isOlorLuz}
              className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 transition-colors ${
                isOlorLuz
                  ? 'border-slate-800 text-slate-500 bg-slate-900/60 cursor-not-allowed font-mono'
                  : !statusComissao
                  ? 'border-amber-500/50 text-amber-300 font-medium'
                  : 'border-slate-700 text-slate-100 font-semibold'
              }`}
            >
              <option value="">
                {isOlorLuz ? 'Vazio (Venda Interna Olor Luz)' : '-- Selecione: Pago ou Não Pago --'}
              </option>
              {!isOlorLuz &&
                opcoesStatusComissao
                  .filter((st) => st && st.trim() !== '')
                  .map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
            </select>
            {!isOlorLuz && !statusComissao && (
              <p className="text-[11px] text-amber-400/90 mt-1">
                Seleção obrigatória entre Pago e Não Pago.
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Observações Gerais do Pedido (OBS)</label>
            <input
              type="text"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Anotações adicionais compartilhadas por todos os itens desta saída..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* BLOCO 4: RESUMO GERAL DO PEDIDO & BOTÃO DE ENVIO */}
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-400" />
              Resumo do Pedido ({itens.length} {itens.length === 1 ? 'Produto' : 'Produtos'})
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Vendedor: <strong className="text-slate-200">{vendedor || '—'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total de Itens</span>
              <span className="text-base font-bold font-mono text-slate-100 mt-0.5 block">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{resumoPedido.totalPecas} peça(s) no total</span>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Subtotal Bruto</span>
              <span className="text-base font-bold font-mono text-slate-200 mt-0.5 block">
                {formatarMoeda(resumoPedido.subtotalBruto)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Soma das quantidades × unit.</span>
            </div>

            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
              <span className="text-[10px] text-amber-400 font-bold block uppercase">Valor Total do Pedido</span>
              <span className="text-lg font-extrabold font-mono text-amber-200 mt-0.5 block">
                {formatarMoeda(resumoPedido.valorTotalVenda)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Salvo em BD_Vendas (Coluna L)</span>
            </div>

            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase">Comissão Total Vendedor</span>
              <span className="text-lg font-extrabold font-mono text-emerald-300 mt-0.5 block">
                {formatarMoeda(resumoPedido.totalComissao)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Salvo em BD_Vendas (Coluna M)</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold px-8 py-3.5 rounded-xl shadow-xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Gravando Pedido com {itens.length} produto(s) no Google Sheets...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Salvar Pedido com {itens.length} Produto(s) em BD_Vendas</span>
                </>
              )}
            </button>
          </div>

        </div>

      </form>
    </div>
  );
};
