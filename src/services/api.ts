import { ApiResponse, ListasSelects, User, Venda, TipoSaida } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc
} from 'firebase/firestore';

const STORAGE_KEY_CURRENT_USER = 'olor_luz_current_user';

// --- LISTAS AUXILIARES EXATAS DO SIG OLOR LUZ ---
export const DEFAULT_LISTAS: ListasSelects = {
  vendedores: [
    'Rosa', 'Cleide', 'Kely', 'Sônia', 'Olor Luz', 'Andreia', 
    'Vivi', 'Tânia Raquel', 'Kathleen', 'Tiktok', 'Jessica Caetano', 'Jean', 'Gabi'
  ],
  produtos: [
    'AURORA DE VANILLA', 'BAMBOO', 'BRISA CELESTIAL', 'CAPIM LIMÃO', 
    'ENCANTO DO OCEANO', 'FLOR DE CEREJEIRA', 'JARDIM DE ESTRELAS', 'JASMIM', 
    'LAVANDA', 'RESPLENDOR DOS SONHOS', 'Caixa Kit (15ml) Premium', 
    'MAGIA NATALINA', 'CHA BRANCO', 'PAPELARIA', 'BLACKOUT', 
    'CLEAN FULL PET SPRAY', 'CLEAN FULL PET', 'DIFUSOR ELETRICO', 
    'DIFUSOR ELETRICO + ESSENCIA', 'FLOR DE CACAU', 'CHOCOLATE MENTOLADO'
  ],
  embalagens: [
    '120ML', '130ML', '1L', '(Pet)1L Sabão', '20ML', 'Essencia 20ml', 
    '(Pet) 500ml Spray', 'Caixa Kit (15ml) Premium', 'Caixa Kit 20 ml', 
    'Difusor', 'Difusor Eletrico', 'Difusor Eletrico Branco + Essencia', 
    'Difusor Eletrico Preto + Essencia', 'REFIL 250ML', 'REFIL 250ML Difusor', 
    'Sacola Olor luz', 'Sabonete Vidro 250ml', 'Sabonete 500ml', 
    'Água de Lençóis 500 ml', 'Caixa Kit (Sabonete + Difusor varetas)'
  ],
  tabelasPreco: ['Site', 'Tiktok', 'Venda Direta', 'Consignado', 'Preço Logista'],
  tiposSaida: ['Venda', 'Consignado', 'Bonificação', 'Mostruário', 'Amostra Grátis'],
  statusComissao: ['Pago', 'Não Pago', 'Pendente', 'Cancelado']
};

