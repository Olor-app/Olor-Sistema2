import React, { useState } from 'react';
import { getAppsScriptUrl, setAppsScriptUrl, saveLocalVendas, DEFAULT_VENDAS_INICIAIS } from '../services/api';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Link as LinkIcon, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [url, setUrl] = useState<string>(getAppsScriptUrl());
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({ success: false, message: 'Insira uma URL válida do Google Apps Script.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(url.trim() + '?action=all', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message || 'Erro retornado pelo script');
      }

      setTestResult({
        success: true,
        message: `Conexão estabelecida com sucesso! Planilha lida com ${data.listas?.vendedores?.length || 0} vendedores e ${data.vendas?.length || 0} registros.`
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Falha ao conectar: ${err.message}. Verifique se a implantação está configurada para "Qualquer pessoa" (Anyone).`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setAppsScriptUrl(url);
    onSaved();
    onClose();
  };

  const handleResetLocal = () => {
    if (window.confirm('Deseja restaurar as vendas de demonstração locais?')) {
      saveLocalVendas(DEFAULT_VENDAS_INICIAIS);
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-slate-100">Configuração de Conexão com Google Sheets</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              URL do Web App do Google Apps Script
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Cole aqui a URL de implantação do seu <code className="text-amber-300">Código.gs</code> publicado como App da Web com acesso para "Qualquer pessoa".
            </p>
          </div>

          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !url.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-4 py-2 rounded-xl text-xs flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Testando...</span>
                </>
              ) : (
                <span>Testar Conexão</span>
              )}
            </button>
          </div>
        </div>

        {/* Reset local data */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetLocal}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Restaurar Vendas Locais</span>
          </button>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg"
            >
              Salvar URL
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
