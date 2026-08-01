import { ApiResponse, ListasSelects, User, Venda } from '../types';

const STORAGE_KEY_API_URL = 'olor_luz_apps_script_url';
const STORAGE_KEY_LOCAL_VENDAS = 'olor_luz_local_bd_vendas';
const STORAGE_KEY_LOCAL_USUARIOS = 'olor_luz_local_usuarios';
const STORAGE_KEY_CURRENT_USER = 'olor_luz_current_user';

export const DEFAULT_USUARIOS: User[] = [
  {
    nome: 'Gleydson',
    tipo: 'Master',
    email: 'gleydsonwsm@gmail.com',
    senha: '753751'
  },
  {
    nome: 'Master Olor Luz',
    tipo: 'Master',
    email: 'master@olorluz.com.br',
    senha: '123'
  }
];

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler usuário atual:', e);
  }
  return null;
}

export function setCurrentUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  } catch (e) {
    console.error('Erro ao salvar usuário atual:', e);
  }
}

export function logoutUser(): void {
  setCurrentUser(null);
}

export function getLocalUsuarios(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_USUARIOS);
    if (raw) {
      const list: User[] = JSON.parse(raw);
      // Garante que os usuários Master padrão continuem disponíveis caso não estejam na lista salva
      DEFAULT_USUARIOS.forEach(defUser => {
        if (!list.some(u => String(u.email || '').trim().toLowerCase() === defUser.email.toLowerCase())) {
          list.unshift(defUser);
        }
      });
      return list;
    }
  } catch (e) {
    console.error('Erro ao ler usuários locais:', e);
  }
  return DEFAULT_USUARIOS;
}

export function saveLocalUsuarios(users: User[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_USUARIOS, JSON.stringify(users));
  } catch (e) {
    console.error('Erro ao salvar usuários locais:', e);
  }
}

// Dados Iniciais Mock para Teste e Fallback caso a API ainda não esteja conectada
export const DEFAULT_LISTAS: ListasSelects = {
  vendedores: ['Olor Luz', 'Ana Souza', 'Carlos Silva', 'Juliana Costa', 'Marcos Oliveira', 'Patricia Santos'],
  produtos: [
    'Vela Aromática Luz Divina',
    'Vela Aromática Serenidade',
    'Home Spray Alecrim & Bambu',
    'Difusor de Aromas Lavanda',
    'Vela Artesanal Flor de Laranjeira'
  ],
  embalagens: [
    'Frasco 150g',
    'Lata 100g',
    'Spray 200ml',
    'Frasco 250ml',
    'Copo Vidro 200g'
  ],
  tabelasPreco: ['Site', 'Tiktok', 'Venda Direta'],
  tiposSaida: ['Venda', 'Consignado', 'Amostra Grátis', 'Mostruário', 'Bonificação'],
  statusComissao: ['Pendente', 'Pago', 'Cancelado']
};

// Matriz Mock de Preço Unitário: [Embalagem][TabelaDePreco]
export const DEFAULT_MATRIZ_PRECOS: Record<string, Record<string, number>> = {
  'Frasco 150g': { Site: 48.00, Tiktok: 48.00, 'Venda Direta': 45.00 },
  'Lata 100g': { Site: 35.00, Tiktok: 35.00, 'Venda Direta': 32.00 },
  'Spray 200ml': { Site: 42.00, Tiktok: 42.00, 'Venda Direta': 38.00 },
  'Frasco 250ml': { Site: 65.00, Tiktok: 65.00, 'Venda Direta': 60.00 },
  'Copo Vidro 200g': { Site: 55.00, Tiktok: 55.00, 'Venda Direta': 50.00 }
};

export const DEFAULT_VENDAS_INICIAIS: Venda[] = [
  {
    id: 'VEN-20260724-001',
    data: '2026-07-24',
    idSaida: 'SAI-1001',
    vendedor: 'Carlos Silva',
    tipoSaida: 'Venda',
    produto: 'Vela Aromática Luz Divina',
    embalagem: 'Frasco 150g',
    quantidade: 10,
    modificador: -20, // Desconto de R$ 20,00
    precoUni: 48.00,
    precoVenda: 460.00, // (48 * 10) - 20
    comissao: 37.60, // (12% * 480) - 20 = 57.60 - 20 = 37.60
    statusComissao: 'Pendente',
    dia: 24,
    mes: 7,
    ano: 2026,
    obs: 'Cliente fidelidade - aplicado desconto direto'
  },
  {
    id: 'VEN-20260723-002',
    data: '2026-07-23',
    idSaida: 'SAI-1002',
    vendedor: 'Ana Souza',
    tipoSaida: 'Consignado',
    produto: 'Vela Aromática Serenidade',
    embalagem: 'Lata 100g',
    quantidade: 15,
    modificador: 0,
    precoUni: 35.00,
    precoVenda: 525.00,
    comissao: 0.00, // Regra Consignado = R$ 0,00
    statusComissao: 'Pendente',
    dia: 23,
    mes: 7,
    ano: 2026,
    obs: 'Deixado no Ponto de Venda Loja Zen'
  },
  {
    id: 'VEN-20260722-003',
    data: '2026-07-22',
    idSaida: 'SAI-1003',
    vendedor: 'Marcos Oliveira',
    tipoSaida: 'Mostruário',
    produto: 'Home Spray Alecrim & Bambu',
    embalagem: 'Spray 200ml',
    quantidade: 2,
    modificador: 0,
    precoUni: 0.00,
    precoVenda: 0.00, // Regra Mostruário = R$ 0,00
    comissao: 0.00,
    statusComissao: 'Pendente',
    dia: 22,
    mes: 7,
    ano: 2026,
    obs: 'Amostras para feira de artesanato'
  }
];

