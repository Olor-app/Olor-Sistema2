import React, { useState, useMemo, useEffect } from 'react';
import { Formula, ProdutoStatus } from '../types';
import { formatarMoeda } from '../utils/calculations';
import { formatarValorUnitarioLitro, normalizarRendimentoParaLitros } from '../utils/formulaCalculations';
import { OFFICIAL_LOGO_URL } from './Logo';
import {
  Factory,
  FlaskConical,
  X,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Printer,
  ExternalLink,
  Sparkles,
  Info,
  Beaker,
  Clock,
  Scale,
  Percent,
  Check,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  Timer,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
  UserCheck
} from 'lucide-react';

interface FabricacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  formulas: Formula[];
  formulaInicial?: Formula | null;
}

export const FabricacaoModal: React.FC<FabricacaoModalProps> = ({
  isOpen,
  onClose,
  formulas,
  formulaInicial
}) => {
  // Fórmula selecionada
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  
  // Volume a produzir
  const [volumeDesejado, setVolumeDesejado] = useState<string>('100');
  const [unidadeVolume, setUnidadeVolume] = useState<'L' | 'ml'>('L');

  // Estado das etapas concluídas (checklist por índice do insumo)
  const [etapasConcluidas, setEtapasConcluidas] = useState<Record<number, boolean>>({});

  // Timer de bancada para o operador
  const [timerAtivo, setTimerAtivo] = useState<boolean>(false);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);
  const [timerEtapaNome, setTimerEtapaNome] = useState<string>('');

  // Sincroniza fórmula inicial ao abrir
  useEffect(() => {
    if (isOpen) {
      if (formulaInicial) {
        setSelectedFormulaId(formulaInicial.id);
        // Se a fórmula original era de laboratório com rendimento em ml, sugere a mesma unidade
        if (formulaInicial.unidadeRendimento?.toLowerCase() === 'ml') {
          setUnidadeVolume('ml');
          setVolumeDesejado(String(formulaInicial.rendimento || 1000));
        } else {
          setUnidadeVolume('L');
          setVolumeDesejado(String(formulaInicial.rendimento || 1000));
        }
      } else if (formulas.length > 0 && !selectedFormulaId) {
        setSelectedFormulaId(formulas[0].id);
        setUnidadeVolume('L');
        setVolumeDesejado('1000');
      }
      setEtapasConcluidas({});
      setTimerAtivo(false);
      setSegundosRestantes(0);
    }
  }, [isOpen, formulaInicial, formulas]);

  // Efeito do Timer de agitação
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerAtivo && segundosRestantes > 0) {
      interval = setInterval(() => {
        setSegundosRestantes(prev => {
          if (prev <= 1) {
            setTimerAtivo(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerAtivo, segundosRestantes]);

  // Fórmula selecionada atual
  const formulaAtiva = useMemo(() => {
    return formulas.find(f => f.id === selectedFormulaId) || null;
  }, [formulas, selectedFormulaId]);

  // Volume numérico validado
  const volumeNumerico = useMemo(() => {
    const v = parseFloat(volumeDesejado.replace(',', '.'));
    return isNaN(v) || v <= 0 ? 0 : v;
  }, [volumeDesejado]);

  // Volume convertido para Litros (base de cálculo)
  const volumeEmLitros = useMemo(() => {
    if (unidadeVolume === 'ml') {
      return volumeNumerico / 1000;
    }
    return volumeNumerico;
  }, [volumeNumerico, unidadeVolume]);

  // Rendimento original da fórmula base em Litros
  const rendimentoBaseLitros = useMemo(() => {
    if (!formulaAtiva) return 1000;
    return normalizarRendimentoParaLitros(
      formulaAtiva.rendimento || 1000,
      formulaAtiva.unidadeRendimento || 'L'
    );
  }, [formulaAtiva]);

  // Fator de escala em relação à receita base cadastrada
  const fatorEscala = useMemo(() => {
    if (!formulaAtiva || rendimentoBaseLitros <= 0) return 1;
    return volumeEmLitros / rendimentoBaseLitros;
  }, [formulaAtiva, volumeEmLitros, rendimentoBaseLitros]);

  // Soma de quantidade base dos insumos para cálculo de porcentagem
  const somaQtdsBase = useMemo(() => {
    if (!formulaAtiva || !formulaAtiva.insumos) return 0;
    return formulaAtiva.insumos.reduce((acc, item) => acc + (Number(item.baseFormula) || 0), 0);
  }, [formulaAtiva]);

  // Etapas calculadas com quantidades escaladas e formatadas
  const etapasProducao = useMemo(() => {
    if (!formulaAtiva || !formulaAtiva.insumos || formulaAtiva.insumos.length === 0) {
      return [];
    }

    return formulaAtiva.insumos.map((item, index) => {
      const rawBase = Number(item.baseFormula) || 0;
      const rawUni = (item.uni || 'L').trim();
      const precoUni = Number(item.precoUni) || 0;

      // Quantidade recalculada para o lote
      const qtdEscalada = rawBase * fatorEscala;

      // Cálculo de porcentagem de participação na fórmula
      const percentual = somaQtdsBase > 0 ? (rawBase / somaQtdsBase) * 100 : 0;

      // Custo proporcional desta etapa
      let custoEtapa = 0;
      if (rawUni.toLowerCase() === 'ml' || rawUni.toLowerCase() === 'g') {
        custoEtapa = (qtdEscalada / 1000) * precoUni;
      } else {
        custoEtapa = qtdEscalada * precoUni;
      }

      // Formatação primária e secundária da quantidade
      let exibicaoPrincipal = '';
      let exibicaoSecundaria = '';

      if (unidadeVolume === 'ml') {
        // Se a ordem de produção for em ml:
        if (rawUni.toLowerCase() === 'l' || rawUni.toLowerCase() === 'ml') {
          const qtdEmMl = rawUni.toLowerCase() === 'l' ? qtdEscalada * 1000 : qtdEscalada;
          exibicaoPrincipal = `${formatarQtdPrecisao(qtdEmMl)} mL`;
          if (qtdEmMl >= 1000) {
            exibicaoSecundaria = `(${formatarQtdPrecisao(qtdEmMl / 1000)} L)`;
          }
        } else if (rawUni.toLowerCase() === 'kg' || rawUni.toLowerCase() === 'g') {
          const qtdEmG = rawUni.toLowerCase() === 'kg' ? qtdEscalada * 1000 : qtdEscalada;
          exibicaoPrincipal = `${formatarQtdPrecisao(qtdEmG)} g`;
          if (qtdEmG >= 1000) {
            exibicaoSecundaria = `(${formatarQtdPrecisao(qtdEmG / 1000)} Kg)`;
          }
        } else {
          exibicaoPrincipal = `${formatarQtdPrecisao(qtdEscalada)} ${rawUni}`;
        }
      } else {
        // Se a ordem de produção for em Litros:
        if (rawUni.toLowerCase() === 'l' || rawUni.toLowerCase() === 'ml') {
          const qtdEmLitros = rawUni.toLowerCase() === 'ml' ? qtdEscalada / 1000 : qtdEscalada;
          exibicaoPrincipal = `${formatarQtdPrecisao(qtdEmLitros)} L`;
          if (qtdEmLitros < 1 && qtdEmLitros > 0) {
            exibicaoSecundaria = `(${formatarQtdPrecisao(qtdEmLitros * 1000)} mL para balança/proveta)`;
          }
        } else if (rawUni.toLowerCase() === 'kg' || rawUni.toLowerCase() === 'g') {
          const qtdEmKg = rawUni.toLowerCase() === 'g' ? qtdEscalada / 1000 : qtdEscalada;
          exibicaoPrincipal = `${formatarQtdPrecisao(qtdEmKg)} Kg`;
          if (qtdEmKg < 1 && qtdEmKg > 0) {
            exibicaoSecundaria = `(${formatarQtdPrecisao(qtdEmKg * 1000)} g na balança)`;
          }
        } else {
          exibicaoPrincipal = `${formatarQtdPrecisao(qtdEscalada)} ${rawUni}`;
        }
      }

      return {
        seqOriginal: item.seq || index + 1,
        index,
        insumo: item.insumo,
        unidadeOriginal: rawUni,
        precoUni,
        qtdBaseOriginal: rawBase,
        qtdEscalada,
        exibicaoPrincipal,
        exibicaoSecundaria,
        percentual,
        metodologia: item.metodologia?.trim() || '',
        custoEtapa
      };
    });
  }, [formulaAtiva, fatorEscala, somaQtdsBase, unidadeVolume]);

  // Custo total do lote a ser fabricado
  const custoTotalLoteFabricacao = useMemo(() => {
    return etapasProducao.reduce((acc, curr) => acc + curr.custoEtapa, 0);
  }, [etapasProducao]);

  // Custo unitário por Litro do lote
  const custoUnitarioLitroFabricacao = useMemo(() => {
    if (volumeEmLitros <= 0) return 0;
    return custoTotalLoteFabricacao / volumeEmLitros;
  }, [custoTotalLoteFabricacao, volumeEmLitros]);

  // Progresso do checklist
  const totalEtapas = etapasProducao.length;
  const concluidasCount = Object.values(etapasConcluidas).filter(Boolean).length;
  const percentualProgresso = totalEtapas > 0 ? Math.round((concluidasCount / totalEtapas) * 100) : 0;

  // Alterna status de uma etapa
  const toggleEtapa = (index: number) => {
    setEtapasConcluidas(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Marcar todas / Desmarcar todas
  const handleToggleTodas = () => {
    if (concluidasCount === totalEtapas) {
      setEtapasConcluidas({});
    } else {
      const todas: Record<number, boolean> = {};
      etapasProducao.forEach((_, idx) => {
        todas[idx] = true;
      });
      setEtapasConcluidas(todas);
    }
  };

  // Iniciar timer rápido
  const iniciarTimer = (minutos: number, nomeEtapa: string) => {
    setSegundosRestantes(minutos * 60);
    setTimerEtapaNome(nomeEtapa);
    setTimerAtivo(true);
  };

  // Formata MM:SS
  const formatarTempo = (totalSegundos: number) => {
    const mins = Math.floor(totalSegundos / 60);
    const secs = totalSegundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Abre a Ficha Técnica de Produção em Nova Aba com opção nativa de Salvar em PDF ou Imprimir
  const handleAbrirFichaEmNovaAba = () => {
    if (!formulaAtiva) return;

    const win = window.open('', '_blank');
    if (!win) {
      alert('Não foi possível abrir a nova aba. Por favor, verifique se o bloqueador de pop-ups está ativo no seu navegador e permita para este site.');
      return;
    }

    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    const horaEmissao = new Date().toLocaleTimeString('pt-BR');
    const produtoNome = formulaAtiva.produto || 'Fórmula Sem Nome';
    const volumeFormatado = `${volumeNumerico} ${unidadeVolume}`;
    const custoLoteFormatado = formatarMoeda(custoTotalLoteFabricacao);
    const custoUnitFormatado = `${formatarValorUnitarioLitro(custoUnitarioLitroFabricacao)} / L`;
    const fatorFormatado = `${fatorEscala.toFixed(3)}x`;

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ficha de Fabricação - ${produtoNome} (${volumeFormatado}) - SIG Olor Luz</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      color: #0F172A;
      min-height: 100vh;
    }
    
    /* BARRA SUPERIOR DE AÇÕES (NÃO IMPRIME) */
    .top-toolbar {
      background-color: #020617;
      border-bottom: 1px solid #1E293B;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-brand-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-logo-img {
      height: 32px;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(245, 158, 11, 0.3));
    }
    .toolbar-brand {
      color: #F59E0B;
      font-weight: 800;
      letter-spacing: 1.5px;
      font-size: 14px;
      text-transform: uppercase;
    }
    .toolbar-desc {
      color: #94A3B8;
      font-size: 12px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-action-primary {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #0F172A;
      font-weight: 800;
      font-size: 13px;
      border: none;
      padding: 9px 20px;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
      transition: all 0.2s ease;
    }
    .btn-action-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
      filter: brightness(1.05);
    }
    .btn-action-close {
      background-color: rgba(255,255,255,0.06);
      color: #CBD5E1;
      border: 1px solid #334155;
      padding: 9px 16px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-action-close:hover {
      background-color: rgba(255,255,255,0.12);
      color: #FFFFFF;
      border-color: #64748B;
    }

    /* ENVOLTÓRIO DA PÁGINA CENTRALIZADA */
    .page-container {
      display: flex;
      justify-content: center;
      padding: 24px 16px 40px;
    }

    /* FOLHA A4 PADRÃO CHÃO DE FÁBRICA */
    .sheet-a4 {
      background-color: #FFFFFF;
      width: 100%;
      max-width: 820px;
      padding: 32px 36px;
      border-radius: 12px;
      border: 1px solid #CBD5E1;
      box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    }

    /* CABEÇALHO DO DOCUMENTO COM LOGO OFICIAL */
    .doc-header {
      border-bottom: 2px solid #D97706;
      padding-bottom: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-brand-area {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .doc-logo-img {
      height: 56px;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(0 2px 6px rgba(217, 119, 6, 0.2));
    }
    .doc-title-brand {
      color: #92400E;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .badge-dept {
      display: inline-block;
      background-color: #FEF3C7;
      color: #92400E;
      border: 1px solid #FCD34D;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-left: 8px;
      vertical-align: middle;
    }
    .doc-title-main {
      font-size: 15px;
      font-weight: 900;
      color: #0F172A;
      text-transform: uppercase;
      margin: 4px 0 2px 0;
      letter-spacing: 0.2px;
    }
    .doc-subtitle {
      font-size: 11px;
      color: #475569;
      margin: 0;
    }
    .doc-meta {
      text-align: right;
      font-size: 10px;
      color: #475569;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      line-height: 1.4;
    }

    /* QUADRO DE ESPECIFICAÇÕES */
    .specs-grid {
      display: grid;
      grid-template-columns: 2fr 1.2fr 1.2fr;
      gap: 12px;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .spec-label {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 800;
      color: #64748B;
      display: block;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .spec-value-main {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.2;
    }
    .spec-value-highlight {
      font-size: 15px;
      font-weight: 900;
      color: #B45309;
    }
    .spec-sub {
      font-size: 10px;
      color: #64748B;
      margin-top: 2px;
      display: block;
    }

    /* TABELA DE MATÉRIAS-PRIMAS */
    .table-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0F172A;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .table-title span {
      font-weight: normal;
      color: #64748B;
      font-size: 10px;
      text-transform: none;
    }
    .chemical-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
    }
    .chemical-table th {
      background-color: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 8px 10px;
      text-align: left;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9.5px;
      color: #334155;
      letter-spacing: 0.4px;
    }
    .chemical-table td {
      border: 1px solid #E2E8F0;
      padding: 8px 10px;
      vertical-align: middle;
    }
    .chemical-table tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    .col-seq {
      text-align: center;
      font-weight: 800;
      font-family: ui-monospace, monospace;
      color: #475569;
      width: 40px;
    }
    .col-qtd {
      background-color: #FEF3C7 !important;
      text-align: center;
      width: 140px;
      border-left: 2px solid #F59E0B !important;
      border-right: 2px solid #F59E0B !important;
    }
    .qtd-main {
      font-size: 13px;
      font-weight: 900;
      color: #78350F;
      font-family: ui-monospace, monospace;
    }
    .qtd-sub {
      font-size: 9.5px;
      font-weight: 600;
      color: #92400E;
    }
    .col-pct {
      text-align: center;
      font-family: ui-monospace, monospace;
      color: #64748B;
      width: 55px;
      font-size: 10px;
    }
    .col-check {
      text-align: center;
      width: 44px;
    }
    .box-check {
      width: 18px;
      height: 18px;
      border: 1.5px solid #94A3B8;
      border-radius: 4px;
      margin: 0 auto;
    }

    /* OBSERVAÇÕES */
    .box-obs {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 18px;
      font-size: 11px;
    }
    .box-obs-title {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      display: block;
    }

    /* QUADRO DE CONTROLE E ASSINATURAS */
    .box-sign {
      border: 1px solid #94A3B8;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 10px;
    }
    .box-sign-header {
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
      border-bottom: 1px solid #CBD5E1;
      padding-bottom: 6px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 12px;
    }
    .sign-field label {
      color: #64748B;
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 16px;
    }
    .sign-line {
      border-bottom: 1px solid #475569;
      height: 1px;
    }
    .sign-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #475569;
      font-size: 10px;
    }

    /* RODAPÉ FINAL */
    .doc-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 9px;
      color: #94A3B8;
      font-family: ui-monospace, monospace;
    }

    /* COMPORTAMENTO DE RESPONSIVIDADE PARA DISPOSITIVOS MÓVEIS (CELULARES E TABLETS) */
    @media screen and (max-width: 640px) {
      .top-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 10px 12px;
      }
      .toolbar-left {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      .toolbar-actions {
        width: 100%;
        display: flex;
        gap: 8px;
      }
      .btn-action-primary, .btn-action-close {
        flex: 1;
        justify-content: center;
        padding: 10px 12px;
        font-size: 12px;
      }
      .page-container {
        padding: 10px 8px 30px;
      }
      .sheet-a4 {
        padding: 16px 12px;
        border-radius: 8px;
        box-shadow: none;
      }
      .doc-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .doc-brand-area {
        gap: 12px;
      }
      .doc-logo-img {
        height: 44px;
      }
      .doc-title-brand {
        font-size: 16px;
      }
      .doc-title-main {
        font-size: 13px;
      }
      .doc-meta {
        text-align: left;
        font-size: 9.5px;
        width: 100%;
        padding-top: 6px;
        border-top: 1px dashed #CBD5E1;
      }
      .specs-grid {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 10px 12px;
      }
      .table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin-bottom: 16px;
      }
      .chemical-table {
        min-width: 520px;
      }
      .sign-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .sign-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }

    /* COMPORTAMENTO DE IMPRESSÃO (NATIVO / SALVAR PDF) */
    @media print {
      body {
        background-color: #FFFFFF !important;
      }
      .no-print {
        display: none !important;
      }
      .page-container {
        padding: 0 !important;
      }
      .sheet-a4 {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .chemical-table tr {
        page-break-inside: avoid;
      }
      .box-sign {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- BARRA DE FERRAMENTAS SUPERIOR (NÃO APARECE NA IMPRESSÃO) -->
  <div class="top-toolbar no-print">
    <div class="toolbar-left">
      <div class="toolbar-brand-wrap">
        <img src="${OFFICIAL_LOGO_URL}" alt="Logo Oficial OLOR LUZ" class="toolbar-logo-img" />
        <span class="toolbar-brand">OLOR LUZ</span>
      </div>
      <span class="toolbar-desc">• Ficha de Fabricação: <strong>${produtoNome}</strong> (${volumeFormatado})</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn-action-primary" onclick="window.print()" title="Salvar como PDF ou Imprimir em impressora física">
        📄 Baixar / Imprimir PDF
      </button>
      <button class="btn-action-close" onclick="window.close()">
        ✕ Fechar Janela
      </button>
    </div>
  </div>

  <!-- CONTAINER CENTRALIZADO DA FOLHA A4 -->
  <div class="page-container">
    <div class="sheet-a4">
      
      <!-- CABEÇALHO DO DOCUMENTO COM LOGO OFICIAL -->
      <div class="doc-header">
        <div class="doc-brand-area">
          <img src="${OFFICIAL_LOGO_URL}" alt="Logo Oficial OLOR LUZ" class="doc-logo-img" />
          <div>
            <div style="display: flex; align-items: center;">
              <h1 class="doc-title-brand">SIG OLOR LUZ</h1>
              <span class="badge-dept">Chão de Fábrica & P&D</span>
            </div>
            <div class="doc-title-main">Ficha de Ordem de Fabricação & Guia de Processo</div>
            <p class="doc-subtitle">Roteiro operacional de pesagem, dosagem sequencial e controle de bancada</p>
          </div>
        </div>

        <div class="doc-meta">
          <div><strong>Emissão:</strong> ${dataEmissao} às ${horaEmissao}</div>
          <div><strong>Status:</strong> ${formulaAtiva.status}</div>
          <div><strong>Cód. ID:</strong> ${formulaAtiva.id.slice(0, 8)}</div>
        </div>
      </div>

      <!-- QUADRO DE ESPECIFICAÇÕES DO LOTE -->
      <div class="specs-grid">
        <div>
          <span class="spec-label">Produto / Fragrância:</span>
          <span class="spec-value-main">${produtoNome}</span>
          ${formulaAtiva.isCriacaoLivre ? '<span class="spec-sub" style="color: #7E22CE; font-weight: bold;">[ Projeto Experimental P&D ]</span>' : ''}
        </div>

        <div>
          <span class="spec-label">Lote a Fabricar:</span>
          <span class="spec-value-highlight">${volumeFormatado}</span>
          <span class="spec-sub">Receita Base: ${formulaAtiva.rendimento} ${formulaAtiva.unidadeRendimento} (${fatorFormatado})</span>
        </div>

        <div>
          <span class="spec-label">Custos Previstos:</span>
          <span class="spec-value-main" style="color: #065F46;">${custoLoteFormatado}</span>
          <span class="spec-sub">Unitário: ${custoUnitFormatado}</span>
        </div>
      </div>

      <!-- TABELA DE MATÉRIAS-PRIMAS -->
      <div class="table-title">
        <span>Roteiro de Pesagem e Adição (${etapasProducao.length} Etapas Sequenciais)</span>
        <span>Siga rigorosamente a ordem numérica de 1 a ${etapasProducao.length}</span>
      </div>

      <div class="table-wrapper">
        <table class="chemical-table">
          <thead>
            <tr>
              <th style="text-align: center; width: 36px;">Seq</th>
              <th style="width: 30%;">Insumo / Matéria-Prima</th>
              <th style="text-align: center; width: 140px; background-color: #FEF3C7; color: #78350F;">Qtd. a Pesar / Medir</th>
              <th style="text-align: center; width: 55px;">% Fórm.</th>
              <th>Instrução de Processo & Homogeneização</th>
              <th style="text-align: center; width: 44px;">Visto</th>
            </tr>
          </thead>
          <tbody>
            ${etapasProducao.map(etapa => `
              <tr>
                <td class="col-seq">${etapa.seqOriginal}</td>
                <td>
                  <strong style="color: #0F172A; display: block;">${etapa.insumo}</strong>
                  <span style="font-size: 9px; color: #64748B; font-family: ui-monospace, monospace;">
                    Base: ${etapa.qtdBaseOriginal} ${etapa.unidadeOriginal} (${formatarMoeda(etapa.custoEtapa)})
                  </span>
                </td>
                <td class="col-qtd">
                  <div class="qtd-main">${etapa.exibicaoPrincipal}</div>
                  ${etapa.exibicaoSecundaria ? `<div class="qtd-sub">${etapa.exibicaoSecundaria}</div>` : ''}
                </td>
                <td class="col-pct">
                  ${etapa.percentual > 0 ? `${etapa.percentual.toFixed(1)}%` : '-'}
                </td>
                <td style="font-size: 10px; color: #334155; font-style: italic; line-height: 1.35;">
                  ${etapa.metodologia || 'Adicionar lentamente sob agitação mecânica até completa homogeneização.'}
                </td>
                <td class="col-check">
                  <div class="box-check"></div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- OBSERVAÇÕES GERAIS DE CQ E ENVASE -->
      ${formulaAtiva.obs ? `
        <div class="box-obs">
          <span class="box-obs-title">Observações Gerais, Controle de Qualidade & Envase:</span>
          <div style="color: #1E293B; line-height: 1.4; white-space: pre-wrap;">${formulaAtiva.obs}</div>
        </div>
      ` : ''}

      <!-- QUADRO DE CONTROLE, RASTREABILIDADE E ASSINATURAS -->
      <div class="box-sign">
        <div class="box-sign-header">
          <span>Rastreabilidade de Fabricação & Liberação Técnica</span>
          <span>Controle de Qualidade</span>
        </div>

        <div class="sign-grid">
          <div class="sign-field">
            <label>Número do Lote Gerado:</label>
            <div class="sign-line"></div>
          </div>
          <div class="sign-field">
            <label>Operador / Manipulador:</label>
            <div class="sign-line"></div>
          </div>
          <div class="sign-field">
            <label>Responsável Técnico / CQ:</label>
            <div class="sign-line"></div>
          </div>
        </div>

        <div class="sign-footer">
          <div style="display: flex; gap: 16px; align-items: center;">
            <span>Parecer Final:</span>
            <strong>[ &nbsp; ] APROVADO</strong>
            <strong>[ &nbsp; ] QUARENTENA</strong>
            <strong>[ &nbsp; ] REPROVADO</strong>
          </div>
          <div>Data de Conclusão: _____/_____/_________</div>
        </div>
      </div>

      <!-- RODAPÉ DO DOCUMENTO -->
      <div class="doc-footer">
        SIG OLOR LUZ • Sistema Integrado de Gestão de Fórmulas e Produção Química • Documento Oficial de Bancada
      </div>

    </div>
  </div>

</body>
</html>`;

    win.document.open();
    win.document.write(htmlContent);
    win.document.close();
  };

  // Imprimir ficha diretamente
  const handleImprimir = () => {
    handleAbrirFichaEmNovaAba();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden"
      id="modal-fabricacao-backdrop"
    >
      <div 
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95dvh] sm:h-auto sm:max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black"
        id="modal-fabricacao-container"
      >
        {/* CABEÇALHO DO MODAL - RESPONSIVO E HÍBRIDO */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-950/95 border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <img 
                src={OFFICIAL_LOGO_URL} 
                alt="Logo Oficial Olor Luz" 
                className="h-7 sm:h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold text-slate-100 font-cinzel tracking-wide truncate">
                  Ordem de Fabricação
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
                  P&D / Fábrica
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block truncate">
                Calculadora dinâmica de batelada e roteiro sequencial de bancada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* BOTÃO ABRIR EM NOVA ABA / BAIXAR PDF */}
            <button
              type="button"
              onClick={handleAbrirFichaEmNovaAba}
              disabled={!formulaAtiva}
              className="min-h-[40px] py-1.5 px-2.5 sm:px-3.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-amber-400/20 flex items-center gap-1.5 active:scale-95 touch-manipulation"
              title="Abrir Ficha de Produção em Nova Aba para Baixar em PDF ou Imprimir"
            >
              <ExternalLink className="w-4 h-4 text-slate-900 shrink-0" />
              <span className="hidden sm:inline">Baixar / Imprimir PDF</span>
              <span className="sm:hidden font-black">PDF</span>
            </button>

            {/* BOTÃO IMPRIMIR */}
            <button
              type="button"
              onClick={handleImprimir}
              disabled={!formulaAtiva}
              className="min-h-[40px] p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 touch-manipulation"
              title="Abrir Ficha Técnica"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors touch-manipulation"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CABEÇALHO PARA IMPRESSÃO (Aparece apenas no print) */}
        <div className="hidden print:block p-6 border-b border-gray-300 text-black">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-serif uppercase tracking-wider text-black">
                SIG Olor Luz — Ficha de Produção
              </h1>
              <p className="text-sm text-gray-600">
                Ordem de Fabricação de Bancada / Lote Industrial
              </p>
            </div>
            <div className="text-right font-mono text-xs text-gray-600">
              <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
              <p>Hora: {new Date().toLocaleTimeString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* CORPO PRINCIPAL COM SCROLL SUAVE */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 overscroll-contain">
          
          {/* SEÇÃO 1: FORMULÁRIO DINÂMICO DE ENTRADA (TOP BAR) */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg print:border-gray-300 print:bg-gray-50 print:p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 print:border-gray-300">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider print:text-black">
                1. Parâmetros de Produção & Volume Desejado
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4">
              
              {/* CAMPO 1: SELETOR DA FÓRMULA (6 Colunas) */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 font-mono print:text-black">
                  Fórmula / Fragrância a Produzir <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedFormulaId}
                    onChange={(e) => {
                      setSelectedFormulaId(e.target.value);
                      setEtapasConcluidas({});
                    }}
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors print:bg-white print:text-black print:border-gray-400"
                  >
                    <option value="" disabled>Selecione uma fórmula...</option>
                    {formulas.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.produto} — ({f.status}) • Base: {f.rendimento} {f.unidadeRendimento} • {f.insumos?.length || 0} Insumos
                      </option>
                    ))}
                  </select>
                </div>
                {formulaAtiva && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-[11px] text-slate-400 pt-0.5 print:text-gray-600">
                    <span className="font-semibold text-amber-200">
                      Status: <strong className="text-amber-300">{formulaAtiva.status}</strong>
                    </span>
                    <span>•</span>
                    <span>Receita Base: <strong>{formulaAtiva.rendimento} {formulaAtiva.unidadeRendimento}</strong></span>
                    {formulaAtiva.isCriacaoLivre && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                        P&D
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* CAMPO 2: VOLUME A PRODUZIR (3 Colunas) */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 font-mono print:text-black">
                  Volume a Produzir <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0.001"
                    value={volumeDesejado}
                    onChange={(e) => {
                      setVolumeDesejado(e.target.value);
                      setEtapasConcluidas({});
                    }}
                    placeholder="Ex: 50"
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm sm:text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors print:bg-white print:text-black print:border-gray-400"
                  />
                </div>
                {/* ATALHOS RÁPIDOS DE VOLUME */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto print:hidden no-scrollbar">
                  {(unidadeVolume === 'L' ? ['5', '20', '50', '200', '1000'] : ['100', '250', '500', '1000']).map((qtd) => (
                    <button
                      key={qtd}
                      type="button"
                      onClick={() => {
                        setVolumeDesejado(qtd);
                        setEtapasConcluidas({});
                      }}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 active:scale-95 text-[11px] font-mono text-slate-300 border border-slate-700/60 transition-all shrink-0 touch-manipulation"
                    >
                      {qtd}{unidadeVolume}
                    </button>
                  ))}
                </div>
              </div>

              {/* CAMPO 3: UNIDADE DO VOLUME (3 Colunas) */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 font-mono print:text-black">
                  Unidade de Medida
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUnidadeVolume('L');
                      setEtapasConcluidas({});
                    }}
                    className={`min-h-[44px] py-2.5 px-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
                      unidadeVolume === 'L'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span>Litros (L)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUnidadeVolume('ml');
                      setEtapasConcluidas({});
                    }}
                    className={`min-h-[44px] py-2.5 px-2.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
                      unidadeVolume === 'ml'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span>Mililitros (mL)</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {unidadeVolume === 'ml' ? 'Ideal para amostras e laboratório' : 'Ideal para tambores e galões'}
                </p>
              </div>

            </div>

            {/* PAINEL DE RESUMO DA BATELADA / ESCALA */}
            {formulaAtiva && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3.5 pt-3.5 border-t border-slate-800 font-mono text-xs print:border-gray-300">
                
                <div className="bg-slate-900/90 p-2 sm:p-2.5 rounded-xl border border-slate-800 print:bg-white print:border-gray-300">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block">Lote a Produzir:</span>
                  <span className="text-xs sm:text-sm font-bold text-amber-300 font-mono print:text-black">
                    {volumeNumerico} {unidadeVolume}
                  </span>
                  {unidadeVolume === 'ml' && (
                    <span className="text-[9px] text-slate-500 block">(= {(volumeNumerico / 1000).toFixed(3)} L)</span>
                  )}
                </div>

                <div className="bg-slate-900/90 p-2 sm:p-2.5 rounded-xl border border-slate-800 print:bg-white print:border-gray-300">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block">Fator Proporcional:</span>
                  <span className="text-xs sm:text-sm font-bold text-cyan-300 font-mono print:text-black">
                    {fatorEscala >= 1 ? `${fatorEscala.toFixed(2)}x` : `${fatorEscala.toFixed(4)}x`}
                  </span>
                  <span className="text-[9px] text-slate-500 block">da receita base</span>
                </div>

                <div className="bg-slate-900/90 p-2 sm:p-2.5 rounded-xl border border-slate-800 print:bg-white print:border-gray-300">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block">Custo do Lote:</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-300 font-mono print:text-black">
                    {formatarMoeda(custoTotalLoteFabricacao)}
                  </span>
                  <span className="text-[9px] text-slate-500 block">custo dos insumos</span>
                </div>

                <div className="bg-slate-900/90 p-2 sm:p-2.5 rounded-xl border border-slate-800 print:bg-white print:border-gray-300">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block">Custo Unitário:</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-200 font-mono print:text-black">
                    {formatarValorUnitarioLitro(custoUnitarioLitroFabricacao)}
                    <span className="text-[9px] font-normal text-slate-400 ml-0.5">/ L</span>
                  </span>
                  <span className="text-[9px] text-slate-500 block">normalizado</span>
                </div>

              </div>
            )}
          </div>

          {/* TIMER DE AGITAÇÃO / BANCADA (SE ATIVO) */}
          {timerAtivo && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-lg animate-pulse print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                  <Timer className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                    Cronômetro de Homogeneização em Execução
                  </span>
                  <p className="text-xs text-slate-200">
                    Etapa: <strong className="text-amber-200">{timerEtapaNome || 'Agitação de Insumo'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-3xl font-black font-mono text-amber-300 bg-slate-950 px-4 py-1.5 rounded-xl border border-amber-500/30">
                  {formatarTempo(segundosRestantes)}
                </div>
                <button
                  type="button"
                  onClick={() => setTimerAtivo(false)}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors"
                >
                  Parar
                </button>
              </div>
            </div>
          )}

          {/* SEÇÃO 2: ROTEIRO SEQUENCIAL DE ETAPAS INDEPENDENTES */}
          {formulaAtiva ? (
            <div className="space-y-4">
              
              {/* BARRA DE PROGRESSO DO CHECKLIST E CABEÇALHO */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 print:bg-transparent print:border-none print:p-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider print:text-black">
                      2. Roteiro Sequencial de Produção ({etapasProducao.length} Etapas)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 print:text-gray-600">
                    Siga a sequência rigorosa de pesagem, adição e homogeneização abaixo.
                  </p>
                </div>

                <div className="flex items-center gap-3 print:hidden">
                  <div className="text-right font-mono">
                    <span className="text-[11px] text-slate-400 block">Progresso do Lote:</span>
                    <span className={`text-xs font-bold ${concluidasCount === totalEtapas ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {concluidasCount} de {totalEtapas} concluídas ({percentualProgresso}%)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleTodas}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700 rounded-xl transition-colors"
                  >
                    {concluidasCount === totalEtapas ? 'Limpar Checklist' : 'Marcar Todas'}
                  </button>
                </div>
              </div>

              {/* BARRA DE PROGRESSO VISUAL */}
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 print:hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    percentualProgresso === 100 
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-400'
                  }`}
                  style={{ width: `${percentualProgresso}%` }}
                />
              </div>

              {/* LISTA DE CARDS DE ETAPAS INDEPENDENTES */}
              <div className="space-y-3">
                {etapasProducao.map((etapa) => {
                  const isConcluida = Boolean(etapasConcluidas[etapa.index]);

                  return (
                    <div
                      key={etapa.index}
                      className={`relative rounded-xl sm:rounded-2xl border transition-all overflow-hidden ${
                        isConcluida
                          ? 'bg-emerald-950/20 border-emerald-500/40 opacity-90'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      } print:bg-white print:border-gray-300 print:text-black print:mb-3`}
                    >
                      <div className="p-3.5 sm:p-5 space-y-3">
                        
                        {/* LINHA SUPERIOR: NÚMERO DA ETAPA, NOME DO INSUMO E CHECKBOX */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
                          
                          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                            {/* BADGE DA ETAPA */}
                            <div className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-mono text-[11px] sm:text-xs font-black shrink-0 border ${
                              isConcluida
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            } print:border-gray-400 print:text-black`}>
                              ETAPA {etapa.seqOriginal}
                            </div>

                            {/* NOME DO INSUMO */}
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h4 className={`text-sm sm:text-base font-bold ${
                                  isConcluida ? 'line-through text-slate-400' : 'text-slate-100'
                                } print:text-black print:no-underline break-words`}>
                                  {etapa.insumo}
                                </h4>
                                
                                {etapa.percentual > 0 && (
                                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-slate-950 text-slate-400 border border-slate-800 print:border-gray-300 print:text-gray-600">
                                    {etapa.percentual.toFixed(2)}% da fórmula
                                  </span>
                                )}
                              </div>

                              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono print:text-gray-600">
                                Preço unitário base: {formatarMoeda(etapa.precoUni)} / {etapa.unidadeOriginal} • Subtotal: <strong className="text-emerald-400">{formatarMoeda(etapa.custoEtapa)}</strong>
                              </p>
                            </div>
                          </div>

                          {/* BOTÃO CHECKBOX DE CONCLUSÃO (Touch-friendly / Ergonomia de Bancada) */}
                          <button
                            type="button"
                            onClick={() => toggleEtapa(etapa.index)}
                            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 shrink-0 touch-manipulation active:scale-95 w-full sm:w-auto ${
                              isConcluida
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-slate-100'
                            } print:hidden`}
                          >
                            {isConcluida ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Etapa Concluída / Adicionado</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>Marcar como Pesado & Adicionado</span>
                              </>
                            )}
                          </button>

                          {/* CHECKBOX PARA IMPRESSÃO */}
                          <div className="hidden print:block w-5 h-5 border-2 border-black rounded shrink-0" />

                        </div>

                        {/* BLOCO CENTRAL: QUANTIDADE EXATA A PESAR / MEDIR (Grande visibilidade no celular/tablet) */}
                        <div className="bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono print:bg-gray-100 print:border-gray-300">
                          <div className="flex items-center gap-2.5">
                            <Scale className="w-5 h-5 text-amber-400 shrink-0" />
                            <div>
                              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase block tracking-wider">
                                Quantidade a pesar/medir para este lote:
                              </span>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-lg sm:text-xl font-black text-amber-300 print:text-black">
                                  {etapa.exibicaoPrincipal}
                                </span>
                                {etapa.exibicaoSecundaria && (
                                  <span className="text-xs text-slate-400 print:text-gray-600">
                                    {etapa.exibicaoSecundaria}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right text-[10px] sm:text-[11px] text-slate-500 sm:self-center pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                            <span>Base na receita: <strong className="text-slate-300">{etapa.qtdBaseOriginal} {etapa.unidadeOriginal}</strong></span>
                          </div>
                        </div>

                        {/* BLOCO INFERIOR: INSTRUÇÃO DE PROCESSO / METODOLOGIA */}
                        <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 print:bg-transparent print:border-none print:p-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 font-mono flex items-center gap-1.5 print:text-black">
                              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Instrução de Processo:</span>
                            </span>

                            {/* ATALHOS RÁPIDOS DE TIMER DE HOMOGENEIZAÇÃO */}
                            <div className="flex items-center gap-1 print:hidden">
                              <span className="text-[10px] text-slate-500 mr-1 hidden sm:inline">Cronômetro:</span>
                              {[1, 3, 5].map((mins) => (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => iniciarTimer(mins, `${etapa.insumo} (Etapa ${etapa.seqOriginal})`)}
                                  className="min-h-[30px] px-2 py-0.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 text-[10px] font-mono rounded-lg border border-slate-700 transition-colors flex items-center gap-1 touch-manipulation active:scale-95"
                                  title={`Iniciar timer de ${mins} minutos para esta homogeneização`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{mins}m</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 italic font-sans leading-relaxed print:text-black">
                            {etapa.metodologia ? (
                              etapa.metodologia
                            ) : (
                              "Adicionar lentamente ao reator sob agitação mecânica constante. Homogeneizar até completa dissolução e dispersão uniforme."
                            )}
                          </p>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* OBSERVAÇÕES DE ENVASE E CQ DA FÓRMULA */}
              {formulaAtiva.obs && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 print:border-gray-300 print:bg-white">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase">
                    <Info className="w-4 h-4" />
                    <span className="print:text-black">Observações Gerais, Controle de Qualidade & Envase:</span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed print:text-black">
                    {formulaAtiva.obs}
                  </p>
                </div>
              )}

              {/* CARD DE CONCLUSÃO QUANDO TODAS AS ETAPAS FOREM MARCADAS */}
              {concluidasCount === totalEtapas && totalEtapas > 0 && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center space-y-2 animate-fadeIn print:hidden">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-emerald-300 font-cinzel">
                    Lote Fabricado com Sucesso!
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Todas as {totalEtapas} etapas de pesagem e homogeneização foram marcadas como concluídas para o produto <strong>{formulaAtiva.produto}</strong>.
                  </p>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-12 bg-slate-950/40 rounded-xl sm:rounded-2xl border border-slate-800">
              <FlaskConical className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-300">Nenhuma fórmula selecionada</h4>
              <p className="text-xs text-slate-500 mt-1">
                Selecione uma fórmula salva no topo para carregar o roteiro sequencial de fabricação.
              </p>
            </div>
          )}

        </div>

        {/* RODAPÉ DO MODAL COM BOTÕES DE AÇÃO */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-950 border-t border-slate-800 shrink-0 print:hidden">
          <div className="text-xs text-slate-400 font-mono hidden md:block">
            {formulaAtiva && (
              <span>
                Total Insumos: <strong className="text-slate-200">{etapasProducao.length} itens</strong> • 
                Volume: <strong className="text-amber-300">{volumeNumerico} {unidadeVolume}</strong> •
                Custo Lote: <strong className="text-emerald-400">{formatarMoeda(custoTotalLoteFabricacao)}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
            {/* BOTÃO ABRIR EM NOVA ABA / BAIXAR PDF NO RODAPÉ */}
            <button
              type="button"
              onClick={handleAbrirFichaEmNovaAba}
              disabled={!formulaAtiva}
              className="min-h-[44px] py-2.5 px-3.5 sm:px-4 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-amber-400/20 flex items-center justify-center gap-1.5 active:scale-95 flex-1 md:flex-initial touch-manipulation"
              title="Abrir Ficha de Produção em Nova Aba para Baixar em PDF ou Imprimir"
            >
              <ExternalLink className="w-4 h-4 text-slate-900" />
              <span>Baixar / Imprimir PDF</span>
            </button>

            {/* BOTÃO FECHAR */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors touch-manipulation"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper de formatação de precisão limpa sem dízimas estranhas
function formatarQtdPrecisao(valor: number): string {
  if (isNaN(valor) || valor === 0) return '0';
  if (valor >= 100) {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  if (valor >= 1) {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
  }
  // Para valores pequenos (ex: 0.05, 0.0025)
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