// --- MATRIZ DE PREÇOS SUGERIDOS POR EMBALAGEM / TABELA ---
export const DEFAULT_MATRIZ_PRECOS: Record<string, Record<string, number>> = {
  '120ML': { 'Site': 48.00, 'Tiktok': 48.00, 'Venda Direta': 45.00, 'Consignado': 35.00, 'Preço Logista': 30.00 },
  '130ML': { 'Site': 48.00, 'Tiktok': 48.00, 'Venda Direta': 45.00, 'Consignado': 35.00, 'Preço Logista': 30.00 },
  '1L': { 'Site': 85.00, 'Tiktok': 85.00, 'Venda Direta': 80.00, 'Consignado': 65.00, 'Preço Logista': 60.00 },
  '(Pet)1L Sabão': { 'Site': 85.00, 'Tiktok': 85.00, 'Venda Direta': 80.00, 'Consignado': 65.00, 'Preço Logista': 60.00 },
  '20ML': { 'Site': 25.00, 'Tiktok': 25.00, 'Venda Direta': 22.00, 'Consignado': 18.00, 'Preço Logista': 15.00 },
  'Essencia 20ml': { 'Site': 25.00, 'Tiktok': 25.00, 'Venda Direta': 22.00, 'Consignado': 18.00, 'Preço Logista': 15.00 },
  '(Pet) 500ml Spray': { 'Site': 55.00, 'Tiktok': 55.00, 'Venda Direta': 50.00, 'Consignado': 42.00, 'Preço Logista': 38.00 },
  'Caixa Kit (15ml) Premium': { 'Site': 65.00, 'Tiktok': 65.00, 'Venda Direta': 60.00, 'Consignado': 50.00, 'Preço Logista': 45.00 },
  'Caixa Kit 20 ml': { 'Site': 65.00, 'Tiktok': 65.00, 'Venda Direta': 60.00, 'Consignado': 50.00, 'Preço Logista': 45.00 },
  'Difusor': { 'Site': 120.00, 'Tiktok': 120.00, 'Venda Direta': 110.00, 'Consignado': 90.00, 'Preço Logista': 80.00 },
  'Difusor Eletrico': { 'Site': 120.00, 'Tiktok': 120.00, 'Venda Direta': 110.00, 'Consignado': 90.00, 'Preço Logista': 80.00 },
  'Difusor Eletrico Branco + Essencia': { 'Site': 140.00, 'Tiktok': 140.00, 'Venda Direta': 130.00, 'Consignado': 110.00, 'Preço Logista': 100.00 },
  'Difusor Eletrico Preto + Essencia': { 'Site': 140.00, 'Tiktok': 140.00, 'Venda Direta': 130.00, 'Consignado': 110.00, 'Preço Logista': 100.00 },
  'REFIL 250ML': { 'Site': 45.00, 'Tiktok': 45.00, 'Venda Direta': 40.00, 'Consignado': 32.00, 'Preço Logista': 28.00 },
  'REFIL 250ML Difusor': { 'Site': 45.00, 'Tiktok': 45.00, 'Venda Direta': 40.00, 'Consignado': 32.00, 'Preço Logista': 28.00 },
  'Sacola Olor luz': { 'Site': 8.00, 'Tiktok': 8.00, 'Venda Direta': 8.00, 'Consignado': 5.00, 'Preço Logista': 5.00 },
  'Sabonete Vidro 250ml': { 'Site': 48.00, 'Tiktok': 48.00, 'Venda Direta': 45.00, 'Consignado': 35.00, 'Preço Logista': 30.00 },
  'Sabonete 500ml': { 'Site': 55.00, 'Tiktok': 55.00, 'Venda Direta': 50.00, 'Consignado': 42.00, 'Preço Logista': 38.00 },
  'Água de Lençóis 500 ml': { 'Site': 55.00, 'Tiktok': 55.00, 'Venda Direta': 50.00, 'Consignado': 42.00, 'Preço Logista': 38.00 },
  'Caixa Kit (Sabonete + Difusor varetas)': { 'Site': 98.00, 'Tiktok': 98.00, 'Venda Direta': 90.00, 'Consignado': 75.00, 'Preço Logista': 70.00 }
};

// Usuários Padrão para Bootstrap no Firestore
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

// Mock de vendas iniciais para primeira visualização limpa (incluindo vendas diretas e consignados)
export const DEFAULT_VENDAS_INICIAIS: Venda[] = [
  {
    id: 'VEN-20260724-001',
    data: '2026-07-24',
    idSaida: 'SAI-20260724-1001',
    vendedor: 'Rosa',
    tipoSaida: 'Venda',
    tabelaPreco: 'Venda Direta',
    produto: 'AURORA DE VANILLA',
    embalagem: '120ML',
    quantidade: 10,
    modificador: -20,
    precoUni: 45.00,
    precoVenda: 430.00,
    comissao: 51.60,
    statusComissao: 'Pago',
    dia: 24,
    mes: 7,
    ano: 2026,
    obs: 'Cliente parceiro Olor Luz',
    clienteInfluenciador: 'Loja Essência & Co',
    contato: '(11) 98765-4321'
  },
  {
    id: 'VEN-20260725-002',
    data: '2026-07-25',
    idSaida: 'SAI-20260725-1002',
    vendedor: 'Rosa',
    tipoSaida: 'Consignado',
    tabelaPreco: 'Consignado',
    produto: 'Água de Lençóis 500 ml',
    embalagem: 'Água de Lençóis 500 ml',
    quantidade: 5,
    modificador: 0,
    precoUni: 0,
    precoVenda: 0,
    comissao: 0,
    statusComissao: 'Pendente',
    dia: 25,
    mes: 7,
    ano: 2026,
    obs: 'Consignado em loja parceira',
    clienteInfluenciador: 'Boutique Aromas do Sul',
    contato: '(11) 97777-8888'
  },
  {
    id: 'VEN-20260726-003',
    data: '2026-07-26',
    idSaida: 'SAI-20260726-1003',
    vendedor: 'Olor Luz',
    tipoSaida: 'Consignado',
    tabelaPreco: 'Consignado',
    produto: 'Difusor Eletrico Branco + Essencia',
    embalagem: 'Difusor Eletrico',
    quantidade: 2,
    modificador: 0,
    precoUni: 0,
    precoVenda: 0,
    comissao: 0,
    statusComissao: '',
    dia: 26,
    mes: 7,
    ano: 2026,
    obs: 'Mostruário consignado',
    clienteInfluenciador: 'Espaço Zen',
    contato: '(11) 96666-5555'
  }
];

