import React, { useState } from 'react';
import { User } from '../types';
import { loginApi, setCurrentUser } from '../services/api';
import { Logo } from './Logo';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      setErrorMsg('Por favor, informe o e-mail e a senha.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await loginApi(email, senha);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.message || 'E-mail ou senha incorretos.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de conexão ao efetuar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Luzes sutis e gradientes de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-slate-800/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* CARD PRINCIPAL DE LOGIN */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6 relative overflow-hidden">
          
          {/* Brilho no topo do Card */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />

          {/* CABEÇALHO / BRANDING */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo size="lg" showText={false} />
            </div>
            <div>
              <h1 className="font-cinzel text-2xl font-bold tracking-wider bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                OLOR LUZ
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                SIG ERP • Controle de Vendas & Acesso
              </p>
            </div>
          </div>

          {/* ALERTA DE ERRO */}
          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORMULÁRIO */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Campo Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>E-mail do Usuário</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: usuario@olorluz.com.br"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 transition-all font-sans"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Senha de Acesso</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl pl-4 pr-11 py-3 text-sm text-slate-100 placeholder-slate-600 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-300 p-1.5 rounded-lg transition-colors"
                  title={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* BOTÃO ENTRAR */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* RODAPÉ */}
        <p className="text-center text-[11px] text-slate-500">
          Olor Luz Velas & Aromas © 2026 • Todos os direitos reservados
        </p>

      </div>
    </div>
  );
};
