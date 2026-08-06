import React, { useState, useMemo } from 'react';
import { Venda, ListasSelects, User as UserAccount } from '../types';
import { formatarMoeda, formatarDataBR } from '../utils/calculations';
import { atualizarStatusComissaoVendaApi } from '../services/api';
import { OFFICIAL_LOGO_URL } from './Logo';
import { 
  DollarSign, 
  Calendar, 
  User, 
  Search, 
  Filter, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Printer, 
  Download, 
  Check, 
  X, 
  Sparkles, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  TrendingUp,
  Tag
} from 'lucide-react';

interface ComissoesViewProps {
  vendas: Venda[];
  listas: ListasSelects;
  currentUser: UserAccount;
  onRefresh: () => void;
  loading?: boolean;
}

export const ComissoesView: React.FC<ComissoesViewProps> = ({
  vendas,
  listas,
  currentUser,
  onRefresh,
  loading = false,
}) => {
  const isMaster = currentUser.tipo === 'Master';

  // State dos Filtros
  const [vendedorFiltro, setVendedorFiltro] = useState<string>(
    isMaster ? 'TODOS' : currentUser.nome
  );
  const [modoFiltro, setModoFiltro] = useState<'mes_ano' | 'periodo'>('mes_ano');
  
  const hoje = new Date();
  const [mesFiltro, setMesFiltro] = useState<string>(String(hoje.getMonth() + 1));
  const [anoFiltro, setAnoFiltro] = useState<string>(String(hoje.getFullYear()));

  // Data inicial e final para modo período (default: primeiro e último dia do mês atual)
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [dataInicial, setDataInicial] = useState<string>(primeiroDiaMes);
  const [dataFinal, setDataFinal] = useState<string>(ultimoDiaMes);

  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');
  const [buscaTexto, setBuscaTexto] = useState<string>('');
  const [visaoAgrupada, setVisaoAgrupada] = useState<boolean>(true);

  // Seleção em lote para ações do Master
  const [itensSelecionados, setItensSelecionados] = useState<string[]>([]);
  const [atualizandoStatus, setAtualizandoStatus] = useState<boolean>(false);
  const [toast, setToast] = useState<{ tipo: 'success' | 'error'; mensagem: string } | null>(null);

  const mostrarToast = (tipo: 'success' | 'error', mensagem: string) => {
    setToast({ tipo, mensagem });
    setTimeout(() => setToast(null), 4000);
  };

  // Anos disponíveis
  const anosDisponiveis = useMemo(() => {
    const anosUnicos = Array.from(new Set(vendas.map(v => v.ano).filter(Boolean)));
    const anoAtualNum = hoje.getFullYear();
    if (!anosUnicos.includes(anoAtualNum)) anosUnicos.push(anoAtualNum);
    return anosUnicos.sort((a, b) => b - a);
  }, [vendas]);

  // Vendedores ordenados
  const vendedoresDisponiveis = useMemo(() => {
    return [...(listas.vendedores || [])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [listas.vendedores]);

  // 1. Filtragem principal dos dados de vendas
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((item) => {
      // Perfil Vendedor só enxerga suas próprias comissões
      if (!isMaster) {
        if (item.vendedor.toLowerCase() !== currentUser.nome.toLowerCase()) {
          return false;
        }
      } else if (vendedorFiltro !== 'TODOS') {
        if (item.vendedor.toLowerCase() !== vendedorFiltro.toLowerCase()) {
          return false;
        }
      }

      // Filtro de Data
      if (modoFiltro === 'mes_ano') {
        if (mesFiltro !== 'TODOS' && item.mes !== Number(mesFiltro)) {
          return false;
        }
        if (anoFiltro !== 'TODOS' && item.ano !== Number(anoFiltro)) {
          return false;
        }
      } else {
        if (dataInicial && item.data < dataInicial) return false;
        if (dataFinal && item.data > dataFinal) return false;
      }

      // Filtro de Status de Comissão
      if (statusFiltro !== 'TODOS') {
        if (statusFiltro === 'Pago' && item.statusComissao !== 'Pago') return false;
        if (statusFiltro === 'Pendente') {
          if (item.statusComissao === 'Pago' || item.statusComissao === 'Cancelado') return false;
        }
        if (statusFiltro === 'Cancelado' && item.statusComissao !== 'Cancelado') return false;
      }

      // Filtro de Busca Por Texto
      if (buscaTexto.trim() !== '') {
        const termo = buscaTexto.toLowerCase();
        const noId = (item.idSaida || '').toLowerCase().includes(termo);
        const noCliente = (item.clienteInfluenciador || '').toLowerCase().includes(termo);
        const noProduto = (item.produto || '').toLowerCase().includes(termo);
        const noVendedor = (item.vendedor || '').toLowerCase().includes(termo);
        if (!noId && !noCliente && !noProduto && !noVendedor) return false;
      }

      return true;
    });
  }, [vendas, isMaster, currentUser.nome, vendedorFiltro, modoFiltro, mesFiltro, anoFiltro, dataInicial, dataFinal, statusFiltro, buscaTexto]);

  // Totais e KPIs calculados
  const totaisKPI = useMemo(() => {
    let valorTotalVendas = 0;
    let totalComissoesGeral = 0;
    let comissoesPagasValor = 0;
    let comissoesPagasQtd = 0;
    let comissoesPendentesValor = 0;
    let comissoesPendentesQtd = 0;

    vendasFiltradas.forEach(v => {
      valorTotalVendas += (v.precoVenda || 0);
      totalComissoesGeral += (v.comissao || 0);

      if (v.statusComissao === 'Pago') {
        comissoesPagasValor += (v.comissao || 0);
        comissoesPagasQtd += 1;
      } else if (v.statusComissao !== 'Cancelado') {
        comissoesPendentesValor += (v.comissao || 0);
        comissoesPendentesQtd += 1;
      }
    });

    return {
      valorTotalVendas,
      totalComissoesGeral,
      comissoesPagasValor,
      comissoesPagasQtd,
      comissoesPendentesValor,
      comissoesPendentesQtd,
      totalItens: vendasFiltradas.length
    };
  }, [vendasFiltradas]);

  // Agrupamento por Saída / Pedido (idSaida)
  const pedidosAgrupados = useMemo(() => {
    const grupos: Record<string, {
      idSaida: string;
      data: string;
      vendedor: string;
      clienteInfluenciador: string;
      contato: string;
      tipoSaida: string;
      statusComissao: string;
      valorTotal: number;
      comissaoTotal: number;
      itens: Venda[];
    }> = {};

    vendasFiltradas.forEach(item => {
      const chave = item.idSaida || item.id;
      if (!grupos[chave]) {
        grupos[chave] = {
          idSaida: chave,
          data: item.data,
          vendedor: item.vendedor,
          clienteInfluenciador: item.clienteInfluenciador || 'Consumidor Final',
          contato: item.contato || '',
          tipoSaida: item.tipoSaida,
          statusComissao: item.statusComissao || 'Pendente',
          valorTotal: 0,
          comissaoTotal: 0,
          itens: []
        };
      }
      grupos[chave].valorTotal += (item.precoVenda || 0);
      grupos[chave].comissaoTotal += (item.comissao || 0);
      grupos[chave].itens.push(item);
    });

    return Object.values(grupos).sort((a, b) => b.data.localeCompare(a.data));
  }, [vendasFiltradas]);

  // Alterar Status em Lote ou Individual
  const handleAlterarStatus = async (ids: string[], novoStatus: string) => {
    if (ids.length === 0) return;
    setAtualizandoStatus(true);
    try {
      const res = await atualizarStatusComissaoVendaApi(ids, novoStatus);
      if (res.success) {
        mostrarToast('success', res.message);
        setItensSelecionados([]);
        onRefresh();
      } else {
        mostrarToast('error', res.message);
      }
    } catch (err: any) {
      mostrarToast('error', `Erro ao atualizar status: ${err.message || err}`);
    } finally {
      setAtualizandoStatus(false);
    }
  };

  // Toggle Seleção de Item/Pedido
  const toggleSelecao = (id: string) => {
    setItensSelecionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodos = () => {
    if (itensSelecionados.length === pedidosAgrupados.length) {
      setItensSelecionados([]);
    } else {
      setItensSelecionados(pedidosAgrupados.map(p => p.idSaida));
    }
  };

  // -------------------------------------------------------------
  // GERAR E ABRIR RELATÓRIO PDF EM NOVA ABA / JANELA DO NAVEGADOR
  // -------------------------------------------------------------
  const handleExportarPDF = () => {
    if (vendasFiltradas.length === 0) {
      alert('Não há registros para exportar com os filtros selecionados.');
      return;
    }

    const reportWin = window.open('', '_blank');
    if (!reportWin) {
      alert('O seu navegador bloqueou a abertura de nova janela. Por favor, permita pop-ups para este site.');
      return;
    }

    // Texto descritivo do período do relatório
    let descricaoPeriodo = '';
    if (modoFiltro === 'mes_ano') {
      const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const mesNome = mesFiltro === 'TODOS' ? 'Todos os Meses' : nomesMeses[Number(mesFiltro) - 1];
      descricaoPeriodo = `${mesNome} / ${anoFiltro}`;
    } else {
      descricaoPeriodo = `De ${formatarDataBR(dataInicial)} até ${formatarDataBR(dataFinal)}`;
    }

    const vendedorNomeRelatorio = vendedorFiltro === 'TODOS' ? 'Todos os Vendedores' : vendedorFiltro;
    const dataEmissao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Comissões - OLOR LUZ</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #1e293b;
      background-color: #f8fafc;
      padding: 30px;
      font-size: 12px;
    }

    /* Barra Superior de Ações (Oculta na Impressão) */
    .no-print-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 24px;
      margin: -30px -30px 24px -30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
    }
    .btn-action {
      background: #d97706;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: #b45309;
    }
    .btn-close {
      background: #334155;
      color: #f1f5f9;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    .report-container {
      background: #ffffff;
      padding: 32px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      max-width: 1100px;
      margin: 0 auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }

    /* Cabeçalho Oficial */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #d97706;
      padding-bottom: 18px;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo-img {
      height: 52px;
      width: auto;
      object-fit: contain;
    }
    .title-area h1 {
      font-family: 'Cinzel', serif;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 1.5px;
    }
    .title-area p {
      color: #64748b;
      font-size: 11px;
      margin-top: 2px;
    }

    .meta-box {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f1f5f9;
      padding: 14px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #cbd5e1;
    }
    .meta-item strong {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .meta-item span {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Cards de Resumo */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      padding: 12px 14px;
      border-radius: 8px;
      background: #fafafa;
    }
    .kpi-card.paid { border-left: 4px solid #16a34a; background: #f0fdf4; }
    .kpi-card.pending { border-left: 4px solid #d97706; background: #fffbeb; }
    .kpi-card.total { border-left: 4px solid #0284c7; background: #f0f9ff; }
    .kpi-title { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; }
    .kpi-value { font-size: 16px; font-weight: 800; font-family: monospace; color: #0f172a; margin-top: 4px; }

    /* Tabela do Relatório */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 11px;
    }
    th {
      background: #0f172a;
      color: #f8fafc;
      padding: 9px 10px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) { background-color: #f8fafc; }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 10px;
    }
    .badge-pago { background: #dcfce7; color: #15803d; }
    .badge-pendente { background: #fef3c7; color: #b45309; }
    .badge-cancelado { background: #fee2e2; color: #b91c1c; }

    /* Seção de Assinaturas */
    .signatures {
      margin-top: 50px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      padding-top: 20px;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      text-align: center;
      padding-top: 8px;
      font-size: 11px;
      color: #475569;
    }

    @media print {
      body { background: #ffffff; padding: 0; }
      .no-print-bar { display: none !important; }
      .report-container { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div>
      <strong>OLOR LUZ</strong> — Módulo de Relatórios de Comissões
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn-action" onclick="window.print()">
        🖨️ Imprimir / Salvar como PDF
      </button>
      <button class="btn-close" onclick="window.close()">❌ Fechar</button>
    </div>
  </div>

  <div class="report-container">
    <div class="header">
      <div class="brand">
        <img src="${OFFICIAL_LOGO_URL}" alt="Logo Oficial OLOR LUZ" class="brand-logo-img" />
        <div class="title-area">
          <h1>OLOR LUZ</h1>
          <p>Relatório Consolidado de Comissões e Saídas de Vendas</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 10px; color: #64748b; font-family: monospace;">EMISSÃO: ${dataEmissao}</span>
      </div>
    </div>

    <div class="meta-box">
      <div class="meta-item">
        <strong>Vendedor:</strong>
        <span>${vendedorNomeRelatorio}</span>
      </div>
      <div class="meta-item">
        <strong>Período:</strong>
        <span>${descricaoPeriodo}</span>
      </div>
      <div class="meta-item">
        <strong>Filtro Status:</strong>
        <span>${statusFiltro === 'TODOS' ? 'Todos os Status' : statusFiltro}</span>
      </div>
      <div class="meta-item">
        <strong>Total de Registros:</strong>
        <span>${vendasFiltradas.length} item(ns)</span>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card total">
        <div class="kpi-title">Total Vendas/Saídas</div>
        <div class="kpi-value">${formatarMoeda(totaisKPI.valorTotalVendas)}</div>
      </div>
      <div class="kpi-card paid">
        <div class="kpi-title">Comissões Pagas</div>
        <div class="kpi-value" style="color: #15803d;">${formatarMoeda(totaisKPI.comissoesPagasValor)}</div>
      </div>
      <div class="kpi-card pending">
        <div class="kpi-title">Comissões Pendentes</div>
        <div class="kpi-value" style="color: #b45309;">${formatarMoeda(totaisKPI.comissoesPendentesValor)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total de Comissões</div>
        <div class="kpi-value">${formatarMoeda(totaisKPI.totalComissoesGeral)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>ID Saída</th>
          <th>Vendedor</th>
          <th>Cliente / Contato</th>
          <th>Produto / Embalagem</th>
          <th>Qtd</th>
          <th style="text-align: right;">Valor Venda</th>
          <th style="text-align: right;">Comissão</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${vendasFiltradas.map(v => {
          const isPago = v.statusComissao === 'Pago';
          const isCancel = v.statusComissao === 'Cancelado';
          const badgeClass = isPago ? 'badge-pago' : isCancel ? 'badge-cancelado' : 'badge-pendente';
          const statusTxt = isPago ? 'PAGO' : isCancel ? 'CANCELADO' : 'PENDENTE';

          return `
            <tr>
              <td>${formatarDataBR(v.data)}</td>
              <td><strong>${v.idSaida || v.id}</strong></td>
              <td>${v.vendedor}</td>
              <td>${v.clienteInfluenciador || 'Consumidor Final'}</td>
              <td>${v.produto} (${v.embalagem})</td>
              <td>${v.quantidade}</td>
              <td style="text-align: right; font-family: monospace;">${formatarMoeda(v.precoVenda)}</td>
              <td style="text-align: right; font-weight: bold; font-family: monospace; color: ${isPago ? '#15803d' : '#b45309'};">
                ${formatarMoeda(v.comissao)}
              </td>
              <td style="text-align: center;">
                <span class="badge ${badgeClass}">${statusTxt}</span>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="signatures">
      <div class="sig-line">
        <strong>${vendedorNomeRelatorio !== 'Todos os Vendedores' ? vendedorNomeRelatorio : 'Assinatura do Vendedor'}</strong><br>
        <span>Vendedor / Representante</span>
      </div>
      <div class="sig-line">
        <strong>Departamento Financeiro</strong><br>
        <span>OLOR LUZ</span>
      </div>
    </div>
  </div>

</body>
</html>
    `;

    reportWin.document.write(htmlContent);
    reportWin.document.close();
  };

  return (
    <div className="space-y-6 relative">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border flex items-center space-x-3 text-xs font-semibold animate-bounce ${
          toast.tipo === 'success' 
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40' 
            : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
        }`}>
          {toast.tipo === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.mensagem}</span>
        </div>
      )}

      {/* PAINEL DE FILTROS SUPERIOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="font-cinzel text-lg font-bold text-amber-200 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Relatórios e Gestão de Comissões
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte comissões a pagar e pagas, filtre por período/vendedor e exporte relatórios em PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportarPDF}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
              title="Gerar e exportar relatório completo em PDF"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Gerar Relatório PDF</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs transition-colors"
              title="Atualizar Dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* LINHA DE FILTROS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          
          {/* 1. VENDEDOR */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Vendedor
            </label>
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              disabled={!isMaster}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400 disabled:opacity-60"
            >
              {isMaster && <option value="TODOS">Todos os Vendedores</option>}
              {vendedoresDisponiveis.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* 2. MODO DE PERÍODO & SELEÇÃO DE MÊS/ANO OU DATAS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Período
              </label>
              
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setModoFiltro('mes_ano')}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${modoFiltro === 'mes_ano' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Mês/Ano
                </button>
                <button
                  type="button"
                  onClick={() => setModoFiltro('periodo')}
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${modoFiltro === 'periodo' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Intervalo
                </button>
              </div>
            </div>

            {modoFiltro === 'mes_ano' ? (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={mesFiltro}
                  onChange={(e) => setMesFiltro(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="TODOS">Todos os Meses</option>
                  <option value="1">Janeiro (01)</option>
                  <option value="2">Fevereiro (02)</option>
                  <option value="3">Março (03)</option>
                  <option value="4">Abril (04)</option>
                  <option value="5">Maio (05)</option>
                  <option value="6">Junho (06)</option>
                  <option value="7">Julho (07)</option>
                  <option value="8">Agosto (08)</option>
                  <option value="9">Setembro (09)</option>
                  <option value="10">Outubro (10)</option>
                  <option value="11">Novembro (11)</option>
                  <option value="12">Dezembro (12)</option>
                </select>

                <select
                  value={anoFiltro}
                  onChange={(e) => setAnoFiltro(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                >
                  <option value="TODOS">Todos Anos</option>
                  {anosDisponiveis.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  title="Data Inicial"
                />
                <input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  title="Data Final"
                />
              </div>
            )}
          </div>

          {/* 3. STATUS DA COMISSÃO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              Status Comissão
            </label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="Pago">🟢 Pago / Quitado</option>
              <option value="Pendente">🟠 A Pagar / Pendente</option>
              <option value="Cancelado">🔴 Cancelado</option>
            </select>
          </div>

          {/* 4. BUSCA POR TEXTO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              Buscar Registro
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nº Pedido, Cliente, Produto..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

        </div>
      </div>

      {/* DASHBOARD DE METRICAS E PAINEL FINANCEIRO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: TOTAL DE COMISSÕES */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total de Comissões</p>
            <p className="text-2xl font-bold font-mono text-amber-300 mt-1">
              {formatarMoeda(totaisKPI.totalComissoesGeral)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{totaisKPI.totalItens} item(ns) de comissão</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: COMISSÕES PAGAS */}
        <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-4 shadow-lg flex items-center justify-between bg-emerald-950/10">
          <div>
            <p className="text-[11px] text-emerald-400/80 font-semibold uppercase tracking-wider">Comissões Pagas</p>
            <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {formatarMoeda(totaisKPI.comissoesPagasValor)}
            </p>
            <p className="text-[10px] text-emerald-500/70 mt-0.5">{totaisKPI.comissoesPagasQtd} item(ns) quitado(s)</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: COMISSÕES A PAGAR / PENDENTES */}
        <div className="bg-slate-900 border border-amber-900/50 rounded-2xl p-4 shadow-lg flex items-center justify-between bg-amber-950/10">
          <div>
            <p className="text-[11px] text-amber-400/80 font-semibold uppercase tracking-wider">A Pagar / Pendentes</p>
            <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {formatarMoeda(totaisKPI.comissoesPendentesValor)}
            </p>
            <p className="text-[10px] text-amber-500/70 mt-0.5">{totaisKPI.comissoesPendentesQtd} item(ns) a pagar</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: TOTAL DE SAÍDAS / VENDAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total de Vendas/Saídas</p>
            <p className="text-2xl font-bold font-mono text-slate-200 mt-1">
              {formatarMoeda(totaisKPI.valorTotalVendas)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{pedidosAgrupados.length} pedido(s) gerado(s)</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* BARRA DE AÇÕES EM LOTE (Apenas Master) */}
      {isMaster && itensSelecionados.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3 px-5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs text-amber-200 font-semibold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span><strong>{itensSelecionados.length}</strong> pedido(s) selecionado(s)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAlterarStatus(itensSelecionados, 'Pago')}
              disabled={atualizandoStatus}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marcar Selecionados como Pago</span>
            </button>

            <button
              onClick={() => handleAlterarStatus(itensSelecionados, 'Pendente')}
              disabled={atualizandoStatus}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Marcar como Pendente</span>
            </button>

            <button
              onClick={() => setItensSelecionados([])}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PAINEL DE CONTEÚDO PRINCIPAL DAS COMISSÕES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-200 text-sm">
              Listagem Detalhada de Comissões ({pedidosAgrupados.length} Pedidos)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isMaster && (
              <button
                onClick={toggleSelecionarTodos}
                className="text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 transition-colors"
              >
                {itensSelecionados.length === pedidosAgrupados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setVisaoAgrupada(true)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${visaoAgrupada ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Por Pedido
              </button>
              <button
                onClick={() => setVisaoAgrupada(false)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${!visaoAgrupada ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Por Itens
              </button>
            </div>
          </div>
        </div>

        {/* VISÃO 1: AGRUPADO POR PEDIDO / SAÍDA */}
        {visaoAgrupada ? (
          <div className="space-y-3">
            {pedidosAgrupados.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-950/50 rounded-2xl border border-dashed border-slate-800">
                <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="text-sm font-semibold">Nenhuma comissão/saída encontrada para os filtros aplicados.</p>
                <p className="text-xs text-slate-600 mt-1">Tente ajustar o período ou selecionar outro vendedor.</p>
              </div>
            ) : (
              pedidosAgrupados.map((pedido) => {
                const isChecked = itensSelecionados.includes(pedido.idSaida);
                const isPago = pedido.statusComissao === 'Pago';
                const isCancelado = pedido.statusComissao === 'Cancelado';

                return (
                  <div
                    key={pedido.idSaida}
                    className={`bg-slate-950/80 border rounded-2xl p-4 transition-all space-y-3 ${
                      isChecked ? 'border-amber-500/60 bg-amber-950/10' : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Linha Superior do Pedido */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                      <div className="flex items-center gap-3">
                        {isMaster && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelecao(pedido.idSaida)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900"
                          />
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-amber-300">
                              {pedido.idSaida}
                            </span>
                            <span className="text-xs text-slate-400">
                              • {formatarDataBR(pedido.data)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-900 border border-slate-800 text-slate-300">
                              {pedido.tipoSaida}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mt-0.5">
                            Cliente: <strong>{pedido.clienteInfluenciador}</strong>
                            {pedido.contato && <span className="text-slate-500 font-normal"> ({pedido.contato})</span>}
                            <span className="text-slate-400"> | Vendedor: <strong className="text-amber-200">{pedido.vendedor}</strong></span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Valor da Comissão</p>
                          <p className={`text-base font-bold font-mono ${isPago ? 'text-emerald-400' : isCancelado ? 'text-rose-400' : 'text-amber-400'}`}>
                            {formatarMoeda(pedido.comissaoTotal)}
                          </p>
                        </div>

                        {/* Dropdown / Badge Status da Comissão */}
                        {isMaster ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={pedido.statusComissao}
                              onChange={(e) => handleAlterarStatus([pedido.idSaida], e.target.value)}
                              disabled={atualizandoStatus}
                              className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer transition-colors ${
                                isPago 
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                                  : isCancelado 
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' 
                                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                              }`}
                            >
                              <option value="Pago" className="bg-slate-900 text-emerald-300">🟢 Pago</option>
                              <option value="Pendente" className="bg-slate-900 text-amber-300">🟠 A Pagar / Pendente</option>
                              <option value="Cancelado" className="bg-slate-900 text-rose-300">🔴 Cancelado</option>
                            </select>
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isPago 
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                              : isCancelado 
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' 
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          }`}>
                            {isPago ? 'PAGO' : isCancelado ? 'CANCELADO' : 'PENDENTE'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subtabela com os itens do Pedido */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/50 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">Produto</th>
                            <th className="py-2 px-3">Embalagem</th>
                            <th className="py-2 px-3 text-center">Qtd</th>
                            <th className="py-2 px-3 text-right">Preço Uni</th>
                            <th className="py-2 px-3 text-right">Valor Venda</th>
                            <th className="py-2 px-3 text-right">Comissão Item</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {pedido.itens.map(item => (
                            <tr key={item.id} className="hover:bg-slate-900/30 text-slate-300">
                              <td className="py-2 px-3 font-medium text-slate-200">{item.produto}</td>
                              <td className="py-2 px-3 text-slate-400">{item.embalagem}</td>
                              <td className="py-2 px-3 text-center font-mono font-semibold">{item.quantidade}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-400">{formatarMoeda(item.precoUni)}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-200">{formatarMoeda(item.precoVenda)}</td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-amber-300">{formatarMoeda(item.comissao)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* VISÃO 2: TABELA ITEM POR ITEM */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Nº Pedido</th>
                  <th className="py-3 px-3">Vendedor</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Produto / Embalagem</th>
                  <th className="py-3 px-3 text-center">Qtd</th>
                  <th className="py-3 px-3 text-right">Valor Venda</th>
                  <th className="py-3 px-3 text-right">Comissão</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {vendasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  vendasFiltradas.map(v => {
                    const isPago = v.statusComissao === 'Pago';
                    const isCancelado = v.statusComissao === 'Cancelado';

                    return (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-300">{formatarDataBR(v.data)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300 whitespace-nowrap">{v.idSaida || v.id}</td>
                        <td className="py-2.5 px-3 text-slate-200 whitespace-nowrap">{v.vendedor}</td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-[160px] truncate">{v.clienteInfluenciador || 'Consumidor Final'}</td>
                        <td className="py-2.5 px-3 text-slate-200 font-medium">{v.produto} <span className="text-slate-400 text-[11px]">({v.embalagem})</span></td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{v.quantidade}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">{formatarMoeda(v.precoVenda)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">{formatarMoeda(v.comissao)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPago 
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                              : isCancelado 
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' 
                              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          }`}>
                            {isPago ? 'PAGO' : isCancelado ? 'CANCELADO' : 'PENDENTE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