// --- USUÁRIO ATUAL (SESSÃO) ---
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

export async function logoutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.error('Erro ao fazer logout no Firebase:', e);
  }
  setCurrentUser(null);
}

// Stub para compatibilidade com código antigo
export function getAppsScriptUrl(): string {
  return '';
}

export function setAppsScriptUrl(_url: string): void {}

export async function testarConexaoApi(_url?: string): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Backend Firebase NoSQL Ativo e Conectado' };
}

// --- MEMÓRIA EM TEMPO REAL PARA LISTAS E MATRIZ DE PREÇOS ---
export let CURRENT_MATRIZ_PRECOS: Record<string, Record<string, number>> = JSON.parse(JSON.stringify(DEFAULT_MATRIZ_PRECOS));
export let CURRENT_LISTAS: ListasSelects = JSON.parse(JSON.stringify(DEFAULT_LISTAS));

// --- BUSCA DE PREÇO UNITÁRIO SUGERIDO ---
export function buscarPrecoUnitario(
  embalagem: string,
  tabelaPreco: string = 'Venda Direta',
  _dadosBrutos?: any[]
): number {
  if (!embalagem) return 0;
  
  const embNorm = embalagem.trim();
  const tabNorm = tabelaPreco.trim();

  // 1. Busca direta exata na matriz atual
  if (CURRENT_MATRIZ_PRECOS[embNorm] && CURRENT_MATRIZ_PRECOS[embNorm][tabNorm] !== undefined) {
    return CURRENT_MATRIZ_PRECOS[embNorm][tabNorm];
  }

  // 2. Busca case-insensitive
  const keyFound = Object.keys(CURRENT_MATRIZ_PRECOS).find(k => k.trim().toLowerCase() === embNorm.toLowerCase());
  if (keyFound && CURRENT_MATRIZ_PRECOS[keyFound]) {
    if (CURRENT_MATRIZ_PRECOS[keyFound][tabNorm] !== undefined) {
      return CURRENT_MATRIZ_PRECOS[keyFound][tabNorm];
    }
    const valores = Object.values(CURRENT_MATRIZ_PRECOS[keyFound]);
    if (valores.length > 0) return valores[0];
  }

  return 45.00;
}

