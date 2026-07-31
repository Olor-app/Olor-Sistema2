import React from 'react';
import { Sparkles, Database, Code2, PlusCircle, Table, DollarSign, Settings } from 'lucide-react';

interface NavbarProps {
  activeTab: 'nova-venda' | 'historico' | 'tabela-precos' | 'apps-script';
  setActiveTab: (tab: 'nova-venda' | 'historico' | 'tabela-precos' | 'apps-script') => void;
  isMock: boolean;
  apiUrl: string;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isMock,
  apiUrl,
  onOpenSettings,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Marca */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 p-2 rounded-xl shadow-lg font-bold flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-wide text-amber-100">SIG Olor Luz</span>
                <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                  ERP Web
                </span>
              </div>
              <p className="text-xs text-slate-400">Sistema Integrado de Vendas e Comissionamento</p>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('nova-venda')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'nova-venda'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova Venda</span>
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'historico'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>BD_Vendas</span>
            </button>

            <button
              onClick={() => setActiveTab('tabela-precos')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tabela-precos'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Matriz de Preços</span>
            </button>

            <button
              onClick={() => setActiveTab('apps-script')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'apps-script'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Código Apps Script</span>
            </button>
          </nav>

          {/* Status da Conexão da API & Ações */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                apiUrl && !isMock
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title="Configurar URL do Google Apps Script"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {apiUrl && !isMock ? 'Google Sheets Conectado' : 'Modo Demonstrativo (Local)'}
              </span>
              <Settings className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden border-t border-slate-800 py-2 space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('nova-venda')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'nova-venda' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Nova Venda
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'historico' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            BD_Vendas
          </button>
          <button
            onClick={() => setActiveTab('tabela-precos')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'tabela-precos' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Matriz Preços
          </button>
          <button
            onClick={() => setActiveTab('apps-script')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              activeTab === 'apps-script' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Apps Script API
          </button>
        </div>

      </div>
    </header>
  );
};
