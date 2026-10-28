import React, { useState } from 'react';
import { X, Download, Upload, Database, Lock, Trash2, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (passphrase?: string) => Promise<string>;
  onImport: (json: string, passphrase?: string) => Promise<{ success: boolean; importedCount: number }>;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => Promise<void>;
  onClearDemoData?: () => Promise<void>;
}

export const BackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExport,
  onImport,
  onNotify,
  onRefreshData,
  onClearDemoData,
}) => {
  const [importing, setImporting] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [useEncryption, setUseEncryption] = useState(false);

  if (!isOpen) return null;

  const handleExportClick = async () => {
    try {
      const pass = useEncryption ? exportPassphrase.trim() : undefined;
      const jsonContent = await onExport(pass);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `tclavis-backup-${dateStr}${useEncryption ? '-encrypted' : ''}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify(
        useEncryption
          ? 'Backup exportado com criptografia AES-256!'
          : 'Backup exportado com sucesso!',
        'success'
      );
    } catch (err: any) {
      onNotify('Erro ao exportar backup: ' + err.message, 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await onImport(text, importPassphrase.trim() || undefined);
        onNotify(`Backup restaurado! ${res.importedCount} itens carregados.`, 'success');
        await onRefreshData();
        onClose();
      } catch (err: any) {
        onNotify('Erro ao restaurar: ' + err.message, 'error');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleClearDemoClick = async () => {
    if (confirm('Deseja remover as contas de demonstração iniciais e manter apenas seus roteadores e usuários reais?')) {
      try {
        if (onClearDemoData) {
          await onClearDemoData();
        } else if (window.tclavisAPI?.clearDemoData) {
          await window.tclavisAPI.clearDemoData();
        }
        await onRefreshData();
        onNotify('Dados de demonstração removidos!', 'info');
      } catch (err: any) {
        onNotify('Erro ao limpar dados: ' + err.message, 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Backup & Manutenção</h3>
              <p className="text-xs text-slate-400">Migração segura, criptografia e limpeza</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Export Box */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>Exportar Base Completa</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Gera arquivo JSON com roteadores, mapeamentos e usuários
                </p>
              </div>

              <button
                onClick={handleExportClick}
                className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-background text-xs font-semibold transition flex items-center space-x-1 shadow-glow-primary flex-shrink-0"
              >
                <span>Exportar</span>
              </button>
            </div>

            <div className="pt-2 border-t border-surface-border/60">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useEncryption}
                  onChange={(e) => setUseEncryption(e.target.checked)}
                  className="rounded bg-background border-surface-border text-primary focus:ring-0"
                />
                <span className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-accent-emerald" />
                  <span>Proteger com senha mestra (AES-256)</span>
                </span>
              </label>

              {useEncryption && (
                <input
                  type="password"
                  placeholder="Digite uma senha mestra para o arquivo..."
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 bg-background border border-surface-border rounded-lg text-white text-xs focus:outline-none focus:border-primary font-mono"
                />
              )}
            </div>
          </div>

          {/* Import Box */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-3">
            <div>
              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-accent-emerald" />
                <span>Restaurar de Backup</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Carrega caixas, perfis e usuários de um arquivo previamente exportado
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                placeholder="Senha mestra (se o arquivo for criptografado)..."
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-surface-border rounded-lg text-white text-xs focus:outline-none focus:border-primary font-mono"
              />

              <label className="w-full py-2 px-3 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-semibold transition flex items-center justify-center space-x-2 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{importing ? 'Processando restauração...' : 'Selecionar Arquivo de Backup'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Clean Demo Data Box */}
          <div className="p-3 bg-surface/50 border border-surface-border rounded-xl flex items-center justify-between">
            <div className="text-xs">
              <span className="font-semibold text-slate-300 block">Ambiente de Produção</span>
              <span className="text-[10px] text-slate-500">Expurgar usuários de demonstração iniciais</span>
            </div>
            <button
              onClick={handleClearDemoClick}
              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-accent-rose/20 text-slate-400 hover:text-accent-rose border border-surface-border text-xs transition flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpar Demos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
