import React, { useState } from 'react';
import { Copy, Check, FileCode, ExternalLink, HelpCircle, Server, Rocket, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Search, Database } from 'lucide-react';
import { getAppsScriptUrl, testarConexaoApi } from '../services/api';

const APPS_SCRIPT_CODE = `/**
 * SIG Olor Luz - API Web App para Google Planilhas
 * 
 * Estrutura da Planilha Olor_Luz_Sistema:
 * - Aba "Listas": Cabeçalhos na Linha 1 (VENDEDORES, PRODUTO, EMBALAGEM, TABELA DE PREÇO, TIPO SAIDA, STATUS COMISSÃO)
 * - Aba "BD_Vendas": Colunas A a R (ID, Data, ID_Saida, Vendedor, Tabela de Preço, Tipo Saida, Produto, Embalagem_VENDA, Quantidade, Desconto/Adicional, Preço uni, Preço de Venda, R$ de Comissão, Status Comissão, Dia, Mes, Ano, OBS)
 */

var ABA_LISTAS = "Listas";
var ABA_BD_VENDAS = "BD_Vendas";

function removerVendasPorIdSaida(sheet, idSaida) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0;
  var removidos = 0;
  var idSaidaNorm = String(idSaida || "").trim().toLowerCase();
  if (!idSaidaNorm) return 0;

  // Localiza dinamicamente a coluna do ID_Saida ou ID no cabeçalho (Linha 1)
  var headers = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });
  var idxIdSaida = headers.indexOf("id_saida");
  if (idxIdSaida === -1) idxIdSaida = headers.findIndex(function(h) { return h.includes("saida"); });
  if (idxIdSaida === -1) idxIdSaida = 2; // Fallback para Coluna C (índice 2)

  var idxId = headers.indexOf("id");
  if (idxId === -1) idxId = 0; // Fallback para Coluna A (índice 0)

  // Deleta de baixo para cima para preservar a integridade dos índices de linha
  for (var i = data.length - 1; i >= 1; i--) {
    var valColSaida = String(data[i][idxIdSaida] || "").trim().toLowerCase();
    var valColId = String(data[i][idxId] || "").trim().toLowerCase();
    if (valColSaida === idSaidaNorm || valColId === idSaidaNorm) {
      sheet.deleteRow(i + 1);
      removidos++;
    }
  }
  return removidos;
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.getActive();
    if (!ss) {
      var sheetId = e && e.parameter && e.parameter.sheetId;
      if (sheetId) {
        ss = SpreadsheetApp.openById(sheetId);
      } else {
        throw new Error("Planilha ativa não encontrada. Abra a planilha Olor_Luz_Sistema e vá em Extensões > Apps Script.");
      }
    }

    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "all";

    // Trata exclusão via GET
    if (action === "delete" || action === "excluir") {
      var sheetVendas = ss.getSheetByName(ABA_BD_VENDAS);
      var idSaidaDel = (e && e.parameter) ? (e.parameter.idSaida || e.parameter.id_saida) : null;
      if (sheetVendas && idSaidaDel) {
        var count = removerVendasPorIdSaida(sheetVendas, idSaidaDel);
        return criarRespostaJSON({
          status: "success",
          message: "Pedido " + idSaidaDel + " (" + count + " item/itens) excluído com sucesso!",
          removidos: count
        });
      }
    }

    // Trata atualização via GET
    if (action === "update" || action === "editar") {
      var sheetVendas = ss.getSheetByName(ABA_BD_VENDAS);
      if (!sheetVendas) {
        sheetVendas = ss.insertSheet(ABA_BD_VENDAS);
        inicializarAbaBDVendas(sheetVendas);
      }
      var payloadRaw = e.parameter.payload;
      var dataObj = {};
      if (payloadRaw) {
        try { dataObj = JSON.parse(payloadRaw); } catch(pErr) { dataObj = e.parameter; }
      } else {
        dataObj = e.parameter;
      }
      var idSaidaUpd = dataObj.idSaida || dataObj.id_saida || e.parameter.idSaida;
      if (idSaidaUpd) {
        removerVendasPorIdSaida(sheetVendas, idSaidaUpd);
      }
      var vendasNovas = Array.isArray(dataObj.vendas) ? dataObj.vendas : (Array.isArray(dataObj) ? dataObj : [dataObj]);
      var salvas = [];
      vendasNovas.forEach(function(v) {
        if (!v.idSaida && idSaidaUpd) v.idSaida = idSaidaUpd;
        var novaLinha = processarERegistrarVenda(sheetVendas, v);
        salvas.push(novaLinha);
      });
      return criarRespostaJSON({
        status: "success",
        message: "Pedido " + idSaidaUpd + " (" + salvas.length + " item/itens) atualizado com sucesso!",
        registros: salvas
      });
    }

    // Trata salvamento via GET ou quando o redirecionamento 302 do POST é convertido em GET
    if (action === "salvar" || (e && e.parameter && (e.parameter.payload || e.parameter.vendedor))) {
      var sheetVendas = ss.getSheetByName(ABA_BD_VENDAS);
      if (!sheetVendas) {
        sheetVendas = ss.insertSheet(ABA_BD_VENDAS);
        inicializarAbaBDVendas(sheetVendas);
      }

      var payloadRaw = e.parameter.payload || e.parameter.venda;
      var vendaObj = {};
      if (payloadRaw) {
        try {
          vendaObj = JSON.parse(payloadRaw);
        } catch(pErr) {
          vendaObj = e.parameter;
        }
      } else {
        vendaObj = e.parameter;
      }

      var salvas = [];
      var vendasParaInserir = Array.isArray(vendaObj) ? vendaObj : (vendaObj.vendas || [vendaObj]);
      vendasParaInserir.forEach(function(v) {
        var novaLinha = processarERegistrarVenda(sheetVendas, v);
        salvas.push(novaLinha);
      });

      return criarRespostaJSON({
        status: "success",
        message: salvas.length + " registro(s) inserido(s) com sucesso na aba BD_Vendas!",
        registros: salvas
      });
    }

    var responseData = {};

    var sheetListas = ss.getSheetByName(ABA_LISTAS);
    if (!sheetListas) {
      sheetListas = ss.insertSheet(ABA_LISTAS);
      inicializarAbaListas(sheetListas);
    }

    var listasData = extrairDadosListas(sheetListas);
    responseData.listas = listasData.selects;
    responseData.dadosBrutos = listasData.dadosBrutos;

    // Chaves de nível superior para compatibilidade direta com o formato do Apps Script
    responseData.vendedores = listasData.selects.vendedores;
    responseData.produtos = listasData.selects.produtos;
    responseData.produto = listasData.selects.produtos;
    responseData.embalagens = listasData.selects.embalagens;
    responseData.embalagem = listasData.selects.embalagens;
    responseData.tabelasPreco = listasData.selects.tabelasPreco;
    responseData.tabelaPreco = listasData.selects.tabelasPreco;
    responseData.tiposSaida = listasData.selects.tiposSaida;
    responseData.tipoSaida = listasData.selects.tiposSaida;
    responseData.statusComissao = listasData.selects.statusComissao;

    if (action === "all" || action === "vendas") {
      var sheetVendas = ss.getSheetByName(ABA_BD_VENDAS);
      if (sheetVendas) {
        responseData.vendas = extrairVendas(sheetVendas);
      } else {
        responseData.vendas = [];
      }
    }

    responseData.status = "success";
    responseData.timestamp = new Date().toISOString();

    return criarRespostaJSON(responseData);

  } catch (error) {
    return criarRespostaJSON({
      status: "error",
      message: error.toString(),
      stack: error.stack
    });
  }
}

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    var ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.getActive();
    var sheetVendas = ss.getSheetByName(ABA_BD_VENDAS);
    if (!sheetVendas) {
      sheetVendas = ss.insertSheet(ABA_BD_VENDAS);
      inicializarAbaBDVendas(sheetVendas);
    }

    var contents = null;
    if (e && e.postData && e.postData.contents) {
      contents = e.postData.contents;
    } else if (e && e.parameter && e.parameter.payload) {
      contents = e.parameter.payload;
    } else if (e && e.parameter) {
      contents = JSON.stringify(e.parameter);
    }

    if (!contents) {
      throw new Error("Payload de dados vazio no POST.");
    }

    var data;
    try {
      data = JSON.parse(contents);
    } catch(pErr) {
      data = e.parameter;
    }

    var action = data.action || (e && e.parameter && e.parameter.action) || "create";

    // 1. ROTA DE EXCLUSÃO (DELETE)
    if (action === "delete" || action === "excluir") {
      var idSaidaDel = data.idSaida || data.id_saida || (e && e.parameter && e.parameter.idSaida);
      if (!idSaidaDel) throw new Error("ID_Saida não informado para exclusão.");
      
      var countDel = removerVendasPorIdSaida(sheetVendas, idSaidaDel);
      lock.releaseLock();
      
      return criarRespostaJSON({
        status: "success",
        message: "Pedido " + idSaidaDel + " (" + countDel + " item/itens) excluído com sucesso da planilha!",
        removidos: countDel
      });
    }

    // 2. ROTA DE ATUALIZAÇÃO (UPDATE)
    if (action === "update" || action === "editar") {
      var idSaidaUpd = data.idSaida || data.id_saida || (e && e.parameter && e.parameter.idSaida);
      if (!idSaidaUpd) throw new Error("ID_Saida não informado para atualização.");
      
      // Remove linhas antigas do mesmo ID_Saida
      removerVendasPorIdSaida(sheetVendas, idSaidaUpd);
      
      // Insere os novos itens atualizados
      var vendasNovas = Array.isArray(data.vendas) ? data.vendas : (Array.isArray(data) ? data : [data]);
      var salvasUpd = [];
      
      vendasNovas.forEach(function(v) {
        if (!v.idSaida) v.idSaida = idSaidaUpd;
        var novaLinha = processarERegistrarVenda(sheetVendas, v);
        salvasUpd.push(novaLinha);
      });
      
      lock.releaseLock();
      
      return criarRespostaJSON({
        status: "success",
        message: "Pedido " + idSaidaUpd + " (" + salvasUpd.length + " item/itens) atualizado com sucesso!",
        registros: salvasUpd
      });
    }

    // 3. ROTA DE CRIAÇÃO PADRÃO (CREATE / SALVAR)
    var vendasParaInserir = Array.isArray(data) ? data : (data.vendas || [data]);
    var salvas = [];

    vendasParaInserir.forEach(function(venda) {
      var novaLinha = processarERegistrarVenda(sheetVendas, venda);
      salvas.push(novaLinha);
    });

    lock.releaseLock();

    return criarRespostaJSON({
      status: "success",
      message: salvas.length + " registro(s) inserido(s) com sucesso na aba BD_Vendas!",
      registros: salvas
    });

  } catch (error) {
    return criarRespostaJSON({
      status: "error",
      message: error.toString(),
      stack: error.stack
    });
  }
}

function processarERegistrarVenda(sheet, venda) {
  var hoje = venda.data ? new Date(venda.data + "T12:00:00") : new Date();
  var dia = venda.dia || hoje.getDate();
  var mes = venda.mes || (hoje.getMonth() + 1);
  var ano = venda.ano || hoje.getFullYear();

  var id = venda.id || "VEN-" + ano + ("0" + mes).slice(-2) + ("0" + dia).slice(-2) + "-" + Math.floor(1000 + Math.random() * 9000);
  var dataFormatada = venda.data || Utilities.formatDate(hoje, "GMT-3", "yyyy-MM-dd");
  var idSaida = venda.idSaida || venda.id_saida || "SAI-" + Math.floor(1000 + Math.random() * 9000);
  var vendedor = venda.vendedor || "";
  var tabelaPreco = venda.tabelaPreco || venda.tabela_preco || venda.tabela || "Site";
  var tipoSaida = venda.tipoSaida || venda.tipo_saida || "Venda";
  var produto = venda.produto || "";
  var embalagem = venda.embalagem || venda.embalagemVenda || venda.embalagem_venda || "";
  var qtdRaw = String(venda.quantidade !== undefined && venda.quantidade !== null ? venda.quantidade : 0).replace(',', '.');
  var quantidade = parseFloat(qtdRaw) || 0;

  var modRaw = String(venda.modificador !== undefined && venda.modificador !== null ? venda.modificador : (venda.descontoAdicional || 0)).replace(',', '.');
  var modificador = parseFloat(modRaw) || 0;

  var precoUniRaw = String(venda.precoUni !== undefined && venda.precoUni !== null ? venda.precoUni : 0).replace(',', '.');
  var precoUniOriginal = parseFloat(precoUniRaw) || 0;
  var statusComissao = venda.statusComissao || venda.status_comissao || "Pendente";
  var obs = venda.obs || "";
  var clienteInfluenciador = venda.clienteInfluenciador || venda.cliente_influenciador || venda.cliente || "";
  var contato = venda.contato || venda.telefone || "";

  var precoUni = 0;
  var precoVenda = 0;
  var comissao = 0;

  var tipoSaidaNorm = tipoSaida.toString().trim().toLowerCase();
  var isOlorLuz = (vendedor.toString().trim().toLowerCase() === "olor luz");

  if (tipoSaidaNorm === "venda") {
    precoUni = precoUniOriginal;
    precoVenda = (precoUni * quantidade) + modificador;
    var subtotalBruto = precoUni * quantidade;
    comissao = isOlorLuz ? 0 : (subtotalBruto * 0.12) + modificador;
  } else if (tipoSaidaNorm === "consignado" || tipoSaidaNorm.indexOf("amostra") !== -1) {
    precoUni = precoUniOriginal;
    precoVenda = (precoUni * quantidade) + modificador;
    comissao = 0;
  } else {
    precoUni = 0;
    precoVenda = 0;
    comissao = 0;
  }

  if (isOlorLuz) {
    comissao = 0;
    statusComissao = "";
  }

  if (venda.precoVenda !== undefined && !isNaN(Number(venda.precoVenda))) {
    precoVenda = Number(venda.precoVenda);
  }
  if (venda.comissao !== undefined && !isNaN(Number(venda.comissao)) && tipoSaidaNorm === "venda" && !isOlorLuz) {
    comissao = Number(venda.comissao);
  }

  // 20 colunas estritas
  var row = [
    id,                   // Coluna A: ID
    dataFormatada,        // Coluna B: Data
    idSaida,              // Coluna C: ID_Saida
    vendedor,             // Coluna D: Vendedor
    tabelaPreco,          // Coluna E: Tabela de Preço
    tipoSaida,            // Coluna F: Tipo Saida
    produto,              // Coluna G: Produto
    embalagem,            // Coluna H: Embalagem_VENDA
    quantidade,           // Coluna I: Quantidade
    modificador,          // Coluna J: Desconto/Adicional
    precoUni,             // Coluna K: Preço uni
    precoVenda,           // Coluna L: Preço de Venda
    comissao,             // Coluna M: R$ de Comissão
    statusComissao,       // Coluna N: Status Comissão
    dia,                  // Coluna O: Dia
    mes,                  // Coluna P: Mês
    ano,                  // Coluna Q: Ano
    obs,                  // Coluna R: OBS
    clienteInfluenciador, // Coluna S: Cliente/Influenciador
    contato               // Coluna T: Contato
  ];

  sheet.appendRow(row);

  return {
    id: id, data: dataFormatada, idSaida: idSaida, vendedor: vendedor,
    tabelaPreco: tabelaPreco, tipoSaida: tipoSaida, produto: produto,
    embalagem: embalagem, quantidade: quantidade, modificador: modificador,
    precoUni: precoUni, precoVenda: precoVenda, comissao: comissao,
    statusComissao: statusComissao, dia: dia, mes: mes, ano: ano, obs: obs,
    clienteInfluenciador: clienteInfluenciador, contato: contato
  };
}

function normalizarTexto(txt) {
  if (!txt) return "";
  return String(txt)
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^A-Z0-9]/gi, " ")
    .trim()
    .toUpperCase();
}

function extrairDadosListas(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    return {
      selects: { vendedores: [], produtos: [], embalagens: [], tabelasPreco: ["Site", "Tiktok", "Venda Direta"], tiposSaida: ["Venda", "Consignado", "Mostruário", "Bonificação"], statusComissao: ["Pendente", "Pago", "Cancelado"] },
      dadosBrutos: []
    };
  }

  var headersOriginais = data[0].map(function(h) { return String(h).trim(); });
  var headersNorm = headersOriginais.map(function(h) { return normalizarTexto(h); });

  var vendedoresSet = {};
  var produtosSet = {};
  var embalagensSet = {};
  var tabelasPrecoSet = { "Site": true, "Tiktok": true, "Venda Direta": true };
  var tiposSaidaSet = {};
  var statusComissaoSet = {};
  var dadosBrutos = [];

  var idxVendedor = -1;
  var idxProduto = -1;
  var idxEmbalagem = -1;
  var idxTabelaPreco = -1;
  var idxTipoSaida = -1;
  var idxStatusComissao = -1;

  for (var c = 0; c < headersNorm.length; c++) {
    var h = headersNorm[c];
    if (idxVendedor === -1 && (h.indexOf("VENDEDOR") !== -1 || h.indexOf("VEND") !== -1)) idxVendedor = c;
    if (idxProduto === -1 && (h.indexOf("PRODUTO") !== -1 || h.indexOf("PROD") !== -1)) idxProduto = c;
    if (idxEmbalagem === -1 && (h.indexOf("EMBALAGEM") !== -1 || h.indexOf("EMB") !== -1)) idxEmbalagem = c;
    if (idxTabelaPreco === -1 && (h.indexOf("TABELA") !== -1 || h.indexOf("PRECO") !== -1)) idxTabelaPreco = c;
    if (idxTipoSaida === -1 && (h.indexOf("TIPO") !== -1 || h.indexOf("SAIDA") !== -1)) idxTipoSaida = c;
    if (idxStatusComissao === -1 && (h.indexOf("STATUS") !== -1 || h.indexOf("COMISSAO") !== -1)) idxStatusComissao = c;
  }

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var itemBruto = {};

    for (var col = 0; col < headersOriginais.length; col++) {
      var headerName = headersOriginais[col] || ("Coluna_" + (col + 1));
      var val = row[col];
      itemBruto[headerName] = val;
    }
    dadosBrutos.push(itemBruto);

    if (idxVendedor !== -1 && row[idxVendedor] !== undefined && row[idxVendedor] !== "") vendedoresSet[String(row[idxVendedor]).trim()] = true;
    if (idxProduto !== -1 && row[idxProduto] !== undefined && row[idxProduto] !== "") produtosSet[String(row[idxProduto]).trim()] = true;
    if (idxEmbalagem !== -1 && row[idxEmbalagem] !== undefined && row[idxEmbalagem] !== "") embalagensSet[String(row[idxEmbalagem]).trim()] = true;
    if (idxTabelaPreco !== -1 && row[idxTabelaPreco] !== undefined && row[idxTabelaPreco] !== "") tabelasPrecoSet[String(row[idxTabelaPreco]).trim()] = true;
    if (idxTipoSaida !== -1 && row[idxTipoSaida] !== undefined && row[idxTipoSaida] !== "") tiposSaidaSet[String(row[idxTipoSaida]).trim()] = true;
    if (idxStatusComissao !== -1 && row[idxStatusComissao] !== undefined && row[idxStatusComissao] !== "") statusComissaoSet[String(row[idxStatusComissao]).trim()] = true;
  }

  var tiposSaidaList = Object.keys(tiposSaidaSet);
  if (tiposSaidaList.length === 0) tiposSaidaList = ["Venda", "Consignado", "Mostruário", "Bonificação"];

  var statusComissaoList = Object.keys(statusComissaoSet);
  if (statusComissaoList.length === 0) statusComissaoList = ["Pendente", "Pago", "Cancelado"];

  return {
    selects: {
      vendedores: Object.keys(vendedoresSet).sort(),
      produtos: Object.keys(produtosSet).sort(),
      embalagens: Object.keys(embalagensSet).sort(),
      tabelasPreco: ["Site", "Tiktok", "Venda Direta"],
      tiposSaida: tiposSaidaList,
      statusComissao: statusComissaoList
    },
    dadosBrutos: dadosBrutos
  };
}

function extrairVendas(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return String(h || "").trim().toLowerCase(); });

  var idxId = headers.indexOf("id");
  var idxData = headers.indexOf("data");
  var idxIdSaida = headers.indexOf("id_saida");
  var idxVendedor = headers.indexOf("vendedor");
  var idxTabela = headers.findIndex(function(h) { return h.includes("tabela"); });
  var idxTipoSaida = headers.findIndex(function(h) { return h.includes("tipo") && h.includes("saida"); });
  var idxProduto = headers.indexOf("produto");
  var idxEmbalagem = headers.findIndex(function(h) { return h.includes("embalagem"); });
  var idxQtd = headers.findIndex(function(h) { return h.includes("quantidade") || h.includes("qtd"); });
  var idxMod = headers.findIndex(function(h) { return h.includes("desconto") || h.includes("modificador") || h.includes("adicional"); });
  var idxPrecoUni = headers.findIndex(function(h) { return h.includes("preco uni") || h.includes("preço uni"); });
  var idxPrecoVenda = headers.findIndex(function(h) { return h.includes("preco de venda") || h.includes("preço de venda"); });
  var idxComissao = headers.findIndex(function(h) { return h.includes("comissao") || h.includes("comissão"); });
  var idxStatus = headers.findIndex(function(h) { return h.includes("status"); });
  var idxDia = headers.indexOf("dia");
  var idxMes = headers.indexOf("mes");
  var idxAno = headers.indexOf("ano");
  var idxObs = headers.indexOf("obs");
  var idxCliente = headers.findIndex(function(h) { return h.includes("cliente") || h.includes("influenciador"); });
  var idxContato = headers.findIndex(function(h) { return h.includes("contato") || h.includes("telefone"); });

  var vendas = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[0] && !row[1] && !row[3]) continue;

    var temColTabela = idxTabela !== -1;

    var getVal = function(idx, default18, default17) {
      if (idx !== -1 && idx < row.length) return row[idx];
      var def = temColTabela ? default18 : default17;
      return def >= 0 && def < row.length ? row[def] : "";
    };

    var dataVal = getVal(idxData, 1, 1);
    var dataStr = "";
    if (dataVal instanceof Date) {
      dataStr = Utilities.formatDate(dataVal, "GMT-3", "yyyy-MM-dd");
    } else {
      dataStr = String(dataVal || "");
    }

    vendas.push({
      id: String(getVal(idxId, 0, 0) || ""),
      data: dataStr,
      idSaida: String(getVal(idxIdSaida, 2, 2) || ""),
      vendedor: String(getVal(idxVendedor, 3, 3) || ""),
      tabelaPreco: String(getVal(idxTabela, 4, -1) || "Site"),
      tipoSaida: String(getVal(idxTipoSaida, 5, 4) || "Venda"),
      produto: String(getVal(idxProduto, 6, 5) || ""),
      embalagem: String(getVal(idxEmbalagem, 7, 6) || ""),
      quantidade: Number(getVal(idxQtd, 8, 7)) || 0,
      modificador: Number(getVal(idxMod, 9, 8)) || 0,
      precoUni: Number(getVal(idxPrecoUni, 10, 9)) || 0,
      precoVenda: Number(getVal(idxPrecoVenda, 11, 10)) || 0,
      comissao: Number(getVal(idxComissao, 12, 11)) || 0,
      statusComissao: String(getVal(idxStatus, 13, 12) || ""),
      dia: Number(getVal(idxDia, 14, 13)) || 0,
      mes: Number(getVal(idxMes, 15, 14)) || 0,
      ano: Number(getVal(idxAno, 16, 15)) || 0,
      obs: String(getVal(idxObs, 17, 16) || ""),
      clienteInfluenciador: String(getVal(idxCliente, 18, -1) || ""),
      contato: String(getVal(idxContato, 19, -1) || "")
    });
  }

  return vendas;
}

function criarRespostaJSON(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

function inicializarAbaListas(sheet) {
  var headers = ["VENDEDORES", "PRODUTO", "EMBALAGEM", "TABELA DE PREÇO", "TIPO SAIDA", "STATUS COMISSÃO"];
  sheet.appendRow(headers);
}

function inicializarAbaBDVendas(sheet) {
  var headers = [
    "ID", "Data", "ID_Saida", "Vendedor", "Tabela de Preço", "Tipo Saida", "Produto",
    "Embalagem_VENDA", "Quantidade", "Desconto/Adicional", "Preço uni",
    "Preço de Venda", "R$ de Comissão", "Status Comissão", "Dia", "Mes", "Ano", "OBS",
    "Cliente / Influenciador", "Contato"
  ];
  sheet.appendRow(headers);
}`;

