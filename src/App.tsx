import React, { useState, useEffect } from 'react';
import { ListasSelects, Venda, User } from './types';
import { fetchListasEVendas, DEFAULT_LISTAS, getLocalVendas, getCurrentUser, setCurrentUser, logoutUser } from './services/api';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { VendaForm } from './components/VendaForm';
import { VendasTable } from './components/VendasTable';
import { PriceMatrix } from './components/PriceMatrix';
import { ListasManagement } from './components/ListasManagement';
import { UserManagement } from './components/UserManagement';
import { ComissoesView } from './components/ComissoesView';
import { LoginScreen } from './components/LoginScreen';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AlertTriangle, Sparkles, RefreshCw, Database, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [listas, setListas] = useState<ListasSelects>(DEFAULT_LISTAS);
  const [vendas, setVendas] = useState<Venda[]>(getLocalVendas());
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Escuta alteração no estado da autenticação Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const stored = getCurrentUser();
        if (stored) {
          setCurrentUserState(stored);
        } else {
          const emailClean = fbUser.email?.toLowerCase() || '';
          const isMaster = emailClean === 'gleydsonwsm@gmail.com' || emailClean === 'master@olorluz.com.br';
          const newUser: User = {
            nome: emailClean === 'gleydsonwsm@gmail.com' ? 'Gleydson' : emailClean.split('@')[0],
            tipo: isMaster ? 'Master' : 'Vendedor',
            email: emailClean
          };
          setCurrentUser(newUser);
          setCurrentUserState(newUser);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserState(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUserState(null);
  };

  const carregarDados = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetchListasEVendas();
      setListas(res.listas);
      setVendas(res.vendas);
      if (res.rawDadosBrutos) setDadosBrutos(res.rawDadosBrutos);
      if (res.error) setErrorMsg(res.error);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      carregarDados();
    }
  }, [currentUser]);

  // Bloqueio RBAC para vendedores tentando acessar rotas administrativas
  useEffect(() => {
    if (currentUser && currentUser.tipo === 'Vendedor') {
      if (['nova-venda', 'tabela-precos', 'listas', 'gestao-usuarios'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  const handleVendaSalva = (vendaOuLote: Venda | Venda[]) => {
    const novos = Array.isArray(vendaOuLote) ? vendaOuLote : [vendaOuLote];
    setVendas((prev) => [...novos, ...prev]);
  };

  // Se não estiver logado, exibe APENAS a Tela de Login de Alto Padrão
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => setCurrentUserState(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* SIDEBAR VERTICAL DO LADO ESQUERDO */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMock={false}
        apiUrl=""
        onOpenSettings={() => {}}
        onRefresh={carregarDados}
        loading={loading}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* ÁREA DE CONTEÚDO PRINCIPAL NA DIREITA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen max-w-full overflow-x-hidden">
        
        {/* CABEÇALHO DO TOPO DA TELA (Limpo e Focado no Título) */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-3 sm:px-8 py-2.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
          
          <div className="flex items-center justify-center sm:justify-start space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-2 bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 rounded-xl transition-all"
              title={isCollapsed ? "Expandir Menu Vertical" : "Minimizar Menu Vertical"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <div className="text-center sm:text-left">
              <h1 className="font-cinzel text-base sm:text-xl lg:text-2xl font-bold text-amber-200 tracking-wider text-center sm:text-left">
                {activeTab === 'dashboard' && 'Dashboard de Vendas'}
                {activeTab === 'historico' && 'Histórico de Saídas (BD_Vendas)'}
                {activeTab === 'comissoes' && 'Relatórios e Extratos de Comissões'}
                {activeTab === 'nova-venda' && 'Lançamento de Nova Saída / Pedido'}
                {activeTab === 'tabela-precos' && 'Matriz de Produtos & Preços'}
                {activeTab === 'listas' && 'Gestão de Listas do Sistema'}
                {activeTab === 'gestao-usuarios' && 'Gestão de Usuários & Acessos (RBAC)'}
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Logado como <strong className="text-amber-300">{currentUser.nome}</strong> ({currentUser.tipo})
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-3 self-end sm:self-auto">
            <button
              onClick={carregarDados}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Sincronizar com Firebase Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>{loading ? 'Carregando...' : 'Atualizar Dados'}</span>
            </button>
          </div>

        </header>

        {/* Faixa de Aviso se houver erro */}
        {errorMsg && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 text-xs text-rose-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span><strong>Aviso:</strong> {errorMsg}</span>
            </div>
          </div>
        )}

        {/* ÁREA DE CONTEÚDO DE CADA ABA */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl w-full mx-auto pb-28 lg:pb-8 overflow-x-hidden">
          
          {/* 1. DASHBOARD */}
          {activeTab === 'dashboard' && (
            <section className="space-y-6">
              <Dashboard vendas={vendas} listas={listas} currentUser={currentUser} />
            </section>
          )}

          {/* 2. BD_VENDAS */}
          {activeTab === 'historico' && (
            <section className="space-y-6">
              <VendasTable
                vendas={vendas}
                onRefresh={carregarDados}
                loading={loading}
                listas={listas}
                dadosBrutos={dadosBrutos}
                currentUser={currentUser}
              />
            </section>
          )}

          {/* 3. COMISSÕES */}
          {activeTab === 'comissoes' && (
            <section className="space-y-6">
              <ComissoesView
                vendas={vendas}
                listas={listas}
                currentUser={currentUser}
                onRefresh={carregarDados}
                loading={loading}
              />
            </section>
          )}

          {/* 3. NOVA SAÍDA (Apenas Master) */}
          {activeTab === 'nova-venda' && currentUser.tipo === 'Master' && (
            <section className="space-y-6">
              <VendaForm
                listas={listas}
                dadosBrutos={dadosBrutos}
                onVendaSalva={handleVendaSalva}
              />
            </section>
          )}

          {/* 4. MATRIZ DE PREÇOS & EMBALAGENS (Apenas Master) */}
          {activeTab === 'tabela-precos' && currentUser.tipo === 'Master' && (
            <section className="space-y-6">
              <PriceMatrix
                listas={listas}
                dadosBrutos={dadosBrutos}
                onRefresh={carregarDados}
              />
            </section>
          )}

          {/* 5. GESTÃO DE LISTAS DO SISTEMA (Apenas Master) */}
          {activeTab === 'listas' && currentUser.tipo === 'Master' && (
            <section className="space-y-6">
              <ListasManagement
                listas={listas}
                onRefresh={carregarDados}
              />
            </section>
          )}

          {/* 6. GESTÃO DE USUÁRIOS (RBAC - Apenas Master) */}
          {activeTab === 'gestao-usuarios' && currentUser.tipo === 'Master' && (
            <section className="space-y-6">
              <UserManagement currentUser={currentUser} />
            </section>
          )}

        </main>

        {/* RODAPÉ */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-slate-400">SIG Olor Luz</span>
              <span>— ERP de Gestão, Comissionamento e Controle de Acesso (RBAC)</span>
            </div>
            <p className="text-[11px]">
              Back-end Firebase NoSQL <code className="text-slate-400">sig-olorluz</code> (Coleções: usuarios e vendas).
            </p>
          </div>
        </footer>

      </div>

    </div>
  );
}
