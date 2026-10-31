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
      padding: 8px 12px;
      font-size: 10.5px;
      line-height: 1.4;
      color: #78350F;
      text-align: center;
      font-weight: 600;
      margin-bottom: 8px;
      box-shadow: none !important;
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
          As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias definidas.
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
          var hPx = Math.ceil(sheet.offsetHeight || sheet.getBoundingClientRect().height || 695);
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

// Gera o arquivo Blob PDF oficial vetorial de alta definição com página autoajustada ao conteúdo e foto 1:1 sem cortes
export async function gerarBlobPdfSorteio(
  cliente: SorteioCliente,
  logoBase64: string,
  kitBase64: string
): Promise<Blob> {
  const pageWidth = 210;
  // Altura exatamente ajustada ao término do rodapé + margem mínima inferior (sem espaço em branco sobrando)
  const pageHeight = 197;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [pageWidth, pageHeight],
    compress: true
  });

  const marginX = 6;
  const contentWidth = pageWidth - marginX * 2; // 198mm
  const marginY = 5;
  const contentHeight = pageHeight - marginY * 2; // 187mm

  // Cabeçalho Escuro
  doc.setFillColor(9, 13, 22);
  doc.rect(marginX, marginY, contentWidth, 32, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(marginX, marginY + 30.8, contentWidth, 1.2, 'F');

  // Logotipo no Cabeçalho
  let headerTextY = marginY + 24;
  if (logoBase64 && logoBase64.startsWith('data:image')) {
    try {
      const format = logoBase64.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(logoBase64, format, pageWidth / 2 - 18, marginY + 2, 36, 15, undefined, 'FAST');
      headerTextY = marginY + 27.5;
    } catch {
      headerTextY = marginY + 22;
    }
  }

  // Título do Cabeçalho
  doc.setTextColor(253, 230, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('NOVEMBRO PREMIADO OLOR LUZ', pageWidth / 2, headerTextY, { align: 'center' });

  // Faixa de Informações do Cliente
  const clientBarY = marginY + 32;
  doc.setFillColor(255, 251, 235);
  doc.rect(marginX, clientBarY, contentWidth, 9.5, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.setLineWidth(0.3);
  doc.line(marginX, clientBarY + 9.5, marginX + contentWidth, clientBarY + 9.5);

  doc.setTextColor(120, 53, 15);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`CLIENTE: ${cliente.nomeCliente}`, marginX + 5, clientBarY + 6.3);
  doc.text(`TELEFONE: ${cliente.telefone}`, marginX + 88, clientBarY + 6.3);
  const totalCupons = cliente.numerosCupons?.length || cliente.quantidadeCupons || 1;
  doc.text(`QTDE DE CUPONS: ${totalCupons}`, marginX + contentWidth - 5, clientBarY + 6.3, { align: 'right' });

  // Caixa de Destaque dos Cupons
  let curY = clientBarY + 12.5;
  const couponsHeight = 23;
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(marginX + 4, curY, contentWidth - 8, couponsHeight, 3, 3, 'F');
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX + 4, curY, contentWidth - 8, couponsHeight, 3, 3, 'S');

  doc.setTextColor(146, 64, 14);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('NÚMERO(S) DO(S) CUPOM(S):', pageWidth / 2, curY + 5.5, { align: 'center' });

  // Cupons auto-ajustados em linha única
  const cupons = cliente.numerosCupons || [];
  const count = cupons.length || 1;
  const availWidth = contentWidth - 16;
  const gapMm = count > 8 ? 1.5 : 3;
  const badgeWidth = Math.min(36, Math.max(8, (availWidth - (count - 1) * gapMm) / count));
  const badgeHeight = 12;
  const totalBadgesWidth = count * badgeWidth + (count - 1) * gapMm;
  let startX = (pageWidth - totalBadgesWidth) / 2;
  const badgeY = curY + 8;

  const cupomFontSize = count <= 2 ? 14 : count <= 4 ? 11.5 : count <= 7 ? 9 : count <= 12 ? 7.5 : 6;

  cupons.forEach((num) => {
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(startX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.roundedRect(startX, badgeY, badgeWidth, badgeHeight, 2, 2, 'S');

    doc.setTextColor(251, 191, 36);
    doc.setFontSize(cupomFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(`#${num}`, startX + badgeWidth / 2, badgeY + badgeHeight / 2 + (cupomFontSize > 11 ? 1.8 : 1.3), {
      align: 'center'
    });

    startX += badgeWidth + gapMm;
  });

  // Seção do Kit & Prêmios (Container da foto 1:1 quadrado sem cortes: 64x64mm + legenda 7mm = 71mm)
  curY += couponsHeight + 3;
  const kitBoxWidth = 65;
  const prizesWidth = contentWidth - 8 - kitBoxWidth - 4;
  const kitSectionHeight = 71;

  // Lista dos Prêmios (Esquerda)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX + 4, curY, prizesWidth, kitSectionHeight, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX + 4, curY, prizesWidth, kitSectionHeight, 3, 3, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize('Preparamos um superkit com 5 itens especiais da Olor Luz!', prizesWidth - 10);
  doc.text(titleLines, marginX + 8, curY + 7.5);

  let prizeY = curY + 18.5;
  LISTA_PREMIOS_SORTEIO.forEach((p) => {
    doc.setFillColor(254, 243, 199);
    doc.circle(marginX + 9.5, prizeY - 1, 2, 'F');
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(6.5);
    doc.text('✦', marginX + 9.5, prizeY - 0.2, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8.2);
    doc.setFont('helvetica', 'bold');
    const pLines = doc.splitTextToSize(p, prizesWidth - 17);
    doc.text(pLines, marginX + 14, prizeY);
    prizeY += 10.5;
  });

  // Foto do Kit (Direita - Container 1:1 quadrado 64x64mm: 100% visível e centralizada sem cortes!)
  const imgX = marginX + 4 + prizesWidth + 4;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(imgX, curY, kitBoxWidth, kitSectionHeight, 3, 3, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(imgX, curY, kitBoxWidth, kitSectionHeight, 3, 3, 'S');

  const imgSquareSize = 64;
  if (kitBase64 && kitBase64.startsWith('data:image')) {
    try {
      const format = kitBase64.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(kitBase64, format, imgX + 0.5, curY + 0.5, imgSquareSize, imgSquareSize, undefined, 'FAST');
    } catch {}
  }
  doc.setTextColor(253, 230, 138);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPERKIT OFICIAL • 5 ITENS EXCLUSIVOS OLOR LUZ', imgX + kitBoxWidth / 2, curY + 68.5, { align: 'center' });

  // Destaques de Datas (Participação e Sorteio lado a lado)
  curY += kitSectionHeight + 3;
  const dateBox1W = (contentWidth - 12) * 0.41;
  const dateBox2W = contentWidth - 8 - dateBox1W - 4;
  const datesHeight = 23;

  // Box Participação
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(marginX + 4, curY, dateBox1W, datesHeight, 3, 3, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX + 4, curY, dateBox1W, datesHeight, 3, 3, 'S');

  doc.setTextColor(253, 230, 138);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('📅 Participação: de 1º a 30 de novembro.', marginX + 4 + dateBox1W / 2, curY + 12.5, { align: 'center' });

  // Box Sorteio
  const box2X = marginX + 4 + dateBox1W + 4;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(box2X, curY, dateBox2W, datesHeight, 3, 3, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.5);
  doc.roundedRect(box2X, curY, dateBox2W, datesHeight, 3, 3, 'S');

  doc.setTextColor(253, 230, 138);
  doc.setFontSize(8.3);
  doc.setFont('helvetica', 'bold');
  doc.text('🎁 Sorteio: 1º de dezembro!', box2X + 5, curY + 7);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  const sorteioDesc = doc.splitTextToSize(
    'O vídeo do sorteio, com a divulgação do ganhador, será publicado na página oficial da Olor Luz no Instagram: @olorluz.',
    dateBox2W - 10
  );
  doc.text(sorteioDesc, box2X + 5, curY + 12.5);

  // Observações
  curY += datesHeight + 2.5;
  const obsHeight = 13.5;
  doc.setFillColor(255, 251, 235);
  doc.roundedRect(marginX + 4, curY, contentWidth - 8, obsHeight, 2.5, 2.5, 'F');
  doc.setDrawColor(252, 211, 77);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX + 4, curY, contentWidth - 8, obsHeight, 2.5, 2.5, 'S');

  doc.setTextColor(120, 53, 15);
  doc.setFontSize(7.3);
  doc.setFont('helvetica', 'normal');
  const obsText = doc.splitTextToSize(
    'As fragrâncias dos produtos poderão ser escolhidas pelo ganhador entre as opções disponíveis, com exceção do kit de mini sprays, que já possui fragrâncias definidas.',
    contentWidth - 16
  );
  doc.text(obsText, pageWidth / 2, curY + 5.8, { align: 'center' });

  // Rodapé
  curY += obsHeight + 2.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX + 4, curY, marginX + contentWidth - 4, curY);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.text('Olor Luz • Certificado Oficial de Participação', marginX + 4, curY + 4.5);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, marginX + contentWidth - 4, curY + 4.5, { align: 'right' });

  // Borda Externa Dourada - enquadramento exato ao redor do conteúdo (sem espaço vazio na base)
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, marginY, contentWidth, contentHeight, 3.5, 3.5, 'S');

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
    // Pré-carrega imagens em Base64 para exportação PDF de alta resolução com enquadramento 1:1 sem cortes
    carregarImagemComoBase64(OFFICIAL_LOGO_URL).then(setLogoBase64);
    carregarImagemKitCentralizada(KIT_PREMIOS_IMAGE_URL, 1.0).then(setKitBase64);
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

  // Compartilhar via WhatsApp com envio direto do arquivo PDF oficial do cupom
  const handleEnviarWhatsApp = async (cliente: SorteioCliente) => {
    setEnviandoWhatsAppId(cliente.id);
    try {
      // 1. Gera o arquivo Blob PDF oficial vetorial em alta resolução com imagem 1:1 centralizada sem cortes
      const kitFinal = kitBase64.startsWith('data:image')
        ? kitBase64
        : await carregarImagemKitCentralizada(KIT_PREMIOS_IMAGE_URL, 1.0);

      const pdfBlob = await gerarBlobPdfSorteio(
        cliente,
        logoBase64 || OFFICIAL_LOGO_URL,
        kitFinal
      );

      const nomeClienteFormatado = (cliente.nomeCliente || 'Cliente').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const nomeArquivo = `Cupom_Sorteio_Olor_Luz_${nomeClienteFormatado}.pdf`;
      const pdfFile = new File([pdfBlob], nomeArquivo, {
        type: 'application/pdf',
        lastModified: Date.now()
      });

      const digitos = cliente.telefone.replace(/\D/g, '');
      const ddiTelefone = digitos.startsWith('55') ? digitos : `55${digitos}`;

      // 2. Se o dispositivo/navegador suporta Web Share com arquivos (Smartphones Android, iPhones iOS, etc.)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: 'NOVEMBRO PREMIADO OLOR LUZ',
          text: `Olá, ${cliente.nomeCliente}! Segue seu cupom oficial em PDF do sorteio Novembro Premiado da Olor Luz! 🍀✨`,
          files: [pdfFile]
        });
        setFeedback({
          tipo: 'sucesso',
          texto: `Arquivo PDF do cupom enviado via WhatsApp para "${cliente.nomeCliente}"!`
        });
        return;
      }

      // 3. Em computadores/navegadores onde o navegador não permite injetar arquivo binário direto no WhatsApp Web:
      // Dispara o download automático do arquivo PDF oficial do cupom para a máquina
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = nomeArquivo;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      // Abre a conversa do WhatsApp para o cliente
      const msg = `Olá, *${cliente.nomeCliente}*! Segue em anexo o arquivo PDF oficial com os seus cupons do sorteio *Novembro Premiado Olor Luz*! 🍀✨`;
      const waUrl = `https://wa.me/${ddiTelefone}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setFeedback({
        tipo: 'sucesso',
        texto: `Arquivo PDF oficial (${nomeArquivo}) baixado! A conversa do WhatsApp com ${cliente.nomeCliente} foi aberta para você anexar o cupom.`
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Usuário apenas fechou a janela de compartilhamento
        return;
      }
      console.warn('Erro ao compartilhar cupom por arquivo:', err);
      // Fallback: abrir conversa do WhatsApp
      const digitos = cliente.telefone.replace(/\D/g, '');
      const ddiTelefone = digitos.startsWith('55') ? digitos : `55${digitos}`;
      const msg = `Olá, *${cliente.nomeCliente}*! Segue seu comprovante do sorteio *Novembro Premiado Olor Luz*! 🍀✨`;
      window.open(`https://wa.me/${ddiTelefone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
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
                <div className="flex items-center gap-2 shrink-0">
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