export const AppsScriptView: React.FC = () => {
  const [copiado, setCopiado] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoDiagnostico, setResultadoDiagnostico] = useState<{
    ok: boolean;
    mensagem: string;
    detalhes?: any;
  } | null>(null);

  const currentUrl = getAppsScriptUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const handleDiagnostico = async () => {
    setTestando(true);
    setResultadoDiagnostico(null);
    const res = await testarConexaoApi();
    setResultadoDiagnostico(res);
    setTestando(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 max-w-5xl mx-auto space-y-8">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Server className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-amber-200">
              Código do Google Apps Script (Código.gs)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            API RESTful para Google Planilhas (`Olor_Luz_Sistema`) com busca inteligente de colunas e rotas <code className="text-amber-300">doGet()</code> e <code className="text-amber-300">doPost()</code>.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-xs shadow-lg transition-all ${
            copiado
              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
          }`}
        >
          {copiado ? (
            <>
              <Check className="w-4 h-4" />
              <span>Código Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar Código.gs</span>
            </>
          )}
        </button>
      </div>

      {/* Aviso de Estrutura da Planilha e Atualização do Código.gs */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          Atenção: Ações necessárias na sua Planilha Google e no Apps Script
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Para que os novos campos <strong className="text-amber-300">Cliente / Influenciador</strong> e <strong className="text-amber-300">Contato</strong> sejam salvos diretamente na sua planilha Google em tempo real, realize os 2 passos abaixo:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-1">
            <span className="font-bold text-amber-400 text-xs block">
              1. Na Aba BD_Vendas do Google Sheets:
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Adicione os títulos no cabeçalho (Linha 1):
              <br />
              • <strong className="text-amber-200">Coluna S (Coluna 19):</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-amber-300">Cliente / Influenciador</code>
              <br />
              • <strong className="text-amber-200">Coluna T (Coluna 20):</strong> <code className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-amber-300">Contato</code>
            </p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-1">
            <span className="font-bold text-amber-400 text-xs block">
              2. No Editor do Apps Script (Extensões &gt; Apps Script):
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Clique no botão <strong className="text-amber-300">"Copiar Código.gs"</strong> abaixo, cole no arquivo <code className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-amber-300">Código.gs</code>, salve (Ctrl+S) e clique em <strong className="text-amber-200">Implantar &gt; Gerenciar implantações &gt; Lápis (Editar) &gt; Versão = "Nova versão" &gt; Implantar</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Caixa de Diagnóstico da Conexão Atual */}
      <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-400" />
              Diagnóstico de Conexão com Google Sheets
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              URL Atual: {currentUrl ? <code className="text-slate-200 font-mono text-[11px]">{currentUrl}</code> : <span className="text-amber-400 font-bold">Nenhuma URL configurada</span>}
            </p>
          </div>

          <button
            onClick={handleDiagnostico}
            disabled={testando || !currentUrl}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center space-x-2 disabled:opacity-50 shrink-0 shadow-lg"
          >
            {testando ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analisando Conexão...</span>
              </>
            ) : (
              <span>Testar e Diagnosticar API</span>
            )}
          </button>
        </div>

        {resultadoDiagnostico && (
          <div className={`p-4 rounded-xl text-xs space-y-2 border ${
            resultadoDiagnostico.ok
              ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-200 border-rose-500/30'
          }`}>
            <div className="flex items-start gap-2.5 font-semibold text-sm">
              {resultadoDiagnostico.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{resultadoDiagnostico.mensagem}</span>
            </div>

            {resultadoDiagnostico.detalhes && (
              <details className="mt-2 text-[11px] text-slate-400 cursor-pointer">
                <summary className="font-mono text-amber-300 hover:underline">Ver detalhes técnicos em JSON</summary>
                <pre className="mt-2 p-3 bg-slate-900 rounded-lg font-mono text-slate-300 overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(resultadoDiagnostico.detalhes, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Caixa de Solução de Problemas: Por que nada mudou? */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          Por que "Conectei e cliquei em Atualizar, mas nada mudou"?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1.5">
            <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
              1. Nova Versão Obrigatória
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              No Apps Script, sempre que você edita ou cola um código novo no <strong className="text-slate-200">Código.gs</strong>, o Google <strong>continua executando a versão antiga</strong> até você criar uma nova versão.
            </p>
            <p className="text-amber-300 font-semibold text-[11px] pt-1">
              Solução: Clique em <strong className="text-white">Implantar &gt; Gerenciar implantações &gt; Ícone do Lápis (Editar) &gt; selecione "Nova versão" &gt; Implantar</strong>.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1.5">
            <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
              2. Permissão "Qualquer pessoa"
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Se a permissão de acesso estivar configurada como <strong className="text-slate-200">"Somente eu"</strong>, o Google exige login no navegador e bloqueia a leitura do ERP.
            </p>
            <p className="text-amber-300 font-semibold text-[11px] pt-1">
              Solução: Na tela de implantação, defina <strong>"Quem pode acessar" = "Qualquer pessoa" (Anyone)</strong>.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1.5">
            <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
              3. Cabeçalhos da Aba Listas
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              O sistema lê a <strong>Linha 1 da aba Listas</strong> para localizar os itens. A lista de produtos fica na coluna que tem o título <strong className="text-slate-200">PRODUTO</strong> ou <strong className="text-slate-200">PRODUTOS</strong>.
            </p>
            <p className="text-amber-300 font-semibold text-[11px] pt-1">
              Solução: Certifique-se de que a Linha 1 da aba <strong className="text-white">Listas</strong> tem o título <strong className="text-white">PRODUTO</strong> na coluna de produtos e <strong className="text-white">VENDEDOR</strong> na de vendedores.
            </p>
          </div>
        </div>
      </div>

      {/* Guia Ilustrado de Publicação */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Rocket className="w-4 h-4 text-amber-400" />
          Passo a Passo para Atualizar o Código no Google Apps Script:
        </h3>

        <ol className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500/20 rounded-full inline-flex items-center justify-center text-[11px] text-amber-300 font-bold">1</span>
              Copiar Código
            </div>
            <p className="text-slate-400 leading-relaxed">
              Clique no botão amarelo <strong className="text-slate-200">"Copiar Código.gs"</strong> acima para copiar a versão atualizada do backend.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500/20 rounded-full inline-flex items-center justify-center text-[11px] text-amber-300 font-bold">2</span>
              Cole no Apps Script
            </div>
            <p className="text-slate-400 leading-relaxed">
              Abra a planilha <strong className="text-slate-200">Olor_Luz_Sistema</strong>, vá em <strong className="text-slate-200">Extensões &gt; Apps Script</strong>, selecione todo o texto de <strong className="text-slate-200">Código.gs</strong> e cole o novo. Salve (Ctrl+S).
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl border-amber-500/30">
            <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500/20 rounded-full inline-flex items-center justify-center text-[11px] text-amber-300 font-bold">3</span>
              Gerenciar Implantações
            </div>
            <p className="text-slate-400 leading-relaxed">
              Clique no topo em <strong className="text-slate-200">Implantar &gt; Gerenciar implantações</strong>, clique no ícone do lápis <strong className="text-slate-200">(Editar)</strong>.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl border-amber-500/30">
            <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500/20 rounded-full inline-flex items-center justify-center text-[11px] text-amber-300 font-bold">4</span>
              Nova Versão + Re-implantar
            </div>
            <p className="text-slate-400 leading-relaxed">
              No campo Versão, mude para <strong className="text-amber-300">Nova versão</strong>, certifique-se de que "Quem pode acessar" está como <strong className="text-amber-300">Qualquer pessoa</strong> e clique em <strong className="text-amber-300">Implantar</strong>!
            </p>
          </div>

        </ol>
      </div>

      {/* Bloco do Código */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            google-apps-script / Codigo.gs
          </span>
          <button
            onClick={handleCopy}
            className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
          >
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        <pre className="p-4 bg-slate-950 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed select-all">
          <code>{APPS_SCRIPT_CODE}</code>
        </pre>
      </div>

    </div>
  );
};
