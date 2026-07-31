import React, { useState, useMemo } from 'react';
import { Venda, ListasSelects } from '../types';
import { formatarMoeda } from '../utils/calculations';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Award, 
  Calendar, 
  Filter, 
  Search, 
  ShoppingBag, 
  PieChart as PieIcon, 
  BarChart3, 
  Users, 
  RotateCcw,
  Tag,
  Layers,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid, 
  Legend 
} from 'recharts';

interface DashboardProps {
  vendas: Venda[];
  listas: ListasSelects;
}

export const Dashboard: React.FC<DashboardProps> = ({ vendas, listas }) => {
  // 1. ESTADOS DOS FILTROS
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('todos');
  const [tipoSaidaFiltro, setTipoSaidaFiltro] = useState<string>('todos');
  const [tabelaPrecoFiltro, setTabelaPrecoFiltro] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');

  // Tabelas de preço disponíveis
  const tabelasOpcoes = useMemo(() => {
    const setTabelas = new Set<string>();
    vendas.forEach(v => { if (v.tabelaPreco) setTabelas.add(v.tabelaPreco); });
    listas.tabelasPreco.forEach(t => setTabelas.add(t));
    return Array.from(setTabelas);
  }, [vendas, listas]);

  // Vendedores disponíveis
  const vendedoresOpcoes = useMemo(() => {
    const setVend = new Set<string>();
    vendas.forEach(v => { if (v.vendedor) setVend.add(v.vendedor); });
    listas.vendedores.forEach(v => setVend.add(v));
    return Array.from(setVend);
  }, [vendas, listas]);

  // Tipos de Saída disponíveis
  const tiposSaidaOpcoes = useMemo(() => {
    const setTipos = new Set<string>();
    vendas.forEach(v => { if (v.tipoSaida) setTipos.add(v.tipoSaida); });
    listas.tiposSaida.forEach(ts => setTipos.add(ts));
    return Array.from(setTipos);
  }, [vendas, listas]);

  // Atravessar atalhos de data
  const aplicarAtalhoData = (tipo: 'tudo' | 'hoje' | 'esteMes' | 'mesAnterior' | 'anoAtual') => {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    if (tipo === 'tudo') {
      setDataInicio('');
      setDataFim('');
    } else if (tipo === 'hoje') {
      const iso = hoje.toISOString().split('T')[0];
      setDataInicio(iso);
      setDataFim(iso);
    } else if (tipo === 'esteMes') {
      const primeiroDia = new Date(ano, mes, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(ano, mes + 1, 0).toISOString().split('T')[0];
      setDataInicio(primeiroDia);
      setDataFim(ultimoDia);
    } else if (tipo === 'mesAnterior') {
      const primeiroDia = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
      const ultimoDia = new Date(ano, mes, 0).toISOString().split('T')[0];
      setDataInicio(primeiroDia);
      setDataFim(ultimoDia);
    } else if (tipo === 'anoAtual') {
      setDataInicio(`${ano}-01-01`);
      setDataFim(`${ano}-12-31`);
    }
  };

  // Limpar todos os filtros
  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setVendedorFiltro('todos');
    setTipoSaidaFiltro('todos');
    setTabelaPrecoFiltro('todos');
    setBusca('');
  };

  // 2. VENDAS FILTRADAS
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      // Data
      if (dataInicio && v.data < dataInicio) return false;
      if (dataFim && v.data > dataFim) return false;

      // Vendedor
      if (vendedorFiltro !== 'todos' && v.vendedor !== vendedorFiltro) return false;

      // Tipo Saída
      if (tipoSaidaFiltro !== 'todos' && v.tipoSaida !== tipoSaidaFiltro) return false;

      // Tabela Preço
      if (tabelaPrecoFiltro !== 'todos' && v.tabelaPreco !== tabelaPrecoFiltro) return false;

      // Busca texto
      if (busca.trim() !== '') {
        const termo = busca.toLowerCase();
        const matchProd = v.produto?.toLowerCase().includes(termo);
        const matchEmb = v.embalagem?.toLowerCase().includes(termo);
        const matchId = v.idSaida?.toLowerCase().includes(termo) || v.id?.toLowerCase().includes(termo);
        const matchVend = v.vendedor?.toLowerCase().includes(termo);
        if (!matchProd && !matchEmb && !matchId && !matchVend) return false;
      }

      return true;
    });
  }, [vendas, dataInicio, dataFim, vendedorFiltro, tipoSaidaFiltro, tabelaPrecoFiltro, busca]);

  // 3. CÁLCULO DOS KPIs GERAIS
  const kpis = useMemo(() => {
    let faturamentoTotal = 0;
    let totalPecas = 0;
    let totalComissoes = 0;
    const idsSaidaUnicos = new Set<string>();

    vendasFiltradas.forEach((v) => {
      faturamentoTotal += v.precoVenda || 0;
      totalPecas += v.quantidade || 0;
      totalComissoes += v.comissao || 0;
      if (v.idSaida) idsSaidaUnicos.add(v.idSaida);
    });

    const totalSaidas = idsSaidaUnicos.size || (vendasFiltradas.length > 0 ? 1 : 0);
    const ticketMedio = totalSaidas > 0 ? faturamentoTotal / totalSaidas : 0;

    return {
      faturamentoTotal,
      totalPecas,
      totalComissoes,
      totalSaidas,
      ticketMedio
    };
  }, [vendasFiltradas]);

  // 4. DADOS PARA GRÁFICO DE TEMPO (EVOLUÇÃO DIÁRIA)
  const dadosEvolucaoTempo = useMemo(() => {
    const mapaDias: Record<string, { data: string; dataFormatada: string; faturamento: number; comissao: number; quantidade: number }> = {};

    // Ordena vendas por data
    const ordenadas = [...vendasFiltradas].sort((a, b) => a.data.localeCompare(b.data));

    ordenadas.forEach((v) => {
      const d = v.data;
      if (!mapaDias[d]) {
        const parts = d.split('-');
        const dataFmt = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        mapaDias[d] = { data: d, dataFormatada: dataFmt, faturamento: 0, comissao: 0, quantidade: 0 };
      }
      mapaDias[d].faturamento += v.precoVenda || 0;
      mapaDias[d].comissao += v.comissao || 0;
      mapaDias[d].quantidade += v.quantidade || 0;
    });

    return Object.values(mapaDias);
  }, [vendasFiltradas]);

  // 5. DADOS PARA VENDEDORES (FATURAMENTO E COMISSÃO POR VENDEDOR)
  const dadosVendedores = useMemo(() => {
    const mapa: Record<string, { vendedor: string; faturamento: number; comissao: number; pecas: number; numSaidas: Set<string> }> = {};

    vendasFiltradas.forEach((v) => {
      const vend = v.vendedor || 'Não Identificado';
      if (!mapa[vend]) {
        mapa[vend] = { vendedor: vend, faturamento: 0, comissao: 0, pecas: 0, numSaidas: new Set() };
      }
      mapa[vend].faturamento += v.precoVenda || 0;
      mapa[vend].comissao += v.comissao || 0;
      mapa[vend].pecas += v.quantidade || 0;
      if (v.idSaida) mapa[vend].numSaidas.add(v.idSaida);
    });

    return Object.values(mapa)
      .map(item => ({
        vendedor: item.vendedor,
        faturamento: item.faturamento,
        comissao: item.comissao,
        pecas: item.pecas,
        saidasCount: item.numSaidas.size || 1,
        ticketMedio: item.numSaidas.size > 0 ? item.faturamento / item.numSaidas.size : item.faturamento
      }))
      .sort((a, b) => b.faturamento - a.faturamento);
  }, [vendasFiltradas]);

  // 6. DADOS PARA TIPOS DE SAÍDA (PIZZA / ROSCA)
  const dadosTiposSaida = useMemo(() => {
    const mapa: Record<string, number> = {};

    vendasFiltradas.forEach((v) => {
      const tipo = v.tipoSaida || 'Outros';
      mapa[tipo] = (mapa[tipo] || 0) + (v.precoVenda || 0);
    });

    const CORES = ['#d4af37', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

    return Object.keys(mapa).map((tipo, idx) => ({
      name: tipo,
      value: mapa[tipo],
      color: CORES[idx % CORES.length]
    })).sort((a, b) => b.value - a.value);
  }, [vendasFiltradas]);

  // 7. DADOS PARA TOP PRODUTOS MAIS VENDIDOS
  const dadosTopProdutos = useMemo(() => {
    const mapa: Record<string, { produto: string; quantidade: number; faturamento: number }> = {};

    vendasFiltradas.forEach((v) => {
      const prod = v.produto || 'Não informado';
      if (!mapa[prod]) {
        mapa[prod] = { produto: prod, quantidade: 0, faturamento: 0 };
      }
      mapa[prod].quantidade += v.quantidade || 0;
      mapa[prod].faturamento += v.precoVenda || 0;
    });

    return Object.values(mapa)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 7);
  }, [vendasFiltradas]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* PAINEL DE FILTROS SUPERIOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-200">Filtros de Desempenho do Dashboard</h2>
              <p className="text-xs text-slate-400">Personalize o período, vendedor e categoria para analisar os resultados</p>
            </div>
          </div>

          {/* Atalhos Rápidos de Período */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">Atalhos:</span>
            <button
              onClick={() => aplicarAtalhoData('hoje')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => aplicarAtalhoData('esteMes')}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/30 transition-colors"
            >
              Este Mês
            </button>
            <button
              onClick={() => aplicarAtalhoData('mesAnterior')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              Mês Anterior
            </button>
            <button
              onClick={() => aplicarAtalhoData('anoAtual')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              Ano Atual
            </button>
            <button
              onClick={limparFiltros}
              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/30 transition-colors flex items-center gap-1"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3 h-3" /> Limpar
            </button>
          </div>
        </div>

        {/* Form de Filtros em Grade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Data Início */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Vendedor</label>
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-medium"
            >
              <option value="todos">Todos os Vendedores</option>
              {vendedoresOpcoes.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Tipo de Saída */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo de Saída</label>
            <select
              value={tipoSaidaFiltro}
              onChange={(e) => setTipoSaidaFiltro(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-medium"
            >
              <option value="todos">Todos os Tipos</option>
              {tiposSaidaOpcoes.map((ts) => (
                <option key={ts} value={ts}>{ts}</option>
              ))}
            </select>
          </div>

          {/* Tabela de Preço */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tabela de Preço</label>
            <select
              value={tabelaPrecoFiltro}
              onChange={(e) => setTabelaPrecoFiltro(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-medium"
            >
              <option value="todos">Todas as Tabelas</option>
              {tabelasOpcoes.map((tb) => (
                <option key={tb} value={tb}>{tb}</option>
              ))}
            </select>
          </div>

          {/* Busca por Texto */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Buscar Termo</label>
            <div className="relative">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Produto, ID, etc..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO DE KPIS DE RESULTADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: Faturamento Bruto */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-16 h-16 text-amber-400" />
          </div>
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Faturamento Total</span>
          <p className="text-2xl font-extrabold text-amber-200 font-mono mt-1">
            {formatarMoeda(kpis.faturamentoTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Vendas consolidadas do período
          </p>
        </div>

        {/* KPI 2: Total de Peças */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Package className="w-16 h-16 text-blue-400" />
          </div>
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Peças / Unidades</span>
          <p className="text-2xl font-extrabold text-slate-100 font-mono mt-1">
            {kpis.totalPecas.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">peças</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-400" />
            Volume total comercializado
          </p>
        </div>

        {/* KPI 3: Total Comissões */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Award className="w-16 h-16 text-emerald-400" />
          </div>
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Comissões Totais</span>
          <p className="text-2xl font-extrabold text-emerald-300 font-mono mt-1">
            {formatarMoeda(kpis.totalComissoes)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Calculadas com regras do sistema
          </p>
        </div>

        {/* KPI 4: Total de Saídas / Pedidos */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShoppingBag className="w-16 h-16 text-purple-400" />
          </div>
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">Total de Pedidos</span>
          <p className="text-2xl font-extrabold text-slate-100 font-mono mt-1">
            {kpis.totalSaidas} <span className="text-xs text-slate-400 font-normal">pedidos</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-purple-400" />
            Saídas com ID_Saida registrado
          </p>
        </div>

        {/* KPI 5: Ticket Médio por Pedido */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="w-16 h-16 text-amber-300" />
          </div>
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">Ticket Médio / Pedido</span>
          <p className="text-2xl font-extrabold text-amber-100 font-mono mt-1">
            {formatarMoeda(kpis.ticketMedio)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-400" />
            Média por pedido efetuado
          </p>
        </div>

      </div>

      {/* PAINEL DE GRÁFICOS - LINHA 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: EVOLUÇÃO TEMPORAL (2 COLUNAS) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-slate-200 text-sm">Evolução do Faturamento no Tempo</h3>
            </div>
            <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
              {dadosEvolucaoTempo.length} dia(s) com lançamentos
            </span>
          </div>

          {dadosEvolucaoTempo.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <Calendar className="w-8 h-8 opacity-40" />
              <span>Nenhum dado encontrado para os filtros selecionados.</span>
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosEvolucaoTempo}>
                  <defs>
                    <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#d4af37" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorCom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="dataFormatada" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                    formatter={(val: any) => [formatarMoeda(Number(val)), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="faturamento" name="Faturamento (R$)" stroke="#d4af37" strokeWidth={2} fillOpacity={1} fill="url(#colorFat)" />
                  <Area type="monotone" dataKey="comissao" name="Comissão (R$)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCom)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* GRÁFICO 2: DISTRIBUIÇÃO POR TIPO DE SAÍDA (PIE CHART) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-200 text-sm">Distribuição por Tipo de Saída</h3>
            </div>
          </div>

          {dadosTiposSaida.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <PieIcon className="w-8 h-8 opacity-40" />
              <span>Sem registros no período.</span>
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={dadosTiposSaida}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {dadosTiposSaida.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                    formatter={(val: any) => [formatarMoeda(Number(val)), 'R$']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 text-xs pt-1">
                {dadosTiposSaida.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300 font-medium">{item.name}:</span>
                    <span className="text-amber-300 font-mono">{formatarMoeda(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* PAINEL DE GRÁFICOS E RANKING - LINHA 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DESEMPENHO POR VENDEDOR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-slate-200 text-sm">Faturamento e Comissão por Vendedor</h3>
            </div>
          </div>

          {dadosVendedores.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
              Sem dados de vendedores.
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosVendedores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="vendedor" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                    formatter={(val: any) => [formatarMoeda(Number(val)), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="faturamento" name="Faturamento (R$)" fill="#d4af37" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="comissao" name="Comissão (R$)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* TOP PRODUTOS MAIS VENDIDOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-slate-200 text-sm">Top Produtos Mais Vendidos (Peças)</h3>
            </div>
          </div>

          {dadosTopProdutos.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
              Sem produtos registrados.
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosTopProdutos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="produto" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                    formatter={(val: any) => [`${val} peças`, 'Quantidade']}
                  />
                  <Bar dataKey="quantidade" name="Peças Vendidas" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* TABELA DE RANKING DETALHADA POR VENDEDOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-200 text-sm">Resumo Detalhado por Vendedor</h3>
          </div>
          <span className="text-xs text-slate-400">
            Total de {dadosVendedores.length} vendedor(es) com lançamentos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                <th className="p-3"># Pos.</th>
                <th className="p-3">Vendedor</th>
                <th className="p-3 text-right">Pedidos / Saídas</th>
                <th className="p-3 text-right">Peças Vendidas</th>
                <th className="p-3 text-right">Faturamento Total</th>
                <th className="p-3 text-right">Comissão R$</th>
                <th className="p-3 text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {dadosVendedores.map((vend, idx) => (
                <tr key={vend.vendedor} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-slate-500 font-bold">#{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-100 font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {vend.vendedor}
                  </td>
                  <td className="p-3 text-right text-slate-300">{vend.saidasCount}</td>
                  <td className="p-3 text-right text-blue-300 font-bold">{vend.pecas}</td>
                  <td className="p-3 text-right text-amber-300 font-bold">{formatarMoeda(vend.faturamento)}</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">{formatarMoeda(vend.comissao)}</td>
                  <td className="p-3 text-right text-slate-300">{formatarMoeda(vend.ticketMedio)}</td>
                </tr>
              ))}

              {dadosVendedores.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    Nenhum vendedor registrado para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