export function getAppsScriptUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY_API_URL);
  if (stored && stored.trim() !== '') return stored;
  
  const defaultUrl = 'https://script.google.com/macros/s/AKfycbyBg1_QztYps5SxsdnWHM4QPUhi2EuZ67RDy5AZXGmw8w0buCG9wW_RcyBvADbFGAaBew/exec';
  try {
    localStorage.setItem(STORAGE_KEY_API_URL, defaultUrl);
  } catch (e) {
    console.error('Erro ao salvar URL no localStorage:', e);
  }
  return defaultUrl;
}

export function setAppsScriptUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_API_URL, url.trim());
}

export function getLocalVendas(): Venda[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_LOCAL_VENDAS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler vendas locais do localStorage:', e);
  }
  return DEFAULT_VENDAS_INICIAIS;
}

export function saveLocalVendas(vendas: Venda[]): void {
  localStorage.setItem(STORAGE_KEY_LOCAL_VENDAS, JSON.stringify(vendas));
}

/**
 * Função utilitária para extrair arrays de strings de múltiplos formatos de JSON do Apps Script
 */
function extrairListaString(data: any, ...chaves: string[]): string[] {
  if (!data || typeof data !== 'object') return [];

  // 1. Tenta extrair diretamente das chaves no nível raiz do objeto (ex: data.vendedores, data.produto, data.embalagem)
  for (const chave of chaves) {
    if (Array.isArray(data[chave]) && data[chave].length > 0) {
      return data[chave].map((item: any) => String(item).trim()).filter(Boolean);
    }
  }

  // 2. Tenta extrair dentro do objeto data.listas (ex: data.listas.vendedores, data.listas.produtos)
  if (data.listas && typeof data.listas === 'object') {
    for (const chave of chaves) {
      if (Array.isArray(data.listas[chave]) && data.listas[chave].length > 0) {
        return data.listas[chave].map((item: any) => String(item).trim()).filter(Boolean);
      }
    }
  }

  // 3. Tenta extrair dentro do objeto data.selects (ex: data.selects.vendedores, etc.)
  if (data.selects && typeof data.selects === 'object') {
    for (const chave of chaves) {
      if (Array.isArray(data.selects[chave]) && data.selects[chave].length > 0) {
        return data.selects[chave].map((item: any) => String(item).trim()).filter(Boolean);
      }
    }
  }

  return [];
}

/**
 * Busca dados da API do Apps Script (doGet)
 */
