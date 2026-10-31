import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SorteioCliente, User } from '../types';
import {
  getSorteioClientesApi,
  salvarSorteioClienteApi,
  excluirSorteioClienteApi,
  calcularProximoNumeroCupom,
  gerarFaixaCuponsSequenciais,
  CUPOM_INICIAL_SORTEIO
} from '../services/api';
import { OFFICIAL_LOGO_URL } from './Logo';
import {
  Ticket,
  UserPlus,
  Phone,
  Hash,
  Search,
  FileDown,
  Eye,
  Printer,
  Edit2,
  Trash2,
  Gift,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  Minus,
  Trophy,
  RefreshCw,
  MessageCircle,
  Award,
  Check
} from 'lucide-react';

export const KIT_PREMIOS_IMAGE_URL = 'https://i.ibb.co/nNFbJjX8/IMG-7339.jpg';

export const LISTA_PREMIOS_SORTEIO = [
  '1 difusor de ambiente de varetas',
  '1 sabonete líquido para as mãos',
  '1 kit com 6 mini aromatizadores spray',
  '1 kit difusor elétrico + essência',
  '1 Água de Lençóis 500 ml'
];

interface SorteioViewProps {
  currentUser: User;
}

// Formata telefone com DDD: (11) 98765-4321 ou (11) 3456-7890
function formatarTelefoneDDD(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
}

// Converte URL de imagem para DataURL Base64 para garantir renderização 100% nítida no html2pdf
async function carregarImagemComoBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) return url;
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

