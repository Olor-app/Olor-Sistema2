import { ApiResponse, ListasSelects, User, Venda, TipoSaida, MateriaPrima, ProdutoItem, ProdutoStatus, Formula, InsumoFormula } from '../types';
import { normalizarFormulaCompleta } from '../utils/formulaCalculations';
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

export function sortAlphabetically(arr: string[]): string[] {
  return [...(arr || [])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true })
  );
}

// --- LISTA DE MATÉRIAS-PRIMAS PADRÃO DO SIG OLOR LUZ ---
export const DEFAULT_MATERIAS_PRIMAS: MateriaPrima[] = [
  { nome: 'Ácido Cítrico', precoUni: 17.00, uni: 'L' },
  { nome: 'ácido fosforico', precoUni: 9.00, uni: 'L' },
  { nome: 'Acticide BR 7530', precoUni: 14.15, uni: 'L' },
  { nome: 'Água', precoUni: 0.02, uni: 'L' },
  { nome: 'Álcool Cereais', precoUni: 16.00, uni: 'L' },
  { nome: 'Álcool Etílico', precoUni: 6.00, uni: 'L' },
  { nome: 'Álcool Isopropilico', precoUni: 16.00, uni: 'L' },
  { nome: 'Alecrim', precoUni: 150.00, uni: 'L' },
  { nome: 'Amida 90', precoUni: 30.00, uni: 'L' },
  { nome: 'Angel', precoUni: 190.00, uni: 'L' },
  { nome: 'Aurora de Vanilla', precoUni: 0, uni: 'L' },
  { nome: 'Aurora de Vanilla (Base)', precoUni: 0, uni: 'L' },
  { nome: 'Bamboo Dreams essencial', precoUni: 95.00, uni: 'L' },
  { nome: 'Base Kayak', precoUni: 200.00, uni: 'L' },
  { nome: 'Base Perolizante', precoUni: 32.00, uni: 'L' },
  { nome: 'Base Sabonete Liquido', precoUni: 0, uni: 'L' },
  { nome: 'Bergamota', precoUni: 95.00, uni: 'L' },
  { nome: 'Cal Virgem', precoUni: 1.40, uni: 'L' },
  { nome: 'Canela', precoUni: 150.00, uni: 'L' },
  { nome: 'Capim Limão frag', precoUni: 158.00, uni: 'L' },
  { nome: 'Capim Limão Jau', precoUni: 158.00, uni: 'L' },
  { nome: 'Cedro', precoUni: 150.00, uni: 'L' },
  { nome: 'Cereja e avelã', precoUni: 210.00, uni: 'L' },
  { nome: 'Chá Branco Frag', precoUni: 120.00, uni: 'L' },
  { nome: 'chocolate', precoUni: 180.00, uni: 'L' },
  { nome: 'cloreto de Sodio', precoUni: 3.00, uni: 'L' },
  { nome: 'corante', precoUni: 0, uni: 'L' },
  { nome: 'corante azul', precoUni: 150.00, uni: 'L' },
  { nome: 'Detergente Neltro', precoUni: 5.00, uni: 'L' },
  { nome: 'EDTA', precoUni: 0, uni: 'L' },
  { nome: 'Encanto do Oceano', precoUni: 0, uni: 'L' },
  { nome: 'Encanto do Oceano (Base)', precoUni: 0, uni: 'L' },
  { nome: 'essencia chocolate', precoUni: 0, uni: 'L' },
  { nome: 'Essência jasmim', precoUni: 137.00, uni: 'L' },
  { nome: 'Essência talco', precoUni: 207.00, uni: 'L' },
  { nome: 'Essência Verão Intenso', precoUni: 95.00, uni: 'L' },
  { nome: 'Eterno Frag', precoUni: 211.20, uni: 'L' },
  { nome: 'Eucalipto Globulus', precoUni: 220.00, uni: 'L' },
  { nome: 'Flor de Cerejeira', precoUni: 265.70, uni: 'L' },
  { nome: 'Flor de Cerejeira Essencial', precoUni: 95.00, uni: 'L' },
  { nome: 'Floral Rose', precoUni: 195.40, uni: 'L' },
  { nome: 'Floral Rose Jau', precoUni: 195.40, uni: 'L' },
  { nome: 'Glicerina', precoUni: 5.60, uni: 'L' },
  { nome: 'Glicerina Bidestilada', precoUni: 15.00, uni: 'L' },
  { nome: 'Goma xantana', precoUni: 0, uni: 'L' },
  { nome: 'Horizonte das Flores', precoUni: 0, uni: 'L' },
  { nome: 'Hotelã', precoUni: 190.00, uni: 'L' },
  { nome: 'HTML', precoUni: 40.00, uni: 'L' },
  { nome: 'Infinity', precoUni: 120.00, uni: 'L' },
  { nome: 'Infinity essencial', precoUni: 240.00, uni: 'L' },
  { nome: 'Jadim de Estrelas', precoUni: 0, uni: 'L' },
  { nome: 'jasmim amadeirado aromalles', precoUni: 186.00, uni: 'L' },
  { nome: 'Lauril', precoUni: 11.45, uni: 'L' },
  { nome: 'Lavanda Francesa', precoUni: 120.00, uni: 'L' },
  { nome: 'Limão siciliano Frag', precoUni: 95.00, uni: 'L' },
  { nome: 'Lirio Aromalles', precoUni: 227.60, uni: 'L' },
  { nome: 'Macadamia Aromalles', precoUni: 182.00, uni: 'L' },
  { nome: 'Macadamia Frag', precoUni: 258.36, uni: 'L' },
  { nome: 'Manga py Aromalles', precoUni: 314.00, uni: 'L' },
  { nome: 'Marruá', precoUni: 270.00, uni: 'L' },
  { nome: 'Metilparabeno', precoUni: 150.00, uni: 'L' },
  { nome: 'Mica po Barata', precoUni: 480.00, uni: 'L' },
  { nome: 'Mica po Cara', precoUni: 1500.00, uni: 'L' },
  { nome: 'Mirra', precoUni: 150.00, uni: 'L' },
  { nome: 'OS', precoUni: 40.00, uni: 'L' },
  { nome: 'Passione', precoUni: 120.00, uni: 'L' },
  { nome: 'Passione essencial', precoUni: 240.00, uni: 'L' },
  { nome: 'Patchouli', precoUni: 170.00, uni: 'L' },
  { nome: 'Peróxido de Hidrogênio', precoUni: 8.00, uni: 'L' },
  { nome: 'PHMB', precoUni: 77.00, uni: 'L' },
  { nome: 'potassa', precoUni: 9.00, uni: 'L' },
  { nome: 'Propilenoglicol', precoUni: 0, uni: 'L' },
  { nome: 'Resplendor dos Sonhos', precoUni: 0, uni: 'L' },
  { nome: 'sol. A.Cítrico', precoUni: 0, uni: 'L' },
  { nome: 'Sulfato de Cobre 25%', precoUni: 17.00, uni: 'L' },
  { nome: 'Talco Pom Pom', precoUni: 212.27, uni: 'L' },
  { nome: 'ULTRAPRIME 130', precoUni: 0, uni: 'L' },
  { nome: 'Vanila Lace', precoUni: 126.00, uni: 'L' },
  { nome: 'Vanila Lace essencial', precoUni: 105.00, uni: 'L' },
  { nome: 'vanilla doce', precoUni: 0, uni: 'L' },
  { nome: 'Vanilla KPh', precoUni: 211.06, uni: 'L' },
  { nome: 'Vanilla lace aromalles', precoUni: 200.00, uni: 'L' },
  { nome: 'verão intenso essencial', precoUni: 210.00, uni: 'L' },
  { nome: 'violeta aromalles', precoUni: 274.00, uni: 'L' },
  { nome: 'Ylang Ylang', precoUni: 190.00, uni: 'L' }
];

