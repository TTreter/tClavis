import React, { useState } from 'react';
import { X, Download, Upload, Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => Promise<string>;
  onImport: (json: string) => Promise<{ success: boolean; importedCount: number }>;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshData: () => Promise<void>;
}

export const BackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onExport,
  onImport,
  onNotify,
  onRefreshData,
}) => {
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleExportClick = async () => {
    try {
      const jsonContent = await onExport();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `tclavis-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify('Backup exportado com sucesso!', 'success');
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
        const res = await onImport(text);
        onNotify(`Backup restaurado! ${res.importedCount} itens carregados.`, 'success');
        await onRefreshData();
        onClose();
      } catch (err: any) {
        onNotify('Erro ao restaurar arquivo: ' + err.message, 'error');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-surface-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Backup & Restauração</h3>
              <p className="text-xs text-slate-400">Migre ou salve seus roteadores e usuários</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Export Box */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Exportar Base Completa</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Gera um arquivo JSON com roteadores, mapeamentos e usuários
              </p>
            </div>
            <button
              onClick={handleExportClick}
              className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-background text-xs font-semibold transition flex items-center space-x-1.5 shadow-glow-primary"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>
          </div>

          {/* Import Box */}
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Restaurar de Arquivo</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Carrega um arquivo de backup previamente exportado
              </p>
            </div>
            <label className="px-3.5 py-1.5 rounded-xl bg-surface hover:bg-surface-border border border-surface-border text-slate-200 text-xs font-semibold cursor-pointer transition flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>{importing ? 'Lendo...' : 'Importar'}</span>
              <input
                type="file"
                accept=".json"
                disabled={importing}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-slate-300 hover:text-white text-xs font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
