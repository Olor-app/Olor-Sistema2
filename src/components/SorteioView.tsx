import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
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

// Mascara o telefone do participante sorteado para privacidade: ex (34) 9****-3233 ou (34) ****-3233
export function mascararTelefonePrivacidade(telefone: string): string {
  if (!telefone) return '';
  const digitos = telefone.replace(/\D/g, '');
  if (digitos.length === 11) {
    const ddd = digitos.slice(0, 2);
    const nono = digitos[2];
    const ultimos4 = digitos.slice(7);
    return `(${ddd}) ${nono}****-${ultimos4}`;
  }
  if (digitos.length === 10) {
    const ddd = digitos.slice(0, 2);
    const ultimos4 = digitos.slice(6);
    return `(${ddd}) ****-${ultimos4}`;
  }
  if (digitos.length >= 8) {
    const ddd = digitos.length > 9 ? digitos.slice(0, 2) : '';
    const ultimos4 = digitos.slice(-4);
    return ddd ? `(${ddd}) ****-${ultimos4}` : `****-${ultimos4}`;
  }
  return telefone;
}

// Mascara o nome do participante sorteado para privacidade: ex "Tatiane Soares" vira "Tatiane S"
export function mascararNomeGanhador(nome: string): string {
  if (!nome) return '';
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0] || nome;

  const primeiroNome = partes[0];
  const preposicoes = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  const sobrenomes = partes.slice(1).filter(s => !preposicoes.has(s.toLowerCase()));

  const lista = sobrenomes.length > 0 ? sobrenomes : partes.slice(1);
  const iniciais = lista.map(s => s[0].toUpperCase()).join(' ');

  return `${primeiroNome} ${iniciais}`;
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

// Carrega a foto do kit em proporção 1:1 (quadrada) perfeitamente centralizada (50% / 50%)
// Como a foto original é 3114x3387 (quase quadrada, 0.92:1), o corte 1:1 remove apenas 4% da sobra de mesa no topo e 4% na base,
// preservando 100% da caixa preta, fita superior, logotipo circular dourado Olor Luz e laço inferior sem nenhum corte!
export async function carregarImagemKitCentralizada(url: string, targetAspect = 1.0): Promise<string> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });

    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;
    if (!origW || !origH) return url;

    const origAspect = origW / origH;
    let sx = 0, sy = 0, sw = origW, sh = origH;

    if (origAspect > targetAspect) {
      sw = origH * targetAspect;
      sx = (origW - sw) / 2;
    } else {
      sh = origW / targetAspect;
      sy = (origH - sh) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = Math.round(960 / targetAspect);
    const ctx = canvas.getContext('2d');
    if (!ctx) return url;

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.95);
  } catch {
    return carregarImagemComoBase64(url);
  }
}

// Calcula dimensões e estilos dinâmicos dos cupons para caberem em uma única linha sem quebrar
export function getCouponBadgeStyles(count: number) {
  if (count <= 1) {
    return {
      fontSize: '32px',
      hashSize: '18px',
      padding: '7px 22px',
      gap: '8px',
      borderWidth: '2px'
    };
  }
  if (count === 2) {
    return {
      fontSize: '24px',
      hashSize: '15px',
      padding: '5px 16px',
      gap: '8px',
      borderWidth: '2px'
    };
  }
  if (count === 3) {
    return {
      fontSize: '20px',
      hashSize: '13px',
      padding: '4px 12px',
      gap: '6px',
      borderWidth: '1.5px'
    };
  }
  if (count === 4) {
    return {
      fontSize: '17px',
      hashSize: '11px',
      padding: '4px 10px',
      gap: '6px',
      borderWidth: '1.5px'
    };
  }
  if (count === 5) {
    return {
      fontSize: '14.5px',
      hashSize: '10px',
      padding: '3px 8px',
      gap: '5px',
      borderWidth: '1.5px'
    };
  }
  if (count <= 8) {
    return {
      fontSize: '13px',
      hashSize: '9px',
      padding: '3px 6px',
      gap: '4px',
      borderWidth: '1px'
    };
  }
  return {
    fontSize: '11px',
    hashSize: '8px',
    padding: '2px 5px',
    gap: '3px',
    borderWidth: '1px'
  };
}