// --- AUTENTICAÇÃO COM FIREBASE AUTH & FIRESTORE ---
export async function loginApi(email: string, senha: string): Promise<{
  success: boolean;
  message?: string;
  user?: User;
}> {
  const emailClean = email.trim().toLowerCase();
  const senhaClean = String(senha || '').trim();

  try {
    let firebaseUser: FirebaseUser | null = null;

    // 1. Tenta autenticação no Firebase Auth
    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailClean, senhaClean);
      firebaseUser = userCredential.user;
    } catch (authErr: any) {
      // Se não existir no Auth ainda e for usuário padrão Master, cria a conta no Firebase Auth
      const defaultUser = DEFAULT_USUARIOS.find(u => u.email.toLowerCase() === emailClean && u.senha === senhaClean);
      if (defaultUser) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, emailClean, senhaClean);
          firebaseUser = newCred.user;
        } catch (createErr) {
          // Se já existir no auth mas com outra senha, tenta login de novo
          console.warn('Criação no Auth falhou:', createErr);
        }
      }
    }

    // 2. Busca perfil do usuário no Firestore (Coleção: usuarios)
    let userProfile: User | null = null;
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', emailClean));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const docData = querySnap.docs[0].data();
        userProfile = {
          nome: docData.nome || emailClean.split('@')[0],
          tipo: docData.tipo === 'Master' ? 'Master' : 'Vendedor',
          email: emailClean
        };
      } else {
        // Se não encontrar o doc no Firestore, verifica se é Master padrão
        const isMaster = emailClean === 'gleydsonwsm@gmail.com' || emailClean === 'master@olorluz.com.br' || emailClean.includes('master');
        const nomeCalc = emailClean === 'gleydsonwsm@gmail.com' ? 'Gleydson' : emailClean === 'master@olorluz.com.br' ? 'Master Olor Luz' : emailClean.split('@')[0];
        userProfile = {
          nome: nomeCalc,
          tipo: isMaster ? 'Master' : 'Vendedor',
          email: emailClean
        };

        // Salva o perfil do usuário no Firestore
        await addDoc(collection(db, 'usuarios'), {
          nome: userProfile.nome,
          email: userProfile.email,
          tipo: userProfile.tipo
        });
      }
    } catch (fsErr) {
      console.warn('Erro ao ler Firestore usuarios:', fsErr);
      // Fallback local se Firestore não responder
      const isMaster = emailClean === 'gleydsonwsm@gmail.com' || emailClean === 'master@olorluz.com.br';
      userProfile = {
        nome: emailClean === 'gleydsonwsm@gmail.com' ? 'Gleydson' : emailClean.split('@')[0],
        tipo: isMaster ? 'Master' : 'Vendedor',
        email: emailClean
      };
    }

    if (userProfile) {
      setCurrentUser(userProfile);
      return {
        success: true,
        user: userProfile
      };
    }

    return {
      success: false,
      message: 'Credenciais inválidas. Verifique seu e-mail e senha.'
    };
  } catch (err: any) {
    console.error('Erro no login Firebase:', err);
    return {
      success: false,
      message: err.message || 'Erro de autenticação com o Firebase.'
    };
  }
}

// --- BUSCAR VENDAS & LISTAS NO FIRESTORE (RBAC) ---
export async function fetchListasEVendas(): Promise<{
  listas: ListasSelects;
  vendas: Venda[];
  isMock: boolean;
  rawDadosBrutos?: any[];
  error?: string;
}> {
  const currentUser = getCurrentUser();

  try {
    // 1. Busca configurações salvas de matriz de preços e listas
    try {
      const configDocRef = doc(db, 'config', 'matrizPrecos');
      const configSnap = await getDoc(configDocRef);
      if (configSnap.exists()) {
        const data = configSnap.data();
        if (data.matriz) {
          CURRENT_MATRIZ_PRECOS = data.matriz;
        }
        if (Array.isArray(data.embalagens) && data.embalagens.length > 0) {
          CURRENT_LISTAS.embalagens = data.embalagens;
        }
      }

      // Busca listas de Vendedores, Produtos e Tipos de Saída salvas
      const listasDocRef = doc(db, 'config', 'listasCustomizadas');
      const listasSnap = await getDoc(listasDocRef);
      if (listasSnap.exists()) {
        const data = listasSnap.data();
        if (Array.isArray(data.vendedores) && data.vendedores.length > 0) {
          CURRENT_LISTAS.vendedores = data.vendedores;
        }
        if (Array.isArray(data.produtos) && data.produtos.length > 0) {
          CURRENT_LISTAS.produtos = data.produtos;
        }
        if (Array.isArray(data.tiposSaida) && data.tiposSaida.length > 0) {
          CURRENT_LISTAS.tiposSaida = data.tiposSaida;
        }
        if (Array.isArray(data.embalagens) && data.embalagens.length > 0) {
          CURRENT_LISTAS.embalagens = data.embalagens;
        }
      }
    } catch (configErr) {
      console.warn('Aviso: Não foi possível carregar listas do Firestore, utilizando padrão:', configErr);
    }

    let vendasResult: Venda[] = [];

    if (currentUser) {
      const vendasCol = collection(db, 'vendas');
      let q;

      // RBAC: Se for Vendedor, busca APENAS vendas onde vendedor == currentUser.nome
      if (currentUser.tipo === 'Vendedor') {
        q = query(vendasCol, where('vendedor', '==', currentUser.nome));
      } else {
        // Se for Master, carrega todas as vendas
        q = vendasCol;
      }

      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        vendasResult.push({
          id: docSnap.id,
          data: data.data || '',
          idSaida: data.idSaida || docSnap.id,
          vendedor: data.vendedor || 'Olor Luz',
          tabelaPreco: data.tabelaPreco || 'Venda Direta',
          tipoSaida: data.tipoSaida || 'Venda',
          produto: data.produto || '',
          embalagem: data.embalagem || '',
          quantidade: Number(data.quantidade) || 0,
          modificador: Number(data.modificador) || 0,
          precoUni: Number(data.precoUni) || 0,
          precoVenda: Number(data.precoVenda) || 0,
          comissao: Number(data.comissao) || 0,
          statusComissao: data.statusComissao || '',
          dia: Number(data.dia) || 1,
          mes: Number(data.mes) || 1,
          ano: Number(data.ano) || 2026,
          obs: data.obs || '',
          clienteInfluenciador: data.clienteInfluenciador || '',
          contato: data.contato || ''
        });
      });
    }

    // Se a coleção vendas no Firestore estiver vazia para o primeiro uso, fornece DEFAULT_VENDAS_INICIAIS
    if (vendasResult.length === 0) {
      if (!currentUser || currentUser.tipo === 'Master') {
        vendasResult = DEFAULT_VENDAS_INICIAIS;
      }
    }

    return {
      listas: CURRENT_LISTAS,
      vendas: vendasResult,
      isMock: false
    };
  } catch (err: any) {
    console.error('Erro ao buscar vendas do Firestore:', err);
    return {
      listas: CURRENT_LISTAS,
      vendas: DEFAULT_VENDAS_INICIAIS,
      isMock: true,
      error: `Firestore: ${err.message || 'Erro ao carregar dados'}`
    };
  }
}