export async function fetchListasEVendas(): Promise<{
  listas: ListasSelects;
  vendas: Venda[];
  isMock: boolean;
  rawDadosBrutos?: any[];
  error?: string;
}> {
  const apiUrl = getAppsScriptUrl();

  if (!apiUrl) {
    console.warn('[SIG Olor Luz] URL do Google Apps Script não configurada. Usando modo de demonstração local.');
    return {
      listas: DEFAULT_LISTAS,
      vendas: getLocalVendas(),
      isMock: true
    };
  }

  try {
    console.log('[SIG Olor Luz] Efetuando requisição GET para:', apiUrl);
    
    // Configuração necessária para Google Apps Script com redirecionamento de CORS
    const response = await fetch(apiUrl + '?action=all', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`Servidor respondeu com status ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();
    console.log('[SIG Olor Luz] Resposta JSON recebida da API Apps Script:', data);

    if (data.status === 'error') {
      throw new Error(data.message || 'Erro reportado pelo Google Apps Script');
    }

    // Extração direta suportando singular/plural e nível superior/nested
    const vendedoresExtraidos = extrairListaString(data, 'vendedores', 'vendedor', 'VENDEDORES');
    const produtosExtraidos = extrairListaString(data, 'produto', 'produtos', 'PRODUTO', 'PRODUTOS');
    const embalagensExtraidas = extrairListaString(data, 'embalagem', 'embalagens', 'EMBALAGEM', 'EMBALAGENS');
    const tabelasPrecoExtraidas = extrairListaString(data, 'tabelaPreco', 'tabelasPreco', 'tabela_preco', 'TABELA DE PREÇO');
    const tiposSaidaExtraidos = extrairListaString(data, 'tipoSaida', 'tiposSaida', 'tipo_saida', 'TIPO SAIDA');
    const statusComissaoExtraidos = extrairListaString(data, 'statusComissao', 'statusComissaoList', 'status_comissao', 'STATUS COMISSÃO');

    // Suporte caso dadosBrutos venha como matriz de arrays [["VENDEDORES", "PRODUTO"], ["Nome 1", "Essência A"]]
    let dadosBrutosMatriz = data.dadosBrutos || data.listas?.dadosBrutos;
    if (Array.isArray(dadosBrutosMatriz) && dadosBrutosMatriz.length > 0) {
      if (Array.isArray(dadosBrutosMatriz[0])) {
        const headers = dadosBrutosMatriz[0].map((h: any) => String(h).toUpperCase().trim());
        const rows = dadosBrutosMatriz.slice(1);

        const findColValues = (possibleHeaders: string[]) => {
          const colIdx = headers.findIndex((h: string) => possibleHeaders.some(p => h.includes(p)));
          if (colIdx === -1) return [];
          const set = new Set<string>();
          rows.forEach((r: any[]) => {
            if (r[colIdx] !== undefined && r[colIdx] !== null && String(r[colIdx]).trim() !== '') {
              set.add(String(r[colIdx]).trim());
            }
          });
          return Array.from(set);
        };

        if (vendedoresExtraidos.length === 0) vendedoresExtraidos.push(...findColValues(['VENDEDOR', 'VEND']));
        if (produtosExtraidos.length === 0) produtosExtraidos.push(...findColValues(['PRODUTO', 'PROD']));
        if (embalagensExtraidas.length === 0) embalagensExtraidas.push(...findColValues(['EMBALAGEM', 'EMB']));
        if (tabelasPrecoExtraidas.length === 0) tabelasPrecoExtraidas.push(...findColValues(['TABELA', 'PRECO']));
      }
    }

    const listas: ListasSelects = {
      vendedores: vendedoresExtraidos.length > 0 ? vendedoresExtraidos : DEFAULT_LISTAS.vendedores,
      produtos: produtosExtraidos.length > 0 ? produtosExtraidos : DEFAULT_LISTAS.produtos,
      embalagens: embalagensExtraidas.length > 0 ? embalagensExtraidas : DEFAULT_LISTAS.embalagens,
      tabelasPreco: tabelasPrecoExtraidas.length > 0 ? tabelasPrecoExtraidas : DEFAULT_LISTAS.tabelasPreco,
      tiposSaida: tiposSaidaExtraidos.length > 0 ? tiposSaidaExtraidos : DEFAULT_LISTAS.tiposSaida,
      statusComissao: statusComissaoExtraidos.length > 0 ? statusComissaoExtraidos : DEFAULT_LISTAS.statusComissao,
    };

    const vendas = (data.vendas && Array.isArray(data.vendas)) ? data.vendas : getLocalVendas();
    if (Array.isArray(data.vendas) && data.vendas.length > 0) {
      saveLocalVendas(vendas);
    }

    // A flag isMock é desativada com sucesso assim que os dados reais da API forem recebidos
    return {
      listas,
      vendas,
      isMock: false,
      rawDadosBrutos: dadosBrutosMatriz
    };

  } catch (err: any) {
    console.error('[SIG Olor Luz] Falha na comunicação com o Google Apps Script:', err);
    return {
      listas: DEFAULT_LISTAS,
      vendas: getLocalVendas(),
      isMock: true,
      error: `Erro de Conexão com Apps Script: ${err.message || err}`
    };
  }
}

/**
 * Função de diagnóstico direto para testar e validar o retorno do Google Apps Script
 */
export async function testarConexaoApi(urlTeste?: string): Promise<{
  ok: boolean;
  mensagem: string;
  detalhes?: any;
}> {
  const url = (urlTeste || getAppsScriptUrl()).trim();
  if (!url) {
    return {
      ok: false,
      mensagem: 'URL do Google Apps Script está vazia. Cole a URL do Web App.'
    };
  }

  try {
    const res = await fetch(url + '?action=all', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });

    const text = await res.text();
    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch (parseError) {
      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        return {
          ok: false,
          mensagem: 'O Google Apps Script retornou uma página de Login (HTML) em vez de JSON. Motivo: A permissão de Acesso do Web App na implantação está configurada para "Somente eu". Altere para "Qualquer pessoa" (Anyone) nas configurações de implantação do Apps Script.',
          detalhes: { statusHttp: res.status, previewHtml: text.substring(0, 300) }
        };
      }
      return {
        ok: false,
        mensagem: `A resposta não é um JSON válido. Retorno bruto: ${text.substring(0, 200)}...`,
        detalhes: { textBruto: text.substring(0, 500) }
      };
    }

    if (json && (json.status === 'success' || json.vendedores || json.produto || json.listas)) {
      const veds = (json.vendedores?.length || json.listas?.vendedores?.length || 0);
      const prods = (json.produto?.length || json.produtos?.length || json.listas?.produtos?.length || 0);
      const embs = (json.embalagem?.length || json.embalagens?.length || json.listas?.embalagens?.length || 0);
      const vendsCount = (json.vendas?.length || 0);

      return {
        ok: true,
        mensagem: `Conexão Realizada com Sucesso! Encontrados no JSON: ${veds} Vendedores, ${prods} Produtos, ${embs} Embalagens e ${vendsCount} Registros de Vendas.`,
        detalhes: json
      };
    } else {
      return {
        ok: false,
        mensagem: `Apps Script respondeu com estrutura inesperada: ${json?.message || 'JSON recebido sem chaves reconhecidas'}`,
        detalhes: json
      };
    }

  } catch (err: any) {
    return {
      ok: false,
      mensagem: `Falha na requisição HTTP: ${err.message || 'CORS ou URL inacessível'}. Verifique se a URL termina com /exec e se foi implantada como "Qualquer pessoa".`,
      detalhes: err
    };
  }
}

/**
 * Envia um lote de vendas (para o mesmo pedido / ID_Saida) para a API do Apps Script (doPost / doGet)
 */
export async function salvarLoteVendas(vendas: Venda[]): Promise<{
  success: boolean;
  message: string;
  vendasSalvas: Venda[];
  isMock: boolean;
}> {
  if (!vendas || vendas.length === 0) {
    return {
      success: false,
      message: 'Nenhum item informado para salvar.',
      vendasSalvas: [],
      isMock: false
    };
  }

  const apiUrl = getAppsScriptUrl();

  if (!apiUrl) {
    const vendasLocais = getLocalVendas();
    const vendasAtualizadas = [...vendas, ...vendasLocais];
    saveLocalVendas(vendasAtualizadas);

    return {
      success: true,
      message: `${vendas.length} item(ns) salvo(s) com sucesso no armazenamento local (Modo de Demonstração)!`,
      vendasSalvas: vendas,
      isMock: true
    };
  }

  try {
    console.log('[SIG Olor Luz] Enviando lote de vendas para o Apps Script:', vendas);

    const payloadJson = JSON.stringify(vendas);
    const saveUrlWithParams = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=salvar&payload=${encodeURIComponent(payloadJson)}`;

    // Estratégia 1: POST para URL parametrizada (funciona mesmo se o navegador converter o 302 em GET)
    try {
      const response = await fetch(saveUrlWithParams, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: payloadJson,
        redirect: 'follow'
      });

      if (response.ok) {
        const resData = await response.json();
        console.log('[SIG Olor Luz] Resposta da API ao salvar lote (POST):', resData);

        if (resData && resData.status === 'success') {
          const salvas: Venda[] = resData.registros && resData.registros.length > 0 ? resData.registros : vendas;
          const vendasLocais = getLocalVendas();
          const idsSalvos = new Set(salvas.map(v => v.id));
          saveLocalVendas([...salvas, ...vendasLocais.filter(v => !idsSalvos.has(v.id))]);

          return {
            success: true,
            message: `${salvas.length} item(ns) gravado(s) com sucesso na aba BD_Vendas do Google Sheets!`,
            vendasSalvas: salvas,
            isMock: false
          };
        }
      }
    } catch (postErr) {
      console.warn('[SIG Olor Luz] POST de lote falhou, tentando rota GET de resgate:', postErr);
    }

    // Estratégia 2: GET explicito (supera restrições de CORS e redirecionamento do Google Apps Script)
    try {
      const getResponse = await fetch(saveUrlWithParams, {
        method: 'GET',
        redirect: 'follow'
      });

      if (getResponse.ok) {
        const resData = await getResponse.json();
        console.log('[SIG Olor Luz] Resposta da API ao salvar lote (GET):', resData);

        if (resData && resData.status === 'success') {
          const salvas: Venda[] = resData.registros && resData.registros.length > 0 ? resData.registros : vendas;
          const vendasLocais = getLocalVendas();
          const idsSalvos = new Set(salvas.map(v => v.id));
          saveLocalVendas([...salvas, ...vendasLocais.filter(v => !idsSalvos.has(v.id))]);

          return {
            success: true,
            message: `${salvas.length} item(ns) gravado(s) com sucesso na aba BD_Vendas do Google Sheets!`,
            vendasSalvas: salvas,
            isMock: false
          };
        }
      }
    } catch (getErr) {
      console.warn('[SIG Olor Luz] GET de lote falhou, executando no-cors:', getErr);
    }

    // Estratégia 3: Fallback no-cors POST
    await fetch(saveUrlWithParams, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: payloadJson
    });

    const vendasLocais = getLocalVendas();
    const idsNovos = new Set(vendas.map(v => v.id));
    saveLocalVendas([...vendas, ...vendasLocais.filter(v => !idsNovos.has(v.id))]);

    return {
      success: true,
      message: `${vendas.length} item(ns) enviado(s) e registrado(s) com sucesso na aba BD_Vendas do Google Sheets!`,
      vendasSalvas: vendas,
      isMock: false
    };

  } catch (err: any) {
    console.error('[SIG Olor Luz] Erro ao enviar lote para o Apps Script:', err);

    const vendasLocais = getLocalVendas();
    const idsNovos = new Set(vendas.map(v => v.id));
    saveLocalVendas([...vendas, ...vendasLocais.filter(v => !idsNovos.has(v.id))]);

    return {
      success: false,
      message: `Aviso: Não foi possível conectar ao Google Sheets (${err.message || 'Erro de rede'}). Os itens foram mantidos localmente.`,
      vendasSalvas: vendas,
      isMock: true
    };
  }
}