// Gera o documento HTML do Cupom/Certificado do Sorteio com layout travado em proporção desktop/A4 tanto no PC quanto no Celular (1 única página, sem cortes e sem desconfigurar no mobile)
function gerarHtmlCupomSorteio(
  cliente: SorteioCliente,
  logoUrl: string,
  kitUrl: string,
  modoNovaAba: boolean
): string {
  const totalCupons = (cliente.numerosCupons || []).length || 1;
  const badgeStyle = getCouponBadgeStyles(totalCupons);

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
  <meta name="viewport" content="width=840, user-scalable=yes" />
  <title>NOVEMBRO PREMIADO OLOR LUZ - ${cliente.nomeCliente}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 210mm 184mm;
      margin: 0 !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      min-width: 794px;
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
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      min-width: 794px;
    }
    .top-bar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #FDE68A;
      font-family: 'Cinzel', Georgia, serif;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 1.2px;
    }
    .top-bar-brand img {
      height: 30px;
      width: auto;
    }
    .btn-print {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #0F172A;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 12.5px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
      white-space: nowrap;
    }
    .page-wrap {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 18px 14px 28px;
      min-width: 794px;
    }
    `
        : `
    .page-wrap {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 0;
      min-width: 794px;
    }
    `
    }
    .sheet {
      width: 794px;
      min-width: 794px;
      max-width: 794px;
      flex-shrink: 0;
      height: auto;
      background: #FFFFFF;
      border-radius: 14px;
      border: 2px solid #D97706;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: ${modoNovaAba ? '0 16px 45px rgba(0,0,0,0.5)' : 'none'};
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      page-break-before: avoid !important;
      break-before: avoid !important;
    }
    .header-banner {
      background: linear-gradient(135deg, #090D16 0%, #1E293B 55%, #0F172A 100%);
      padding: 13px 20px 10px;
      text-align: center;
      border-bottom: 3px solid #F59E0B;
    }
    .logo-img {
      height: 50px;
      width: auto;
      object-fit: contain;
      margin: 0 auto 4px;
      display: block;
      filter: none !important;
    }
    .main-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 21px;
      font-weight: 900;
      color: #FDE68A;
      letter-spacing: 1.6px;
      margin: 0;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .client-bar {
      background-color: #FFFBEB;
      border-bottom: 1px solid #FDE68A;
      padding: 7px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      white-space: nowrap;
      font-size: 12px;
      color: #78350F;
    }
    .body-content {
      display: flex;
      flex-direction: column;
      padding: 12px 18px 12px;
    }
    .coupons-section {
      background: linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%);
      border: 1.5px dashed #D97706;
      border-radius: 12px;
      padding: 10px 14px;
      text-align: center;
      margin-bottom: 11px;
      box-shadow: none !important;
    }
    .coupons-label {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.1px;
      color: #92400E;
      margin: 0 0 6px 0;
    }
    .coupons-grid {
      display: flex;
      flex-wrap: nowrap !important;
      justify-content: center;
      align-items: center;
      gap: ${badgeStyle.gap};
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      white-space: nowrap !important;
    }
    .coupon-badge {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: #FBBF24;
      border: ${badgeStyle.borderWidth} solid #F59E0B;
      border-radius: 8px;
      padding: ${badgeStyle.padding};
      font-size: ${badgeStyle.fontSize};
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: 0.5px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap !important;
      flex-shrink: 1;
      min-width: 0;
      box-shadow: none !important;
    }
    .coupon-hash {
      font-size: ${badgeStyle.hashSize};
      color: #FDE68A;
      margin-right: 2px;
      font-weight: 700;
    }
    .kit-grid {
      display: grid;
      grid-template-columns: 1.92fr 1fr;
      gap: 12px;
      align-items: stretch;
      margin-bottom: 11px;
    }
    .prizes-box {
      min-width: 0;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .prizes-heading {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 8px 0;
      line-height: 1.35;
    }
    .prizes-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      flex: 1;
    }
    .prize-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
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
      width: 100%;
      min-width: 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1.5px solid #F59E0B;
      background-color: #0F172A;
      display: flex;
      flex-direction: column;
      box-shadow: none !important;
    }
    .image-frame {
      width: 100%;
      aspect-ratio: 1 / 1;
      background-color: #C9B59C;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: none !important;
    }
    .image-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center center;
      display: block;
      box-shadow: none !important;
    }
    .image-caption {
      background-color: #0F172A;
      color: #FDE68A;
      text-align: center;
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.7px;
      text-transform: uppercase;
      padding: 6px 6px;
      border-top: 1px solid rgba(245, 158, 11, 0.4);
    }
    .dates-grid {
      display: grid;
      grid-template-columns: 1fr 1.35fr;
      gap: 10px;
      margin-bottom: 10px;
      align-items: stretch;
    }
    .date-highlight {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border: 1.5px solid #F59E0B;
      border-radius: 10px;
      padding: 9px 12px;
      text-align: center;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-shadow: none !important;
    }
    .date-highlight-sorteio {
      padding: 9px 12px;
    }
    .date-highlight-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #FDE68A;
      margin: 0;
      line-height: 1.35;
    }
    .date-highlight-sorteio-text {
      font-size: 11px;
      font-weight: 600;
      color: #FFFFFF;
      margin: 0;
      line-height: 1.4;
    }
    .obs-box {
      background-color: #FFFBEB;
      border: 1px solid #FCD34D;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 10.5px;
      line-height: 1.4;
      color: #78350F;
      text-align: center;
      font-weight: 600;
      margin-bottom: 8px;
      box-shadow: none !important;
    }
    .obs-line {
      margin: 0 0 4px 0;
    }
    .obs-line:last-child {
      margin-bottom: 0;
    }
    .doc-footer {
      margin-top: 2px;
      padding-top: 6px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748B;
    }
    @media print {
      html, body {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        overflow: hidden !important;
        background: #FFFFFF !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .top-bar { display: none !important; }
      .page-wrap {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        overflow: hidden !important;
      }
      .sheet {
        box-shadow: none !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        border: 2px solid #D97706 !important;
        border-radius: 10px !important;
        overflow: hidden !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
        page-break-inside: avoid !important;
        break-after: avoid !important;
        break-before: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
  <style id="dynamic-page-size"></style>
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
    <button class="btn-print" onclick="acionarImpressaoAjustada()">🖨️ Baixar PDF / Imprimir Agora</button>
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
          <div class="coupons-grid" id="coupons-grid-row">
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
            <div class="image-frame">
              <img id="kit-img-el" src="${kitUrl}" alt="Superkit Olor Luz" referrerpolicy="no-referrer" />
            </div>
            <div class="image-caption">Superkit Oficial • 5 Itens Exclusivos Olor Luz</div>
          </div>
        </div>
        <div class="dates-grid">
          <div class="date-highlight">
            <p class="date-highlight-title">📅 Participação: de 1º a 30 de novembro.</p>
          </div>
          <div class="date-highlight date-highlight-sorteio">
            <p class="date-highlight-sorteio-text"><strong style="color: #FDE68A; font-size: 12px;">🎁 Sorteio: 1º de dezembro!</strong> O vídeo do sorteio, com a divulgação do ganhador, será publicado na página oficial da Olor Luz no Instagram: <strong style="color: #FDE68A;">@olorluz</strong>.</p>
          </div>
        </div>
        <div class="obs-box">
          <p class="obs-line">As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias definidas.</p>
          <p class="obs-line"><strong>Prazo de retirada:</strong> O ganhador terá o prazo de 30 dias úteis após a data do sorteio para reclamar o prêmio.</p>
          <p class="obs-line"><strong>Entrega:</strong> Para ganhadores de Uberaba, o super kit será entregue pela Olor Luz, mediante agendamento, sem cobrança de taxa. Para ganhadores de outras cidades, o custo do frete para envio será de responsabilidade do ganhador.</p>
        </div>
        <div class="doc-footer">
          <span>Olor Luz • Certificado Oficial de Participação</span>
          <span>Emitido em ${dataAtual}</span>
        </div>
      </div>
    </div>
  </div>
  <script>
    function ajustarDocumentoAoConteudo() {
      try {
        var sheet = document.getElementById('sorteio-folha-pdf');
        if (!sheet) return;

        // 1. Garante que a linha de cupons nunca quebre nem transborde, autoajustando se houver muitos cupons
        var grid = document.getElementById('coupons-grid-row');
        if (grid && grid.scrollWidth > grid.clientWidth) {
          var ratio = grid.clientWidth / grid.scrollWidth;
          var badges = grid.querySelectorAll('.coupon-badge');
          for (var i = 0; i < badges.length; i++) {
            var b = badges[i];
            var curFs = parseFloat(window.getComputedStyle(b).fontSize) || 14;
            var newFs = Math.max(7.5, curFs * ratio * 0.94);
            b.style.fontSize = newFs.toFixed(1) + 'px';
            b.style.padding = '2px ' + Math.max(3, Math.floor(6 * ratio)) + 'px';
          }
          grid.style.gap = '3px';
        }

        // 2. Mede a altura exata da folha (.sheet) na largura oficial de 794px (210mm)
        // Nunca usa uma largura reduzida de tela mobile para não espremer a folha no @media print
        var dynStyle = document.getElementById('dynamic-page-size');
        if (dynStyle) {
          var hPx = Math.ceil(sheet.offsetHeight || sheet.getBoundingClientRect().height || 740);
          if (hPx > 0) {
            var hMm = ((hPx + 2) * 25.4 / 96).toFixed(2);
            dynStyle.textContent =
              '@page { size: 210mm ' + hMm + 'mm !important; margin: 0 !important; } ' +
              '@media print { ' +
              '  html, body, .page-wrap { ' +
              '    width: 100% !important; ' +
              '    min-width: 100% !important; ' +
              '    max-width: 100% !important; ' +
              '    height: auto !important; ' +
              '    max-height: ' + hMm + 'mm !important; ' +
              '    overflow: hidden !important; ' +
              '    margin: 0 !important; ' +
              '    padding: 0 !important; ' +
              '  } ' +
              '  .sheet { ' +
              '    width: 100% !important; ' +
              '    min-width: 100% !important; ' +
              '    max-width: 100% !important; ' +
              '    height: auto !important; ' +
              '    max-height: ' + hMm + 'mm !important; ' +
              '    overflow: hidden !important; ' +
              '    margin: 0 !important; ' +
              '    page-break-inside: avoid !important; ' +
              '    break-inside: avoid !important; ' +
              '    page-break-after: avoid !important; ' +
              '    break-after: avoid !important; ' +
              '  } ' +
              '}';
          }
        }
      } catch (err) {}
    }

    function acionarImpressaoAjustada() {
      ajustarDocumentoAoConteudo();
      window.print();
    }

    window.addEventListener('DOMContentLoaded', ajustarDocumentoAoConteudo);
    window.addEventListener('resize', ajustarDocumentoAoConteudo);
    window.addEventListener('beforeprint', ajustarDocumentoAoConteudo);

    var kitImg = document.getElementById('kit-img-el');
    if (kitImg) {
      kitImg.addEventListener('load', ajustarDocumentoAoConteudo);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(ajustarDocumentoAoConteudo);
    }

    ${
      modoNovaAba
        ? `
    window.addEventListener('load', function() {
      ajustarDocumentoAoConteudo();
      setTimeout(function() {
        ajustarDocumentoAoConteudo();
        try {
          window.print();
        } catch (e) {}
      }, 450);
    });
    `
        : ''
    }
  </script>
</body>
</html>`;
}