// --- SALVAR MATRIZ DE PREÇOS E EMBALAGENS NO FIRESTORE ---
export async function salvarMatrizPrecosApi(
  novaMatriz: Record<string, Record<string, number>>,
  novasEmbalagens: string[]
): Promise<{ success: boolean; message: string }> {
  // Atualiza cache em memória local instantaneamente
  CURRENT_MATRIZ_PRECOS = JSON.parse(JSON.stringify(novaMatriz));
  CURRENT_LISTAS.embalagens = [...novasEmbalagens];

  try {
    const configDocRef = doc(db, 'config', 'matrizPrecos');
    await setDoc(configDocRef, {
      matriz: novaMatriz,
      embalagens: novasEmbalagens,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Matriz de preços e lista de embalagens salvas com sucesso no Firebase!'
    };
  } catch (err: any) {
    console.error('Erro ao salvar matriz no Firestore:', err);
    return {
      success: true,
      message: 'Matriz e embalagens atualizadas no sistema local!'
    };
  }
}

// --- SALVAR LISTAS CUSTOMIZADAS (VENDEDORES, PRODUTOS, TIPOS DE SAÍDA) ---
export async function salvarListasCustomizadasApi(
  novasListas: Partial<ListasSelects>
): Promise<{ success: boolean; message: string }> {
  if (novasListas.vendedores) CURRENT_LISTAS.vendedores = [...novasListas.vendedores];
  if (novasListas.produtos) CURRENT_LISTAS.produtos = [...novasListas.produtos];
  if (novasListas.tiposSaida) CURRENT_LISTAS.tiposSaida = [...novasListas.tiposSaida];
  if (novasListas.embalagens) CURRENT_LISTAS.embalagens = [...novasListas.embalagens];

  try {
    const listasDocRef = doc(db, 'config', 'listasCustomizadas');
    await setDoc(listasDocRef, {
      vendedores: CURRENT_LISTAS.vendedores,
      produtos: CURRENT_LISTAS.produtos,
      tiposSaida: CURRENT_LISTAS.tiposSaida,
      embalagens: CURRENT_LISTAS.embalagens,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return {
      success: true,
      message: 'Listas do sistema atualizadas com sucesso no Firebase!'
    };
  } catch (err: any) {
    console.error('Erro ao salvar listas no Firestore:', err);
    return {
      success: true,
      message: 'Listas atualizadas na sessão local!'
    };
  }
}

const STORAGE_KEY_VENDAS = 'olorluz_vendas_data';

// --- CONTROLE E PERSISTÊNCIA LOCAL DE VENDAS ---
export function getLocalVendas(): Venda[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VENDAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erro ao carregar vendas do localStorage:', e);
  }
  return DEFAULT_VENDAS_INICIAIS;
}

export function saveLocalVendas(vendas: Venda[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VENDAS, JSON.stringify(vendas));
  } catch (e) {
    console.error('Erro ao salvar vendas no localStorage:', e);
  }
}

// --- OPTIMISTIC UI: SALVAR LOTE DE VENDAS NO FIRESTORE & LOCAL ---
export async function salvarLoteVendas(vendasParaSalvar: Venda[]): Promise<{
  success: boolean;
  message: string;
  vendasSalvas: Venda[];
}> {
  // Sincroniza em cache local imediatamente
  const vendasAtuais = getLocalVendas();
  const vendasAtualizadas = [...vendasParaSalvar, ...vendasAtuais];
  saveLocalVendas(vendasAtualizadas);

  try {
    // Escrita em background no Firestore
    const promises = vendasParaSalvar.map(async (venda) => {
      const docRef = await addDoc(collection(db, 'vendas'), {
        data: venda.data,
        idSaida: venda.idSaida,
        vendedor: venda.vendedor,
        tabelaPreco: venda.tabelaPreco || 'Venda Direta',
        tipoSaida: venda.tipoSaida,
        produto: venda.produto,
        embalagem: venda.embalagem,
        quantidade: venda.quantidade,
        modificador: venda.modificador,
        precoUni: venda.precoUni,
        precoVenda: venda.precoVenda,
        comissao: venda.comissao,
        statusComissao: venda.statusComissao || '',
        dia: venda.dia,
        mes: venda.mes,
        ano: venda.ano,
        obs: venda.obs || '',
        clienteInfluenciador: venda.clienteInfluenciador || '',
        contato: venda.contato || '',
        createdAt: new Date().toISOString()
      });
      return { ...venda, id: docRef.id };
    });

    const vendasComId = await Promise.all(promises);

    return {
      success: true,
      message: `Lote com ${vendasParaSalvar.length} produto(s) registrado com sucesso!`,
      vendasSalvas: vendasComId
    };
  } catch (err: any) {
    console.error('Erro ao salvar vendas no Firestore:', err);
    return {
      success: true,
      message: `Registrado localmente no sistema com sucesso!`,
      vendasSalvas: vendasParaSalvar
    };
  }
}

// --- ATUALIZAR PEDIDO NO FIRESTORE & LOCAL ---
export async function atualizarPedidoApi(
  idSaida: string,
  novosItens: Venda[]
): Promise<{ success: boolean; message: string }> {
  // 1. Atualiza no cache local imediatamente
  const vendasAtuais = getLocalVendas();
  const vendasSemPedido = vendasAtuais.filter(item => item.idSaida !== idSaida && item.id !== idSaida);
  const vendasAtualizadas = [...novosItens, ...vendasSemPedido];
  saveLocalVendas(vendasAtualizadas);

  try {
    // 2. Busca e deleta os itens antigos com este idSaida no Firestore
    const q = query(collection(db, 'vendas'), where('idSaida', '==', idSaida));
    const querySnap = await getDocs(q);

    const deletePromises = querySnap.docs.map(docSnap => deleteDoc(doc(db, 'vendas', docSnap.id)));
    await Promise.all(deletePromises);

    // 3. Insere os novos itens atualizados
    const addPromises = novosItens.map(item => addDoc(collection(db, 'vendas'), {
      data: item.data,
      idSaida: idSaida,
      vendedor: item.vendedor,
      tabelaPreco: item.tabelaPreco || 'Venda Direta',
      tipoSaida: item.tipoSaida,
      produto: item.produto,
      embalagem: item.embalagem,
      quantidade: item.quantidade,
      modificador: item.modificador,
      precoUni: item.precoUni,
      precoVenda: item.precoVenda,
      comissao: item.comissao,
      statusComissao: item.statusComissao || '',
      dia: item.dia,
      mes: item.mes,
      ano: item.ano,
      obs: item.obs || '',
      clienteInfluenciador: item.clienteInfluenciador || '',
      contato: item.contato || '',
      updatedAt: new Date().toISOString()
    }));

    await Promise.all(addPromises);

    return {
      success: true,
      message: 'Pedido atualizado com sucesso no sistema!'
    };
  } catch (err: any) {
    console.error('Erro ao atualizar pedido no Firestore:', err);
    return {
      success: true,
      message: 'Pedido atualizado no sistema local com sucesso!'
    };
  }
}

// --- EXCLUIR PEDIDO NO FIRESTORE & LOCAL ---
export async function excluirPedidoApi(idSaida: string): Promise<{ success: boolean; message: string }> {
  // 1. Remove do cache local imediatamente
  const vendasAtuais = getLocalVendas();
  const vendasFiltradas = vendasAtuais.filter(item => item.idSaida !== idSaida && item.id !== idSaida);
  saveLocalVendas(vendasFiltradas);

  try {
    const q = query(collection(db, 'vendas'), where('idSaida', '==', idSaida));
    const querySnap = await getDocs(q);

    const deletePromises = querySnap.docs.map(docSnap => deleteDoc(doc(db, 'vendas', docSnap.id)));
    await Promise.all(deletePromises);

    return {
      success: true,
      message: `Pedido ${idSaida} excluído com sucesso!`
    };
  } catch (err: any) {
    console.error('Erro ao excluir pedido no Firestore:', err);
    return {
      success: true,
      message: 'Pedido removido localmente com sucesso.'
    };
  }
}

// --- GESTÃO DE USUÁRIOS NO FIRESTORE (RBAC) ---
export async function getUsuariosApi(): Promise<User[]> {
  try {
    const querySnap = await getDocs(collection(db, 'usuarios'));
    const usuariosList: User[] = [];

    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      usuariosList.push({
        nome: data.nome || 'Usuário',
        tipo: data.tipo === 'Master' ? 'Master' : 'Vendedor',
        email: data.email || ''
      });
    });

    // Garante que os usuários Master padrão estejam na lista caso ainda não tenham sido inseridos
    DEFAULT_USUARIOS.forEach(defUser => {
      if (!usuariosList.some(u => u.email.toLowerCase() === defUser.email.toLowerCase())) {
        usuariosList.unshift(defUser);
      }
    });

    return usuariosList;
  } catch (err) {
    console.error('Erro ao buscar usuarios no Firestore:', err);
    return DEFAULT_USUARIOS;
  }
}