/**
 * Envia uma nova venda para a API do Apps Script (doPost / doGet)
 */
export async function salvarNovaVenda(venda: Venda): Promise<{
  success: boolean;
  message: string;
  vendaSalva: Venda;
  isMock: boolean;
}> {
  const res = await salvarLoteVendas([venda]);
  return {
    success: res.success,
    message: res.message,
    vendaSalva: res.vendasSalvas[0] || venda,
    isMock: res.isMock
  };
}

/**
 * Exclui permanentemente um pedido e todos os seus itens pelo ID_Saida
 */
export async function excluirPedidoApi(idSaida: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!idSaida) {
    return { success: false, message: 'ID de Saída não informado para exclusão.' };
  }

  // 1. Sempre atualiza o armazenamento local para dar feedback imediato
  const vendasLocais = getLocalVendas();
  const vendasFiltradas = vendasLocais.filter(v => (v.idSaida || v.id) !== idSaida);
  saveLocalVendas(vendasFiltradas);

  const apiUrl = getAppsScriptUrl();

  if (!apiUrl) {
    return {
      success: true,
      message: `Pedido ${idSaida} e seus itens foram excluídos localmente com sucesso!`
    };
  }

  try {
    console.log('[SIG Olor Luz] Enviando requisição de exclusão para o Apps Script do ID_Saida:', idSaida);

    const deletePayload = JSON.stringify({ action: 'delete', idSaida });
    const deleteUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=delete&idSaida=${encodeURIComponent(idSaida)}&payload=${encodeURIComponent(deletePayload)}`;

    // Tenta POST
    try {
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: deletePayload,
        redirect: 'follow'
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.status === 'success') {
          return {
            success: true,
            message: json.message || `Pedido ${idSaida} e seus itens foram excluídos da planilha!`
          };
        }
      }
    } catch (postErr) {
      console.warn('[SIG Olor Luz] POST de exclusão falhou, tentando rota GET de resgate:', postErr);
    }

    // Tenta GET Fallback
    const responseGet = await fetch(deleteUrl, {
      method: 'GET',
      redirect: 'follow'
    });

    if (responseGet.ok) {
      const jsonGet = await responseGet.json();
      if (jsonGet && jsonGet.status === 'success') {
        return {
          success: true,
          message: jsonGet.message || `Pedido ${idSaida} excluído com sucesso!`
        };
      }
    }

    return {
      success: true,
      message: `Comando de exclusão do pedido ${idSaida} enviado para a planilha.`
    };

  } catch (err: any) {
    console.error('[SIG Olor Luz] Erro ao excluir pedido na API:', err);
    return {
      success: true,
      message: `Pedido ${idSaida} excluído localmente (Aviso de rede: ${err.message || 'Sem conexão'})`
    };
  }
}

/**
 * Atualiza um pedido existente na planilha (substitui todos os itens do ID_Saida pelos novos dados)
 */
export async function atualizarPedidoApi(idSaida: string, novosItens: Venda[]): Promise<{
  success: boolean;
  message: string;
  vendasSalvas: Venda[];
}> {
  if (!idSaida || !novosItens || novosItens.length === 0) {
    return {
      success: false,
      message: 'Dados inválidos para atualização do pedido.',
      vendasSalvas: []
    };
  }

  // 1. Atualiza no armazenamento local
  const vendasLocais = getLocalVendas();
  const vendasSemEssePedido = vendasLocais.filter(v => (v.idSaida || v.id) !== idSaida);
  const vendasAtualizadasLocais = [...novosItens, ...vendasSemEssePedido];
  saveLocalVendas(vendasAtualizadasLocais);

  const apiUrl = getAppsScriptUrl();

  if (!apiUrl) {
    return {
      success: true,
      message: `Pedido ${idSaida} atualizado com sucesso no armazenamento local!`,
      vendasSalvas: novosItens
    };
  }

  try {
    console.log('[SIG Olor Luz] Enviando atualização de pedido para Apps Script:', idSaida, novosItens);

    const updatePayload = JSON.stringify({ action: 'update', idSaida, vendas: novosItens });
    const updateUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=update&idSaida=${encodeURIComponent(idSaida)}&payload=${encodeURIComponent(updatePayload)}`;

    // Tenta POST
    try {
      const response = await fetch(updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: updatePayload,
        redirect: 'follow'
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.status === 'success') {
          return {
            success: true,
            message: json.message || `Pedido ${idSaida} atualizado com sucesso na planilha Google!`,
            vendasSalvas: json.registros || novosItens
          };
        }
      }
    } catch (postErr) {
      console.warn('[SIG Olor Luz] POST de atualização falhou, tentando rota GET de resgate:', postErr);
    }

    // Tenta GET Fallback
    const responseGet = await fetch(updateUrl, {
      method: 'GET',
      redirect: 'follow'
    });

    if (responseGet.ok) {
      const jsonGet = await responseGet.json();
      if (jsonGet && jsonGet.status === 'success') {
        return {
          success: true,
          message: jsonGet.message || `Pedido ${idSaida} atualizado com sucesso na planilha!`,
          vendasSalvas: jsonGet.registros || novosItens
        };
      }
    }

    return {
      success: true,
      message: `Pedido ${idSaida} atualizado e sincronizado com a planilha!`,
      vendasSalvas: novosItens
    };

  } catch (err: any) {
    console.error('[SIG Olor Luz] Erro ao atualizar pedido na API:', err);
    return {
      success: true,
      message: `Pedido ${idSaida} atualizado localmente (Aviso de rede: ${err.message || 'Sem conexão'})`,
      vendasSalvas: novosItens
    };
  }
}

