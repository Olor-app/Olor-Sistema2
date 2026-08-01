import React, { useState } from 'react';
import { Logo } from './Logo';
import { User } from '../types';
import { 
  BarChart3, 
  Table, 
  PlusCircle, 
  DollarSign, 
  Code2, 
  Settings, 
  Database, 
  Menu, 
  X, 
  RefreshCw,
  Sparkles,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export type TabType = 'dashboard' | 'historico' | 'nova-venda' | 'tabela-precos' | 'gestao-usuarios' | 'apps-script';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isMock: boolean;
  apiUrl: string;
  onOpenSettings: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMock,
  apiUrl,
  onOpenSettings,
  onRefresh,
  loading = false,
  isCollapsed,
  setIsCollapsed,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMaster = currentUser?.tipo === 'Master';

  // Itens do menu com filtro de permissões (RBAC)
  const allMenuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      description: 'Resultados e Indicadores',
      icon: BarChart3,
      badge: 'Principal',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      allowedRoles: ['Master', 'Vendedor']
    },
    {
      id: 'historico' as TabType,
      label: 'BD_Vendas',
      description: isMaster ? 'Histórico Geral de Saídas' : 'Minhas Vendas Lançadas',
      icon: Table,
      allowedRoles: ['Master', 'Vendedor']
    },
    {
      id: 'nova-venda' as TabType,
      label: 'Nova Saída',
      description: 'Lançamento de Pedidos',
      icon: PlusCircle,
      allowedRoles: ['Master']
    },
    {
      id: 'tabela-precos' as TabType,
      label: 'Preços & Listas',
      description: 'Matriz de Produtos & Preços',
      icon: DollarSign,
      allowedRoles: ['Master']
    },
    {
      id: 'gestao-usuarios' as TabType,
      label: 'Gestão de Usuários',
      description: 'Controle de Acesso RBAC',
      icon: Users,
      badge: 'Master',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      allowedRoles: ['Master']
    },
    {
      id: 'apps-script' as TabType,
      label: 'Código Apps Script',
      description: 'Configuração da Planilha',
      icon: Code2,
      allowedRoles: ['Master']
    },
  ];

  const menuItems = allMenuItems.filter(item => 
    !currentUser || item.allowedRoles.includes(currentUser.tipo)
  );

  const handleSelectTab = (id: TabType) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* CABEÇALHO MOBILE (Aparece apenas em telas pequenas) */}
      <div className="lg:hidden bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" showText={false} />
          <div>
            <h1 className="font-cinzel font-bold text-lg text-amber-200 tracking-wider">
              OLOR LUZ
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">SIG ERP Vendas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-900 transition-colors"
              title="Atualizar Dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-slate-900 text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="Abrir Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* OVERLAY MOBILE QUANDO MENU ABERTO */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
        />
      )}

      {/* SIDEBAR VERTICAL PRINCIPAL (Com suporte a Minimizar / Expandir) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 ${
          isCollapsed ? 'lg:w-20' : 'lg:w-72'
        } ${mobileMenuOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
          
          {/* TOPO DA SIDEBAR: LOGO + TÍTULO E BOTÃO PARA MINIMIZAR/EXPANDIR */}
          <div className={`p-4 border-b border-slate-900 bg-gradient-to-b from-slate-900/80 to-transparent flex flex-col ${
            isCollapsed ? 'items-center' : 'items-start'
          }`}>
            <div className="w-full flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <Logo size={isCollapsed ? 'sm' : 'md'} showText={false} />
                {!isCollapsed && (
                  <div className="truncate">
                    <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase font-mono block">
                      SISTEMA ERP
                    </span>
                    <span className="text-xs text-slate-400 truncate block">
                      Olor Luz Aromas
                    </span>
                  </div>
                )}
              </div>

              {/* Botão de Minimizar / Expandir no Desktop */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-2 bg-slate-900/90 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 rounded-xl transition-all hover:scale-105 shrink-0"
                title={isCollapsed ? "Expandir Menu" : "Minimizar Menu"}
              >
                {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </button>
            </div>

            {/* TÍTULO EM FONTE GRANDE E BEM ESTILIZADA (Exibido quando Expandido) */}
            {!isCollapsed && (
              <div className="pt-3 w-full border-t border-slate-900/50 mt-3">
                <h1 className="font-cinzel text-2xl font-extrabold tracking-wider bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(212,175,55,0.2)]">
                  OLOR LUZ
                </h1>
              </div>
            )}
          </div>

          {/* NAVEGAÇÃO PRINCIPAL EM LISTA VERTICAL */}
          <div className="p-3 space-y-1 flex-1">
            {!isCollapsed && (
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase font-mono flex items-center justify-between">
                <span>Menu Principal</span>
                <Sparkles className="w-3 h-3 text-amber-500/60" />
              </div>
            )}

            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                  className={`w-full group flex items-center p-2.5 rounded-xl transition-all duration-200 relative ${
                    isCollapsed ? 'justify-center' : 'justify-between'
                  } ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/10'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-amber-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-slate-900 text-amber-400 group-hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    {!isCollapsed && (
                      <div className="text-left truncate">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm tracking-wide font-semibold ${isSelected ? 'text-slate-950' : 'text-slate-200'}`}>
                            {item.label}
                          </span>
                          {item.badge && !isSelected && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-semibold ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] truncate ${isSelected ? 'text-slate-900/80 font-normal' : 'text-slate-400'}`}>
                          {item.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {!isCollapsed && (
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-slate-950 translate-x-0.5' : 'text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5'
                      }`}
                    />
                  )}

                  {/* Dot indicador quando colapsado */}
                  {isCollapsed && isSelected && (
                    <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-slate-950 rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* RODAPÉ DA SIDEBAR: USUÁRIO LOGADO + CONEXÃO SHEETS */}
          <div className="p-3 border-t border-slate-900 bg-slate-950/90 space-y-2">
            
            {/* CARD DO USUÁRIO LOGADO */}
            {currentUser && (
              !isCollapsed ? (
                <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isMaster 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {currentUser.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {currentUser.nome}
                        </span>
                        {isMaster ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" title="Perfil Master" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" title="Perfil Vendedor" />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium block truncate ${
                        isMaster ? 'text-amber-400 font-semibold' : 'text-slate-400'
                      }`}>
                        {currentUser.tipo} • {currentUser.email}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onLogout}
                    className="p-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-800 rounded-lg transition-colors shrink-0"
                    title="Sair do Sistema"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-1">
                  <button
                    onClick={onLogout}
                    className="p-2 bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 rounded-xl transition-colors"
                    title={`Sair de ${currentUser.nome} (${currentUser.tipo})`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
            
            {!isCollapsed ? (
              isMaster && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-400" />
                      Conexão Sheets
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        apiUrl && !isMock ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium truncate">
                    {apiUrl && !isMock ? 'Google Planilhas OK' : 'Modo Local (Demo)'}
                  </p>

                  <button
                    onClick={onOpenSettings}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configurar URL API</span>
                  </button>
                </div>
              )
            ) : (
              isMaster && (
                <div className="flex flex-col items-center gap-2 py-1">
                  <button
                    onClick={onOpenSettings}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl transition-colors relative"
                    title={apiUrl && !isMock ? "Google Planilhas Conectado - Configurar API" : "Modo Local - Configurar API"}
                  >
                    <Settings className="w-4 h-4" />
                    <span
                      className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                        apiUrl && !isMock ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </button>
                </div>
              )
            )}

            {!isCollapsed && (
              <div className="text-center text-[10px] text-slate-500 font-mono">
                v2.5 • SIG Olor Luz ERP
              </div>
            )}

          </div>

        </div>
      </aside>
    </>
  );
};