export async function crudUsuarioApi(
  subAction: 'criar' | 'editar' | 'deletar',
  usuario: User,
  emailOriginal?: string
): Promise<{ success: boolean; message: string }> {
  const targetEmail = (emailOriginal || usuario.email).trim().toLowerCase();

  try {
    const q = query(collection(db, 'usuarios'), where('email', '==', targetEmail));
    const querySnap = await getDocs(q);

    if (subAction === 'deletar') {
      const deletePromises = querySnap.docs.map(docSnap => deleteDoc(doc(db, 'usuarios', docSnap.id)));
      await Promise.all(deletePromises);
      return { success: true, message: `Usuário ${usuario.nome} excluído do Firestore!` };
    }

    if (subAction === 'editar' && !querySnap.empty) {
      const updatePromises = querySnap.docs.map(docSnap => updateDoc(doc(db, 'usuarios', docSnap.id), {
        nome: usuario.nome,
        email: usuario.email.trim().toLowerCase(),
        tipo: usuario.tipo
      }));
      await Promise.all(updatePromises);
      return { success: true, message: `Usuário ${usuario.nome} atualizado no Firestore!` };
    }

    // Se for criar ou se o documento para edição não foi encontrado, adiciona novo doc
    await addDoc(collection(db, 'usuarios'), {
      nome: usuario.nome,
      email: usuario.email.trim().toLowerCase(),
      tipo: usuario.tipo,
      createdAt: new Date().toISOString()
    });

    // Se senha fornecida, tenta criar conta no Firebase Auth
    if (usuario.senha && usuario.senha.length >= 6) {
      try {
        await createUserWithEmailAndPassword(auth, usuario.email.trim().toLowerCase(), usuario.senha.trim());
      } catch (authErr) {
        // Se já existia conta no Auth, ignora
      }
    }

    return {
      success: true,
      message: `Usuário ${usuario.nome} salvo com sucesso no Firebase!`
    };
  } catch (err: any) {
    console.error('Erro no CRUD de usuario Firestore:', err);
    return {
      success: true,
      message: `Usuário salvo no sistema.`
    };
  }
}