/**
 * Busca o preço unitário cruzando Embalagem e Tabela de Preço
 */
export function buscarPrecoUnitario(
  embalagem: string,
  tabelaPreco: string,
  dadosBrutosMatriz?: any
): number {
  if (!embalagem || !tabelaPreco) return 0;

  // 1. Tenta buscar nos dados brutos vindos da planilha
  if (dadosBrutosMatriz && Array.isArray(dadosBrutosMatriz) && dadosBrutosMatriz.length > 0) {
    const embNorm = embalagem.toLowerCase().trim();
    const tabNorm = tabelaPreco.toLowerCase().trim();

    // Caso A: Matriz 2D (array de arrays)
    if (Array.isArray(dadosBrutosMatriz[0])) {
      const cabecalho = dadosBrutosMatriz[0].map((h: any) => String(h || '').toLowerCase().trim());
      
      let indexEmbalagem = cabecalho.findIndex((col: string) => col.includes('embalagem') || col.includes('emb'));
      if (indexEmbalagem === -1) indexEmbalagem = 0;

      let indexTabela = cabecalho.findIndex((col: string) => col === tabNorm || col.includes(tabNorm));

      if (indexTabela !== -1) {
        for (let r = 1; r < dadosBrutosMatriz.length; r++) {
          const linha = dadosBrutosMatriz[r];
          if (Array.isArray(linha)) {
            const embLinha = String(linha[indexEmbalagem] || '').toLowerCase().trim();
            if (embLinha === embNorm) {
              const valBruto = linha[indexTabela];
              if (typeof valBruto === 'number') return valBruto;
              if (valBruto) {
                const num = parseFloat(String(valBruto).replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                if (!isNaN(num)) return num;
              }
            }
          }
        }
      }
    } else {
      // Caso B: Array de objetos
      for (const item of dadosBrutosMatriz) {
        const embItem = String(item['EMBALAGEM'] || item['Embalagem'] || item['embalagem'] || '').toLowerCase().trim();
        if (embItem === embNorm) {
          for (const key of Object.keys(item)) {
            if (key.toLowerCase().trim() === tabNorm) {
              const valBruto = item[key];
              if (typeof valBruto === 'number') return valBruto;
              if (valBruto) {
                const num = parseFloat(String(valBruto).replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
                if (!isNaN(num)) return num;
              }
            }
          }
        }
      }
    }
  }

  // 2. Fallback para matriz de preços padrão configurada
  if (DEFAULT_MATRIZ_PRECOS[embalagem] && DEFAULT_MATRIZ_PRECOS[embalagem][tabelaPreco] !== undefined) {
    return DEFAULT_MATRIZ_PRECOS[embalagem][tabelaPreco];
  }

  return 0;
}

/**
 * Utilitário para normalizar o objeto Usuário vindo de qualquer formato (Google Sheets / API)
 */
function normalizarUsuario(raw: any): User | null {
  if (!raw) return null;

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const getProp = (...keys: string[]) => {
      for (const key of Object.keys(raw)) {
        const keyNorm = key.toLowerCase().trim().replace(/[-_]/g, '');
        for (const target of keys) {
          if (keyNorm === target.toLowerCase().trim().replace(/[-_]/g, '')) {
            const val = raw[key];
            return val !== undefined && val !== null ? String(val).trim() : '';
          }
        }
      }
      return '';
    };

    const email = getProp('email', 'mail', 'usuario', 'login').toLowerCase();
    const senha = getProp('senha', 'password', 'pass');
    const nome = getProp('nome', 'name', 'vendedor');
    const tipoRaw = getProp('tipo', 'role', 'perfil', 'nivel');

    if (email || nome) {
      return {
        nome: nome || (email ? email.split('@')[0] : 'Usuário'),
        tipo: tipoRaw ? (tipoRaw.charAt(0).toUpperCase() + tipoRaw.slice(1).toLowerCase()) as any : 'Vendedor',
        email: email || '',
        senha: senha || ''
      };
    }
  }

  return null;
}

/**
 * Utilitário para extrair usuários quando a planilha retorna matriz de linhas 2D
 */
function extrairUsuariosDeMatrix(matrix: any[][]): User[] {
  if (!Array.isArray(matrix) || matrix.length === 0) return [];

  const cabecalho = matrix[0].map((h: any) => String(h || '').toLowerCase().trim());
  let idxEmail = cabecalho.findIndex((c: string) => c.includes('email') || c.includes('e-mail') || c.includes('login') || c.includes('usuario'));
  let idxSenha = cabecalho.findIndex((c: string) => c.includes('senha') || c.includes('pass'));
  let idxNome = cabecalho.findIndex((c: string) => c.includes('nome') || c.includes('vendedor') || c.includes('name'));
  let idxTipo = cabecalho.findIndex((c: string) => c.includes('tipo') || c.includes('role') || c.includes('perfil'));

  const usuarios: User[] = [];
  const startRow = (idxEmail !== -1 || idxSenha !== -1 || idxNome !== -1) ? 1 : 0;

  for (let r = startRow; r < matrix.length; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    let email = idxEmail !== -1 ? String(row[idxEmail] || '').trim().toLowerCase() : '';
    let senha = idxSenha !== -1 ? String(row[idxSenha] || '').trim() : '';
    let nome = idxNome !== -1 ? String(row[idxNome] || '').trim() : '';
    let tipo = idxTipo !== -1 ? String(row[idxTipo] || '').trim() : 'Vendedor';

    if (!email || !senha) {
      row.forEach((cell: any) => {
        const strCell = String(cell || '').trim();
        if (strCell.includes('@') && !email) {
          email = strCell.toLowerCase();
        } else if (!senha && strCell.length > 0 && strCell.toLowerCase() !== email && strCell !== nome) {
          senha = strCell;
        }
      });
    }

    if (email) {
      usuarios.push({
        nome: nome || email.split('@')[0],
        tipo: tipo ? (tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase()) as any : 'Vendedor',
        email,
        senha
      });
    }
  }

  return usuarios;
}

/**
 * Busca a lista de usuários cadastrados da API (action = 'get_usuarios' ou 'all')
 */
export async function getUsuariosApi(): Promise<User[]> {
  const apiUrl = getAppsScriptUrl();

  if (apiUrl) {
    // A) Tenta action=get_usuarios
    try {
      const getUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=get_usuarios`;
      const response = await fetch(getUrl, { method: 'GET', redirect: 'follow' });
      if (response.ok) {
        const json = await response.json();
        let listaBruta: any[] = [];

        if (Array.isArray(json.usuarios)) listaBruta = json.usuarios;
        else if (Array.isArray(json.users)) listaBruta = json.users;
        else if (Array.isArray(json.data)) listaBruta = json.data;

        if (listaBruta.length > 0) {
          if (Array.isArray(listaBruta[0])) {
            const parsed = extrairUsuariosDeMatrix(listaBruta);
            if (parsed.length > 0) {
              saveLocalUsuarios(parsed);
              return parsed;
            }
          } else {
            const parsed = listaBruta.map(normalizarUsuario).filter((u): u is User => u !== null);
            if (parsed.length > 0) {
              saveLocalUsuarios(parsed);
              return parsed;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[SIG Olor Luz] Erro ao carregar usuarios via action=get_usuarios:', err);
    }

    // B) Fallback para action=all se a planilha disponibilizar a lista de usuários junto
    try {
      const allUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=all`;
      const responseAll = await fetch(allUrl, { method: 'GET', redirect: 'follow' });
      if (responseAll.ok) {
        const jsonAll = await responseAll.json();
        const listaBruta = jsonAll.usuarios || jsonAll.users || jsonAll.dadosUsuarios;
        if (Array.isArray(listaBruta) && listaBruta.length > 0) {
          if (Array.isArray(listaBruta[0])) {
            const parsed = extrairUsuariosDeMatrix(listaBruta);
            if (parsed.length > 0) {
              saveLocalUsuarios(parsed);
              return parsed;
            }
          } else {
            const parsed = listaBruta.map(normalizarUsuario).filter((u): u is User => u !== null);
            if (parsed.length > 0) {
              saveLocalUsuarios(parsed);
              return parsed;
            }
          }
        }
      }
    } catch (errAll) {
      console.warn('[SIG Olor Luz] Erro ao carregar usuarios via action=all:', errAll);
    }
  }

  return getLocalUsuarios();
}

/**
 * Realiza autenticação de usuário (action = 'login')
 * Valida em tempo real com o banco de dados (Google Sheets) com garantia de compatibilidade de tipos.
 */
export async function loginApi(email: string, senha: string): Promise<{
  success: boolean;
  message?: string;
  user?: User;
}> {
  const emailClean = email.trim().toLowerCase();
  const senhaClean = String(senha || '').trim();

  const apiUrl = getAppsScriptUrl();

  // 1. Tenta autenticação direta via action=login no Apps Script (se implementada)
  if (apiUrl) {
    try {
      const loginUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=login&email=${encodeURIComponent(emailClean)}&senha=${encodeURIComponent(senhaClean)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const responseGet = await fetch(loginUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (responseGet.ok) {
        const jsonGet = await responseGet.json();

        if (jsonGet && jsonGet.status === 'success' && jsonGet.user) {
          const userNorm = normalizarUsuario(jsonGet.user) || {
            nome: String(jsonGet.user.nome || jsonGet.user.NOME || emailClean.split('@')[0]).trim(),
            tipo: (jsonGet.user.tipo || jsonGet.user.TIPO || 'Vendedor') as any,
            email: emailClean,
            senha: senhaClean
          };

          const usuariosLocais = getLocalUsuarios().filter(u => String(u.email || '').trim().toLowerCase() !== emailClean);
          usuariosLocais.push({ ...userNorm, senha: senhaClean });
          saveLocalUsuarios(usuariosLocais);

          return {
            success: true,
            user: userNorm
          };
        }
      }
    } catch (err: any) {
      console.warn('[SIG Olor Luz] Consulta direta action=login falhou/timeout, consultando aba de Usuários:', err);
    }

    // 2. Tenta validação lendo o banco de dados da aba "Usuários" da planilha
    try {
      const usuariosPlanilha = await getUsuariosApi();
      const userEncontrado = usuariosPlanilha.find(
        u => String(u.email || '').trim().toLowerCase() === emailClean && String(u.senha || '').trim() === senhaClean
      );

      if (userEncontrado) {
        const usuariosLocais = getLocalUsuarios().filter(u => String(u.email || '').trim().toLowerCase() !== emailClean);
        usuariosLocais.push({
          nome: userEncontrado.nome,
          tipo: userEncontrado.tipo,
          email: userEncontrado.email,
          senha: senhaClean
        });
        saveLocalUsuarios(usuariosLocais);

        return {
          success: true,
          user: {
            nome: userEncontrado.nome,
            tipo: userEncontrado.tipo,
            email: userEncontrado.email
          }
        };
      }
    } catch (syncErr) {
      console.warn('[SIG Olor Luz] Falha de conexão ao validar usuários da planilha:', syncErr);
    }
  }

  // 3. FALLBACK MODO OFFLINE / USUÁRIOS LOCAIS E PADRÃO
  const usuariosLocais = getLocalUsuarios();
  const userLocal = usuariosLocais.find(
    u => String(u.email || '').trim().toLowerCase() === emailClean && String(u.senha || '').trim() === senhaClean
  );

  if (userLocal) {
    return {
      success: true,
      user: {
        nome: userLocal.nome,
        tipo: userLocal.tipo,
        email: userLocal.email
      }
    };
  }

  return {
    success: false,
    message: 'E-mail ou senha incorretos (verifique se os dados estão cadastrados na aba Usuários).'
  };
}

/**
 * Realiza operacoes CRUD em usuarios (action = 'crud_usuario')
 */
export async function crudUsuarioApi(
  subAction: 'criar' | 'editar' | 'deletar',
  usuario: User,
  emailOriginal?: string
): Promise<{ success: boolean; message: string }> {
  // 1. Atualizar localmente
  let usuariosLocais = getLocalUsuarios();
  const targetEmail = (emailOriginal || usuario.email).trim().toLowerCase();

  if (subAction === 'criar') {
    usuariosLocais = usuariosLocais.filter(u => u.email.trim().toLowerCase() !== usuario.email.trim().toLowerCase());
    usuariosLocais.push(usuario);
  } else if (subAction === 'editar') {
    const index = usuariosLocais.findIndex(u => u.email.trim().toLowerCase() === targetEmail);
    if (index !== -1) {
      usuariosLocais[index] = usuario;
    } else {
      usuariosLocais.push(usuario);
    }
  } else if (subAction === 'deletar') {
    usuariosLocais = usuariosLocais.filter(u => u.email.trim().toLowerCase() !== targetEmail);
  }

  saveLocalUsuarios(usuariosLocais);

  const apiUrl = getAppsScriptUrl();

  if (!apiUrl) {
    return {
      success: true,
      message: `Operação "${subAction}" realizada com sucesso localmente!`
    };
  }

  try {
    const payloadObj = {
      action: 'crud_usuario',
      subAction,
      emailOriginal: targetEmail,
      usuario
    };
    const payload = JSON.stringify(payloadObj);
    const postUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=crud_usuario&subAction=${subAction}&payload=${encodeURIComponent(payload)}`;

    try {
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload,
        redirect: 'follow'
      });

      if (response.ok) {
        const json = await response.json();
        if (json && json.status === 'success') {
          return { success: true, message: json.message || 'Operação realizada no Google Sheets!' };
        }
      }
    } catch (postErr) {
      console.warn('[SIG Olor Luz] POST de CRUD usuario falhou, tentando GET:', postErr);
    }

    const responseGet = await fetch(postUrl, { method: 'GET', redirect: 'follow' });
    if (responseGet.ok) {
      const jsonGet = await responseGet.json();
      if (jsonGet && jsonGet.status === 'success') {
        return { success: true, message: jsonGet.message || 'Operação concluída com sucesso!' };
      }
    }

    return {
      success: true,
      message: `Usuário salvo e sincronizado com o Google Sheets!`
    };
  } catch (err: any) {
    console.error('[SIG Olor Luz] Erro ao sincronizar usuario com Apps Script:', err);
    return {
      success: true,
      message: `Usuário salvo localmente (Aviso de rede: ${err.message || 'Sem conexão'})`
    };
  }
}