// Cache em memória dos elementos HTMLImageElement para geração instantânea (<30ms) do PDF sem perder o gesto de clique do navegador
const cacheElementosImagem = new Map<string, HTMLImageElement>();

// Auxiliar para carregar imagem HTMLImageElement de forma segura e instantânea quando já em cache
async function carregarElementoImagem(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  const emCache = cacheElementosImagem.get(src);
  if (emCache && emCache.complete && emCache.naturalWidth > 0) {
    return emCache;
  }
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      cacheElementosImagem.set(src, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Auxiliar para desenhar retângulo arredondado no Canvas 2D
function desenharRetanguloArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Auxiliar para quebrar texto em múltiplas linhas no Canvas 2D
function quebrarTextoCanvas(ctx: CanvasRenderingContext2D, texto: string, maxWidth: number): string[] {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let linhaAtual = '';
  for (const p of palavras) {
    const teste = linhaAtual ? `${linhaAtual} ${p}` : p;
    if (ctx.measureText(teste).width > maxWidth && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = p;
    } else {
      linhaAtual = teste;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

// Compacta lista de números de cupons para URL curta (ex: [108,109,110] -> "108-110")
function compactarNumerosCupons(numeros: number[]): string {
  if (!numeros || numeros.length === 0) return '';
  const ordenados = [...numeros].sort((a, b) => a - b);
  const partes: string[] = [];
  let inicio = ordenados[0];
  let fim = ordenados[0];

  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i] === fim + 1) {
      fim = ordenados[i];
    } else {
      partes.push(inicio === fim ? `${inicio}` : `${inicio}-${fim}`);
      inicio = ordenados[i];
      fim = ordenados[i];
    }
  }
  partes.push(inicio === fim ? `${inicio}` : `${inicio}-${fim}`);
  return partes.join(',');
}

// Expande string compactada de cupons de volta para array numérico
function expandirNumerosCupons(compacto: string): number[] {
  if (!compacto) return [];
  const resultado: number[] = [];
  const partes = compacto.split(',');
  for (const p of partes) {
    if (p.includes('-')) {
      const [iniStr, fimStr] = p.split('-');
      const ini = parseInt(iniStr, 10);
      const fim = parseInt(fimStr, 10);
      if (!isNaN(ini) && !isNaN(fim) && fim >= ini && fim - ini <= 1000) {
        for (let n = ini; n <= fim; n++) resultado.push(n);
      }
    } else {
      const n = parseInt(p, 10);
      if (!isNaN(n)) resultado.push(n);
    }
  }
  return resultado;
}

// Codifica os dados do cupom em Base64URL seguro para UTF-8 (link direto de download do PDF no WhatsApp)
export function codificarCupomUrl(cliente: SorteioCliente): string {
  try {
    const cuponsStr = compactarNumerosCupons(cliente.numerosCupons || []);
    const payload = `${cliente.nomeCliente || 'Cliente'}|${cliente.telefone || ''}|${cuponsStr}|${cliente.dataCadastro || ''}`;
    const bytes = new TextEncoder().encode(payload);
    let bin = '';
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

// Decodifica o parâmetro ?cupom= da URL para exibir e baixar o PDF oficial sem exigir login
export function decodificarCupomUrl(codigo: string): SorteioCliente | null {
  try {
    if (!codigo) return null;
    const base64 = codigo.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    const [nomeCliente, telefone, cuponsStr, dataCadastro] = decoded.split('|');
    if (!nomeCliente) return null;
    const numerosCupons = expandirNumerosCupons(cuponsStr || '');
    return {
      id: 'cupom-publico',
      nomeCliente,
      telefone: telefone || '',
      numerosCupons: numerosCupons.length > 0 ? numerosCupons : [100],
      quantidadeCupons: numerosCupons.length || 1,
      dataCadastro: dataCadastro || new Date().toISOString().slice(0, 10)
    };
  } catch {
    return null;
  }
}

// Renderiza o Certificado Oficial de Participação em um Canvas 2.5x Retina com o layout EXATO do "Baixar PDF"
export async function gerarCanvasCertificadoSorteio(
  cliente: SorteioCliente,
  logoBase64: string,
  kitBase64: string
): Promise<{ canvas: HTMLCanvasElement; widthPx: number; heightPx: number }> {
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const [logoImg, kitImg] = await Promise.all([
    carregarElementoImagem(logoBase64 || OFFICIAL_LOGO_URL),
    carregarElementoImagem(kitBase64 || KIT_PREMIOS_IMAGE_URL)
  ]);

  const W = 794; // Largura exata de 210mm a 96 DPI
  const innerX = 18;
  const innerW = W - 36; // 758px
  const fontSans = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const fontSerif = "'Cinzel', Georgia, serif";

  // Mede as linhas das 3 observações para calcular a altura exata do documento
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d')!;
  mCtx.font = `600 10.5px ${fontSans}`;

  const obsParagrafos = [
    'As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias definidas.',
    'Prazo de retirada: O ganhador terá o prazo de 30 dias úteis após a data do sorteio para reclamar o prêmio.',
    'Entrega: Para ganhadores de Uberaba, o super kit será entregue pela Olor Luz, mediante agendamento, sem cobrança de taxa. Para ganhadores de outras cidades, o custo do frete para envio será de responsabilidade do ganhador.'
  ];

  const obsLinhasPorParagrafo = obsParagrafos.map((p) => quebrarTextoCanvas(mCtx, p, innerW - 28));
  const totalObsLinhas = obsLinhasPorParagrafo.reduce((acc, l) => acc + l.length, 0);
  const obsLineHeight = 14.5;
  const obsParaGap = 4;
  const obsH = Math.ceil(totalObsLinhas * obsLineHeight + (obsParagrafos.length - 1) * obsParaGap + 18);

  const headerH = 96;
  const clientBarH = 31;
  const couponsH = 78;
  const kitGridH = 274; // 248px foto 1:1 + 26px legenda
  const datesH = 68;
  const footerH = 26;

  // Altura total exata do certificado (sem margem branca sobrando)
  const H = headerH + clientBarH + 12 + couponsH + 11 + kitGridH + 11 + datesH + 10 + obsH + 8 + footerH + 10;

  const scale = 2.5;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // Fundo Branco Geral
  ctx.fillStyle = '#FFFFFF';
  desenharRetanguloArredondado(ctx, 1, 1, W - 2, H - 2, 12);
  ctx.fill();

  // 1. CABEÇALHO ESCURO (.header-banner)
  ctx.save();
  desenharRetanguloArredondado(ctx, 1, 1, W - 2, headerH, 12);
  ctx.clip();
  const headerGrad = ctx.createLinearGradient(0, 0, W, headerH);
  headerGrad.addColorStop(0, '#090D16');
  headerGrad.addColorStop(0.55, '#1E293B');
  headerGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, W, headerH);

  // Linha dourada na base do cabeçalho
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, headerH - 3, W, 3);

  // Logotipo Olor Luz mantendo proporção natural exata (sem achatar nem esticar)
  if (logoImg && logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
    const logoH = 50;
    const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
    ctx.drawImage(logoImg, (W - logoW) / 2, 10, logoW, logoH);
  }

  // Título Principal
  ctx.fillStyle = '#FDE68A';
  ctx.font = `900 21px ${fontSerif}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NOVEMBRO PREMIADO OLOR LUZ', W / 2, 76);
  ctx.restore();

  // 2. FAIXA DE IDENTIFICAÇÃO DO CLIENTE (.client-bar)
  const clientBarY = headerH;
  ctx.fillStyle = '#FFFBEB';
  ctx.fillRect(2, clientBarY, W - 4, clientBarH);
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, clientBarY + clientBarH);
  ctx.lineTo(W - 2, clientBarY + clientBarH);
  ctx.stroke();

  ctx.fillStyle = '#78350F';
  ctx.font = `700 12px ${fontSans}`;
  ctx.textBaseline = 'middle';
  const clientTextY = clientBarY + clientBarH / 2 + 0.5;

  ctx.textAlign = 'left';
  ctx.fillText(`CLIENTE: ${cliente.nomeCliente}`, 20, clientTextY);

  ctx.textAlign = 'center';
  ctx.fillText(`TELEFONE: ${cliente.telefone}`, W / 2, clientTextY);

  const totalCupons = cliente.numerosCupons?.length || cliente.quantidadeCupons || 1;
  ctx.textAlign = 'right';
  ctx.fillText(`QTDE DE CUPONS: ${totalCupons}`, W - 20, clientTextY);

  // 3. SEÇÃO DE CUPONS (.coupons-section)
  let curY = clientBarY + clientBarH + 12;
  const couponsGrad = ctx.createLinearGradient(0, curY, 0, curY + couponsH);
  couponsGrad.addColorStop(0, '#FFFBEB');
  couponsGrad.addColorStop(1, '#FEF3C7');
  ctx.fillStyle = couponsGrad;
  desenharRetanguloArredondado(ctx, innerX, curY, innerW, couponsH, 12);
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  desenharRetanguloArredondado(ctx, innerX, curY, innerW, couponsH, 12);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#92400E';
  ctx.font = `800 12px ${fontSans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NÚMERO(S) DO(S) CUPOM(S):', W / 2, curY + 19);

  // Badges dos cupons em linha única com autoajuste idêntico ao HTML
  const cupons = cliente.numerosCupons || [];
  const count = cupons.length || 1;
  let bFont = count <= 1 ? 28 : count === 2 ? 23 : count === 3 ? 20 : count === 4 ? 17 : count === 5 ? 15 : count <= 8 ? 13 : 11;
  let bPadX = count <= 1 ? 20 : count === 2 ? 16 : count === 3 ? 13 : count === 4 ? 11 : count === 5 ? 10 : 7;
  let bHeight = count <= 1 ? 40 : count === 2 ? 36 : count <= 4 ? 33 : 30;
  let bGap = count <= 3 ? 8 : count <= 5 ? 6 : 4;

  // Verifica se todos cabem na largura disponível e reduz proporcionalmente se necessário
  ctx.font = `900 ${bFont}px ${fontSans}`;
  const maxRowW = innerW - 28;
  let badgeWidths = cupons.map((n) => Math.ceil(ctx.measureText(`#${n}`).width + bPadX * 2));
  let totalRowW = badgeWidths.reduce((a, b) => a + b, 0) + (count - 1) * bGap;

  if (totalRowW > maxRowW && totalRowW > 0) {
    const ratio = (maxRowW / totalRowW) * 0.95;
    bFont = Math.max(8, bFont * ratio);
    bPadX = Math.max(4, bPadX * ratio);
    bGap = Math.max(3, bGap * ratio);
    ctx.font = `900 ${bFont}px ${fontSans}`;
    badgeWidths = cupons.map((n) => Math.ceil(ctx.measureText(`#${n}`).width + bPadX * 2));
    totalRowW = badgeWidths.reduce((a, b) => a + b, 0) + (count - 1) * bGap;
  }

  let bx = (W - totalRowW) / 2;
  const by = curY + 32 + (36 - bHeight) / 2;

  cupons.forEach((num, idx) => {
    const bw = badgeWidths[idx];
    const bGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bHeight);
    bGrad.addColorStop(0, '#0F172A');
    bGrad.addColorStop(1, '#1E293B');
    ctx.fillStyle = bGrad;
    desenharRetanguloArredondado(ctx, bx, by, bw, bHeight, 8);
    ctx.fill();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = count <= 2 ? 2 : 1.5;
    desenharRetanguloArredondado(ctx, bx, by, bw, bHeight, 8);
    ctx.stroke();

    ctx.fillStyle = '#FBBF24';
    ctx.font = `900 ${bFont}px ${fontSans}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${num}`, bx + bw / 2, by + bHeight / 2 + 1);

    bx += bw + bGap;
  });

  // 4. SEÇÃO DO SUPERKIT E FOTO 1:1 (.kit-grid)
  curY += couponsH + 11;
  const imgBoxW = 248;
  const kitGap = 12;
  const prizesBoxW = innerW - imgBoxW - kitGap; // 498px

  // Caixa da Esquerda: Lista de Prêmios
  ctx.fillStyle = '#F8FAFC';
  desenharRetanguloArredondado(ctx, innerX, curY, prizesBoxW, kitGridH, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  desenharRetanguloArredondado(ctx, innerX, curY, prizesBoxW, kitGridH, 12);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `800 14px ${fontSans}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Preparamos um superkit com 5 itens especiais da Olor Luz!', innerX + 16, curY + 15);

  const listStartY = curY + 46;
  const listAvailH = kitGridH - 54;
  const itemStepH = listAvailH / LISTA_PREMIOS_SORTEIO.length;

  LISTA_PREMIOS_SORTEIO.forEach((item, idx) => {
    const itemCenterY = listStartY + idx * itemStepH + itemStepH / 2;

    // Círculo dourado com estrela
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(innerX + 25, itemCenterY, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#B45309';
    ctx.font = `900 10px ${fontSans}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', innerX + 25, itemCenterY + 0.5);

    // Texto do item
    ctx.fillStyle = '#1E293B';
    ctx.font = `700 12.5px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item, innerX + 42, itemCenterY + 0.5);

    // Linha divisória sutil
    if (idx < LISTA_PREMIOS_SORTEIO.length - 1) {
      const lineY = listStartY + (idx + 1) * itemStepH;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(innerX + 16, lineY);
      ctx.lineTo(innerX + prizesBoxW - 16, lineY);
      ctx.stroke();
    }
  });

  // Caixa da Direita: Foto 1:1 Quadrada sem cortes (.image-box)
  const imgBoxX = innerX + prizesBoxW + kitGap;
  ctx.save();
  desenharRetanguloArredondado(ctx, imgBoxX, curY, imgBoxW, kitGridH, 12);
  ctx.fillStyle = '#0F172A';
  ctx.fill();
  ctx.clip();

  // Frame 1:1 (248x248)
  ctx.fillStyle = '#C9B59C';
  ctx.fillRect(imgBoxX, curY, imgBoxW, imgBoxW);
  if (kitImg && kitImg.naturalWidth > 0 && kitImg.naturalHeight > 0) {
    const kAspect = kitImg.naturalWidth / kitImg.naturalHeight;
    let dw = imgBoxW;
    let dh = imgBoxW;
    let dx = imgBoxX;
    let dy = curY;
    if (kAspect > 1) {
      dh = imgBoxW / kAspect;
      dy = curY + (imgBoxW - dh) / 2;
    } else if (kAspect < 1) {
      dw = imgBoxW * kAspect;
      dx = imgBoxX + (imgBoxW - dw) / 2;
    }
    ctx.drawImage(kitImg, dx, dy, dw, dh);
  }

  // Legenda inferior da foto
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(imgBoxX, curY + imgBoxW, imgBoxW, kitGridH - imgBoxW);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(imgBoxX, curY + imgBoxW);
  ctx.lineTo(imgBoxX + imgBoxW, curY + imgBoxW);
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.font = `800 9.2px ${fontSans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SUPERKIT OFICIAL • 5 ITENS EXCLUSIVOS OLOR LUZ', imgBoxX + imgBoxW / 2, curY + imgBoxW + 13);
  ctx.restore();

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.5;
  desenharRetanguloArredondado(ctx, imgBoxX, curY, imgBoxW, kitGridH, 12);
  ctx.stroke();

  // 5. SEÇÃO DE DATAS E SORTEIO (.dates-grid)
  curY += kitGridH + 11;
  const dateGap = 10;
  const dateBox1W = Math.round((innerW - dateGap) * 0.425); // ~318px
  const dateBox2W = innerW - dateGap - dateBox1W; // ~430px

  // Caixa 1: Participação
  const dGrad1 = ctx.createLinearGradient(innerX, curY, innerX + dateBox1W, curY + datesH);
  dGrad1.addColorStop(0, '#0F172A');
  dGrad1.addColorStop(1, '#1E293B');
  ctx.fillStyle = dGrad1;
  desenharRetanguloArredondado(ctx, innerX, curY, dateBox1W, datesH, 10);
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.5;
  desenharRetanguloArredondado(ctx, innerX, curY, dateBox1W, datesH, 10);
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.font = `800 12.5px ${fontSans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📅 Participação: de 1º a 30 de novembro.', innerX + dateBox1W / 2, curY + datesH / 2);

  // Caixa 2: Sorteio
  const box2X = innerX + dateBox1W + dateGap;
  const dGrad2 = ctx.createLinearGradient(box2X, curY, box2X + dateBox2W, curY + datesH);
  dGrad2.addColorStop(0, '#0F172A');
  dGrad2.addColorStop(1, '#1E293B');
  ctx.fillStyle = dGrad2;
  desenharRetanguloArredondado(ctx, box2X, curY, dateBox2W, datesH, 10);
  ctx.fill();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.5;
  desenharRetanguloArredondado(ctx, box2X, curY, dateBox2W, datesH, 10);
  ctx.stroke();

  ctx.fillStyle = '#FDE68A';
  ctx.font = `800 11.8px ${fontSans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎁 Sorteio: 1º de dezembro! O vídeo do sorteio, com a divulgação', box2X + dateBox2W / 2, curY + 19);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 11px ${fontSans}`;
  ctx.fillText('do ganhador, será publicado na página oficial da Olor Luz no', box2X + dateBox2W / 2, curY + 36);
  ctx.fillStyle = '#FDE68A';
  ctx.font = `800 11px ${fontSans}`;
  ctx.fillText('Instagram: @olorluz.', box2X + dateBox2W / 2, curY + 51);

  // 6. CAIXA DE OBSERVAÇÕES (.obs-box) COM AS 3 OBSERVAÇÕES OFICIAIS
  curY += datesH + 10;
  ctx.fillStyle = '#FFFBEB';
  desenharRetanguloArredondado(ctx, innerX, curY, innerW, obsH, 10);
  ctx.fill();
  ctx.strokeStyle = '#FCD34D';
  ctx.lineWidth = 1;
  desenharRetanguloArredondado(ctx, innerX, curY, innerW, obsH, 10);
  ctx.stroke();

  ctx.fillStyle = '#78350F';
  ctx.font = `600 10.5px ${fontSans}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  let obsCurY = curY + 9;
  obsLinhasPorParagrafo.forEach((linhasPara, pIdx) => {
    linhasPara.forEach((linha) => {
      ctx.fillText(linha, W / 2, obsCurY);
      obsCurY += obsLineHeight;
    });
    if (pIdx < obsLinhasPorParagrafo.length - 1) {
      obsCurY += obsParaGap;
    }
  });

  // 7. RODAPÉ (.doc-footer)
  curY += obsH + 8;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, curY);
  ctx.lineTo(innerX + innerW, curY);
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = `500 10px ${fontSans}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('Olor Luz • Certificado Oficial de Participação', innerX, curY + 14);

  ctx.textAlign = 'right';
  ctx.fillText(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, innerX + innerW, curY + 14);

  // Borda Externa Dourada (.sheet)
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 2;
  desenharRetanguloArredondado(ctx, 1, 1, W - 2, H - 2, 12);
  ctx.stroke();

  return { canvas, widthPx: W, heightPx: H };
}

// Gera o arquivo Blob PDF oficial (1 página auto-dimensionada) a partir do Canvas 2.5x Retina idêntico ao "Baixar PDF"
export async function gerarBlobPdfSorteio(
  cliente: SorteioCliente,
  logoBase64: string,
  kitBase64: string
): Promise<Blob> {
  const { canvas, widthPx, heightPx } = await gerarCanvasCertificadoSorteio(cliente, logoBase64, kitBase64);

  // Converte para PDF de página única auto-dimensionada (210mm x altura exata proporcional)
  const pageWidthMm = 210;
  const pageHeightMm = Number(((heightPx * pageWidthMm) / widthPx).toFixed(2));

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
    compress: true
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.96);
  doc.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');

  return doc.output('blob');
}

export const SorteioView: React.FC<SorteioViewProps> = ({ currentUser }) => {
  const [clientes, setClientes] = useState<SorteioCliente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [gerandoPdfId, setGerandoPdfId] = useState<string | null>(null);
  const [enviandoWhatsAppId, setEnviandoWhatsAppId] = useState<string | null>(null);

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
    // Pré-carrega imagens em Base64 e em HTMLImageElement para geração instantânea do PDF no clique do WhatsApp
    carregarElementoImagem(OFFICIAL_LOGO_URL);
    carregarElementoImagem(KIT_PREMIOS_IMAGE_URL);
    carregarImagemComoBase64(OFFICIAL_LOGO_URL).then((b64) => {
      setLogoBase64(b64);
      carregarElementoImagem(b64);
    });
    carregarImagemKitCentralizada(KIT_PREMIOS_IMAGE_URL, 1.0).then((b64) => {
      setKitBase64(b64);
      carregarElementoImagem(b64);
    });
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

  // Lista de participantes ordenada do lançamento mais recente para o menos e filtrada pela busca
  const clientesFiltrados = useMemo(() => {
    // Ordena do lançamento mais recente para o menos
    const ordenados = [...clientes].sort((a, b) => {
      // 1. Data e hora de criação ISO (mais recente primeiro)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;

      // 2. Maior número de cupom (os cupons são sequenciais e incrementais)
      const maxA = Math.max(...(a.numerosCupons || [0]), 0);
      const maxB = Math.max(...(b.numerosCupons || [0]), 0);
      if (maxA !== maxB) return maxB - maxA;

      // 3. Data de cadastro (string YYYY-MM-DD)
      const cadA = a.dataCadastro || '';
      const cadB = b.dataCadastro || '';
      if (cadA !== cadB) return cadB.localeCompare(cadA);

      return (b.id || '').localeCompare(a.id || '');
    });

    const termo = busca.trim().toLowerCase();
    if (!termo) return ordenados;
    const termoApenasDigitos = termo.replace(/\D/g, '');
    return ordenados.filter(c => {
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
        // Mantém a tela original intacta sem abrir modal por cima
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
      setFeedback({
        tipo: 'erro',
        texto: 'Por favor, habilite pop-ups para abrir o documento na nova aba.'
      });
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

  // Ação de baixar PDF: abre na nova aba mantendo a tela original 100% intacta
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
      setFeedback({
        tipo: 'erro',
        texto: 'Por favor, permita pop-ups no seu navegador para abrir o documento na nova aba.'
      });
    } finally {
      setTimeout(() => {
        setGerandoPdfId(null);
      }, 400);
    }
  };

  // Compartilha o arquivo PDF binário nativamente no celular/sistema (Web Share API) quando solicitado
  const handleCompartilharPdfNativo = async (cliente: SorteioCliente) => {
    setEnviandoWhatsAppId(cliente.id);
    try {
      const kitFinal = kitBase64.startsWith('data:image')
        ? kitBase64
        : await carregarImagemKitCentralizada(KIT_PREMIOS_IMAGE_URL, 1.0);

      const pdfBlob = await gerarBlobPdfSorteio(
        cliente,
        logoBase64 || OFFICIAL_LOGO_URL,
        kitFinal
      );

      const nomeClienteFormatado = (cliente.nomeCliente || 'Cliente').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const nomeArquivo = `NOVEMBRO_PREMIADO_OLOR_LUZ_-_${nomeClienteFormatado}.pdf`;
      const pdfFile = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });
      const cuponsLista = (cliente.numerosCupons || []).map((n) => `#${n}`).join(', ');

      const nav = navigator as any;
      if (nav.share && (!nav.canShare || nav.canShare({ files: [pdfFile] }))) {
        await nav.share({
          files: [pdfFile],
          title: `Cupom Oficial Olor Luz - ${cliente.nomeCliente}`,
          text: `Olá, ${cliente.nomeCliente}! Segue o arquivo PDF oficial com o(s) seu(s) cupom(ns) (${cuponsLista}) do sorteio Novembro Premiado Olor Luz.`
        });
        return;
      }

      // Caso o navegador não suporte Web Share de arquivo, faz download do PDF
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = nomeArquivo;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Erro ao compartilhar arquivo PDF:', err);
      }
    } finally {
      setEnviandoWhatsAppId(null);
    }
  };

  // Envia o ARQUIVO PDF OFICIAL diretamente pelo compartilhamento nativo (Web Share API) com o mesmo layout do "Baixar PDF"
  const handleEnviarWhatsApp = async (cliente: SorteioCliente) => {
    setEnviandoWhatsAppId(cliente.id);

    const digitos = cliente.telefone.replace(/\D/g, '');
    const ddiTelefone = digitos.startsWith('55') ? digitos : `55${digitos}`;
    const cuponsLista = (cliente.numerosCupons || []).map((n) => `#${n}`).join(', ');
    const msg = `Olá, *${cliente.nomeCliente}*! Segue em anexo o arquivo PDF oficial com o(s) seu(s) cupom(ns) (${cuponsLista}) do sorteio *Novembro Premiado Olor Luz*!`;
    const waUrl = `https://api.whatsapp.com/send?phone=${ddiTelefone}&text=${encodeURIComponent(msg)}`;

    try {
      // 1. Gera instantaneamente o arquivo PDF oficial com o MESMO layout visual de 1 página do "Baixar PDF"
      const pdfBlob = await gerarBlobPdfSorteio(
        cliente,
        logoBase64 || OFFICIAL_LOGO_URL,
        kitBase64 || KIT_PREMIOS_IMAGE_URL
      );

      const nomeClienteFormatado = (cliente.nomeCliente || 'Cliente').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const nomeArquivo = `NOVEMBRO_PREMIADO_OLOR_LUZ_-_${nomeClienteFormatado}.pdf`;
      const pdfFile = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });

      // 2. Prioridade 1: Envia o ARQUIVO PDF DIRETAMENTE pelo compartilhamento nativo (igual funcionava antes, agora com o PDF 100% corrigido)
      const nav = navigator as any;
      if (nav.share && (!nav.canShare || nav.canShare({ files: [pdfFile] }))) {
        await nav.share({
          files: [pdfFile],
          title: `Cupom Oficial Olor Luz - ${cliente.nomeCliente}`,
          text: msg
        });

        setFeedback({
          tipo: 'sucesso',
          texto: `Arquivo PDF oficial (${nomeArquivo}) enviado diretamente para o WhatsApp!`
        });
        return;
      }

      // 3. Fallback para computadores onde o navegador não suporta navigator.share de arquivos:
      // Baixa o arquivo PDF oficial e abre a conversa do cliente no WhatsApp
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = nomeArquivo;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setFeedback({
        tipo: 'sucesso',
        texto: `Arquivo PDF (${nomeArquivo}) baixado e conversa do WhatsApp aberta para ${cliente.telefone} (${cliente.nomeCliente})!`
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      console.warn('Erro ao enviar PDF para WhatsApp:', err);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setEnviandoWhatsAppId(null);
    }
  };

  // Realizar sorteio aleatório entre todos os cupons emitidos com tempo aumentado de embaralhamento
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
    // Aumenta o tempo de embaralhamento dos números para ~3.8 segundos (48 ciclos de 80ms) gerando mais suspense e emoção
    const totalCiclos = 48;
    const interval = setInterval(() => {
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      setCupomSorteadoNumero(randomItem.numero);
      contador++;
      if (contador >= totalCiclos) {
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
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEnviarWhatsApp(feedback.clienteRecente!)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Direto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompartilharPdfNativo(feedback.clienteRecente!)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    title="Compartilhar arquivo PDF binário direto pelo menu do celular"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Anexar PDF (App)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBaixarArquivoPdf(feedback.clienteRecente!)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Baixar PDF / Imprimir</span>
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
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full ml-1">
                Mais recentes primeiro
              </span>
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
                    <th className="py-3 px-4">Cliente (Lançamentos Recentes)</th>
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
                            disabled={enviandoWhatsAppId === cliente.id}
                            className="p-2 bg-slate-950 hover:bg-emerald-950/60 text-emerald-400 border border-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Enviar Arquivo PDF dos Cupons por WhatsApp"
                          >
                            {enviandoWhatsAppId === cliente.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                            ) : (
                              <MessageCircle className="w-4 h-4" />
                            )}
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
                      disabled={enviandoWhatsAppId === cliente.id}
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-emerald-950/40 text-emerald-400 border border-slate-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {enviandoWhatsAppId === cliente.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <MessageCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{enviandoWhatsAppId === cliente.id ? 'Gerando...' : 'Enviar PDF'}</span>
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
                  <h4 className="text-xl font-bold text-white">
                    {mascararNomeGanhador(ganhadorSorteado.nomeCliente)}
                  </h4>
                  <p className="text-sm font-mono text-amber-300 font-bold tracking-wider">
                    {mascararTelefonePrivacidade(ganhadorSorteado.telefone)}
                  </p>
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

                  {(() => {
                    const modalBadgeStyle = getCouponBadgeStyles((clientePdfModal.numerosCupons || []).length || 1);
                    return (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'nowrap',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: modalBadgeStyle.gap,
                          width: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        {(clientePdfModal.numerosCupons || []).map((numero) => (
                          <div
                            key={numero}
                            style={{
                              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                              color: '#FBBF24',
                              border: `${modalBadgeStyle.borderWidth} solid #F59E0B`,
                              borderRadius: '8px',
                              padding: modalBadgeStyle.padding,
                              fontSize: modalBadgeStyle.fontSize,
                              fontWeight: 900,
                              lineHeight: 1.1,
                              letterSpacing: '0.5px',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap',
                              flexShrink: 1,
                              minWidth: 0,
                              boxShadow: 'none'
                            }}
                          >
                            <span style={{ fontSize: modalBadgeStyle.hashSize, color: '#FDE68A', marginRight: '2px', fontWeight: 700 }}>
                              #
                            </span>
                            {numero}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* SEÇÃO DO SUPERKIT COM 5 ITENS + FOTO EM ALTA QUALIDADE SEM CORTES */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 248px',
                    gap: '16px',
                    alignItems: 'stretch',
                    marginBottom: '16px'
                  }}
                >
                  {/* Lista dos 5 Prêmios */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '14px',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: '0 0 10px 0',
                        lineHeight: 1.35
                      }}
                    >
                      Preparamos um superkit com 5 itens especiais da Olor Luz!
                    </h2>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', flex: 1 }}>
                      {LISTA_PREMIOS_SORTEIO.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 0',
                            borderBottom:
                              idx === LISTA_PREMIOS_SORTEIO.length - 1
                                ? 'none'
                                : '1px solid #E2E8F0',
                            fontSize: '13px',
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

                  {/* Foto Oficial do Kit de Prêmios (Container 1:1 Quadrado - Visível 100% sem cortes) */}
                  <div
                    style={{
                      width: '248px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1.5px solid #F59E0B',
                      backgroundColor: '#0F172A',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        backgroundColor: '#C9B59C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={kitBase64 || KIT_PREMIOS_IMAGE_URL}
                        alt="Kit de Prêmios Olor Luz"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center center',
                          display: 'block'
                        }}
                      />
                    </div>
                    <div
                      style={{
                        backgroundColor: '#0F172A',
                        color: '#FDE68A',
                        textAlign: 'center',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        letterSpacing: '0.7px',
                        textTransform: 'uppercase',
                        padding: '6px 6px',
                        borderTop: '1px solid rgba(245, 158, 11, 0.4)'
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

                {/* OBSERVAÇÕES SOBRE FRAGRÂNCIAS, PRAZO E ENTREGA */}
                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FCD34D',
                    borderRadius: '10px',
                    padding: '11px 16px',
                    fontSize: '11.5px',
                    lineHeight: 1.45,
                    color: '#78350F',
                    textAlign: 'center',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <p style={{ margin: 0 }}>
                    As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções
                    disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias
                    definidas.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Prazo de retirada:</strong> O ganhador terá o prazo de 30 dias úteis após a data do sorteio para reclamar o prêmio.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Entrega:</strong> Para ganhadores de Uberaba, o super kit será entregue pela Olor Luz, mediante agendamento, sem cobrança de taxa. Para ganhadores de outras cidades, o custo do frete para envio será de responsabilidade do ganhador.
                  </p>
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

// Componente Público de Visualização e Download Automático do Cupom Oficial em PDF (acessado pelo link enviado no WhatsApp sem exigir login)
export const PublicCupomView: React.FC<{ cliente: SorteioCliente }> = ({ cliente }) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [baixando, setBaixando] = useState<boolean>(false);
  const [statusTexto, setStatusTexto] = useState<string>('Gerando seu Certificado Oficial em PDF...');

  const nomeClienteFormatado = (cliente.nomeCliente || 'Cliente').trim().replace(/[^a-zA-Z0-9]/g, '_');
  const nomeArquivo = `NOVEMBRO_PREMIADO_OLOR_LUZ_-_${nomeClienteFormatado}.pdf`;

  const dispararDownloadPdf = async () => {
    setBaixando(true);
    try {
      const [logoB64, kitB64] = await Promise.all([
        carregarImagemComoBase64(OFFICIAL_LOGO_URL),
        carregarImagemKitCentralizada(KIT_PREMIOS_IMAGE_URL, 1.0)
      ]);
      const { canvas, widthPx, heightPx } = await gerarCanvasCertificadoSorteio(cliente, logoB64, kitB64);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.96);
      setPreviewUrl(dataUrl);

      const pageWidthMm = 210;
      const pageHeightMm = Number(((heightPx * pageWidthMm) / widthPx).toFixed(2));
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pageWidthMm, pageHeightMm],
        compress: true
      });
      doc.addImage(dataUrl, 'JPEG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
      const pdfBlob = doc.output('blob');

      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      setStatusTexto('Seu arquivo PDF oficial foi gerado e baixado automaticamente!');
    } catch (err) {
      console.warn('Erro ao gerar PDF público:', err);
      setStatusTexto('Clique no botão abaixo para baixar ou imprimir seu cupom oficial.');
    } finally {
      setBaixando(false);
    }
  };

  const abrirParaImpressao = async () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const [logoB64, kitB64] = await Promise.all([
      carregarImagemComoBase64(OFFICIAL_LOGO_URL),
      carregarImagemKitCentralizada(KIT_PREMIOS_IMAGE_URL, 1.0)
    ]);
    const html = gerarHtmlCupomSorteio(cliente, logoB64, kitB64, true);
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  useEffect(() => {
    dispararDownloadPdf();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-6 mb-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-left flex-col sm:flex-row">
          <img
            src={OFFICIAL_LOGO_URL}
            alt="Olor Luz"
            className="h-12 w-auto object-contain"
          />
          <div>
            <h1 className="font-cinzel text-base sm:text-lg font-bold text-amber-300">
              NOVEMBRO PREMIADO OLOR LUZ
            </h1>
            <p className="text-xs sm:text-sm text-emerald-300 font-medium mt-0.5">
              {statusTexto}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={dispararDownloadPdf}
            disabled={baixando}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{baixando ? 'Baixando PDF...' : 'Baixar Meu Cupom em PDF'}</span>
          </button>

          <button
            type="button"
            onClick={abrirParaImpressao}
            className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl flex justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Cupom Oficial Olor Luz - ${cliente.nomeCliente}`}
            className="w-full h-auto rounded-2xl shadow-2xl border-2 border-amber-500/50 bg-white"
          />
        ) : (
          <div className="py-16 text-center text-amber-300 font-semibold text-sm">
            Carregando visualização do seu Certificado Oficial Olor Luz...
          </div>
        )}
      </div>
    </div>
  );
};