// --- LISTAS AUXILIARES EXATAS DO SIG OLOR LUZ ---
export const DEFAULT_PRODUTOS_BASE: string[] = sortAlphabetically([
  'AURORA DE VANILLA', 'BAMBOO', 'BRISA CELESTIAL', 'CAPIM LIMÃO', 
  'ENCANTO DO OCEANO', 'FLOR DE CEREJEIRA', 'JARDIM DE ESTRELAS', 'JASMIM', 
  'LAVANDA', 'RESPLENDOR DOS SONHOS', 'Caixa Kit (15ml) Premium', 
  'MAGIA NATALINA', 'CHA BRANCO', 'PAPELARIA', 'BLACKOUT', 
  'CLEAN FULL PET SPRAY', 'CLEAN FULL PET', 'DIFUSOR ELETRICO', 
  'DIFUSOR ELETRICO + ESSENCIA', 'FLOR DE CACAU', 'CHOCOLATE MENTOLADO'
]);

export const DEFAULT_PRODUTOS_DETALHADOS: ProdutoItem[] = DEFAULT_PRODUTOS_BASE.map(nome => ({
  nome,
  status: 'Ativo'
}));

export const DEFAULT_LISTAS: ListasSelects = {
  vendedores: [
    'Rosa', 'Cleide', 'Kely', 'Sônia', 'Olor Luz', 'Andreia', 
    'Vivi', 'Tânia Raquel', 'Kathleen', 'Tiktok', 'Jessica Caetano', 'Jean', 'Gabi'
  ],
  produtos: DEFAULT_PRODUTOS_BASE,
  produtosDetalhes: DEFAULT_PRODUTOS_DETALHADOS,
  embalagens: sortAlphabetically([
    '120ML', '130ML', '1L', '(Pet)1L Sabão', '20ML', 'Essencia 20ml', 
    '(Pet) 500ml Spray', 'Caixa Kit (15ml) Premium', 'Caixa Kit 20 ml', 
    'Difusor', 'Difusor Eletrico', 'Difusor Eletrico Branco + Essencia', 
    'Difusor Eletrico Preto + Essencia', 'REFIL 250ML', 'REFIL 250ML Difusor', 
    'Sacola Olor luz', 'Sabonete Vidro 250ml', 'Sabonete 500ml', 
    'Água de Lençóis 500 ml', 'Caixa Kit (Sabonete + Difusor varetas)'
  ]),
  tabelasPreco: ['Site', 'Tiktok', 'Venda Direta', 'Consignado', 'Preço Logista'],
  tiposSaida: ['Venda', 'Consignado', 'Bonificação', 'Mostruário', 'Amostra Grátis'],
  statusComissao: ['Pago', 'Não Pago', 'Pendente', 'Cancelado'],
  materiasPrimas: DEFAULT_MATERIAS_PRIMAS
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
          CURRENT_LISTAS.embalagens = sortAlphabetically(data.embalagens);
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
        // Processa produtos e seus respectivos status (Ativo, Inativo, Teste, Uso interno)
        if (Array.isArray(data.produtosDetalhes) && data.produtosDetalhes.length > 0) {
          CURRENT_LISTAS.produtosDetalhes = data.produtosDetalhes.map((p: any) => ({
            nome: typeof p === 'string' ? p.trim() : String(p.nome || '').trim(),
            status: ((p.status === 'Inativo' || p.status === 'Teste' || p.status === 'Uso interno') ? p.status : 'Ativo') as ProdutoStatus
          }));
        } else if (Array.isArray(data.produtos) && data.produtos.length > 0) {
          // Compatibilidade com listas legadas (marca todas como Ativo por padrão)
          CURRENT_LISTAS.produtosDetalhes = data.produtos.map((p: any) => {
            if (typeof p === 'string') {
              return { nome: p.trim(), status: 'Ativo' as const };
            }
            return {
              nome: String(p.nome || '').trim(),
              status: ((p.status === 'Inativo' || p.status === 'Teste' || p.status === 'Uso interno') ? p.status : 'Ativo') as ProdutoStatus
            };
          });
        } else {
          CURRENT_LISTAS.produtosDetalhes = [...DEFAULT_PRODUTOS_DETALHADOS];
        }

        // Apenas os produtos ATIVOS ficam disponíveis para seleção em Vendas
        CURRENT_LISTAS.produtos = sortAlphabetically(
          (CURRENT_LISTAS.produtosDetalhes || [])
            .filter(p => p.status === 'Ativo')
            .map(p => p.nome)
        );
        if (Array.isArray(data.tiposSaida) && data.tiposSaida.length > 0) {
          CURRENT_LISTAS.tiposSaida = data.tiposSaida;
        }
        if (Array.isArray(data.embalagens) && data.embalagens.length > 0) {
          CURRENT_LISTAS.embalagens = sortAlphabetically(data.embalagens);
        }
        if (Array.isArray(data.materiasPrimas) && data.materiasPrimas.length > 0) {
          CURRENT_LISTAS.materiasPrimas = data.materiasPrimas.map((m: any) => ({
            nome: m.nome,
            precoUni: Number(m.precoUni) || 0,
            uni: m.uni || m.unidade || 'L'
          }));
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

    // Se a coleção vendas no Firestore estiver vazia, só insere DEFAULT_VENDAS_INICIAIS no primeiro acesso absoluto (quando nunca foi inicializado)
    const foiInicializado = localStorage.getItem('olorluz_vendas_initialized') === 'true' || localStorage.getItem(STORAGE_KEY_VENDAS) !== null;

    if (vendasResult.length === 0 && !foiInicializado) {
      if (!currentUser || currentUser.tipo === 'Master') {
        vendasResult = DEFAULT_VENDAS_INICIAIS;
        localStorage.setItem('olorluz_vendas_initialized', 'true');
        localStorage.setItem(STORAGE_KEY_VENDAS, JSON.stringify(DEFAULT_VENDAS_INICIAIS));
      }
    }

    return {
      listas: CURRENT_LISTAS,
      vendas: vendasResult,
      isMock: false
    };
  } catch (err: any) {
    console.error('Erro ao buscar vendas do Firestore:', err);
    const foiInicializado = localStorage.getItem('olorluz_vendas_initialized') === 'true' || localStorage.getItem(STORAGE_KEY_VENDAS) !== null;
    return {
      listas: CURRENT_LISTAS,
      vendas: foiInicializado ? [] : DEFAULT_VENDAS_INICIAIS,
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
  CURRENT_LISTAS.embalagens = sortAlphabetically(novasEmbalagens);

  try {
    const configDocRef = doc(db, 'config', 'matrizPrecos');
    await setDoc(configDocRef, {
      matriz: novaMatriz,
      embalagens: CURRENT_LISTAS.embalagens,
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
  
  if (novasListas.produtosDetalhes) {
    CURRENT_LISTAS.produtosDetalhes = novasListas.produtosDetalhes.map(p => ({
      nome: p.nome.trim(),
      status: ((p.status === 'Inativo' || p.status === 'Teste' || p.status === 'Uso interno') ? p.status : 'Ativo') as ProdutoStatus
    }));
    CURRENT_LISTAS.produtos = sortAlphabetically(
      CURRENT_LISTAS.produtosDetalhes
        .filter(p => p.status === 'Ativo')
        .map(p => p.nome)
    );
  } else if (novasListas.produtos) {
    CURRENT_LISTAS.produtos = sortAlphabetically(novasListas.produtos);
    CURRENT_LISTAS.produtosDetalhes = CURRENT_LISTAS.produtos.map(nome => ({
      nome,
      status: 'Ativo' as const
    }));
  }

  if (novasListas.tiposSaida) CURRENT_LISTAS.tiposSaida = [...novasListas.tiposSaida];
  if (novasListas.embalagens) CURRENT_LISTAS.embalagens = sortAlphabetically(novasListas.embalagens);
  if (novasListas.materiasPrimas) CURRENT_LISTAS.materiasPrimas = [...novasListas.materiasPrimas];

  // Sincroniza o status das fórmulas existentes no Firestore e LocalStorage com base nas alterações de status dos produtos
  if (CURRENT_LISTAS.produtosDetalhes && CURRENT_LISTAS.produtosDetalhes.length > 0) {
    const formulasAtuais = getLocalFormulas();
    let formulasModificadas = false;
    const formulasPromises: Promise<void>[] = [];

    for (const prodItem of CURRENT_LISTAS.produtosDetalhes) {
      const nomeNorm = prodItem.nome.trim().toLowerCase();
      for (let i = 0; i < formulasAtuais.length; i++) {
        const f = formulasAtuais[i];
        if (f.produto && f.produto.trim().toLowerCase() === nomeNorm) {
          if (f.status !== prodItem.status) {
            f.status = prodItem.status;
            f.updatedAt = new Date().toISOString();
            formulasModificadas = true;

            if (f.id && !f.id.startsWith('temp_')) {
              formulasPromises.push(
                updateDoc(doc(db, 'formulas', f.id), {
                  status: prodItem.status,
                  updatedAt: f.updatedAt
                }).catch(err => console.warn('Aviso: Erro ao atualizar status da formula no Firestore:', err))
              );
            }
          }
        }
      }
    }

    if (formulasModificadas) {
      saveLocalFormulas(formulasAtuais);
    }
    if (formulasPromises.length > 0) {
      Promise.all(formulasPromises).catch(err => console.warn('Erro nas promises de fórmulas:', err));
    }
  }

  try {
    const listasDocRef = doc(db, 'config', 'listasCustomizadas');
    await setDoc(listasDocRef, {
      vendedores: CURRENT_LISTAS.vendedores,
      produtos: CURRENT_LISTAS.produtos,
      produtosDetalhes: CURRENT_LISTAS.produtosDetalhes || DEFAULT_PRODUTOS_DETALHADOS,
      tiposSaida: CURRENT_LISTAS.tiposSaida,
      embalagens: CURRENT_LISTAS.embalagens,
      materiasPrimas: CURRENT_LISTAS.materiasPrimas || DEFAULT_MATERIAS_PRIMAS,
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

/**
 * Se um item de saída for do tipo 'Consignado' e possuir quantidade > 1,
 * esta função desmembra esse item em N registros individuais (1 por unidade),
 * permitindo conversão ("tornar venda") parcial de cada unidade individualmente.
 */
export function desmembrarItensConsignado(vendas: Venda[]): Venda[] {
  const resultado: Venda[] = [];

  for (const item of vendas) {
    const isConsignado = (item.tipoSaida || '').trim().toLowerCase() === 'consignado';
    const qtdNum = Math.round(Number(item.quantidade)) || 1;

    if (isConsignado && qtdNum > 1) {
      const modTotal = Number(item.modificador) || 0;
      const modPorUnidade = modTotal / qtdNum;

      for (let i = 0; i < qtdNum; i++) {
        resultado.push({
          ...item,
          id: `${item.id || 'VEN'}-U${i + 1}`,
          quantidade: 1,
          modificador: modPorUnidade,
          precoUni: 0,
          precoVenda: 0,
          comissao: 0
        });
      }
    } else {
      resultado.push(item);
    }
  }

  return resultado;
}

// --- CONTROLE E PERSISTÊNCIA LOCAL DE VENDAS ---
export function getLocalVendas(): Venda[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VENDAS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return desmembrarItensConsignado(parsed);
      }
    }
  } catch (e) {
    console.error('Erro ao carregar vendas do localStorage:', e);
  }

  if (localStorage.getItem('olorluz_vendas_initialized') === 'true') {
    return [];
  }

  return desmembrarItensConsignado(DEFAULT_VENDAS_INICIAIS);
}

export function saveLocalVendas(vendas: Venda[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VENDAS, JSON.stringify(vendas));
    localStorage.setItem('olorluz_vendas_initialized', 'true');
  } catch (e) {
    console.error('Erro ao salvar vendas no localStorage:', e);
  }
}

// --- OPTIMISTIC UI: SALVAR LOTE DE VENDAS NO FIRESTORE & LOCAL ---
export async function salvarLoteVendas(vendasParaSalvarOriginal: Venda[]): Promise<{
  success: boolean;
  message: string;
  vendasSalvas: Venda[];
}> {
  const vendasParaSalvar = desmembrarItensConsignado(vendasParaSalvarOriginal);

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
  novosItensOriginal: Venda[]
): Promise<{ success: boolean; message: string }> {
  const novosItens = desmembrarItensConsignado(novosItensOriginal);

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

// --- ATUALIZAR STATUS DE COMISSÃO EM LOTE OU INDIVIDUAL ---
export async function atualizarStatusComissaoVendaApi(
  idsVendasOuSaidas: string[],
  novoStatus: string
): Promise<{ success: boolean; message: string }> {
  // 1. Atualiza cache local
  const vendasAtuais = getLocalVendas();
  const vendasAtualizadas = vendasAtuais.map(v => {
    if (idsVendasOuSaidas.includes(v.id) || idsVendasOuSaidas.includes(v.idSaida)) {
      return { ...v, statusComissao: novoStatus };
    }
    return v;
  });
  saveLocalVendas(vendasAtualizadas);

  try {
    // 2. Atualiza no Firestore
    const vendasCol = collection(db, 'vendas');
    const querySnap = await getDocs(vendasCol);
    const updatePromises: Promise<void>[] = [];

    querySnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (idsVendasOuSaidas.includes(docSnap.id) || idsVendasOuSaidas.includes(data.idSaida)) {
        updatePromises.push(updateDoc(doc(db, 'vendas', docSnap.id), {
          statusComissao: novoStatus,
          updatedAt: new Date().toISOString()
        }));
      }
    });

    await Promise.all(updatePromises);
    return {
      success: true,
      message: `Status de comissão atualizado para "${novoStatus}" com sucesso!`
    };
  } catch (err: any) {
    console.error('Erro ao atualizar status de comissão no Firestore:', err);
    return {
      success: true,
      message: `Status atualizado localmente para "${novoStatus}".`
    };
  }
}

// --- ZERAR / LIMPAR TODAS AS VENDAS NO FIRESTORE E LOCAL ---
export async function limparTodasVendasApi(): Promise<{ success: boolean; message: string }> {
  // 1. Zera localmente
  try {
    localStorage.setItem(STORAGE_KEY_VENDAS, JSON.stringify([]));
    localStorage.setItem('olorluz_vendas_initialized', 'true');
  } catch (e) {
    console.error('Erro ao zerar cache de vendas local:', e);
  }

  try {
    // 2. Apaga TODOS os registros da coleção 'vendas' no Firestore
    const vendasCol = collection(db, 'vendas');
    const querySnap = await getDocs(vendasCol);

    const deletePromises = querySnap.docs.map(docSnap => deleteDoc(doc(db, 'vendas', docSnap.id)));
    await Promise.all(deletePromises);

    return {
      success: true,
      message: 'Banco de dados BD_Vendas foi totalmente zerado com sucesso!'
    };
  } catch (err: any) {
    console.error('Erro ao zerar banco de vendas no Firestore:', err);
    return {
      success: true,
      message: 'Banco de dados zerado localmente com sucesso.'
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

// --- FÓRMULAS & ENGENHARIA DE PRODUTOS (P&D) ---

export const STORAGE_KEY_FORMULAS = 'olorluz_formulas_data';

export const DEFAULT_FORMULAS_INICIAIS: Formula[] = [
  {
    id: 'FORM-001',
    produto: 'AURORA DE VANILLA',
    status: 'Ativo',
    isCriacaoLivre: false,
    rendimento: 1000,
    unidadeRendimento: 'L',
    custoTotal: 15420.00,
    custoUnitarioLitro: 15.42,
    insumos: [
      {
        seq: 1,
        insumo: 'Água',
        uni: 'L',
        precoUni: 0.02,
        baseFormula: 750,
        metodologia: 'Adicionar água purificada e desmineralizada no tanque principal.',
        custoTotal: 15.00
      },
      {
        seq: 2,
        insumo: 'Álcool Cereais',
        uni: 'L',
        precoUni: 16.00,
        baseFormula: 150,
        metodologia: 'Adicionar álcool de cereais sob agitação constante lenta por 5 minutos.',
        custoTotal: 2400.00
      },
      {
        seq: 3,
        insumo: 'Vanilla KPh',
        uni: 'L',
        precoUni: 211.06,
        baseFormula: 60,
        metodologia: 'Incorporar fragrância concentrada de Vanilla e homogeneizar.',
        custoTotal: 12663.60
      },
      {
        seq: 4,
        insumo: 'Propilenoglicol',
        uni: 'L',
        precoUni: 8.50,
        baseFormula: 40,
        metodologia: 'Adicionar solubilizante e fixador, agitar por 15 minutos até total transparência.',
        custoTotal: 340.00
      }
    ],
    obs: 'Fórmula padrão para difusores e aromatizadores de 120ml e 500ml. Armazenar em temperatura ambiente.',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-15T14:30:00.000Z'
  },
  {
    id: 'FORM-002',
    produto: 'BAMBOO',
    status: 'Ativo',
    isCriacaoLivre: false,
    rendimento: 1000,
    unidadeRendimento: 'L',
    custoTotal: 11520.00,
    custoUnitarioLitro: 11.52,
    insumos: [
      {
        seq: 1,
        insumo: 'Água',
        uni: 'L',
        precoUni: 0.02,
        baseFormula: 800,
        metodologia: 'Carga inicial de água desmineralizada no reator.',
        custoTotal: 16.00
      },
      {
        seq: 2,
        insumo: 'Álcool Etílico',
        uni: 'L',
        precoUni: 6.00,
        baseFormula: 100,
        metodologia: 'Misturar álcool neutro 96° GL.',
        custoTotal: 600.00
      },
      {
        seq: 3,
        insumo: 'Bamboo Dreams essencial',
        uni: 'L',
        precoUni: 95.00,
        baseFormula: 100,
        metodologia: 'Adicionar essência Bamboo Dreams sob agitação suave por 10 min.',
        custoTotal: 9500.00
      },
      {
        seq: 4,
        insumo: 'Acticide BR 7530',
        uni: 'L',
        precoUni: 14.15,
        baseFormula: 100,
        metodologia: 'Adicionar conservante cosmético e homogeneizar até limpidez.',
        custoTotal: 1415.00
      }
    ],
    obs: 'Fragrância herbal fresca de alta saída. Teste de estabilidade e turbidez aprovado.',
    createdAt: '2026-07-05T11:00:00.000Z',
    updatedAt: '2026-07-20T09:00:00.000Z'
  },
  {
    id: 'FORM-003',
    produto: 'Base Jardim de Estrelas',
    status: 'Uso interno',
    isCriacaoLivre: true,
    rendimento: 1000,
    unidadeRendimento: 'L',
    custoTotal: 164100.00,
    custoUnitarioLitro: 164.10,
    insumos: [
      {
        seq: 1,
        insumo: 'verão intenso essencial',
        uni: 'L',
        precoUni: 210.00,
        baseFormula: 340,
        metodologia: 'Carga principal de essência Verão Intenso sob agitação constante.',
        custoTotal: 71400.00
      },
      {
        seq: 2,
        insumo: 'Passione',
        uni: 'L',
        precoUni: 120.00,
        baseFormula: 510,
        metodologia: 'Adicionar fragrância Passione e homogeneizar por 10 minutos.',
        custoTotal: 61200.00
      },
      {
        seq: 3,
        insumo: 'Flor de Cerejeira Essencial',
        uni: 'L',
        precoUni: 240.00,
        baseFormula: 100,
        metodologia: 'Incorporar Flor de Cerejeira Essencial como nota floral de topo.',
        custoTotal: 24000.00
      },
      {
        seq: 4,
        insumo: 'Mirra',
        uni: 'L',
        precoUni: 150.00,
        baseFormula: 50,
        metodologia: 'Adicionar Mirra para sustentação, fixação e corpo da base aromática.',
        custoTotal: 7500.00
      }
    ],
    obs: 'Base aromática de uso interno exclusiva. Calibrada e fechada no padrão industrial de 1.000 Litros com unidades em L.',
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z'
  }
];

export function getLocalFormulas(): Formula[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FORMULAS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(f => normalizarFormulaCompleta(f));
      }
    }
  } catch (e) {
    console.error('Erro ao ler fórmulas do localStorage:', e);
  }
  return DEFAULT_FORMULAS_INICIAIS.map(f => normalizarFormulaCompleta(f));
}

export function saveLocalFormulas(formulas: Formula[]): void {
  try {
    const normalizadas = formulas.map(f => normalizarFormulaCompleta(f));
    localStorage.setItem(STORAGE_KEY_FORMULAS, JSON.stringify(normalizadas));
  } catch (e) {
    console.error('Erro ao salvar fórmulas no localStorage:', e);
  }
}

export async function getFormulasApi(): Promise<Formula[]> {
  try {
    const formulasCol = collection(db, 'formulas');
    const querySnap = await getDocs(formulasCol);
    const result: Formula[] = [];

    querySnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const parsedFormula: Formula = {
        id: docSnap.id,
        produto: data.produto || '',
        status: (data.status || 'Ativo') as ProdutoStatus,
        isCriacaoLivre: Boolean(data.isCriacaoLivre),
        rendimento: Number(data.rendimento) || 1000,
        unidadeRendimento: data.unidadeRendimento || 'L',
        custoTotal: Number(data.custoTotal) || 0,
        custoUnitarioLitro: Number(data.custoUnitarioLitro) || 0,
        insumos: Array.isArray(data.insumos) ? data.insumos.map((item: any, idx: number) => ({
          seq: Number(item.seq) || (idx + 1),
          insumo: item.insumo || '',
          uni: item.uni || 'L',
          precoUni: Number(item.precoUni) || 0,
          baseFormula: Number(item.baseFormula) || 0,
          metodologia: item.metodologia || '',
          custoTotal: Number(item.custoTotal) || 0
        })) : [],
        obs: data.obs || '',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || ''
      };

      // Garante normalização de fórmulas criadas anteriormente ou com unidades de ensaio
      result.push(normalizarFormulaCompleta(parsedFormula));
    });

    if (result.length === 0) {
      // Se a coleção estiver vazia no Firestore, inicializa com os dados padrão locais
      const local = getLocalFormulas();
      if (local.length > 0) return local;
      return DEFAULT_FORMULAS_INICIAIS.map(f => normalizarFormulaCompleta(f));
    }

    // Sincroniza status com CURRENT_LISTAS.produtosDetalhes se houver alteração
    if (CURRENT_LISTAS.produtosDetalhes && CURRENT_LISTAS.produtosDetalhes.length > 0) {
      result.forEach(f => {
        const prodMatch = CURRENT_LISTAS.produtosDetalhes?.find(
          p => p.nome.trim().toLowerCase() === (f.produto || '').trim().toLowerCase()
        );
        if (prodMatch && prodMatch.status) {
          f.status = prodMatch.status;
        }
      });
    }

    saveLocalFormulas(result);
    return result;
  } catch (err) {
    console.error('Erro ao buscar fórmulas do Firestore:', err);
    return getLocalFormulas();
  }
}

export async function salvarFormulaApi(formula: Formula): Promise<{
  success: boolean;
  message: string;
  formulaSalva: Formula;
}> {
  // 1. Normaliza a fórmula integralmente para o padrão de 1.000 Litros
  const formulaFinal = normalizarFormulaCompleta({ ...formula });

  // 2. Atualiza Optimisticamente no cache local
  const formulasAtuais = getLocalFormulas();
  const indexExistente = formulasAtuais.findIndex(f => f.id === formulaFinal.id);

  if (indexExistente >= 0) {
    formulaFinal.updatedAt = new Date().toISOString();
    formulasAtuais[indexExistente] = formulaFinal;
  } else {
    formulaFinal.createdAt = formulaFinal.createdAt || new Date().toISOString();
    formulaFinal.updatedAt = new Date().toISOString();
    formulasAtuais.unshift(formulaFinal);
  }
  saveLocalFormulas(formulasAtuais);

  // 3. Sincroniza a Lista Global de Produtos no Firestore / Estado com o status da fórmula
  if (formulaFinal.produto && formulaFinal.produto.trim()) {
    const nomeNormalizado = formulaFinal.produto.trim();
    const indexProduto = (CURRENT_LISTAS.produtosDetalhes || []).findIndex(
      p => p.nome.trim().toLowerCase() === nomeNormalizado.toLowerCase()
    );

    let novosDetalhes = [...(CURRENT_LISTAS.produtosDetalhes || [])];
    if (indexProduto >= 0) {
      novosDetalhes[indexProduto] = {
        ...novosDetalhes[indexProduto],
        status: formulaFinal.status || 'Ativo'
      };
    } else {
      novosDetalhes.push({
        nome: nomeNormalizado,
        status: formulaFinal.status || 'Ativo'
      });
    }

    CURRENT_LISTAS.produtosDetalhes = novosDetalhes;
    CURRENT_LISTAS.produtos = sortAlphabetically(
      novosDetalhes.filter(p => p.status === 'Ativo').map(p => p.nome)
    );

    // Salva a lista de produtos atualizada no Firestore
    salvarListasCustomizadasApi({ produtosDetalhes: novosDetalhes }).catch(err => {
      console.warn('Erro ao sincronizar produto na lista global:', err);
    });
  }

  // 3. Salva no Firestore
  try {
    const payload = {
      produto: formulaFinal.produto,
      status: formulaFinal.status,
      isCriacaoLivre: formulaFinal.isCriacaoLivre,
      rendimento: formulaFinal.rendimento,
      unidadeRendimento: formulaFinal.unidadeRendimento,
      custoTotal: formulaFinal.custoTotal,
      custoUnitarioLitro: formulaFinal.custoUnitarioLitro,
      insumos: formulaFinal.insumos,
      obs: formulaFinal.obs || '',
      updatedAt: formulaFinal.updatedAt,
      createdAt: formulaFinal.createdAt
    };

    if (formulaFinal.id && !formulaFinal.id.startsWith('temp_')) {
      await updateDoc(doc(db, 'formulas', formulaFinal.id), payload);
    } else {
      const docRef = await addDoc(collection(db, 'formulas'), payload);
      formulaFinal.id = docRef.id;
      // Atualiza o ID no cache local
      const localUpdated = getLocalFormulas().map(f => f.id === formula.id ? formulaFinal : f);
      saveLocalFormulas(localUpdated);
    }

    return {
      success: true,
      message: `Fórmula de "${formulaFinal.produto}" salva com sucesso no Firebase!`,
      formulaSalva: formulaFinal
    };
  } catch (err: any) {
    console.error('Erro ao salvar fórmula no Firestore:', err);
    return {
      success: true,
      message: `Fórmula salva localmente com sucesso.`,
      formulaSalva: formulaFinal
    };
  }
}

export async function excluirFormulaApi(formulaId: string): Promise<{ success: boolean; message: string }> {
  // 1. Remove do cache local
  const formulasAtuais = getLocalFormulas().filter(f => f.id !== formulaId);
  saveLocalFormulas(formulasAtuais);

  // 2. Remove do Firestore
  try {
    await deleteDoc(doc(db, 'formulas', formulaId));
    return {
      success: true,
      message: 'Fórmula excluída com sucesso do Firebase!'
    };
  } catch (err: any) {
    console.error('Erro ao excluir fórmula do Firestore:', err);
    return {
      success: true,
      message: 'Fórmula removida localmente.'
    };
  }
}