// Gera o documento HTML do Cupom/Certificado do Sorteio 100% isolado de Tailwind e oklch
function gerarHtmlCupomSorteio(
  cliente: SorteioCliente,
  logoUrl: string,
  kitUrl: string,
  modoNovaAba: boolean
): string {
  const cuponsHtml = (cliente.numerosCupons || [])
    .map(
      (num) => `
      <div class="coupon-badge">
        <span class="coupon-hash">#</span>${num}
      </div>
    `
    )
    .join('');

  const premiosHtml = LISTA_PREMIOS_SORTEIO.map(
    (item) => `
      <li class="prize-item">
        <span class="prize-check">✦</span>
        <span>${item}</span>
      </li>
    `
  ).join('');

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NOVEMBRO PREMIADO OLOR LUZ - ${cliente.nomeCliente}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: ${modoNovaAba ? '#0F172A' : '#FFFFFF'};
      color: #0F172A;
    }
    ${
      modoNovaAba
        ? `
    .top-bar {
      background: #020617;
      border-bottom: 1px solid #1E293B;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .top-bar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #FDE68A;
      font-family: 'Cinzel', Georgia, serif;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 1.5px;
    }
    .top-bar-brand img {
      height: 34px;
      width: auto;
    }
    .btn-print {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #0F172A;
      border: none;
      padding: 10px 22px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
    }
    .page-wrap {
      display: flex;
      justify-content: center;
      padding: 24px 16px 40px;
    }
    `
        : `
    .page-wrap {
      display: flex;
      justify-content: center;
      padding: 0;
    }
    `
    }
    .sheet {
      width: 100%;
      max-width: 780px;
      background: #FFFFFF;
      border-radius: 16px;
      border: 2px solid #D97706;
      overflow: hidden;
      box-shadow: ${modoNovaAba ? '0 20px 50px rgba(0,0,0,0.6)' : 'none'};
    }
    .header-banner {
      background: linear-gradient(135deg, #090D16 0%, #1E293B 55%, #0F172A 100%);
      padding: 20px 28px 16px;
      text-align: center;
      border-bottom: 4px solid #F59E0B;
    }
    .logo-img {
      height: 70px;
      width: auto;
      object-fit: contain;
      margin: 0 auto 8px;
      display: block;
      filter: drop-shadow(0 4px 12px rgba(245, 158, 11, 0.35));
    }
    .main-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 24px;
      font-weight: 900;
      color: #FDE68A;
      letter-spacing: 2px;
      margin: 2px 0 0;
      text-transform: uppercase;
    }
    .client-bar {
      background-color: #FFFBEB;
      border-bottom: 1px solid #FDE68A;
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      color: #78350F;
    }
    .body-content {
      padding: 18px 24px 20px;
    }
    .coupons-section {
      background: linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%);
      border: 2px dashed #D97706;
      border-radius: 14px;
      padding: 14px 16px;
      text-align: center;
      margin-bottom: 18px;
    }
    .coupons-label {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #92400E;
      margin: 0 0 10px 0;
    }
    .coupons-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
    }
    .coupon-badge {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: #FBBF24;
      border: 2px solid #F59E0B;
      border-radius: 12px;
      padding: 8px 22px;
      font-size: 34px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 1px;
      font-variant-numeric: tabular-nums;
    }
    .coupon-hash {
      font-size: 20px;
      color: #FDE68A;
      margin-right: 2px;
      font-weight: 700;
    }
    .kit-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 18px;
      align-items: stretch;
      margin-bottom: 16px;
    }
    .prizes-box {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .prizes-heading {
      font-size: 14.5px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 10px 0;
      line-height: 1.35;
    }
    .prizes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .prize-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px solid #E2E8F0;
      font-size: 12.5px;
      font-weight: 700;
      color: #1E293B;
    }
    .prize-item:last-child {
      border-bottom: none;
    }
    .prize-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 10px;
      font-weight: 900;
      flex-shrink: 0;
    }
    .image-box {
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid #F59E0B;
      background-color: #0F172A;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .image-box img {
      width: 100%;
      height: 240px;
      object-fit: cover;
      object-position: center 25%;
      display: block;
    }
    .image-caption {
      background-color: #0F172A;
      color: #FDE68A;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 5px 8px;
    }
    .dates-grid {
      display: grid;
      grid-template-columns: 1fr 1.35fr;
      gap: 12px;
      margin-bottom: 14px;
      align-items: stretch;
    }
    .date-highlight {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border: 2px solid #F59E0B;
      border-radius: 10px;
      padding: 10px 14px;
      text-align: center;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .date-highlight-sorteio {
      padding: 10px 14px;
    }
    .date-highlight-title {
      font-size: 13px;
      font-weight: 800;
      color: #FDE68A;
      margin: 0;
      line-height: 1.35;
    }
    .date-highlight-sorteio-text {
      font-size: 11.5px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0;
      line-height: 1.45;
    }
    .obs-box {
      background-color: #FFFBEB;
      border: 1px solid #FCD34D;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 11.5px;
      line-height: 1.45;
      color: #78350F;
      text-align: center;
      font-weight: 600;
    }
    .doc-footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748B;
    }
    @media print {
      body { background: #FFFFFF; }
      .top-bar { display: none !important; }
      .page-wrap { padding: 0; }
      .sheet { box-shadow: none; max-width: 100%; border-width: 1px; }
    }
  </style>
</head>
<body>
  ${
    modoNovaAba
      ? `
  <div class="top-bar">
    <div class="top-bar-brand">
      <img src="${logoUrl}" alt="Olor Luz" referrerpolicy="no-referrer" />
      <span>NOVEMBRO PREMIADO OLOR LUZ — COMPROVANTE DE CUPONS</span>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Baixar PDF / Imprimir Agora</button>
  </div>
  `
      : ''
  }
  <div class="page-wrap">
    <div class="sheet" id="sorteio-folha-pdf">
      <div class="header-banner">
        <img class="logo-img" src="${logoUrl}" alt="Logo Olor Luz" referrerpolicy="no-referrer" />
        <h1 class="main-title">NOVEMBRO PREMIADO OLOR LUZ</h1>
      </div>
      <div class="client-bar">
        <div><strong>CLIENTE:</strong> ${cliente.nomeCliente}</div>
        <div><strong>TELEFONE:</strong> ${cliente.telefone}</div>
        <div><strong>QTDE DE CUPONS:</strong> ${cliente.numerosCupons?.length || cliente.quantidadeCupons}</div>
      </div>
      <div class="body-content">
        <div class="coupons-section">
          <p class="coupons-label">Número(s) do(s) cupom(s):</p>
          <div class="coupons-grid">
            ${cuponsHtml}
          </div>
        </div>
        <div class="kit-grid">
          <div class="prizes-box">
            <h2 class="prizes-heading">Preparamos um superkit com 5 itens especiais da Olor Luz!</h2>
            <ul class="prizes-list">
              ${premiosHtml}
            </ul>
          </div>
          <div class="image-box">
            <img src="${kitUrl}" alt="Superkit Olor Luz" referrerpolicy="no-referrer" />
            <div class="image-caption">Superkit Oficial • 5 Itens Exclusivos Olor Luz</div>
          </div>
        </div>
        <div class="dates-grid">
          <div class="date-highlight">
            <p class="date-highlight-title">📅 Participação: de 1º a 30 de novembro.</p>
          </div>
          <div class="date-highlight date-highlight-sorteio">
            <p class="date-highlight-sorteio-text"><strong style="color: #FDE68A; font-size: 12.5px;">🎁 Sorteio: 1º de dezembro!</strong> O vídeo do sorteio, com a divulgação do ganhador, será publicado na página oficial da Olor Luz no Instagram: <strong style="color: #FDE68A;">@olorluz</strong>.</p>
          </div>
        </div>
        <div class="obs-box">
          As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias definidas.
        </div>
        <div class="doc-footer">
          <span>Olor Luz • Certificado Oficial de Participação</span>
          <span>Emitido em ${dataAtual}</span>
        </div>
      </div>
    </div>
  </div>
  ${
    modoNovaAba
      ? `
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {}
      }, 450);
    });
  </script>
  `
      : ''
  }
</body>
</html>`;
}

export const SorteioView: React.FC<SorteioViewProps> = ({ currentUser }) => {
  const [clientes, setClientes] = useState<SorteioCliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [gerandoPdfId, setGerandoPdfId] = useState<string | null>(null);

  // Estado do formulário CRUD
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomeCliente, setNomeCliente] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [quantidadeCupons, setQuantidadeCupons] = useState<string>('1');
  const [obs, setObs] = useState<string>('');

  // Busca e Filtros
  const [busca, setBusca] = useState<string>('');

  // Feedback visual
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string; clienteRecente?: SorteioCliente } | null>(null);

  // Modal de Visualização / Download do PDF
  const [clientePdfModal, setClientePdfModal] = useState<SorteioCliente | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  // Imagens cacheadas em Base64 para o PDF
  const [logoBase64, setLogoBase64] = useState<string>(OFFICIAL_LOGO_URL);
  const [kitBase64, setKitBase64] = useState<string>(KIT_PREMIOS_IMAGE_URL);

  // Modal de Confirmação de Exclusão
  const [clienteParaExcluir, setClienteParaExcluir] = useState<SorteioCliente | null>(null);

  // Modal de Sorteador Interativo (Realizar Sorteio)
  const [sorteadorAberto, setSorteadorAberto] = useState<boolean>(false);
  const [sorteandoAnimacao, setSorteandoAnimacao] = useState<boolean>(false);
  const [cupomSorteadoNumero, setCupomSorteadoNumero] = useState<number | null>(null);
  const [ganhadorSorteado, setGanhadorSorteado] = useState<SorteioCliente | null>(null);

  const carregarClientes = async () => {
    setLoading(true);
    try {
      const lista = await getSorteioClientesApi();
      setClientes(lista);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
    // Pré-carrega imagens em Base64 para exportação PDF de alta resolução
    carregarImagemComoBase64(OFFICIAL_LOGO_URL).then(setLogoBase64);
    carregarImagemComoBase64(KIT_PREMIOS_IMAGE_URL).then(setKitBase64);
  }, []);

  // Próximo número de cupom global (iniciando em 100)
  const proximoNumeroGlobal = useMemo(() => {
    return calcularProximoNumeroCupom(clientes);
  }, [clientes]);

  // Total de cupons emitidos
  const totalCuponsEmitidos = useMemo(() => {
    return clientes.reduce((acc, c) => acc + (c.numerosCupons?.length || c.quantidadeCupons || 0), 0);
  }, [clientes]);

  // Preview dos números de cupons que o cliente no formulário terá
  const previewCuponsFormulario = useMemo(() => {
    const qtd = Math.max(1, Math.min(500, Math.floor(Number(quantidadeCupons) || 1)));
    if (editingId) {
      const clienteAtual = clientes.find(c => c.id === editingId);
      if (clienteAtual) {
        const existentes = clienteAtual.numerosCupons || [];
        if (qtd === existentes.length) return existentes;
        if (qtd < existentes.length) return existentes.slice(0, qtd);
        const adicionais = gerarFaixaCuponsSequenciais(proximoNumeroGlobal, qtd - existentes.length);
        return [...existentes, ...adicionais];
      }
    }
    return gerarFaixaCuponsSequenciais(proximoNumeroGlobal, qtd);
  }, [quantidadeCupons, editingId, clientes, proximoNumeroGlobal]);

  // Lista filtrada pela busca (nome, telefone ou número do cupom)
  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    const termoApenasDigitos = termo.replace(/\D/g, '');
    return clientes.filter(c => {
      const matchNome = c.nomeCliente.toLowerCase().includes(termo);
      const matchTel = c.telefone.toLowerCase().includes(termo) || (termoApenasDigitos && c.telefone.replace(/\D/g, '').includes(termoApenasDigitos));
      const matchCupom = c.numerosCupons?.some(num => String(num).includes(termoApenasDigitos || termo));
      return matchNome || matchTel || matchCupom;
    });
  }, [clientes, busca]);

  const limparFormulario = () => {
    setEditingId(null);
    setNomeCliente('');
    setTelefone('');
    setQuantidadeCupons('1');
    setObs('');
  };

  const handleEditarCliente = (cliente: SorteioCliente) => {
    setEditingId(cliente.id);
    setNomeCliente(cliente.nomeCliente);
    setTelefone(cliente.telefone);
    setQuantidadeCupons(String(cliente.quantidadeCupons || cliente.numerosCupons?.length || 1));
    setObs(cliente.obs || '');
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSalvar = async (e: React.FormEvent, abrirPdfAposSalvar = false) => {
    e.preventDefault();
    setFeedback(null);

    if (!nomeCliente.trim()) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, informe o Nome do Cliente.' });
      return;
    }

    const digitosTelefone = telefone.replace(/\D/g, '');
    if (digitosTelefone.length < 10) {
      setFeedback({ tipo: 'erro', texto: 'Informe um Telefone válido com DDD (ex: (11) 98765-4321).' });
      return;
    }

    const qtdNum = Math.floor(Number(quantidadeCupons) || 0);
    if (qtdNum < 1) {
      setFeedback({ tipo: 'erro', texto: 'A quantidade de cupons deve ser de pelo menos 1.' });
      return;
    }

    // Se o usuário clicou em Cadastrar + Baixar PDF, abrimos a janela já no manipulador de clique para contornar bloqueador de popups
    let winPre: Window | null = null;
    if (abrirPdfAposSalvar) {
      try {
        winPre = window.open('', '_blank');
        if (winPre) {
          winPre.document.write(`
            <!DOCTYPE html>
            <html><head><title>Olor Luz - Gerando Cupons...</title></head>
            <body style="background:#0F172A;color:#FDE68A;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="text-align:center;">
                <h2 style="margin-bottom:8px;">Olor Luz • Novembro Premiado</h2>
                <p style="color:#94A3B8;">Cadastrando cliente e gerando os cupons oficiais...</p>
              </div>
            </body></html>
          `);
        }
      } catch (e) {
        winPre = null;
      }
    }

    setSalvando(true);
    try {
      const res = await salvarSorteioClienteApi(
        {
          id: editingId || undefined,
          nomeCliente,
          telefone,
          quantidadeCupons: qtdNum,
          obs
        },
        clientes
      );

      setClientes(res.listaAtualizada);
      setFeedback({
        tipo: 'sucesso',
        texto: res.message,
        clienteRecente: res.clienteSalvo
      });
      limparFormulario();

      if (abrirPdfAposSalvar) {
        handleImprimirOuNovaAba(res.clienteSalvo, winPre);
        setClientePdfModal(res.clienteSalvo);
      }
    } catch (err: any) {
      if (winPre && !winPre.closed) {
        winPre.close();
      }
      setFeedback({
        tipo: 'erro',
        texto: err?.message || 'Erro ao salvar cadastro no sorteio.'
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!clienteParaExcluir) return;
    const alvo = clienteParaExcluir;
    setClienteParaExcluir(null);

    const res = await excluirSorteioClienteApi(alvo.id, clientes);
    setClientes(res.listaAtualizada);
    if (editingId === alvo.id) {
      limparFormulario();
    }
    setFeedback({
      tipo: 'sucesso',
      texto: `Cadastro de "${alvo.nomeCliente}" removido com sucesso.`
    });
  };

  // Abre em nova aba com design oficial e aciona nativamente a opção de Baixar PDF / Imprimir sem travar o navegador
  const handleImprimirOuNovaAba = (cliente: SorteioCliente, janelaPreAberta?: Window | null) => {
    let win = janelaPreAberta;
    if (!win || win.closed) {
      win = window.open('', '_blank');
    }

    if (!win) {
      setClientePdfModal(cliente);
      return;
    }

    const htmlDoc = gerarHtmlCupomSorteio(
      cliente,
      logoBase64 || OFFICIAL_LOGO_URL,
      kitBase64 || KIT_PREMIOS_IMAGE_URL,
      true
    );

    win.document.open();
    win.document.write(htmlDoc);
    win.document.close();
  };

  // Ação de baixar PDF: rápida, direta e segura via renderização vetorial nativa do navegador
  const handleBaixarArquivoPdf = (cliente: SorteioCliente) => {
    setGerandoPdfId(cliente.id);
    try {
      handleImprimirOuNovaAba(cliente);
      setFeedback({
        tipo: 'sucesso',
        texto: `Documento oficial de "${cliente.nomeCliente}" aberto em nova aba pronto para Salvar como PDF ou Imprimir!`
      });
    } catch (err: any) {
      console.warn('Erro ao abrir documento:', err);
      setClientePdfModal(cliente);
    } finally {
      setTimeout(() => {
        setGerandoPdfId(null);
      }, 400);
    }
  };

  // Compartilhar via WhatsApp com o cliente
  const handleEnviarWhatsApp = (cliente: SorteioCliente) => {
    const digitos = cliente.telefone.replace(/\D/g, '');
    const ddiTelefone = digitos.startsWith('55') ? digitos : `55${digitos}`;
    const listaCuponsStr = (cliente.numerosCupons || []).map(n => `#${n}`).join(', ');
    const mensagem = [
      `✨ *NOVEMBRO PREMIADO OLOR LUZ* ✨`,
      ``,
      `Olá, *${cliente.nomeCliente}*! Seus cupons para o nosso sorteio já estão garantidos:`,
      ``,
      `🎟️ *Número(s) do(s) cupom(s):*`,
      `*${listaCuponsStr}*`,
      ``,
      `Preparamos um superkit com 5 itens especiais da Olor Luz! 🎁`,
      `• 1 difusor de ambiente de varetas`,
      `• 1 sabonete líquido para as mãos`,
      `• 1 kit com 6 mini aromatizadores spray`,
      `• 1 kit difusor elétrico + essência`,
      `• 1 Água de Lençóis 500 ml`,
      ``,
      `📅 *Participação:* de 1º a 30 de novembro.`,
      `🎁 *Sorteio:* 1º de dezembro.`,
      ``,
      `_As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias definidas._`,
      ``,
      `Boa sorte! 🍀✨`
    ].join('\n');

    const url = `https://wa.me/${ddiTelefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Realizar sorteio aleatório entre todos os cupons emitidos
  const handleRealizarSorteio = () => {
    const pool: { numero: number; cliente: SorteioCliente }[] = [];
    clientes.forEach(c => {
      (c.numerosCupons || []).forEach(num => {
        pool.push({ numero: num, cliente: c });
      });
    });

    if (pool.length === 0) return;

    setSorteandoAnimacao(true);
    setGanhadorSorteado(null);

    let contador = 0;
    const interval = setInterval(() => {
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      setCupomSorteadoNumero(randomItem.numero);
      contador++;
      if (contador >= 18) {
        clearInterval(interval);
        const vencedorFinal = pool[Math.floor(Math.random() * pool.length)];
        setCupomSorteadoNumero(vencedorFinal.numero);
        setGanhadorSorteado(vencedorFinal.cliente);
        setSorteandoAnimacao(false);
      }
    }, 80);
  };

  return (
    <div className="space-y-6">
      {/* BANNER SUPERIOR & INDICADORES DO SORTEIO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-medium">
                <span>Campanha Oficial Olor Luz</span>
                <span aria-hidden="true">·</span>
                <span>Cupons Sequenciais a partir do #100</span>
              </div>
              <h2 className="font-cinzel text-lg sm:text-2xl font-bold text-slate-100 tracking-wide mt-0.5">
                NOVEMBRO PREMIADO OLOR LUZ
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Participação: <strong className="text-amber-300">1º a 30 de novembro</strong> · Sorteio Oficial: <strong className="text-amber-300">1º de dezembro</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSorteadorAberto(true);
                setCupomSorteadoNumero(null);
                setGanhadorSorteado(null);
              }}
              disabled={totalCuponsEmitidos === 0}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trophy className="w-4 h-4" />
              <span>Sortear Cupom</span>
            </button>

            <button
              type="button"
              onClick={carregarClientes}
              disabled={loading}
              className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* KPIs Numéricos com Tabular Nums */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Clientes Participantes</span>
              <span className="text-2xl sm:text-3xl font-bold text-slate-100 font-mono tabular-nums mt-1 block">
                {clientes.length}
              </span>
            </div>
            <UserPlus className="w-8 h-8 text-amber-400/40" />
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Total de Cupons Emitidos</span>
              <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tabular-nums mt-1 block">
                {totalCuponsEmitidos}
              </span>
            </div>
            <Ticket className="w-8 h-8 text-amber-400/40" />
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Próximo Cupom Disponível</span>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
                #{proximoNumeroGlobal}
              </span>
            </div>
            <Hash className="w-8 h-8 text-emerald-400/40" />
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL: FORMULÁRIO CRUD (ESQUERDA) + RESUMO DO KIT (DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* FORMULÁRIO DE CADASTRO / EDIÇÃO DE CLIENTE */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>{editingId ? 'Editar Participante do Sorteio' : 'Cadastrar Cliente no Sorteio'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Os números dos cupons são gerados automaticamente em sequência a partir do número {CUPOM_INICIAL_SORTEIO}.
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={limparFormulario}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          {feedback && (
            <div
              className={`mb-5 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                feedback.tipo === 'sucesso'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                {feedback.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{feedback.texto}</span>
              </div>

              {feedback.clienteRecente && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setClientePdfModal(feedback.clienteRecente!)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Abrir / Baixar PDF</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={(e) => handleSalvar(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome do Cliente */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Ex: Maria Clara Oliveira"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                />
              </div>

              {/* Telefone com DDD */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Telefone com DDD *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefoneDDD(e.target.value))}
                    placeholder="(11) 98765-4321"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-sm text-slate-100 font-mono tabular-nums placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Quantidade de Cupons */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Número de Cupons (Quantidade) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const atual = Math.max(1, (Number(quantidadeCupons) || 1) - 1);
                      setQuantidadeCupons(String(atual));
                    }}
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors cursor-pointer"
                    aria-label="Diminuir cupons"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={quantidadeCupons}
                    onChange={(e) => setQuantidadeCupons(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-center text-base font-bold text-amber-300 font-mono tabular-nums outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const atual = Math.min(500, (Number(quantidadeCupons) || 1) + 1);
                      setQuantidadeCupons(String(atual));
                    }}
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-colors cursor-pointer"
                    aria-label="Aumentar cupons"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Atalhos rápidos de quantidade */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500 mr-1">Rápido:</span>
                  {[1, 2, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuantidadeCupons(String(n))}
                      className={`px-2 py-0.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
                        Number(quantidadeCupons) === n
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      +{n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Observação opcional */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Observação (Opcional)
              </label>
              <input
                type="text"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex: Compra realizada na loja / Pedido #104"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            {/* PREVIEW AUTOMÁTICO DOS NÚMEROS SEQUENCIAIS */}
            <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>Número(s) do(s) Cupom(ns) que serão atribuídos:</span>
                </span>
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {previewCuponsFormulario.length} cupom(ns)
                </span>
              </div>

              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto py-1">
                {previewCuponsFormulario.slice(0, 40).map((num) => (
                  <span
                    key={num}
                    className="px-3 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-extrabold text-sm sm:text-base rounded-lg tabular-nums"
                  >
                    #{num}
                  </span>
                ))}
                {previewCuponsFormulario.length > 40 && (
                  <span className="px-2.5 py-1 text-xs text-slate-400 font-mono self-center">
                    ... até #{previewCuponsFormulario[previewCuponsFormulario.length - 1]}
                  </span>
                )}
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={salvando}
                className="flex-1 py-3 px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {salvando
                    ? 'Salvando...'
                    : editingId
                    ? 'Salvar Alterações do Cliente'
                    : 'Cadastrar Cliente e Gerar Cupons'}
                </span>
              </button>

              <button
                type="button"
                disabled={salvando}
                onClick={(e) => handleSalvar(e as any, true)}
                className="py-3 px-5 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <FileDown className="w-4 h-4" />
                <span>{editingId ? 'Salvar e Baixar PDF' : 'Cadastrar + Baixar PDF'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* CARD DE PREVIEW DO KIT DE PRÊMIOS DA CAMPANHA */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="relative h-52 sm:h-60 bg-slate-950 overflow-hidden border-b border-slate-800">
            <img
              src={KIT_PREMIOS_IMAGE_URL}
              alt="Superkit 5 itens Olor Luz"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 25%' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <div>
                <span className="text-[11px] font-medium text-amber-300 block">
                  Prêmio Oficial da Campanha
                </span>
                <h4 className="font-cinzel text-base sm:text-lg font-bold text-white">
                  Superkit com 5 Itens Especiais
                </h4>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <ul className="space-y-2 text-xs sm:text-sm text-slate-200">
              {LISTA_PREMIOS_SORTEIO.map((premio, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{premio}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3">
                <span className="text-[11px] text-amber-300 font-semibold block">
                  📅 Participação
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5 block">
                  1º a 30 de novembro
                </span>
              </div>
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3">
                <span className="text-[11px] text-amber-300 font-semibold block">
                  🎁 Sorteio
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5 block">
                  1º de dezembro
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
              As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias definidas.
            </p>
          </div>
        </div>
      </div>

      {/* LISTAGEM / CRUD DE CLIENTES E EMISSÃO DE PDF */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              <span>Clientes Cadastrados & Cupons Emitidos</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clique em <strong>Baixar PDF</strong> ou <strong>Visualizar Cupom</strong> para gerar o encarte oficial com o logotipo Olor Luz.
            </p>
          </div>

          {/* Barra de Busca */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente, telefone ou nº cupom..."
              className="w-full pl-10 pr-8 py-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Carregando participantes do sorteio...
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              {busca ? 'Nenhum cliente ou cupom encontrado para esta busca.' : 'Nenhum cliente cadastrado no sorteio ainda.'}
            </p>
            <p className="text-xs text-slate-500">
              {busca
                ? 'Tente buscar por outro nome, telefone ou número de cupom.'
                : 'Utilize o formulário acima para cadastrar o primeiro cliente (iniciando no cupom #100).'}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {/* TABELA DESKTOP */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Telefone (DDD)</th>
                    <th className="py-3 px-4 text-center">Qtde</th>
                    <th className="py-3 px-4">Número(s) do(s) Cupom(ns)</th>
                    <th className="py-3 px-4 text-right">Ações & PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-950/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100">{cliente.nomeCliente}</div>
                        {cliente.obs && (
                          <div className="text-xs text-slate-400 mt-0.5">{cliente.obs}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap">
                        {cliente.telefone}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-300 tabular-nums">
                        {cliente.numerosCupons?.length || cliente.quantidadeCupons}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {(cliente.numerosCupons || []).map((num) => (
                            <span
                              key={num}
                              className="px-2.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-extrabold text-xs sm:text-sm rounded-md tabular-nums"
                            >
                              #{num}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleBaixarArquivoPdf(cliente)}
                            disabled={gerandoPdfId === cliente.id}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                            title="Baixar arquivo PDF do Sorteio"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>{gerandoPdfId === cliente.id ? 'Gerando...' : 'Baixar PDF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setClientePdfModal(cliente)}
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar Documento do Cupom"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleImprimirOuNovaAba(cliente)}
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Abrir em Nova Aba / Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEnviarWhatsApp(cliente)}
                            className="p-2 bg-slate-950 hover:bg-emerald-950/60 text-emerald-400 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Enviar Cupons por WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditarCliente(cliente)}
                            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar Cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setClienteParaExcluir(cliente)}
                            className="p-2 bg-slate-950 hover:bg-rose-950/60 text-rose-400 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CARDS MOBILE (Responsivo para Celular) */}
            <div className="md:hidden space-y-3">
              {clientesFiltrados.map((cliente) => (
                <div
                  key={cliente.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{cliente.nomeCliente}</h4>
                      <p className="text-xs font-mono text-slate-400 tabular-nums mt-0.5">
                        {cliente.telefone}
                      </p>
                      {cliente.obs && (
                        <p className="text-xs text-slate-400 mt-1">{cliente.obs}</p>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300 tabular-nums shrink-0">
                      {cliente.numerosCupons?.length || cliente.quantidadeCupons} cupom(ns)
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1.5">
                      Número(s) do(s) cupom(ns):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(cliente.numerosCupons || []).map((num) => (
                        <span
                          key={num}
                          className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-extrabold text-sm rounded-lg tabular-nums"
                        >
                          #{num}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleBaixarArquivoPdf(cliente)}
                      disabled={gerandoPdfId === cliente.id}
                      className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>{gerandoPdfId === cliente.id ? 'Gerando...' : 'Baixar PDF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientePdfModal(cliente)}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver Cupom</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleEnviarWhatsApp(cliente)}
                      className="flex-1 py-2 px-3 bg-slate-900 text-emerald-400 border border-slate-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditarCliente(cliente)}
                      className="py-2 px-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClienteParaExcluir(cliente)}
                      className="py-2 px-3 bg-slate-900 text-rose-400 border border-slate-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {clienteParaExcluir && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-slate-100">
                Confirmar Exclusão de Participante
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Deseja realmente remover o cadastro de <strong>{clienteParaExcluir.nomeCliente}</strong> (Cupom(ns):{' '}
              <span className="text-amber-300 font-mono">
                #{(clienteParaExcluir.numerosCupons || []).join(', #')}
              </span>
              )?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClienteParaExcluir(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SORTEADOR INTERATIVO */}
      {sorteadorAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-amber-400 font-cinzel font-bold">
                <Trophy className="w-5 h-5" />
                <span>SORTEADOR OFICIAL OLOR LUZ</span>
              </div>
              <button
                type="button"
                onClick={() => setSorteadorAberto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 px-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block">
                Número do Cupom Sorteado
              </span>
              <div className="text-5xl sm:text-6xl font-extrabold font-mono text-amber-400 tabular-nums py-2">
                {cupomSorteadoNumero !== null ? `#${cupomSorteadoNumero}` : '---'}
              </div>

              {ganhadorSorteado && (
                <div className="pt-3 border-t border-slate-800/80 space-y-1">
                  <span className="text-xs text-emerald-400 font-semibold block">
                    🎉 Ganhador(a) Identificado(a):
                  </span>
                  <h4 className="text-xl font-bold text-white">{ganhadorSorteado.nomeCliente}</h4>
                  <p className="text-xs font-mono text-slate-400">{ganhadorSorteado.telefone}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRealizarSorteio}
                disabled={sorteandoAnimacao || totalCuponsEmitidos === 0}
                className="flex-1 py-3 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer"
              >
                {sorteandoAnimacao ? 'Sorteando Cupom...' : 'Sortear Agora! 🎁'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREVIEW E DOWNLOAD DO DOCUMENTO PDF (A4) */}
      {clientePdfModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col overflow-y-auto">
          {/* Barra de Ferramentas Fixa no Topo do Modal */}
          <div className="sticky top-0 z-50 bg-slate-950 border-b border-slate-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={OFFICIAL_LOGO_URL}
                alt="Olor Luz"
                referrerPolicy="no-referrer"
                className="h-8 w-auto object-contain"
              />
              <div>
                <h4 className="font-cinzel text-sm sm:text-base font-bold text-amber-300">
                  NOVEMBRO PREMIADO OLOR LUZ
                </h4>
                <p className="text-xs text-slate-400">
                  Cliente: <strong className="text-slate-200">{clientePdfModal.nomeCliente}</strong> ({clientePdfModal.numerosCupons?.length} cupom(ns))
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBaixarArquivoPdf(clientePdfModal)}
                disabled={gerandoPdfId === clientePdfModal.id}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>
                  {gerandoPdfId === clientePdfModal.id ? 'Abrindo...' : 'Baixar PDF / Imprimir'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleImprimirOuNovaAba(clientePdfModal)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Abrir em Nova Aba</span>
              </button>

              <button
                type="button"
                onClick={() => setClientePdfModal(null)}
                className="px-3 py-2 bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Fechar</span>
              </button>
            </div>
          </div>

          {/* Área Central com a Folha A4 Oficial do Sorteio */}
          <div className="flex-1 flex justify-center p-3 sm:p-8 overflow-x-auto">
            <div
              ref={pdfContainerRef}
              style={{
                width: '760px',
                minWidth: '760px',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                borderRadius: '16px',
                border: '2px solid #D97706',
                overflow: 'hidden',
                fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}
            >
              {/* CABEÇALHO DO PDF COM LOGOTIPO OLOR LUZ E TÍTULO */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #090D16 0%, #1E293B 55%, #0F172A 100%)',
                  padding: '22px 28px 18px',
                  textAlign: 'center',
                  borderBottom: '4px solid #F59E0B'
                }}
              >
                <img
                  src={logoBase64 || OFFICIAL_LOGO_URL}
                  alt="Logo Oficial Olor Luz"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  style={{
                    height: '72px',
                    width: 'auto',
                    objectFit: 'contain',
                    margin: '0 auto 8px',
                    display: 'block'
                  }}
                />
                <h1
                  style={{
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: '25px',
                    fontWeight: 900,
                    color: '#FDE68A',
                    letterSpacing: '2px',
                    margin: 0,
                    textTransform: 'uppercase'
                  }}
                >
                  NOVEMBRO PREMIADO OLOR LUZ
                </h1>
              </div>

              {/* FAIXA DE IDENTIFICAÇÃO DO CLIENTE */}
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  borderBottom: '1px solid #FDE68A',
                  padding: '10px 26px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '13px',
                  color: '#78350F'
                }}
              >
                <div>
                  <strong>Cliente:</strong> {clientePdfModal.nomeCliente}
                </div>
                <div>
                  <strong>Telefone:</strong> {clientePdfModal.telefone}
                </div>
                <div>
                  <strong>Total de Cupons:</strong>{' '}
                  {clientePdfModal.numerosCupons?.length || clientePdfModal.quantidadeCupons}
                </div>
              </div>

              {/* CORPO DO DOCUMENTO */}
              <div style={{ padding: '20px 26px 24px' }}>
                {/* DESTAQUE BEM GRANDE PARA OS NÚMEROS DOS CUPONS */}
                <div
                  style={{
                    background: 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)',
                    border: '2px dashed #D97706',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    textAlign: 'center',
                    marginBottom: '20px'
                  }}
                >
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1.2px',
                      color: '#92400E',
                      margin: '0 0 12px 0'
                    }}
                  >
                    Número(s) do(s) cupom(s):
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: '12px'
                    }}
                  >
                    {(clientePdfModal.numerosCupons || []).map((numero) => (
                      <div
                        key={numero}
                        style={{
                          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                          color: '#FBBF24',
                          border: '2px solid #F59E0B',
                          borderRadius: '12px',
                          padding: '10px 22px',
                          fontSize: '36px',
                          fontWeight: 900,
                          lineHeight: 1,
                          letterSpacing: '1px',
                          fontVariantNumeric: 'tabular-nums'
                        }}
                      >
                        <span style={{ fontSize: '22px', color: '#FDE68A', marginRight: '2px' }}>
                          #
                        </span>
                        {numero}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEÇÃO DO SUPERKIT COM 5 ITENS + FOTO EM ALTA QUALIDADE */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.15fr 0.85fr',
                    gap: '20px',
                    alignItems: 'stretch',
                    marginBottom: '18px'
                  }}
                >
                  {/* Lista dos 5 Prêmios */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: '0 0 12px 0',
                        lineHeight: 1.35
                      }}
                    >
                      Preparamos um superkit com 5 itens especiais da Olor Luz!
                    </h2>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {LISTA_PREMIOS_SORTEIO.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '7px 0',
                            borderBottom:
                              idx === LISTA_PREMIOS_SORTEIO.length - 1
                                ? 'none'
                                : '1px solid #E2E8F0',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            color: '#1E293B'
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              fontSize: '11px',
                              fontWeight: 900,
                              flexShrink: 0
                            }}
                          >
                            ✦
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Foto Oficial do Kit de Prêmios */}
                  <div
                    style={{
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: '2px solid #F59E0B',
                      backgroundColor: '#0F172A',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <img
                      src={kitBase64 || KIT_PREMIOS_IMAGE_URL}
                      alt="Kit de Prêmios Olor Luz"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      style={{
                        width: '100%',
                        height: '245px',
                        objectFit: 'cover',
                        objectPosition: 'center 25%',
                        display: 'block'
                      }}
                    />
                    <div
                      style={{
                        backgroundColor: '#0F172A',
                        color: '#FDE68A',
                        textAlign: 'center',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                        padding: '6px 10px'
                      }}
                    >
                      Superkit Oficial • 5 Itens Exclusivos Olor Luz
                    </div>
                  </div>
                </div>

                {/* DESTAQUE PARA O PERÍODO DE PARTICIPAÇÃO E DATA DO SORTEIO */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.35fr',
                    gap: '14px',
                    marginBottom: '16px',
                    alignItems: 'stretch'
                  }}
                >
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                      border: '2px solid #F59E0B',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#FDE68A',
                        margin: 0,
                        lineHeight: 1.35
                      }}
                    >
                      📅 Participação: de 1º a 30 de novembro.
                    </p>
                  </div>

                  <div
                    style={{
                      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                      border: '2px solid #F59E0B',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <p
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        margin: 0,
                        lineHeight: 1.45
                      }}
                    >
                      <strong style={{ color: '#FDE68A', fontSize: '13px' }}>🎁 Sorteio: 1º de dezembro!</strong>{' '}
                      O vídeo do sorteio, com a divulgação do ganhador, será publicado na página oficial da Olor Luz no Instagram:{' '}
                      <strong style={{ color: '#FDE68A' }}>@olorluz</strong>.
                    </p>
                  </div>
                </div>

                {/* OBSERVAÇÃO SOBRE AS FRAGRÂNCIAS */}
                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FCD34D',
                    borderRadius: '10px',
                    padding: '11px 16px',
                    fontSize: '12px',
                    lineHeight: 1.5,
                    color: '#78350F',
                    textAlign: 'center',
                    fontWeight: 600
                  }}
                >
                  As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções
                  disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias
                  definidas.
                </div>

                {/* RODAPÉ DO CERTIFICADO */}
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '8px',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10.5px',
                    color: '#64748B'
                  }}
                >
                  <span>Olor Luz • Certificado Oficial de Participação</span>
                  <span>Emitido em {new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
