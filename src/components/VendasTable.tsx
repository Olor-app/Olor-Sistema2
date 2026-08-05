import React, { useState, useMemo } from 'react';
import { Venda, ListasSelects, User as UserAccount } from '../types';
import { formatarMoeda, formatarDataBR } from '../utils/calculations';
import { excluirPedidoApi, atualizarPedidoApi, buscarPrecoUnitario, DEFAULT_LISTAS, limparTodasVendasApi } from '../services/api';
import html2pdf from 'html2pdf.js';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertCircle, 
  RefreshCw, 
  Gift, 
  User as UserIcon, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Phone, 
  ShoppingBag,
  Layers,
  Edit,
  Trash2,
  Check,
  X,
  Plus,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface VendasTableProps {
  vendas: Venda[];
  onRefresh: () => void;
  loading: boolean;
  listas?: ListasSelects;
  dadosBrutos?: any[];
  currentUser?: UserAccount | null;
}

interface PedidoAgrupado {
  idSaida: string;
  data: string;
  vendedor: string;
  tipoSaida: string;
  statusComissao: string;
  tabelaPreco?: string;
  obs?: string;
  clienteInfluenciador?: string;
  contato?: string;
  quantidadeTotal: number;
  totalVenda: number;
  totalComissao: number;
  itens: Venda[];
}

