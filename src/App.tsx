import React, { useState, useEffect } from 'react';
import { ListasSelects, Venda, User } from './types';
import { fetchListasEVendas, DEFAULT_LISTAS, getLocalVendas, getAppsScriptUrl, getCurrentUser, logoutUser } from './services/api';
import { Sidebar, TabType } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { VendaForm } from './components/VendaForm';
import { VendasTable } from './components/VendasTable';
import { PriceMatrix } from './components/PriceMatrix';
import { AppsScriptView } from './components/AppsScriptView';
import { UserManagement } from './components/UserManagement';
import { LoginScreen } from './components/LoginScreen';
import { SettingsModal } from './components/SettingsModal';
import { Logo } from './components/Logo';
import { AlertTriangle, Sparkles, RefreshCw, Database, Settings, PanelLeftOpen, PanelLeftClose, ShieldCheck, UserCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [listas, setListas] = useState<ListasSelects>(DEFAULT_LISTAS);
  const [vendas, setVendas] = useState<Venda[]>(getLocalVendas());
  const [dadosBrutos, setDadosBrutos] = useState<any[]>([]);
  const [isMock, setIsMock] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const apiUrl = getAppsScriptUrl();

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const carregarDados = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetchListasEVendas();
      setListas(res.listas);
      setVendas(res.vendas);
      setIsMock(res.isMock);
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
      if (['nova-venda', 'tabela-precos', 'gestao-usuarios', 'apps-script'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  const handleVendaSalva = (vendaOuLote: Venda | Venda[]) => {
    const novos = Array.isArray(vendaOuLote) ? vendaOuLote : [vendaOuLote];
    setVendas((prev) => [...novos, ...prev]);
  };

  // Se não estiver logado, exibe a Tela de Login de Alto Padrão
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* SIDEBAR VERTICAL DO LADO ESQUERDO */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMock={isMock}
        apiUrl={apiUrl}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={carregarDados}
        loading={loading}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* ÁREA DE CONTEÚDO PRINCIPAL NA DIREITA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* CABEÇALHO DO TOPO */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-2 bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 rounded-xl transition-all"
              title={isCollapsed ? "Expandir Menu Vertical" : "Minimizar Menu Vertical"}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <Logo size="md" />
            <div className="hidden sm:block h-8 w-px bg-slate-800" />
            <div>
              <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-amber-200 tracking-wider">
                {activeTab === 'dashboard' && 'Dashboard de Vendas'}
                {activeTab === 'historico' && 'Histórico de Saídas'}
                {activeTab === 'nova-venda' && 'Lançamento de Nova Saída / Pedido'}
                {activeTab === 'tabela-precos' && 'Matriz de Produtos & Preços'}
                {activeTab === 'gestao-usuarios' && 'Gestão de Usuários & Acessos (RBAC)'}
                {activeTab === 'apps-script' && 'Integração Google Apps Script'}
              </h1>
              <p className="text-xs text-slate-400">
                SIG Olor Luz — Logado como <strong className="text-amber-300">{currentUser.nome}</strong> ({currentUser.tipo})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <button
              onClick={carregarDados}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Sincronizar e Atualizar com o Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span className="hidden md:inline">{loading ? 'Carregando...' : 'Sincronizar Dados'}</span>
            </button>

            {currentUser.tipo === 'Master' && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  apiUrl && !isMock
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>{apiUrl && !isMock ? 'Planilha Conectada' : 'Modo Demonstrativo'}</span>
                <Settings className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>
            )}
          </div>

        </header>

        {/* Faixa de Aviso de Erro ou Modo Demonstrativo */}
        {errorMsg ? (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 text-xs text-rose-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span><strong>Erro de Conexão:</strong> {errorMsg}</span>
              </div>
              {currentUser.tipo === 'Master' && (
                <button
                  onClick={() => setActiveTab('apps-script')}
                  className="bg-rose-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] shadow hover:bg-rose-400 whitespace-nowrap"
                >
                  Ver Solução
                </button>
              )}
            </div>
          </div>
        ) : (
          (!apiUrl || isMock) && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-xs text-amber-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Modo Demonstrativo:</strong> Sistema rodando com dados locais.
                  </span>
                </div>
                {currentUser.tipo === 'Master' && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] shadow hover:bg-amber-400 whitespace-nowrap"
                  >
                    Conectar Planilha
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {/* ÁREA DE CONTEÚDO DE CADA ABA */}
        <main className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
          
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

          {/* 3. NOVA SAÍDA */}
          {activeTab === 'nova-venda' && (
            <section className="space-y-6">
              <VendaForm
                listas={listas}
                dadosBrutos={dadosBrutos}
                onVendaSalva={handleVendaSalva}
              />
            </section>
          )}

          {/* 4. MATRIZ DE PREÇOS & LISTAS (Apenas Master) */}
          {activeTab === 'tabela-precos' && currentUser.tipo === 'Master' && (
            <section className="space-y-6">
              <PriceMatrix
                listas={listas}
                dadosBrutos={dadosBrutos}
              />
            </section>
          )}

          {/* 5. GESTÃO DE USUÁRIOS (RBAC - Apenas Master) */}
          {activeTab === 'gestao-usuarios' && currentUser.tipo === 'Master' && (
            <section className="space-y-6">
              <UserManagement currentUser={currentUser} />
            </section>
          )}

          {/* 6. CÓDIGO APPS SCRIPT (Apenas Master) */}
          {activeTab === 'apps-script' && currentUser.tipo === 'Master' && (
            <section className="space-y-6">
              <AppsScriptView />
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
              Sincronizado com Planilha <code className="text-slate-400">Olor_Luz_Sistema</code> (Abas Listas, BD_Vendas e Usuários).
            </p>
          </div>
        </footer>

      </div>

      {/* MODAL DE CONFIGURAÇÃO DA API */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={carregarDados}
      />

    </div>
  );
}

