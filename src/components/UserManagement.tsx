import React, { useState, useEffect } from 'react';
import { User, UserTipo } from '../types';
import { getUsuariosApi, crudUsuarioApi } from '../services/api';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Edit3, 
  Trash2, 
  Search, 
  Loader2, 
  X, 
  Eye, 
  EyeOff, 
  Check, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface UserManagementProps {
  currentUser: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  
  // Modal Formulário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editandoEmail, setEditandoEmail] = useState<string | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState<UserTipo>('Vendedor');
  const [formEmail, setFormEmail] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // Modal Deletar
  const [deletandoUser, setDeletandoUser] = useState<User | null>(null);
  const [deletando, setDeletando] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ tipo: 'success' | 'error'; msg: string } | null>(null);

  const mostrarToast = (tipo: 'success' | 'error', msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const list = await getUsuariosApi();
      setUsuarios(list);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      mostrarToast('error', 'Erro ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleOpenNovo = () => {
    setEditandoEmail(null);
    setFormNome('');
    setFormTipo('Vendedor');
    setFormEmail('');
    setFormSenha('');
    setIsModalOpen(true);
  };

  const handleOpenEditar = (u: User) => {
    setEditandoEmail(u.email);
    setFormNome(u.nome);
    setFormTipo(u.tipo);
    setFormEmail(u.email);
    setFormSenha(u.senha || '');
    setIsModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim() || !formSenha.trim()) {
      mostrarToast('error', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    const subAction = editandoEmail ? 'editar' : 'criar';
    const userPayload: User = {
      nome: formNome.trim(),
      tipo: formTipo,
      email: formEmail.trim().toLowerCase(),
      senha: formSenha.trim()
    };

    try {
      const res = await crudUsuarioApi(subAction, userPayload, editandoEmail || undefined);
      if (res.success) {
        mostrarToast('success', res.message);
        setIsModalOpen(false);
        carregarUsuarios();
      } else {
        mostrarToast('error', res.message || 'Erro ao salvar usuário.');
      }
    } catch (err: any) {
      mostrarToast('error', err.message || 'Falha ao salvar no servidor.');
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarDeletar = async () => {
    if (!deletandoUser) return;
    setDeletando(true);

    try {
      const res = await crudUsuarioApi('deletar', deletandoUser);
      if (res.success) {
        mostrarToast('success', res.message);
        setDeletandoUser(null);
        carregarUsuarios();
      } else {
        mostrarToast('error', res.message || 'Erro ao deletar usuário.');
      }
    } catch (err: any) {
      mostrarToast('error', 'Erro de rede ao deletar.');
    } finally {
      setDeletando(false);
    }
  };

  const togglePasswordVisibility = (email: string) => {
    setShowPassword(prev => ({ ...prev, [email]: !prev[email] }));
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    u.email.toLowerCase().includes(filtro.toLowerCase()) ||
    u.tipo.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* TOAST DE NOTIFICAÇÃO */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-semibold animate-slideDown ${
          toast.tipo === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40' : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
        }`}>
          {toast.tipo === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono uppercase tracking-wider">
              Acesso Exclusivo Master
            </span>
          </div>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-100 mt-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Gestão de Usuários & Níveis de Acesso (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre e controle vendedores e administradores. As credenciais são armazenadas na aba <code className="text-amber-300 font-mono">Usuários</code> da sua planilha.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={carregarUsuarios}
            disabled={loading}
            className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-colors"
            title="Atualizar Usuários"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenNovo}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Tabela / Filtros */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Barra de Busca */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nome, e-mail ou tipo..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono font-medium ml-auto">
            Total: {usuariosFiltrados.length} usuário(s)
          </span>
        </div>

        {/* Visualização em Cards para Dispositivos Móveis (Mobile First) */}
        <div className="md:hidden divide-y divide-slate-800">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
              <span>Carregando usuários...</span>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhum usuário encontrado.
            </div>
          ) : (
            usuariosFiltrados.map((user) => (
              <div key={user.email} className="p-4 space-y-3 bg-slate-900/60 hover:bg-slate-900 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                      user.tipo === 'Master' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {user.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{user.nome}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditar(user)}
                      className="p-2.5 text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Editar Usuário"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletandoUser(user)}
                      className="p-2.5 text-slate-400 hover:text-rose-400 bg-slate-950 border border-slate-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div>
                    {user.tipo === 'Master' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        <ShieldCheck className="w-3 h-3" /> Master
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                        <UserCheck className="w-3 h-3" /> Vendedor
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-slate-400">
                    <span>Senha: {showPassword[user.email] ? (user.senha || '••••••') : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(user.email)}
                      className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                      title="Mostrar/ocultar senha"
                    >
                      {showPassword[user.email] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabela de Usuários para Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Nome do Usuário</th>
                <th className="px-6 py-3.5">Tipo de Permissão</th>
                <th className="px-6 py-3.5">E-mail de Acesso</th>
                <th className="px-6 py-3.5">Senha</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
                    <span>Carregando usuários do banco de dados...</span>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhum usuário encontrado. Clique em "Novo Usuário" para cadastrar.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((user) => (
                  <tr key={user.email} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-100 flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        user.tipo === 'Master' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {user.nome.charAt(0).toUpperCase()}
                      </div>
                      <span>{user.nome}</span>
                    </td>

                    <td className="px-6 py-4">
                      {user.tipo === 'Master' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Master (Acesso Total)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30">
                          <UserCheck className="w-3.5 h-3.5" />
                          Vendedor
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-300">
                      {user.email}
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>{showPassword[user.email] ? (user.senha || '••••••') : '••••••••'}</span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(user.email)}
                          className="text-slate-500 hover:text-amber-400 transition-colors"
                          title="Mostrar/ocultar senha"
                        >
                          {showPassword[user.email] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditar(user)}
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar Usuário"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletandoUser(user)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRIAR / EDITAR USUÁRIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-[95%] max-w-md p-5 sm:p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-cinzel text-lg font-bold text-amber-200">
                {editandoEmail ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fechar Modal"
              >
                <X className="w-5 h-5 text-amber-400" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4">
              
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                />
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nível de Acesso (Tipo)</label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value as UserTipo)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                >
                  <option value="Vendedor">Vendedor (Apenas as próprias vendas)</option>
                  <option value="Master">Master (Acesso total + Gestão de Usuários)</option>
                </select>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="ex: vendedor@olorluz.com.br"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100"
                />
              </div>

              {/* Senha */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Senha de Acesso</label>
                <input
                  type="text"
                  required
                  value={formSenha}
                  onChange={(e) => setFormSenha(e.target.value)}
                  placeholder="Informe a senha"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 text-slate-300 border border-slate-800 rounded-xl text-xs hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Salvar Usuário</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO DE DELETAR */}
      {deletandoUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            
            <div className="w-12 h-12 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-cinzel text-lg font-bold text-slate-100">Excluir Usuário?</h3>
            <p className="text-xs text-slate-400">
              Tem certeza de que deseja remover o usuário <strong className="text-amber-300">{deletandoUser.nome}</strong> ({deletandoUser.email})? Esta ação irá excluí-lo da aba <code className="text-amber-300 font-mono">Usuários</code> na planilha.
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletandoUser(null)}
                className="px-4 py-2 bg-slate-950 text-slate-300 border border-slate-800 rounded-xl text-xs hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmarDeletar}
                disabled={deletando}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-50"
              >
                {deletando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