export const VendasTable: React.FC<VendasTableProps> = ({ 
  vendas, 
  onRefresh, 
  loading,
  listas = DEFAULT_LISTAS,
  dadosBrutos = [],
  currentUser
}) => {
  const isMaster = !currentUser || currentUser.tipo === 'Master';

  const [busca, setBusca] = useState<string>('');
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('todos');
  const [tipoSaidaFiltro, setTipoSaidaFiltro] = useState<string>('todos');
  const [statusComissaoFiltro, setStatusComissaoFiltro] = useState<string>('todos');

  // Estado para controlar quais pedidos estão expandidos no Accordion
  const [pedidosExpandidos, setPedidosExpandidos] = useState<Set<string>>(new Set());

  // Estado para Edição Inline de Pedido
  const [editandoIdSaida, setEditandoIdSaida] = useState<string | null>(null);
  const [formEdicao, setFormEdicao] = useState<{
    idSaida: string;
    data: string;
    vendedor: string;
    tipoSaida: string;
    tabelaPreco: string;
    statusComissao: string;
    clienteInfluenciador: string;
    contato: string;
    obs: string;
    itens: Venda[];
  } | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState<boolean>(false);

  // Estado para Modal de Exclusão
  const [excluindoIdSaida, setExcluindoIdSaida] = useState<string | null>(null);
  const [processandoExclusao, setProcessandoExclusao] = useState<boolean>(false);

  // Estado para Mensagem Toast
  const [toast, setToast] = useState<{ tipo: 'success' | 'error'; mensagem: string } | null>(null);

  const mostrarToast = (tipo: 'success' | 'error', mensagem: string) => {
    setToast({ tipo, mensagem });
    setTimeout(() => setToast(null), 4000);
  };

  // Listas únicas para os selects dos filtros
  const vendedoresUnicos = Array.from(new Set(vendas.map(v => v.vendedor).filter(Boolean))).sort();
  const tiposSaidaUnicos = Array.from(new Set(vendas.map(v => v.tipoSaida).filter(Boolean))).sort();

  // 1. Filtragem dos registros antes do agrupamento
  const vendasFiltradas = vendas.filter(venda => {
    const matchBusca = 
      !busca ||
      (venda.vendedor && venda.vendedor.toLowerCase().includes(busca.toLowerCase())) ||
      (venda.produto && venda.produto.toLowerCase().includes(busca.toLowerCase())) ||
      (venda.id && venda.id.toLowerCase().includes(busca.toLowerCase())) ||
      (venda.idSaida && venda.idSaida.toLowerCase().includes(busca.toLowerCase())) ||
      (venda.obs && venda.obs.toLowerCase().includes(busca.toLowerCase())) ||
      (venda.clienteInfluenciador && venda.clienteInfluenciador.toLowerCase().includes(busca.toLowerCase())) ||
      (venda.contato && venda.contato.toLowerCase().includes(busca.toLowerCase()));

    let matchVendedor = true;
    if (currentUser && currentUser.tipo === 'Vendedor') {
      matchVendedor = (venda.vendedor || '').trim().toLowerCase() === (currentUser.nome || '').trim().toLowerCase();
    } else {
      matchVendedor = vendedorFiltro === 'todos' || venda.vendedor === vendedorFiltro;
    }

    const matchTipo = tipoSaidaFiltro === 'todos' || venda.tipoSaida === tipoSaidaFiltro;
    const matchStatus =
      statusComissaoFiltro === 'todos' ||
      (statusComissaoFiltro === 'vazio' ? !venda.statusComissao : venda.statusComissao === statusComissaoFiltro);

    return matchBusca && matchVendedor && matchTipo && matchStatus;
  });

  // 2. Agrupamento estrito por idSaida
  const pedidosAgrupados: PedidoAgrupado[] = useMemo(() => {
    const mapa = new Map<string, PedidoAgrupado>();

    vendasFiltradas.forEach((item) => {
      const chave = item.idSaida || item.id || 'sem-id';

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          idSaida: item.idSaida || item.id || 'N/A',
          data: item.data,
          vendedor: item.vendedor || 'Olor Luz',
          tipoSaida: item.tipoSaida || 'Venda',
          statusComissao: item.statusComissao || '',
          tabelaPreco: item.tabelaPreco || 'Site',
          obs: item.obs || '',
          clienteInfluenciador: item.clienteInfluenciador || '',
          contato: item.contato || '',
          quantidadeTotal: 0,
          totalVenda: 0,
          totalComissao: 0,
          itens: [],
        });
      }

      const grupo = mapa.get(chave)!;
      grupo.quantidadeTotal += Number(item.quantidade) || 0;
      grupo.totalVenda += Number(item.precoVenda) || 0;
      grupo.totalComissao += Number(item.comissao) || 0;

      if (!grupo.obs && item.obs) grupo.obs = item.obs;
      if (!grupo.clienteInfluenciador && item.clienteInfluenciador) grupo.clienteInfluenciador = item.clienteInfluenciador;
      if (!grupo.contato && item.contato) grupo.contato = item.contato;
      if ((!grupo.tabelaPreco || grupo.tabelaPreco === 'Site') && item.tabelaPreco) grupo.tabelaPreco = item.tabelaPreco;

      grupo.itens.push(item);
    });

    const listaGrupos = Array.from(mapa.values());
    listaGrupos.forEach((grupo) => {
      const todosVenda = grupo.itens.every(it => (it.tipoSaida || '').trim().toLowerCase() === 'venda');
      const temConsignado = grupo.itens.some(it => (it.tipoSaida || '').trim().toLowerCase() === 'consignado');
      if (todosVenda) {
        grupo.tipoSaida = 'Venda';
      } else if (temConsignado) {
        grupo.tipoSaida = 'Consignado';
      }
    });

    return listaGrupos;
  }, [vendasFiltradas]);

  // Alternar expansão do Accordion
  const toggleExpandir = (idSaida: string) => {
    setPedidosExpandidos(prev => {
      const proximo = new Set(prev);
      if (proximo.has(idSaida)) {
        proximo.delete(idSaida);
      } else {
        proximo.add(idSaida);
      }
      return proximo;
    });
  };

  const toggleExpandirTodos = () => {
    if (pedidosExpandidos.size === pedidosAgrupados.length) {
      setPedidosExpandidos(new Set());
    } else {
      setPedidosExpandidos(new Set(pedidosAgrupados.map(p => p.idSaida)));
    }
  };

  // Cálculo das Métricas Gerais (KPIs)
  const faturamentoTotal = vendasFiltradas.reduce((acc, v) => acc + (v.precoVenda || 0), 0);
  const comissoesTotais = vendasFiltradas.reduce((acc, v) => acc + (v.comissao || 0), 0);
  const totalItens = vendasFiltradas.reduce((acc, v) => acc + (v.quantidade || 0), 0);
  const totalConsignados = vendasFiltradas
    .filter(v => (v.tipoSaida || '').toLowerCase() === 'consignado')
    .reduce((acc, v) => acc + (v.quantidade || 0), 0);

  // --- AÇÃO 1: GERAR PDF DE ALTO PADRÃO (LUXO OLOR LUZ VIA NOVA ABA) ---
  const handleGerarPdf = (pedido: PedidoAgrupado) => {
    const win = window.open('', '_blank');
    if (!win) {
      mostrarToast('error', 'Não foi possível abrir a nova aba. Verifique as permissões de pop-up no seu navegador.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido ${pedido.idSaida} - Olor Luz</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #1A1715;
      color: #2B2623;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .top-bar {
      background-color: #26211D;
      border-bottom: 1px solid #3D352E;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .top-bar-title {
      color: #C5A059;
      font-family: Georgia, serif;
      font-size: 15px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    .top-bar-subtitle {
      color: #9C8255;
      font-size: 11px;
      margin-left: 8px;
    }
    .btn-export {
      background: linear-gradient(135deg, #C5A059 0%, #A8833E 100%);
      color: #FFFFFF;
      border: none;
      padding: 10px 22px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(197, 160, 89, 0.3);
      transition: all 0.2s ease;
    }
    .btn-export:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(197, 160, 89, 0.4);
    }
    .btn-close {
      background-color: rgba(255,255,255,0.05);
      color: #AAA;
      border: 1px solid #444;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-close:hover { color: #FFF; border-color: #777; }

    .page-wrapper {
      padding: 30px 20px;
      display: flex;
      justify-content: center;
    }

    .invoice-card {
      background-color: #FAF8F5;
      width: 100%;
      max-width: 800px;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #E8E2D9;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    }

    @media print {
      .no-print { display: none !important; }
      body { background-color: #FFFFFF !important; }
      .page-wrapper { padding: 0 !important; }
      .invoice-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        background-color: #FFFFFF !important;
      }
    }
  </style>
</head>
<body>
  <div class="top-bar no-print">
    <div>
      <span class="top-bar-title">OLOR LUZ</span>
      <span class="top-bar-subtitle">Comprovante do Pedido #${pedido.idSaida}</span>
    </div>
    <div style="display: flex; gap: 12px; align-items: center;">
      <button class="btn-export" onclick="exportarPdf()">
        📄 Exportar em PDF / Imprimir
      </button>
      <button class="btn-close" onclick="window.close()">✕ Fechar</button>
    </div>
  </div>

  <div class="page-wrapper">
    <div id="comprovante" class="invoice-card">
      
      <!-- CABEÇALHO SOFISTICADO OLOR LUZ -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #C5A059; padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <h1 style="font-family: Georgia, serif; color: #7A5C22; font-size: 28px; margin: 0; letter-spacing: 3px; font-weight: bold; text-transform: uppercase;">OLOR LUZ</h1>
          <p style="color: #9C8255; font-size: 11px; margin: 4px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase;">Aromas & Experiências Olfativas</p>
        </div>
        <div style="text-align: right;">
          <span style="background-color: #C5A059; color: #FFFFFF; font-size: 10px; font-weight: bold; padding: 5px 12px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">COMPROVANTE DE PEDIDO</span>
          <p style="font-family: monospace; font-size: 15px; font-weight: bold; color: #2B2623; margin: 8px 0 0 0;">#${pedido.idSaida}</p>
          <p style="font-size: 11px; color: #776E65; margin: 2px 0 0 0;">Data: ${formatarDataBR(pedido.data)}</p>
        </div>
      </div>

      <!-- BLOCOS DE DADOS DO CLIENTE E OPERAÇÃO -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background-color: #FFFFFF; padding: 18px; border-radius: 8px; border: 1px solid #EFEAE3; margin-bottom: 24px;">
        <div>
          <p style="font-size: 10px; font-weight: bold; color: #9C8255; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">INFORMAÇÕES DO CLIENTE</p>
          <p style="font-size: 13px; font-weight: bold; color: #2B2623; margin: 0;">${pedido.clienteInfluenciador || 'Cliente não informado'}</p>
          <p style="font-size: 11px; color: #554E48; margin: 4px 0 0 0;">Contato: <strong>${pedido.contato || 'Não informado'}</strong></p>
        </div>
        <div>
          <p style="font-size: 10px; font-weight: bold; color: #9C8255; text-transform: uppercase; margin: 0 0 6px 0; letter-spacing: 0.5px;">DADOS DO ATENDIMENTO</p>
          <p style="font-size: 12px; color: #2B2623; margin: 0;">Vendedor: <strong>${pedido.vendedor}</strong></p>
          <p style="font-size: 11px; color: #554E48; margin: 4px 0 0 0;">Tipo de Saída: <strong>${pedido.tipoSaida}</strong> | Tabela: <strong>${pedido.tabelaPreco || 'Site'}</strong></p>
        </div>
      </div>

      <!-- TABELA DE ITENS DO PEDIDO -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #F3ECE1; border-bottom: 1.5px solid #C5A059; text-align: left; font-size: 10px; text-transform: uppercase; color: #614C23; letter-spacing: 0.5px;">
            <th style="padding: 10px 12px; width: 40%;">PRODUTO</th>
            <th style="padding: 10px 12px;">EMBALAGEM</th>
            <th style="padding: 10px 12px; text-align: center;">QTD</th>
            <th style="padding: 10px 12px; text-align: right;">PREÇO UNI</th>
            <th style="padding: 10px 12px; text-align: right;">AJUSTE</th>
            <th style="padding: 10px 12px; text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${pedido.itens.map(item => `
            <tr style="border-bottom: 1px solid #EFEAE3; font-size: 12px; color: #3A332E;">
              <td style="padding: 10px 12px; font-weight: 600;">${item.produto}</td>
              <td style="padding: 10px 12px; color: #665E56;">${item.embalagem}</td>
              <td style="padding: 10px 12px; text-align: center; font-weight: bold;">${item.quantidade}</td>
              <td style="padding: 10px 12px; text-align: right; font-family: monospace;">${formatarMoeda(item.precoUni)}</td>
              <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: ${item.modificador < 0 ? '#C0392B' : item.modificador > 0 ? '#27AE60' : '#888'};">
                ${item.modificador !== 0 ? formatarMoeda(item.modificador) : '-'}
              </td>
              <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: bold; color: #7A5C22;">${formatarMoeda(item.precoVenda)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- RESUMO DE TOTAIS E OBSERVAÇÕES -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
        <div style="flex: 1; background-color: #FFFFFF; padding: 14px; border-radius: 8px; border: 1px solid #EFEAE3; font-size: 11px; color: #554E48;">
          <strong style="color: #9C8255; text-transform: uppercase; font-size: 9.5px; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">Observações do Pedido:</strong>
          ${pedido.obs ? `"${pedido.obs}"` : 'Sem observações registradas.'}
        </div>

        <div style="width: 250px; background-color: #F8F4EE; padding: 16px; border-radius: 8px; border: 1px solid #D8C8B0; text-align: right;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #665E56; margin-bottom: 6px;">
            <span>Qtd Total de Itens:</span>
            <strong style="color: #2B2623;">${pedido.quantidadeTotal} un</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; color: #7A5C22; border-top: 1.5px solid #D8C8B0; padding-top: 10px; margin-top: 6px;">
            <span>VALOR TOTAL:</span>
            <span>${formatarMoeda(pedido.totalVenda)}</span>
          </div>
        </div>
      </div>

      <!-- RODAPÉ -->
      <div style="margin-top: 36px; border-top: 1px solid #E8E2D9; padding-top: 16px; text-align: center; font-size: 10px; color: #9C8255; letter-spacing: 0.5px;">
        SIG Olor Luz — Comprovante do Sistema Oficial de Gestão
      </div>

    </div>
  </div>

  <script>
    function exportarPdf() {
      const btn = document.querySelector('.btn-export');
      if (btn) btn.innerText = '⌛ Gerando PDF...';

      if (typeof html2pdf !== 'undefined') {
        const element = document.getElementById('comprovante');
        const opt = {
          margin: 10,
          filename: 'Pedido_OlorLuz_${pedido.idSaida}.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save().then(function() {
          if (btn) btn.innerText = '📄 Exportar em PDF / Imprimir';
        }).catch(function(err) {
          console.warn('Fallback para janela de impressão nativa:', err);
          window.print();
          if (btn) btn.innerText = '📄 Exportar em PDF / Imprimir';
        });
      } else {
        window.print();
        if (btn) btn.innerText = '📄 Exportar em PDF / Imprimir';
      }
    }
  </script>
</body>
</html>`;

    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
    mostrarToast('success', `Pedido #${pedido.idSaida} aberto em nova aba para exportação!`);
  };

  // --- AÇÃO 2: EDICÃO INLINE DE PEDIDO ---
  const handleIniciarEdicao = (pedido: PedidoAgrupado) => {
    // Abre a aba do accordion
    setPedidosExpandidos(prev => new Set(prev).add(pedido.idSaida));
    setEditandoIdSaida(pedido.idSaida);

    // Clona os itens do pedido preservando tipoSaida de cada item
    const itensClonados: Venda[] = pedido.itens.map(item => ({
      ...item,
      tipoSaida: item.tipoSaida || pedido.tipoSaida
    }));

    setFormEdicao({
      idSaida: pedido.idSaida,
      data: pedido.data,
      vendedor: pedido.vendedor || (listas.vendedores[0] || 'Olor Luz'),
      tipoSaida: pedido.tipoSaida || (listas.tiposSaida[0] || 'Venda'),
      tabelaPreco: pedido.tabelaPreco || (listas.tabelasPreco[0] || 'Site'),
      statusComissao: pedido.statusComissao || (listas.statusComissao[0] || 'Pendente'),
      clienteInfluenciador: pedido.clienteInfluenciador || '',
      contato: pedido.contato || '',
      obs: pedido.obs || '',
      itens: itensClonados
    });
  };

  const handleCancelarEdicao = () => {
    setEditandoIdSaida(null);
    setFormEdicao(null);
  };

  // --- CONVERTER PEDIDO INTEIRO DE CONSIGNADO PARA VENDA ---
  const handleConverterPedidoEmVenda = async (pedido: PedidoAgrupado) => {
    try {
      const tabPreco = pedido.tabelaPreco && pedido.tabelaPreco !== 'Consignado' ? pedido.tabelaPreco : 'Venda Direta';
      const isOlorLuz = (pedido.vendedor || '').trim().toLowerCase() === 'olor luz';

      const novosItens: Venda[] = pedido.itens.map(item => {
        const emb = item.embalagem;
        const precoUniBuscado = buscarPrecoUnitario(emb, tabPreco, dadosBrutos);
        const quantidade = Number(item.quantidade) || 1;
        const modificador = Number(item.modificador) || 0;

        const precoUni = precoUniBuscado;
        const subtotalBruto = precoUni * quantidade;
        const precoVenda = Math.max(0, subtotalBruto + modificador);
        const comissao = isOlorLuz ? 0 : Number(((subtotalBruto * 0.12) + modificador).toFixed(2));

        return {
          ...item,
          tipoSaida: 'Venda',
          tabelaPreco: tabPreco,
          precoUni,
          precoVenda,
          comissao
        };
      });

      const res = await atualizarPedidoApi(pedido.idSaida, novosItens);
      if (res.success) {
        mostrarToast('success', `Pedido ${pedido.idSaida} convertido com sucesso em Venda!`);
        onRefresh();
      } else {
        mostrarToast('error', res.message);
      }
    } catch (err: any) {
      mostrarToast('error', `Erro ao converter pedido: ${err.message || err}`);
    }
  };

  // --- CONVERTER ITEM ESPECÍFICO DE CONSIGNADO PARA VENDA ---
  const handleConverterItemEmVenda = async (pedido: PedidoAgrupado, indexItem: number) => {
    try {
      const tabPreco = pedido.tabelaPreco && pedido.tabelaPreco !== 'Consignado' ? pedido.tabelaPreco : 'Venda Direta';
      const isOlorLuz = (pedido.vendedor || '').trim().toLowerCase() === 'olor luz';

      const novosItens = pedido.itens.map((item, idx) => {
        if (idx !== indexItem) return item;

        const emb = item.embalagem;
        const precoUniBuscado = buscarPrecoUnitario(emb, tabPreco, dadosBrutos);
        const quantidade = Number(item.quantidade) || 1;
        const modificador = Number(item.modificador) || 0;

        const precoUni = precoUniBuscado;
        const subtotalBruto = precoUni * quantidade;
        const precoVenda = Math.max(0, subtotalBruto + modificador);
        const comissao = isOlorLuz ? 0 : Number(((subtotalBruto * 0.12) + modificador).toFixed(2));

        return {
          ...item,
          tipoSaida: 'Venda',
          tabelaPreco: tabPreco,
          precoUni,
          precoVenda,
          comissao
        };
      });

      // Se todos os itens se tornaram Venda, ajusta o tipo geral para Venda
      const todosVenda = novosItens.every(it => (it.tipoSaida || '').toLowerCase() === 'venda');
      if (todosVenda) {
        novosItens.forEach(it => { it.tipoSaida = 'Venda'; });
      }

      const res = await atualizarPedidoApi(pedido.idSaida, novosItens);
      if (res.success) {
        mostrarToast('success', `Item #${indexItem + 1} do pedido ${pedido.idSaida} convertido em Venda!`);
        onRefresh();
      } else {
        mostrarToast('error', res.message);
      }
    } catch (err: any) {
      mostrarToast('error', `Erro ao converter item: ${err.message || err}`);
    }
  };

  // Recálculo automático de Preço Uni, Preço Venda e Comissão para um item do formulário de edição
  const recalculareAtualizarItemForm = (
    indexItem: number,
    campo: keyof Venda,
    valor: any,
    novoFormHeader?: Partial<typeof formEdicao>
  ) => {
    if (!formEdicao) return;

    const formAtualizado = novoFormHeader ? { ...formEdicao, ...novoFormHeader } : { ...formEdicao };
    const novosItens = [...formAtualizado.itens];
    const itemAtual = { ...novosItens[indexItem], [campo]: valor };

    const tabPreco = formAtualizado.tabelaPreco;
    const vendedor = formAtualizado.vendedor;
    const isOlorLuz = (vendedor || '').trim().toLowerCase() === 'olor luz';

    // Determina o tipo de saída específico deste item
    const itemTipo = itemAtual.tipoSaida || formAtualizado.tipoSaida || 'Venda';
    const isVendaItem = (itemTipo || '').trim().toLowerCase() === 'venda';

    const emb = itemAtual.embalagem;
    const precoUniBuscado = buscarPrecoUnitario(emb, tabPreco, dadosBrutos);

    const quantidade = typeof itemAtual.quantidade === 'string'
      ? (parseFloat(itemAtual.quantidade) || 0)
      : (Number(itemAtual.quantidade) || 0);

    const modStr = String(itemAtual.modificador ?? '').replace(',', '.');
    const modificador = parseFloat(modStr) || 0;

    let precoUni = 0;
    let precoVenda = 0;
    let comissao = 0;

    if (isVendaItem) {
      precoUni = precoUniBuscado;
      const subtotalBruto = precoUni * quantidade;
      precoVenda = Math.max(0, subtotalBruto + modificador);
      comissao = isOlorLuz ? 0 : Number(((subtotalBruto * 0.12) + modificador).toFixed(2));
    } else {
      // Consignado, Amostra Grátis, Mostruário, Bonificação: valor financeiro zero
      precoUni = 0;
      precoVenda = 0;
      comissao = 0;
    }

    itemAtual.tipoSaida = itemTipo;
    itemAtual.precoUni = precoUni;
    itemAtual.precoVenda = precoVenda;
    itemAtual.comissao = comissao;
    itemAtual.vendedor = vendedor;
    itemAtual.tabelaPreco = tabPreco;
    itemAtual.statusComissao = isOlorLuz ? '' : formAtualizado.statusComissao;
    itemAtual.data = formAtualizado.data;
    itemAtual.clienteInfluenciador = formAtualizado.clienteInfluenciador;
    itemAtual.contato = formAtualizado.contato;
    itemAtual.obs = formAtualizado.obs;

    novosItens[indexItem] = itemAtual;

    // Regra: Se TODOS os itens do pedido se tornaram "Venda", a saída como um todo vira "Venda"
    // Se ainda houver algum item "Consignado", permanece como "Consignado"
    const todosItensVenda = novosItens.every(it => (it.tipoSaida || '').trim().toLowerCase() === 'venda');
    const temItemConsignado = novosItens.some(it => (it.tipoSaida || '').trim().toLowerCase() === 'consignado');

    let novoTipoHeader = formAtualizado.tipoSaida;
    if (todosItensVenda) {
      novoTipoHeader = 'Venda';
    } else if (temItemConsignado) {
      novoTipoHeader = 'Consignado';
    }

    setFormEdicao({
      ...formAtualizado,
      tipoSaida: novoTipoHeader,
      itens: novosItens
    });
  };

  // Recalcular todos os itens quando altera um campo do cabeçalho
  const handleHeaderFormChange = (campoHeader: string, valorHeader: string) => {
    if (!formEdicao) return;

    const headerAtualizado = { ...formEdicao, [campoHeader]: valorHeader };
    const novoTipoHeader = headerAtualizado.tipoSaida;

    const itensRecalculados = headerAtualizado.itens.map(item => {
      const tabPreco = headerAtualizado.tabelaPreco;
      const vendedor = headerAtualizado.vendedor;
      const isOlorLuz = (vendedor || '').trim().toLowerCase() === 'olor luz';

      // Se alterou o tipoSaida do cabeçalho, propaga para todos os itens
      const itemTipo = campoHeader === 'tipoSaida' ? valorHeader : (item.tipoSaida || novoTipoHeader);
      const isVendaItem = (itemTipo || '').trim().toLowerCase() === 'venda';

      const precoUniBuscado = buscarPrecoUnitario(item.embalagem, tabPreco, dadosBrutos);
      const quantidade = typeof item.quantidade === 'string'
        ? (parseFloat(item.quantidade) || 0)
        : (Number(item.quantidade) || 0);

      const modStr = String(item.modificador ?? '').replace(',', '.');
      const modificador = parseFloat(modStr) || 0;

      let precoUni = 0;
      let precoVenda = 0;
      let comissao = 0;

      if (isVendaItem) {
        precoUni = precoUniBuscado;
        const subtotalBruto = precoUni * quantidade;
        precoVenda = Math.max(0, subtotalBruto + modificador);
        comissao = isOlorLuz ? 0 : Number(((subtotalBruto * 0.12) + modificador).toFixed(2));
      } else {
        precoUni = 0;
        precoVenda = 0;
        comissao = 0;
      }

      return {
        ...item,
        data: headerAtualizado.data,
        vendedor: vendedor,
        tipoSaida: itemTipo,
        tabelaPreco: tabPreco,
        statusComissao: isOlorLuz ? '' : headerAtualizado.statusComissao,
        clienteInfluenciador: headerAtualizado.clienteInfluenciador,
        contato: headerAtualizado.contato,
        obs: headerAtualizado.obs,
        precoUni: precoUni,
        precoVenda: precoVenda,
        comissao: comissao
      };
    });

    setFormEdicao({
      ...headerAtualizado,
      itens: itensRecalculados
    });
  };

  const handleAdicionarItemForm = () => {
    if (!formEdicao) return;
    const prodPadrao = listas.produtos[0] || 'Essência Olor Luz';
    const embPadrao = listas.embalagens[0] || '10ml';
    const precoUniCalc = buscarPrecoUnitario(embPadrao, formEdicao.tabelaPreco, dadosBrutos);
    const itemTipo = formEdicao.tipoSaida || 'Venda';
    const isVenda = itemTipo.toLowerCase() === 'venda';

    const dataObj = new Date(formEdicao.data + 'T12:00:00');
    const precoUni = isVenda ? precoUniCalc : 0;
    const precoVenda = isVenda ? precoUniCalc : 0;
    const comissao = (isVenda && formEdicao.vendedor.toLowerCase() !== 'olor luz') ? Number((precoUniCalc * 0.12).toFixed(2)) : 0;

    const novoItem: Venda = {
      id: `VEN-${dataObj.getFullYear()}${("0" + (dataObj.getMonth() + 1)).slice(-2)}${("0" + dataObj.getDate()).slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`,
      data: formEdicao.data,
      idSaida: formEdicao.idSaida,
      vendedor: formEdicao.vendedor,
      tabelaPreco: formEdicao.tabelaPreco,
      tipoSaida: itemTipo,
      produto: prodPadrao,
      embalagem: embPadrao,
      quantidade: 1,
      modificador: 0,
      precoUni: precoUni,
      precoVenda: precoVenda,
      comissao: comissao,
      statusComissao: formEdicao.statusComissao,
      dia: dataObj.getDate(),
      mes: dataObj.getMonth() + 1,
      ano: dataObj.getFullYear(),
      obs: formEdicao.obs,
      clienteInfluenciador: formEdicao.clienteInfluenciador,
      contato: formEdicao.contato
    };

    setFormEdicao({
      ...formEdicao,
      itens: [...formEdicao.itens, novoItem]
    });
  };

  const handleRemoverItemForm = (index: number) => {
    if (!formEdicao || formEdicao.itens.length <= 1) return;
    const novosItens = formEdicao.itens.filter((_, idx) => idx !== index);
    setFormEdicao({ ...formEdicao, itens: novosItens });
  };

  const handleSalvarEdicao = async () => {
    if (!formEdicao) return;
    setSalvandoEdicao(true);

    try {
      // Normalizar os itens para garantir que quantidade e modificador sejam números válidos ao enviar para a API
      const itensNormalizados: Venda[] = formEdicao.itens.map(item => {
        const qtdNum = Math.max(1, parseInt(String(item.quantidade), 10) || 1);
        const modNum = parseFloat(String(item.modificador ?? 0).replace(',', '.')) || 0;
        return {
          ...item,
          quantidade: qtdNum,
          modificador: modNum
        };
      });

      const res = await atualizarPedidoApi(formEdicao.idSaida, itensNormalizados);
      if (res.success) {
        mostrarToast('success', res.message);
        setEditandoIdSaida(null);
        setFormEdicao(null);
        onRefresh();
      } else {
        mostrarToast('error', res.message);
      }
    } catch (err: any) {
      mostrarToast('error', `Erro ao salvar alterações: ${err.message || err}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // --- AÇÃO 3: EXCLUSÃO DE PEDIDO ---
  const handleConfirmarExclusao = async () => {
    if (!excluindoIdSaida) return;
    setProcessandoExclusao(true);

    try {
      const res = await excluirPedidoApi(excluindoIdSaida);
      if (res.success) {
        mostrarToast('success', res.message);
        setExcluindoIdSaida(null);
        onRefresh();
      } else {
        mostrarToast('error', res.message);
      }
    } catch (err: any) {
      mostrarToast('error', `Falha ao excluir pedido: ${err.message || err}`);
    } finally {
      setProcessandoExclusao(false);
    }
  };

  const [zerandoBanco, setZerandoBanco] = useState(false);

  const handleZerarBancoVendas = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Tem certeza que deseja APAGAR TODOS os registros de vendas/saídas do banco de dados (BD_Vendas)? Esta ação zerará toda a base de dados e não poderá ser desfeita.')) {
      return;
    }

    setZerandoBanco(true);
    try {
      const res = await limparTodasVendasApi();
      if (res.success) {
        mostrarToast('success', res.message);
        onRefresh();
      } else {
        mostrarToast('error', res.message);
      }
    } catch (err: any) {
      mostrarToast('error', `Erro ao zerar banco de vendas: ${err.message || err}`);
    } finally {
      setZerandoBanco(false);
    }
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
          {toast.tipo === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.mensagem}</span>
        </div>
      )}
      
      {/* Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total de Vendas</p>
            <p className="text-xl font-bold font-mono text-amber-300 mt-1">
              {formatarMoeda(faturamentoTotal)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{pedidosAgrupados.length} pedido(s) agrupado(s)</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total de Comissões</p>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {formatarMoeda(comissoesTotais)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Calculadas no repasse de 12%</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Unidades Vendidas</p>
            <p className="text-xl font-bold font-mono text-sky-400 mt-1">
              {totalItens} un
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{vendasFiltradas.length} item(ns) de produto</p>
          </div>
          <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Qtd Consignada</p>
            <p className="text-xl font-bold font-mono text-purple-400 mt-1">
              {totalConsignados} un
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Comissão fixa R$ 0,00</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Painel de Filtros e Busca */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
        
        {/* Barra de Busca */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por ID Saída, vendedor, produto, cliente ou OBS..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          
          {currentUser && currentUser.tipo === 'Vendedor' ? (
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-semibold">
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Vendedor: {currentUser.nome}</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 ml-1">Fixo</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={vendedorFiltro}
                onChange={(e) => setVendedorFiltro(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none"
              >
                <option value="todos" className="bg-slate-900">Todos os Vendedores</option>
                {vendedoresUnicos.map(v => (
                  <option key={v} value={v} className="bg-slate-900">{v}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
            <select
              value={tipoSaidaFiltro}
              onChange={(e) => setTipoSaidaFiltro(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none"
            >
              <option value="todos" className="bg-slate-900">Todos Tipos Saída</option>
              {tiposSaidaUnicos.map(ts => (
                <option key={ts} value={ts} className="bg-slate-900">{ts}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5">
            <select
              value={statusComissaoFiltro}
              onChange={(e) => setStatusComissaoFiltro(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none"
            >
              <option value="todos" className="bg-slate-900">Status Comissão: Todos</option>
              <option value="Pago" className="bg-slate-900">Pago</option>
              <option value="Não Pago" className="bg-slate-900">Não Pago</option>
              <option value="Pendente" className="bg-slate-900">Pendente</option>
              <option value="vazio" className="bg-slate-900">Sem Comissão (Vazio)</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Atualizar dados do sistema"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {isMaster && (
            <button
              onClick={handleZerarBancoVendas}
              disabled={zerandoBanco || loading}
              className="p-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 rounded-xl text-rose-300 hover:text-rose-200 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Apagar TODOS os registros do BD_Vendas (Zerar Banco)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Zerar BD_Vendas</span>
            </button>
          )}

        </div>
      </div>

      {/* Tabela de Pedidos Agrupados (Accordion) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Registros da Aba BD_Vendas (Pedidos Agrupados)</span>
            <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-0.5 rounded-full font-mono">
              {pedidosAgrupados.length} pedido(s)
            </span>
          </h3>

          {pedidosAgrupados.length > 0 && (
            <button
              onClick={toggleExpandirTodos}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-slate-950 border border-slate-800 hover:border-amber-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              {pedidosExpandidos.size === pedidosAgrupados.length ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Recolher Todos</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expandir Todos</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* VISUALIZAÇÃO EM CARDS PARA MOBILE (Aparece apenas em telas pequenas < lg) */}
        <div className="lg:hidden divide-y divide-slate-800">
          {pedidosAgrupados.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum pedido encontrado para os filtros selecionados.
            </div>
          ) : (
            pedidosAgrupados.map((pedido) => {
              const isExpandido = pedidosExpandidos.has(pedido.idSaida);
              const isEmEdicao = editandoIdSaida === pedido.idSaida;
              const isConsignado = (pedido.tipoSaida || '').toLowerCase() === 'consignado';
              const isAmostra = (pedido.tipoSaida || '').toLowerCase().includes('amostra');
              const isOutraSaida = (pedido.tipoSaida || '').toLowerCase() !== 'venda' && !isConsignado && !isAmostra;

              return (
                <div key={`mobile-${pedido.idSaida}`} className="p-4 space-y-3 bg-slate-900/80 hover:bg-slate-900 transition-colors">
                  
                  {/* Cabeçalho do Card Mobile */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-bold text-slate-100 text-sm">{formatarDataBR(pedido.data)}</span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate">
                        #{pedido.idSaida}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      pedido.statusComissao === 'Pago'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : pedido.statusComissao === 'Não Pago' || pedido.statusComissao === 'Não pago'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : pedido.statusComissao === 'Pendente'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 font-normal'
                    }`}>
                      {pedido.statusComissao || 'Sem comissão'}
                    </span>
                  </div>

                  {/* Informações do Vendedor e Tipo de Saída */}
                  <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                      <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{pedido.vendedor}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isConsignado
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : isAmostra
                        ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                        : isOutraSaida
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {pedido.tipoSaida}
                    </span>
                  </div>

                  {/* Métricas Principais (Valores e Peças) */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Itens / Qtd</span>
                      <span className="text-xs font-bold text-slate-200">{pedido.quantidadeTotal} un</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-400/80 block uppercase">Total Venda</span>
                      <span className="text-xs font-bold text-amber-300">{formatarMoeda(pedido.totalVenda)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400/80 block uppercase">Comissão</span>
                      <span className="text-xs font-bold text-emerald-400">{formatarMoeda(pedido.totalComissao)}</span>
                    </div>
                  </div>

                  {/* Barra de Ações Rápidas Mobile (Touch Target Ampliado > 44px) */}
                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => toggleExpandir(pedido.idSaida)}
                      className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      {isExpandido ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
                      <span>{isExpandido ? 'Ocultar Itens' : `Ver ${pedido.itens.length} item(ns)`}</span>
                    </button>

                    {(isConsignado || pedido.itens.some(it => (it.tipoSaida || '').toLowerCase() === 'consignado')) && (
                      <button
                        onClick={() => handleConverterPedidoEmVenda(pedido)}
                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 min-h-[44px]"
                        title="Tornar toda esta saída consignada em Venda faturada"
                      >
                        <ShoppingBag className="w-4 h-4 text-slate-950" />
                        <span>Tornar Venda</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleGerarPdf(pedido)}
                      className="p-2.5 bg-slate-950 hover:bg-amber-500/20 text-amber-400 border border-slate-800 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Gerar PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    {isMaster && (
                      <button
                        onClick={() => handleIniciarEdicao(pedido)}
                        className={`p-2.5 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center ${
                          isEmEdicao
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-950 hover:bg-sky-500/20 text-sky-400 border-slate-800'
                        }`}
                        title="Editar Pedido"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {isMaster && (
                      <button
                        onClick={() => setExcluindoIdSaida(pedido.idSaida)}
                        className="p-2.5 bg-slate-950 hover:bg-rose-500/20 text-rose-400 border border-slate-800 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Excluir Pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Sub-lista Expandida Mobile se aberto */}
                  {isExpandido && !isEmEdicao && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 mt-2 animate-fadeIn text-xs">
                      <p className="font-bold text-amber-300 text-[11px] uppercase tracking-wider font-mono">
                        Produtos do Pedido #{pedido.idSaida}
                      </p>
                      <div className="divide-y divide-slate-800/80">
                        {pedido.itens.map((item, idx) => {
                          const isVendaItem = (item.tipoSaida || pedido.tipoSaida || '').toLowerCase() === 'venda';
                          return (
                            <div key={item.id || idx} className="py-2.5 space-y-1.5">
                              <div className="flex items-center justify-between font-semibold text-slate-100 gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{item.produto}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isVendaItem
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  }`}>
                                    {item.tipoSaida || pedido.tipoSaida}
                                  </span>
                                </div>
                                <span className="font-mono text-amber-300">{formatarMoeda(item.precoVenda)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                                <span>{item.embalagem} × {item.quantidade} un</span>
                                <span>Uni: {formatarMoeda(item.precoUni)}</span>
                              </div>
                              {!isVendaItem && (
                                <div className="pt-1 flex justify-end">
                                  <button
                                    onClick={() => handleConverterItemEmVenda(pedido, idx)}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-lg shadow flex items-center gap-1.5 transition-all min-h-[38px]"
                                    title="Tornar apenas este item em Venda com faturamento"
                                  >
                                    <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
                                    <span>Tornar este item Venda</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* TABELA DE PEDIDOS PARA DESKTOP (Com Rolagem Horizontal) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider font-mono">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Tipo Saída</th>
                <th className="px-4 py-3 text-right">Quantidade</th>
                <th className="px-4 py-3 text-right">Total da Venda</th>
                <th className="px-4 py-3 text-right">R$ de Comissão</th>
                <th className="px-4 py-3 text-center">Status Comissão</th>
                <th className="px-4 py-3 text-center text-amber-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {pedidosAgrupados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    Nenhum pedido encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                pedidosAgrupados.map((pedido) => {
                  const isExpandido = pedidosExpandidos.has(pedido.idSaida);
                  const isEmEdicao = editandoIdSaida === pedido.idSaida;
                  const isConsignado = (pedido.tipoSaida || '').toLowerCase() === 'consignado';
                  const isAmostra = (pedido.tipoSaida || '').toLowerCase().includes('amostra');
                  const isOutraSaida = (pedido.tipoSaida || '').toLowerCase() !== 'venda' && !isConsignado && !isAmostra;

                  return (
                    <React.Fragment key={pedido.idSaida}>
                      
                      {/* LINHA PRINCIPAL DO PEDIDO (RESUMO AGRUPADO) */}
                      <tr 
                        onClick={() => toggleExpandir(pedido.idSaida)}
                        className={`cursor-pointer transition-colors select-none ${
                          isEmEdicao
                            ? 'bg-amber-500/20 border-l-4 border-l-amber-400'
                            : isExpandido 
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-400' 
                            : 'hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Data com Ícone Accordion e Badge de Itens */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className={`p-1 rounded-md transition-transform duration-200 ${
                              isExpandido ? 'bg-amber-500/20 text-amber-300 rotate-180' : 'bg-slate-800 text-slate-400'
                            }`}>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </span>
                            <span className="font-semibold text-slate-100">{formatarDataBR(pedido.data)}</span>
                            <span className="text-[10px] font-normal text-slate-500 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'}
                            </span>
                          </div>
                        </td>

                        {/* Vendedor */}
                        <td className="px-4 py-3.5 font-semibold text-slate-100 whitespace-nowrap">
                          {pedido.vendedor}
                        </td>

                        {/* Tipo Saída */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 w-max ${
                            isConsignado
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : isAmostra
                              ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                              : isOutraSaida
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {isAmostra && <Gift className="w-3 h-3 text-fuchsia-300" />}
                            {pedido.tipoSaida}
                          </span>
                        </td>

                        {/* Quantidade Total do Agrupamento */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-100 whitespace-nowrap text-sm">
                          {pedido.quantidadeTotal} un
                        </td>

                        {/* Total da Venda Formatado R$ */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-300 whitespace-nowrap text-sm">
                          {formatarMoeda(pedido.totalVenda)}
                        </td>

                        {/* R$ de Comissão Formatado R$ */}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap text-sm">
                          {formatarMoeda(pedido.totalComissao)}
                        </td>

                        {/* Status Comissão */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            pedido.statusComissao === 'Pago'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : pedido.statusComissao === 'Não Pago' || pedido.statusComissao === 'Não pago'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : pedido.statusComissao === 'Pendente'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 font-normal'
                          }`}>
                            {pedido.statusComissao || '—'}
                          </span>
                        </td>

                        {/* COLUNA AÇÕES: PDF, TORNAR VENDA, EDITA, DELETA */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Botão Tornar Venda em Pedidos Consignados */}
                            {(isConsignado || pedido.itens.some(it => (it.tipoSaida || '').toLowerCase() === 'consignado')) && (
                              <button
                                onClick={() => handleConverterPedidoEmVenda(pedido)}
                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5 shrink-0"
                                title="Tornar este pedido consignado em Venda faturada"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
                                <span className="hidden xl:inline">Tornar Venda</span>
                              </button>
                            )}

                            {/* Botão PDF */}
                            <button
                              onClick={() => handleGerarPdf(pedido)}
                              className="p-1.5 bg-slate-950 hover:bg-amber-500/20 text-amber-400 border border-slate-800 hover:border-amber-500/40 rounded-lg transition-all"
                              title="Gerar PDF de Alto Padrão (Comprovante Olor Luz)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            {/* Botão Editar (Apenas Master) */}
                            {isMaster && (
                              <button
                                onClick={() => handleIniciarEdicao(pedido)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isEmEdicao
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                    : 'bg-slate-950 hover:bg-sky-500/20 text-sky-400 border-slate-800 hover:border-sky-500/40'
                                }`}
                                title="Editar Pedido e Itens Inline"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}

                            {/* Botão Deletar (Apenas Master) */}
                            {isMaster && (
                              <button
                                onClick={() => setExcluindoIdSaida(pedido.idSaida)}
                                className="p-1.5 bg-slate-950 hover:bg-rose-500/20 text-rose-400 border border-slate-800 hover:border-rose-500/40 rounded-lg transition-all"
                                title="Excluir Pedido Permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ÁREA EXPANDIDA (DETALHES OU MODO EDICÃO INLINE) */}
                      {isExpandido && (
                        <tr className="bg-slate-950/90 border-b border-amber-500/20">
                          <td colSpan={8} className="p-4 sm:p-5">
                            
                            {/* MODO EDICÃO INLINE ATIVO */}
                            {isEmEdicao && formEdicao ? (
                              <div className="space-y-5 bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl animate-fadeIn">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                  <div className="flex items-center space-x-2">
                                    <Edit className="w-5 h-5 text-amber-400" />
                                    <h4 className="text-sm font-bold text-amber-200">
                                      Modo de Edição — Pedido <span className="font-mono text-amber-300">{formEdicao.idSaida}</span>
                                    </h4>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={handleCancelarEdicao}
                                      disabled={salvandoEdicao}
                                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Cancelar</span>
                                    </button>
                                    <button
                                      onClick={handleSalvarEdicao}
                                      disabled={salvandoEdicao}
                                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                      {salvandoEdicao ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                      <span>{salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* CABEÇALHO EDITÁVEL DO PEDIDO */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Data:</label>
                                    <input
                                      type="date"
                                      value={formEdicao.data}
                                      onChange={(e) => handleHeaderFormChange('data', e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Vendedor:</label>
                                    <select
                                      value={formEdicao.vendedor}
                                      onChange={(e) => handleHeaderFormChange('vendedor', e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                                    >
                                      {listas.vendedores.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tipo de Saída:</label>
                                    <select
                                      value={formEdicao.tipoSaida}
                                      onChange={(e) => handleHeaderFormChange('tipoSaida', e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                                    >
                                      {listas.tiposSaida.map(ts => (
                                        <option key={ts} value={ts}>{ts}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tabela de Preço:</label>
                                    <select
                                      value={formEdicao.tabelaPreco}
                                      onChange={(e) => handleHeaderFormChange('tabelaPreco', e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                                    >
                                      {listas.tabelasPreco.map(tp => (
                                        <option key={tp} value={tp}>{tp}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status Comissão:</label>
                                    <select
                                      value={formEdicao.statusComissao}
                                      onChange={(e) => handleHeaderFormChange('statusComissao', e.target.value)}
                                      disabled={formEdicao.vendedor.toLowerCase() === 'olor luz'}
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 disabled:opacity-50"
                                    >
                                      {listas.statusComissao.map(sc => (
                                        <option key={sc} value={sc}>{sc}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cliente / Influenciador:</label>
                                    <input
                                      type="text"
                                      value={formEdicao.clienteInfluenciador}
                                      onChange={(e) => handleHeaderFormChange('clienteInfluenciador', e.target.value)}
                                      placeholder="Nome do Cliente..."
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Contato / Telefone:</label>
                                    <input
                                      type="text"
                                      value={formEdicao.contato}
                                      onChange={(e) => handleHeaderFormChange('contato', e.target.value)}
                                      placeholder="(00) 00000-0000"
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Observações (OBS):</label>
                                    <input
                                      type="text"
                                      value={formEdicao.obs}
                                      onChange={(e) => handleHeaderFormChange('obs', e.target.value)}
                                      placeholder="Ex: Entrega prioritária..."
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                                    />
                                  </div>
                                </div>

                                {/* TABELA EDITÁVEL DE ITENS DO PEDIDO */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                                      Itens de Produto ({formEdicao.itens.length})
                                    </h5>
                                    <button
                                      type="button"
                                      onClick={handleAdicionarItemForm}
                                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Adicionar Item</span>
                                    </button>
                                  </div>

                                  {/* CARDS DE ITENS PARA DISPOSITIVOS MÓVEIS (CELULAR) */}
                                  <div className="block md:hidden space-y-3">
                                    {formEdicao.itens.map((item, idx) => {
                                      const isVenda = (item.tipoSaida || '').toLowerCase() === 'venda';
                                      return (
                                        <div
                                          key={item.id || idx}
                                          className={`bg-slate-950 border rounded-xl p-3.5 space-y-3 shadow-md ${
                                            isVenda ? 'border-emerald-500/40 border-l-4 border-l-emerald-500' : 'border-purple-500/40 border-l-4 border-l-purple-500'
                                          }`}
                                        >
                                          {/* Cabeçalho do Card: Número, Botão Tornar Venda e Selector de Tipo */}
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                                            <div className="flex items-center gap-2">
                                              <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold font-mono flex items-center justify-center">
                                                {idx + 1}
                                              </span>
                                              <span className="text-xs font-bold text-slate-200">Item #{idx + 1}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              {/* Botão de Destaque "Tornar Venda" no celular se não for Venda */}
                                              {!isVenda && (
                                                <button
                                                  type="button"
                                                  onClick={() => recalculareAtualizarItemForm(idx, 'tipoSaida', 'Venda')}
                                                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-lg text-xs font-extrabold shadow-md transition-all flex items-center gap-1 shrink-0"
                                                  title="Converter este item em Venda"
                                                >
                                                  <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
                                                  <span>Tornar Venda</span>
                                                </button>
                                              )}

                                              {/* Selector de Tipo do Item */}
                                              <select
                                                value={item.tipoSaida || formEdicao.tipoSaida}
                                                onChange={(e) => recalculareAtualizarItemForm(idx, 'tipoSaida', e.target.value)}
                                                className={`bg-slate-900 border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none ${
                                                  isVenda
                                                    ? 'border-emerald-500/50 text-emerald-300'
                                                    : 'border-purple-500/50 text-purple-300'
                                                }`}
                                              >
                                                <option value="Consignado">Consignado</option>
                                                <option value="Venda">Venda</option>
                                                <option value="Amostra Grátis">Amostra Grátis</option>
                                                <option value="Mostruário">Mostruário</option>
                                                <option value="Bonificação">Bonificação</option>
                                              </select>

                                              {/* Botão Excluir Item */}
                                              <button
                                                type="button"
                                                onClick={() => handleRemoverItemForm(idx)}
                                                disabled={formEdicao.itens.length <= 1}
                                                className="p-1.5 bg-slate-900 hover:bg-rose-500/20 text-rose-400 border border-slate-800 rounded-lg transition-colors disabled:opacity-30"
                                                title="Remover item"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Entradas: Produto e Embalagem */}
                                          <div className="space-y-2.5">
                                            <div>
                                              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                                Produto
                                              </label>
                                              <select
                                                value={item.produto}
                                                onChange={(e) => recalculareAtualizarItemForm(idx, 'produto', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                                              >
                                                {listas.produtos.map(p => (
                                                  <option key={p} value={p}>{p}</option>
                                                ))}
                                              </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                                  Embalagem
                                                </label>
                                                <select
                                                  value={item.embalagem}
                                                  onChange={(e) => recalculareAtualizarItemForm(idx, 'embalagem', e.target.value)}
                                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                                                >
                                                  {listas.embalagens.map(emb => (
                                                    <option key={emb} value={emb}>{emb}</option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div>
                                                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                                  Quantidade
                                                </label>
                                                <input
                                                  type="text"
                                                  inputMode="numeric"
                                                  value={item.quantidade ?? ''}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val === '' || /^\d*$/.test(val)) {
                                                      recalculareAtualizarItemForm(idx, 'quantidade', val);
                                                    }
                                                  }}
                                                  placeholder="1"
                                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-right text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-400"
                                                />
                                              </div>
                                            </div>

                                            <div>
                                              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                                Modificador R$ (- Desconto / + Adicional)
                                              </label>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                value={item.modificador ?? ''}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val === '' || val === '-' || /^-?\d*([.,]\d*)?$/.test(val)) {
                                                    recalculareAtualizarItemForm(idx, 'modificador', val);
                                                  }
                                                }}
                                                placeholder="0.00"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-right font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                                              />
                                            </div>
                                          </div>

                                          {/* Valores Calculados */}
                                          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono">
                                            <div className="text-slate-400">
                                              Uni: <span className="text-slate-200">{formatarMoeda(item.precoUni)}</span>
                                            </div>
                                            <div className="text-slate-400">
                                              Venda: <span className="text-amber-300 font-bold">{formatarMoeda(item.precoVenda)}</span>
                                            </div>
                                            <div className="text-slate-400">
                                              Comissão: <span className="text-emerald-400 font-bold">{formatarMoeda(item.comissao)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* TABELA EDITÁVEL DE ITENS DO PEDIDO EM DESKTOP */}
                                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-inner max-w-full">
                                    <table className="w-full min-w-[980px] text-left text-xs border-collapse">
                                      <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                                        <tr>
                                          <th className="px-3.5 py-2.5 min-w-[200px] w-56">Produto</th>
                                          <th className="px-3.5 py-2.5 min-w-[150px] w-40">Embalagem</th>
                                          <th className="px-3.5 py-2.5 text-right w-20 min-w-[70px]">Qtd</th>
                                          <th className="px-3.5 py-2.5 text-center min-w-[240px]">Tipo / Ação</th>
                                          <th className="px-3.5 py-2.5 text-right min-w-[100px]">Preço Uni</th>
                                          <th className="px-3.5 py-2.5 text-right min-w-[120px]">Modificador (R$)</th>
                                          <th className="px-3.5 py-2.5 text-right text-amber-300 min-w-[110px]">Preço Venda</th>
                                          <th className="px-3.5 py-2.5 text-right text-emerald-400 min-w-[110px]">R$ Comissão</th>
                                          <th className="px-3.5 py-2.5 text-center min-w-[60px] w-14">Remover</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/60 font-sans">
                                        {formEdicao.itens.map((item, idx) => (
                                          <tr key={item.id || idx} className="hover:bg-slate-900/50">
                                            
                                            {/* Select Produto */}
                                            <td className="px-3 py-2 min-w-[200px]">
                                              <select
                                                value={item.produto}
                                                onChange={(e) => recalculareAtualizarItemForm(idx, 'produto', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                                              >
                                                {listas.produtos.map(p => (
                                                  <option key={p} value={p}>{p}</option>
                                                ))}
                                              </select>
                                            </td>

                                            {/* Select Embalagem */}
                                            <td className="px-3 py-2 min-w-[150px]">
                                              <select
                                                value={item.embalagem}
                                                onChange={(e) => recalculareAtualizarItemForm(idx, 'embalagem', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400"
                                              >
                                                {listas.embalagens.map(emb => (
                                                  <option key={emb} value={emb}>{emb}</option>
                                                ))}
                                              </select>
                                            </td>

                                            {/* Input Quantidade */}
                                            <td className="px-3 py-2 text-right min-w-[70px]">
                                              <input
                                                type="text"
                                                inputMode="numeric"
                                                value={item.quantidade ?? ''}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val === '' || /^\d*$/.test(val)) {
                                                    recalculareAtualizarItemForm(idx, 'quantidade', val);
                                                  }
                                                }}
                                                placeholder="1"
                                                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-400"
                                              />
                                            </td>

                                            {/* Tipo do Item / Converter em Venda */}
                                            <td className="px-3 py-2 text-center min-w-[240px]">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <select
                                                  value={item.tipoSaida || formEdicao.tipoSaida}
                                                  onChange={(e) => recalculareAtualizarItemForm(idx, 'tipoSaida', e.target.value)}
                                                  className={`bg-slate-900 border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none ${
                                                    (item.tipoSaida || '').toLowerCase() === 'venda'
                                                      ? 'border-emerald-500/50 text-emerald-300'
                                                      : 'border-purple-500/50 text-purple-300'
                                                  }`}
                                                >
                                                  <option value="Consignado">Consignado</option>
                                                  <option value="Venda">Venda</option>
                                                  <option value="Amostra Grátis">Amostra Grátis</option>
                                                  <option value="Mostruário">Mostruário</option>
                                                  <option value="Bonificação">Bonificação</option>
                                                </select>

                                                {(item.tipoSaida || '').toLowerCase() !== 'venda' && (
                                                  <button
                                                    type="button"
                                                    onClick={() => recalculareAtualizarItemForm(idx, 'tipoSaida', 'Venda')}
                                                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-[11px] font-bold shadow transition-colors flex items-center gap-1 shrink-0"
                                                    title="Tornar este item uma Venda com faturamento"
                                                  >
                                                    <ShoppingBag className="w-3.5 h-3.5 text-slate-950" />
                                                    <span className="whitespace-nowrap">Tornar Venda</span>
                                                  </button>
                                                )}
                                              </div>
                                            </td>

                                            {/* Preço Unitário Calculado */}
                                            <td className="px-3 py-2 text-right font-mono text-slate-300 min-w-[100px] whitespace-nowrap">
                                              {formatarMoeda(item.precoUni)}
                                            </td>

                                            {/* Input Modificador (Desconto/Adicional Total) */}
                                            <td className="px-3 py-2 text-right min-w-[120px]">
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                value={item.modificador ?? ''}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (val === '' || val === '-' || /^-?\d*([.,]\d*)?$/.test(val)) {
                                                    recalculareAtualizarItemForm(idx, 'modificador', val);
                                                  }
                                                }}
                                                placeholder="0.00"
                                                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-right font-mono text-slate-100 focus:outline-none focus:border-amber-400"
                                              />
                                            </td>

                                            {/* Preço Venda Calculado */}
                                            <td className="px-3 py-2 text-right font-mono font-bold text-amber-300 min-w-[110px] whitespace-nowrap">
                                              {formatarMoeda(item.precoVenda)}
                                            </td>

                                            {/* Comissão Calculada */}
                                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400 min-w-[110px] whitespace-nowrap">
                                              {formatarMoeda(item.comissao)}
                                            </td>

                                            {/* Botão Remover Item */}
                                            <td className="px-3 py-2 text-center min-w-[60px]">
                                              <button
                                                type="button"
                                                onClick={() => handleRemoverItemForm(idx)}
                                                disabled={formEdicao.itens.length <= 1}
                                                className="p-1.5 bg-slate-900 hover:bg-rose-500/20 text-rose-400 rounded transition-colors disabled:opacity-30"
                                                title="Remover este item do pedido"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>

                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                              </div>
                            ) : (
                              
                              /* MODO VISUALIZAÇÃO PADRÃO (MINI-TABELA DE ITENS SEM COLUNA ID ITEM) */
                              <div className="space-y-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner">
                                
                                {/* Sub-cabeçalho da Mini-tabela */}
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2 uppercase tracking-wider font-mono">
                                    <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Itens do Pedido ({pedido.idSaida})</span>
                                  </h4>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    Tabela de Preço: <strong className="text-amber-300">{pedido.tabelaPreco || 'Site'}</strong>
                                  </span>
                                </div>

                                {/* CARDS MÓVEIS DE PRODUTOS NO MODO VISUALIZAÇÃO */}
                                <div className="block md:hidden space-y-2.5">
                                  {pedido.itens.map((item, idx) => {
                                    const isVendaItem = (item.tipoSaida || pedido.tipoSaida || '').toLowerCase() === 'venda';
                                    return (
                                      <div key={item.id || idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
                                          <div className="font-semibold text-slate-100 truncate">{item.produto}</div>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                                            isVendaItem
                                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                              : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                          }`}>
                                            {item.tipoSaida || pedido.tipoSaida}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                                          <div>Embalagem: <strong className="text-slate-100">{item.embalagem}</strong></div>
                                          <div>Qtd: <strong className="text-slate-100 font-mono">{item.quantidade}</strong></div>
                                          <div>Preço Uni: <span className="font-mono">{formatarMoeda(item.precoUni)}</span></div>
                                          <div>Modificador: <span className="font-mono">{item.modificador !== 0 ? formatarMoeda(item.modificador) : 'R$ 0,00'}</span></div>
                                        </div>
                                        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded font-mono font-bold text-xs">
                                          <span className="text-amber-300">Venda: {formatarMoeda(item.precoVenda)}</span>
                                          <span className="text-emerald-400">Comissão: {formatarMoeda(item.comissao)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Mini-tabela de Produtos em Desktop (SEM A COLUNA ID ITEM) */}
                                <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                                      <tr>
                                        <th className="px-3.5 py-2.5">Produto</th>
                                        <th className="px-3.5 py-2.5">Embalagem</th>
                                        <th className="px-3.5 py-2.5 text-center">Tipo</th>
                                        <th className="px-3.5 py-2.5 text-right">Qtd</th>
                                        <th className="px-3.5 py-2.5 text-right">Preço Uni</th>
                                        <th className="px-3.5 py-2.5 text-right">Modificador</th>
                                        <th className="px-3.5 py-2.5 text-right text-amber-300">Preço Venda</th>
                                        <th className="px-3.5 py-2.5 text-right text-emerald-400">R$ Comissão</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-sans">
                                      {pedido.itens.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-slate-900/50">
                                          <td className="px-3.5 py-2.5 font-semibold text-slate-100">{item.produto}</td>
                                          <td className="px-3.5 py-2.5 text-slate-300">{item.embalagem}</td>
                                          <td className="px-3.5 py-2.5 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                              (item.tipoSaida || pedido.tipoSaida || '').toLowerCase() === 'venda'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                                : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                            }`}>
                                              {item.tipoSaida || pedido.tipoSaida}
                                            </span>
                                            {(item.tipoSaida || pedido.tipoSaida || '').toLowerCase() !== 'venda' && (
                                              <button
                                                type="button"
                                                onClick={() => handleConverterItemEmVenda(pedido, idx)}
                                                className="ml-2 px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded text-[11px] font-extrabold shadow transition-all inline-flex items-center gap-1 shrink-0"
                                                title="Tornar este item uma Venda com faturamento"
                                              >
                                                <ShoppingBag className="w-3 h-3 text-slate-950" />
                                                <span>Tornar Venda</span>
                                              </button>
                                            )}
                                          </td>
                                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-100">{item.quantidade}</td>
                                          <td className="px-3.5 py-2.5 text-right font-mono text-slate-300">{formatarMoeda(item.precoUni)}</td>
                                          <td className={`px-3.5 py-2.5 text-right font-mono ${
                                            item.modificador < 0 ? 'text-rose-400' : item.modificador > 0 ? 'text-emerald-400' : 'text-slate-500'
                                          }`}>
                                            {item.modificador !== 0 ? formatarMoeda(item.modificador) : 'R$ 0,00'}
                                          </td>
                                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-amber-300">{formatarMoeda(item.precoVenda)}</td>
                                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-400">{formatarMoeda(item.comissao)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Bloco de Informações Adicionais */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                  
                                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                                      <UserIcon className="w-3 h-3 text-amber-400" />
                                      <span>Cliente / Influenciador:</span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-200">
                                      {pedido.clienteInfluenciador || <span className="text-slate-600 font-normal">Não informado</span>}
                                    </p>
                                  </div>

                                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                                      <Phone className="w-3 h-3 text-amber-400" />
                                      <span>Contato / Telefone:</span>
                                    </div>
                                    <p className="text-xs font-mono text-slate-200">
                                      {pedido.contato || <span className="text-slate-600 font-normal">Não informado</span>}
                                    </p>
                                  </div>

                                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-1 sm:col-span-1">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
                                      <FileText className="w-3 h-3 text-amber-400" />
                                      <span>Observações (OBS):</span>
                                    </div>
                                    <p className="text-xs text-slate-300 italic">
                                      {pedido.obs ? `"${pedido.obs}"` : <span className="text-slate-600 font-normal not-italic">Sem observações</span>}
                                    </p>
                                  </div>

                                </div>

                              </div>
                            )}

                          </td>
                        </tr>
                      )}

                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {excluindoIdSaida && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Excluir Pedido Permanentemente</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir permanentemente o pedido <strong className="font-mono text-amber-300">{excluindoIdSaida}</strong> e todos os seus itens?
            </p>
            <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Esta ação irá remover todas as linhas correspondentes deste pedido tanto no aplicativo quanto na aba <code className="text-amber-300 font-mono">BD_Vendas</code> da planilha Google.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setExcluindoIdSaida(null)}
                disabled={processandoExclusao}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors border border-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={processandoExclusao}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {processandoExclusao ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{processandoExclusao ? 'Excluindo...' : 'Excluir Permanentemente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
