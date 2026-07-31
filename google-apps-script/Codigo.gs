/**
 * SIG Olor Luz - API Web App para Google Planilhas
 * 
 * Estrutura da Planilha Olor_Luz_Sistema:
 * - Aba "Listas": Cabeçalhos na Linha 1 (ex: VENDEDORES, PRODUTO, EMBALAGEM, TABELA DE PREÇO, TIPO SAIDA, STATUS COMISSÃO)
 * - Aba "BD_Vendas": Colunas A a Q (ID, Data, ID_Saida, Vendedor, Tipo Saida, Produto, Embalagem_VENDA, Quantidade, Desconto/Adicional, Preco uni, Preco de Venda, R$ de Comissao, Status Comissao, Dia, Mes, Ano, OBS)
 */

var ABA_LISTAS = "Listas";
var ABA_BD_VENDAS = "BD_Vendas";

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
  var quantidade = Number(venda.quantidade) || 0;
  var modificador = Number(venda.modificador) || Number(venda.descontoAdicional) || 0;
  var precoUniOriginal = Number(venda.precoUni) || 0;
  var statusComissao = venda.statusComissao || venda.status_comissao || "Pendente";
  var obs = venda.obs || "";

  var precoUni = 0;
  var precoVenda = 0;
  var comissao = 0;

  var tipoSaidaNorm = tipoSaida.toString().trim().toLowerCase();

  if (tipoSaidaNorm === "venda") {
    precoUni = precoUniOriginal;
    precoVenda = (precoUni * quantidade) + modificador;
    var subtotalBruto = precoUni * quantidade;
    comissao = (subtotalBruto * 0.12) + modificador;
  } else if (tipoSaidaNorm === "consignado") {
    precoUni = precoUniOriginal;
    precoVenda = (precoUni * quantidade) + modificador;
    comissao = 0;
  } else {
    precoUni = 0;
    precoVenda = 0;
    comissao = 0;
  }

  // Sobrescreve com valores pré-calculados do frontend se disponíveis
  if (venda.precoVenda !== undefined && !isNaN(Number(venda.precoVenda))) {
    precoVenda = Number(venda.precoVenda);
  }
  if (venda.comissao !== undefined && !isNaN(Number(venda.comissao)) && tipoSaidaNorm === "venda") {
    comissao = Number(venda.comissao);
  }

  // Array ordenado com exatamente 18 colunas (A até R)
  var row = [
    id,              // Coluna A (1): ID
    dataFormatada,   // Coluna B (2): Data
    idSaida,         // Coluna C (3): ID_Saida
    vendedor,        // Coluna D (4): Vendedor
    tabelaPreco,     // Coluna E (5): Tabela de Preço
    tipoSaida,       // Coluna F (6): Tipo Saida
    produto,         // Coluna G (7): Produto
    embalagem,       // Coluna H (8): Embalagem_VENDA
    quantidade,      // Coluna I (9): Quantidade
    modificador,     // Coluna J (10): Desconto/Adicional
    precoUni,        // Coluna K (11): Preço uni
    precoVenda,      // Coluna L (12): Preço de Venda
    comissao,        // Coluna M (13): R$ de Comissão
    statusComissao,  // Coluna N (14): Status Comissão
    dia,             // Coluna O (15): Dia
    mes,             // Coluna P (16): Mes
    ano,             // Coluna Q (17): Ano
    obs              // Coluna R (18): OBS
  ];

  sheet.appendRow(row);

  return {
    id: id,
    data: dataFormatada,
    idSaida: idSaida,
    vendedor: vendedor,
    tabelaPreco: tabelaPreco,
    tipoSaida: tipoSaida,
    produto: produto,
    embalagem: embalagem,
    quantidade: quantidade,
    modificador: modificador,
    precoUni: precoUni,
    precoVenda: precoVenda,
    comissao: comissao,
    statusComissao: statusComissao,
    dia: dia,
    mes: mes,
    ano: ano,
    obs: obs
  };
}

function normalizarTexto(txt) {
  if (!txt) return "";
  return String(txt)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
      statusComissao: String(getVal(idxStatus, 13, 12) || "Pendente"),
      dia: Number(getVal(idxDia, 14, 13)) || 0,
      mes: Number(getVal(idxMes, 15, 14)) || 0,
      ano: Number(getVal(idxAno, 16, 15)) || 0,
      obs: String(getVal(idxObs, 17, 16) || "")
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
    "Preço de Venda", "R$ de Comissão", "Status Comissão", "Dia", "Mes", "Ano", "OBS"
  ];
  sheet.appendRow(headers);
}
